/**
 * Handler smoke tests: index.js loads on the SDK v3 / common-layer imports and
 * completes a run. The SDK v3 Lambda and SES clients ship with the Node 20
 * runtime and the layer mounts at /opt/nodejs, so all three are virtual here.
 */

jest.mock(
  "/opt/nodejs/utils",
  () => ({
    dynamoHelpers: {
      scan: jest.fn(),
      getItem: jest.fn(),
      queryByPK: jest.fn(),
      putItem: jest.fn(),
      updateItem: jest.fn(),
    },
  }),
  { virtual: true },
);

jest.mock(
  "@aws-sdk/client-lambda",
  () => {
    const send = jest.fn();
    return {
      __send: send,
      LambdaClient: class {
        send(cmd) {
          return send(cmd);
        }
      },
      InvokeCommand: class {
        constructor(input) {
          this.input = input;
        }
      },
    };
  },
  { virtual: true },
);

jest.mock(
  "@aws-sdk/client-ses",
  () => ({
    SESClient: class {
      send() {
        return Promise.resolve({});
      }
    },
    SendEmailCommand: class {
      constructor(input) {
        this.input = input;
      }
    },
  }),
  { virtual: true },
);

const { dynamoHelpers } = require("/opt/nodejs/utils");
const { __send: mockLambdaSend } = require("@aws-sdk/client-lambda");
const { handler } = require("./index");

describe("daily-reminders handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
    dynamoHelpers.getItem.mockResolvedValue(null);
    dynamoHelpers.queryByPK.mockResolvedValue([]);
    mockLambdaSend.mockResolvedValue({ StatusCode: 202 });
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  it("scans USER#/PROFILE records through the paginating layer helper", async () => {
    dynamoHelpers.scan.mockResolvedValue([]);

    const result = await handler({ source: "aws.events" });

    expect(result.statusCode).toBe(200);
    expect(dynamoHelpers.scan).toHaveBeenCalledWith({
      FilterExpression: "begins_with(PK, :pk) AND SK = :sk",
      ExpressionAttributeValues: { ":pk": "USER#", ":sk": "PROFILE" },
    });
    expect(JSON.parse(result.body).totalUsers).toBe(0);
  });

  it("completes a run and skips users without a familyId instead of reminding them", async () => {
    // Current profiles carry no familyId; the FAMILY#-keyed transaction lookup
    // would find nothing and remind on every run
    dynamoHelpers.scan.mockResolvedValue([
      { PK: "USER#user-1", SK: "PROFILE", userId: "user-1", email: "a@example.com" },
    ]);

    const result = await handler({ source: "aws.events" });
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.totalUsers).toBe(1);
    expect(body.errors).toBe(0);
    expect(body.remindersSent).toBe(0);
    expect(body.details[0].reason).toBe("no_family_id");
    expect(mockLambdaSend).not.toHaveBeenCalled();
  });
});
