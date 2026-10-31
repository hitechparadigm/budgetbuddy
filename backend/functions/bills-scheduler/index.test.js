/**
 * Unit tests for the bill notification scheduler
 */

jest.mock(
  "/opt/nodejs/utils",
  () => ({
    dynamoHelpers: {
      queryByGSI: jest.fn(),
      queryByPK: jest.fn(),
      putItem: jest.fn(),
      updateItem: jest.fn(),
    },
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  }),
  { virtual: true },
);

const { dynamoHelpers } = require("/opt/nodejs/utils");
const { handler } = require("./index");

const context = { awsRequestId: "req-1" };

function isoDate(daysFromToday) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString().split("T")[0];
}

function bill(billId, dueDate, overrides = {}) {
  return {
    PK: "BUDGET#budget-1",
    SK: `BILL#${billId}`,
    GSI1PK: `BILLS#${dueDate.substring(0, 7)}`,
    GSI1SK: `${dueDate}#${billId}`,
    entityType: "BILL",
    billId,
    budgetId: "budget-1",
    name: `Bill ${billId}`,
    amount: 100,
    dueDate,
    status: "unpaid",
    remindersSent: [],
    ...overrides,
  };
}

describe("bills-scheduler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dynamoHelpers.queryByGSI.mockResolvedValue([]);
    dynamoHelpers.queryByPK.mockResolvedValue([
      { SK: "MEMBER#user-1", userId: "user-1", status: "active" },
      { SK: "MEMBER#user-2", userId: "user-2", status: "active" },
      { SK: "MEMBER#user-3", userId: "user-3", status: "expired" },
    ]);
    dynamoHelpers.putItem.mockResolvedValue(undefined);
    dynamoHelpers.updateItem.mockResolvedValue({});
  });

  it("queries GSI1 for the previous, current and next month instead of scanning", async () => {
    await handler({}, context);

    const now = new Date();
    const month = (offset) =>
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1))
        .toISOString()
        .slice(0, 7);

    expect(dynamoHelpers.queryByGSI).toHaveBeenCalledTimes(3);
    const partitions = dynamoHelpers.queryByGSI.mock.calls.map(([index, pk]) => `${index}:${pk}`);
    expect(partitions).toEqual([
      `GSI1:BILLS#${month(-1)}`,
      `GSI1:BILLS#${month(0)}`,
      `GSI1:BILLS#${month(1)}`,
    ]);
    expect(dynamoHelpers.queryByGSI.mock.calls[0][2]).toEqual(
      expect.objectContaining({
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":entityType": "BILL", ":paid": "paid", ":false": false },
      }),
    );
  });

  it("writes one USER#-keyed notification per active member and no FAMILY# keys", async () => {
    const dueToday = bill("bill-1", isoDate(0));
    dynamoHelpers.queryByGSI.mockResolvedValueOnce([]).mockResolvedValueOnce([dueToday]);

    const result = await handler({}, context);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.results.dueToday.sent).toBe(1);

    expect(dynamoHelpers.queryByPK).toHaveBeenCalledWith(
      "BUDGET#budget-1",
      expect.objectContaining({ ExpressionAttributeValues: { ":sk": "MEMBER#" } }),
    );

    const items = dynamoHelpers.putItem.mock.calls.map(([item]) => item);
    expect(items.map((item) => item.PK)).toEqual(["USER#user-1", "USER#user-2"]);
    items.forEach((item) => {
      expect(item.SK).toMatch(/^NOTIFICATION#\d+_bill-1$/);
      expect(item.reminderType).toBe("due-today");
      expect(item.read).toBe(false);
      expect(JSON.stringify(item)).not.toContain("FAMILY#");
      expect(item).not.toHaveProperty("familyId");
    });

    expect(dynamoHelpers.updateItem).toHaveBeenCalledWith(
      "BUDGET#budget-1",
      "BILL#bill-1",
      expect.objectContaining({ remindersSent: ["due-today"] }),
    );
  });

  it("skips reminders that were already sent", async () => {
    const dueInSeven = bill("bill-2", isoDate(7), { remindersSent: ["7-day"] });
    dynamoHelpers.queryByGSI.mockResolvedValue([]);
    dynamoHelpers.queryByGSI.mockResolvedValueOnce([dueInSeven]);

    const result = await handler({}, context);

    expect(JSON.parse(result.body).totalSent).toBe(0);
    expect(dynamoHelpers.putItem).not.toHaveBeenCalled();
  });
});
