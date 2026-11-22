/**
 * Handler smoke tests: index.js loads on the SDK v3 / common-layer imports,
 * answers the health event without any read, routes the two scheduled events,
 * and never scans the table. keys.js and reminder-preferences.js are the real
 * layer modules (package.json jest moduleNameMapper); utils and the Lambda
 * client are virtual mocks.
 */
jest.mock(
  "/opt/nodejs/utils",
  () => {
    const fail = () => jest.fn(async () => { throw new Error("no data access expected"); });
    return {
      dynamoHelpers: {
        scan: fail(),
        getItem: fail(),
        queryAll: jest.fn(async () => []),
        queryByPK: fail(),
        queryByPrefix: fail(),
        queryGSIRange: fail(),
        putItem: fail(),
        updateItem: fail(),
      },
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      emitEmfMetric: jest.fn(),
    };
  },
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
const { dynamoHelpers } = require("/opt/nodejs/utils");
const { __send: mockLambdaSend } = require("@aws-sdk/client-lambda");
const { handler } = require("./index");

describe("daily-reminders handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ now: new Date("2026-11-24T19:00:03Z") });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns 200 for { healthCheck: true } before any read", async () => {
    dynamoHelpers.queryAll.mockImplementationOnce(async () => {
      throw new Error("no data access expected");
    });

    const result = await handler({ healthCheck: true });

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ status: "healthy" });
    expect(dynamoHelpers.queryAll).not.toHaveBeenCalled();
    expect(mockLambdaSend).not.toHaveBeenCalled();
    dynamoHelpers.queryAll.mockReset();
    dynamoHelpers.queryAll.mockResolvedValue([]);
  });

  it("an EventBridge scheduled event runs the hourly reminder query on GSI3, never a Scan", async () => {
    const result = await handler({ source: "aws.events", "detail-type": "Scheduled Event" });

    expect(result.statusCode).toBe(200);
    expect(dynamoHelpers.scan).not.toHaveBeenCalled();
    expect(dynamoHelpers.queryAll).toHaveBeenCalledTimes(1);
    const [input] = dynamoHelpers.queryAll.mock.calls[0];
    expect(input).toEqual({
      IndexName: "GSI3",
      KeyConditionExpression: "GSI3PK = :bucket",
      ExpressionAttributeValues: { ":bucket": "REMINDER#19" },
    });
    expect(input.FilterExpression).toBeUndefined();
    expect(JSON.parse(result.body)).toMatchObject({ mode: "hourly", hourUtc: 19, due: 0, sent: 0 });
  });

  it("the 13:00 rule's { mode: 'daily-nudges' } event queries the month's periods on GSI2", async () => {
    const result = await handler({ mode: "daily-nudges" });

    expect(result.statusCode).toBe(200);
    expect(dynamoHelpers.queryAll.mock.calls[0][0]).toEqual({
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :period",
      ExpressionAttributeValues: { ":period": "PERIOD#2026-11" },
    });
    expect(JSON.parse(result.body)).toMatchObject({ mode: "daily-nudges", budgets: 0 });
  });

  it("a failed GSI3 query fails the invocation so EventBridge retries", async () => {
    dynamoHelpers.queryAll.mockRejectedValueOnce(Object.assign(new Error("throttled"), {
      name: "ProvisionedThroughputExceededException",
    }));

    await expect(handler({ source: "aws.events" })).rejects.toThrow("throttled");
  });
});
