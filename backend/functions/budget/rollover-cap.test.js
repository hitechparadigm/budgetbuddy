/**
 * PUT /budget/categories/{categoryId}/rollover - cap handling
 *
 * Runs the REAL handler. Three request shapes have to mean three different
 * things, and the middle one used to be indistinguishable from the third:
 *
 *   rolloverCap: <number>  set the cap
 *   rolloverCap: null      clear the cap   <- blanking the field in the UI
 *   (field absent)         leave it alone
 *
 * Fixtures use the stored group shape the handler actually reads: `groups` is
 * an object keyed income/savings/expenses whose values are FLAT arrays of
 * category objects.
 */

jest.mock("/opt/nodejs/utils");
jest.mock("/opt/nodejs/shared");

const { handler } = require("./index");

const CONTEXT = { awsRequestId: "test-request-id" };

/** A stored period record holding one category. */
function periodWith(category) {
  return {
    PK: "BUDGET#budget_test_123",
    SK: "PERIOD#2026-02",
    month: "2026-02",
    groups: { income: [], savings: [], expenses: [category] },
  };
}

function rolloverEvent(body) {
  return {
    httpMethod: "PUT",
    path: "/budget/categories/cat_groceries/rollover",
    pathParameters: { categoryId: "cat_groceries" },
    body: JSON.stringify({ month: "2026-02", groupType: "expenses", ...body }),
    requestContext: {
      authorizer: { claims: { sub: "user_123", email: "test@example.com" } },
    },
  };
}

describe("rollover cap", () => {
  let dynamoHelpers;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TABLE_NAME = "test-table";
    ({ dynamoHelpers } = require("/opt/nodejs/utils"));
    dynamoHelpers.updateItem.mockImplementation((pk, sk, updates) =>
      Promise.resolve({ PK: pk, SK: sk, ...updates }),
    );
  });

  /** The category as it was written back. */
  function savedCategory() {
    const [, , updates] = dynamoHelpers.updateItem.mock.calls[0];
    return updates.groups.expenses[0];
  }

  const CAPPED = {
    id: "cat_groceries",
    name: "Groceries",
    plannedAmount: 500,
    rolloverEnabled: true,
    rolloverAmount: 150,
    rolloverCap: 200,
  };

  it("sets a cap", async () => {
    dynamoHelpers.getItem.mockResolvedValue(
      periodWith({ ...CAPPED, rolloverCap: undefined }),
    );

    const result = await handler(
      rolloverEvent({ rolloverEnabled: true, rolloverCap: 300 }),
      CONTEXT,
    );

    expect(result.statusCode).toBe(200);
    expect(savedCategory().rolloverCap).toBe(300);
  });

  it("clears the cap when the client sends an explicit null", async () => {
    dynamoHelpers.getItem.mockResolvedValue(periodWith(CAPPED));

    const result = await handler(
      rolloverEvent({ rolloverEnabled: true, rolloverCap: null }),
      CONTEXT,
    );

    expect(result.statusCode).toBe(200);
    // Previously neither branch ran for null-with-rollover-on, so the old cap
    // survived and blanking the input did nothing.
    expect(savedCategory()).not.toHaveProperty("rolloverCap");
    expect(savedCategory().rolloverEnabled).toBe(true);
  });

  it("leaves the cap alone when the field is absent", async () => {
    dynamoHelpers.getItem.mockResolvedValue(periodWith(CAPPED));

    const result = await handler(
      rolloverEvent({ rolloverEnabled: true }),
      CONTEXT,
    );

    expect(result.statusCode).toBe(200);
    expect(savedCategory().rolloverCap).toBe(200);
  });

  it("drops the cap when rollover is turned off", async () => {
    dynamoHelpers.getItem.mockResolvedValue(periodWith(CAPPED));

    const result = await handler(
      rolloverEvent({ rolloverEnabled: false }),
      CONTEXT,
    );

    expect(result.statusCode).toBe(200);
    expect(savedCategory()).not.toHaveProperty("rolloverCap");
    expect(savedCategory().rolloverAmount).toBe(0);
  });

  it("requires month and groupType", async () => {
    dynamoHelpers.getItem.mockResolvedValue(periodWith(CAPPED));

    const noMonth = await handler(
      {
        httpMethod: "PUT",
        path: "/budget/categories/cat_groceries/rollover",
        pathParameters: { categoryId: "cat_groceries" },
        body: JSON.stringify({ groupType: "expenses", rolloverEnabled: true }),
        requestContext: { authorizer: { claims: { sub: "user_123" } } },
      },
      CONTEXT,
    );
    expect(noMonth.statusCode).toBe(400);

    const noGroupType = await handler(
      {
        httpMethod: "PUT",
        path: "/budget/categories/cat_groceries/rollover",
        pathParameters: { categoryId: "cat_groceries" },
        body: JSON.stringify({ month: "2026-02", rolloverEnabled: true }),
        requestContext: { authorizer: { claims: { sub: "user_123" } } },
      },
      CONTEXT,
    );
    expect(noGroupType.statusCode).toBe(400);

    expect(dynamoHelpers.updateItem).not.toHaveBeenCalled();
  });
});
