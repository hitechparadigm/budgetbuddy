/**
 * PUT /accounts/{accountId}: the request body must not be able to SET
 * arbitrary attributes (GSI keys, budgetId, entityType, isManual, plaid ids)
 * on the account item. Goes through the real handler; the layer is mocked via
 * jest.config.js moduleNameMapper.
 */
const { handler } = require("./index");
const { dynamoHelpers } = require("/opt/nodejs/utils");

const BUDGET_ID = "budget_test_123"; // what the mocked resolveAccess returns
const manualAccount = {
  PK: `BUDGET#${BUDGET_ID}`,
  SK: "ACCOUNT#acc_1",
  entityType: "ACCOUNT",
  accountId: "acc_1",
  budgetId: BUDGET_ID,
  accountType: "banking",
  accountSubtype: "checking",
  nickname: "Everyday",
  currentBalance: 100,
  currency: "USD",
  isManual: true,
  isTracked: true,
};

const putAccount = (body) =>
  handler(
    {
      httpMethod: "PUT",
      path: "/accounts/acc_1",
      pathParameters: { accountId: "acc_1" },
      body: JSON.stringify(body),
      requestContext: { authorizer: { claims: { sub: "test-user-id" } } },
    },
    { awsRequestId: "req-1" },
  );

beforeEach(() => {
  jest.clearAllMocks();
  dynamoHelpers.getItem.mockResolvedValue({ ...manualAccount });
  dynamoHelpers.updateItem.mockImplementation(async (_pk, _sk, updates) => ({
    ...manualAccount,
    ...updates,
  }));
});

describe("PUT /accounts/{accountId} field allowlist", () => {
  it("drops key, index and ownership fields and updates only the caller's account", async () => {
    const res = await putAccount({
      nickname: "Renamed",
      currentBalance: 250,
      PK: "BUDGET#budget_victim",
      SK: "MEMBER#user_attacker",
      GSI1PK: "USER#user_victim",
      GSI1SK: "BUDGET#budget_victim",
      budgetId: "budget_victim",
      entityType: "MEMBER",
      role: "owner",
      isManual: false,
      plaidAccountId: "plaid_injected",
      userId: "user_victim",
    });

    expect(res.statusCode).toBe(200);
    expect(dynamoHelpers.updateItem).toHaveBeenCalledTimes(1);
    const [pk, sk, updates] = dynamoHelpers.updateItem.mock.calls[0];
    expect(pk).toBe(`BUDGET#${BUDGET_ID}`);
    expect(sk).toBe("ACCOUNT#acc_1");
    expect(Object.keys(updates).sort()).toEqual(
      ["currentBalance", "nickname", "updatedAt"].sort(),
    );
    expect(updates).toMatchObject({ nickname: "Renamed", currentBalance: 250 });
  });

  it("keeps every user-editable field the web client sends", async () => {
    const res = await putAccount({
      nickname: "Savings",
      institutionName: "Example Bank",
      currentBalance: 42.5,
      isTracked: false,
    });

    expect(res.statusCode).toBe(200);
    const updates = dynamoHelpers.updateItem.mock.calls[0][2];
    expect(updates).toMatchObject({
      nickname: "Savings",
      institutionName: "Example Bank",
      currentBalance: 42.5,
      isTracked: false,
    });
  });

  it("still returns 400 for an invalid value", async () => {
    const res = await putAccount({ currentBalance: "lots" });

    expect(res.statusCode).toBe(400);
    expect(dynamoHelpers.updateItem).not.toHaveBeenCalled();
  });
});
