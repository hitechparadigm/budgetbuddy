/**
 * Unit tests for E2E cost tracking utilities
 */

const { CostTracker, PRICING, COST_THRESHOLDS } = require("./cost-tracker");

describe("E2E Cost Tracker", () => {
  let tracker;

  beforeEach(() => {
    tracker = new CostTracker();
  });

  describe("trackDynamoDBOperation", () => {
    it("should track write operations", () => {
      tracker.trackDynamoDBOperation("write");
      tracker.trackDynamoDBOperation("write");

      expect(tracker.operations.dynamodbWrites).toBe(2);
      expect(tracker.operations.dynamodbReads).toBe(0);
    });

    it("should track read operations", () => {
      tracker.trackDynamoDBOperation("read");
      tracker.trackDynamoDBOperation("read");
      tracker.trackDynamoDBOperation("read");

      expect(tracker.operations.dynamodbReads).toBe(3);
      expect(tracker.operations.dynamodbWrites).toBe(0);
    });

    it("should track mixed operations", () => {
      tracker.trackDynamoDBOperation("write");
      tracker.trackDynamoDBOperation("read");
      tracker.trackDynamoDBOperation("write");

      expect(tracker.operations.dynamodbWrites).toBe(2);
      expect(tracker.operations.dynamodbReads).toBe(1);
    });
  });

  describe("trackLambdaInvocation", () => {
    it("should track Lambda invocations", () => {
      tracker.trackLambdaInvocation();
      tracker.trackLambdaInvocation();
      tracker.trackLambdaInvocation();

      expect(tracker.operations.lambdaInvocations).toBe(3);
    });
  });

  describe("trackCognitoOperation", () => {
    it("should track Cognito operations", () => {
      tracker.trackCognitoOperation();
      tracker.trackCognitoOperation();

      expect(tracker.operations.cognitoOperations).toBe(2);
    });
  });

  describe("calculateEstimatedCost", () => {
    it("should calculate cost for DynamoDB writes", () => {
      tracker.trackDynamoDBOperation("write");
      tracker.trackDynamoDBOperation("write");

      const cost = tracker.calculateEstimatedCost();

      expect(cost.dynamodbWriteCost).toBe(2 * PRICING.dynamodb.writeRequest);
      expect(cost.totalCost).toBe(2 * PRICING.dynamodb.writeRequest);
    });

    it("should calculate cost for DynamoDB reads", () => {
      tracker.trackDynamoDBOperation("read");
      tracker.trackDynamoDBOperation("read");
      tracker.trackDynamoDBOperation("read");

      const cost = tracker.calculateEstimatedCost();

      expect(cost.dynamodbReadCost).toBe(3 * PRICING.dynamodb.readRequest);
      expect(cost.totalCost).toBe(3 * PRICING.dynamodb.readRequest);
    });

    it("should calculate cost for Lambda invocations", () => {
      tracker.trackLambdaInvocation();
      tracker.trackLambdaInvocation();

      const cost = tracker.calculateEstimatedCost();

      expect(cost.lambdaCost).toBe(2 * PRICING.lambda.invocation);
      expect(cost.totalCost).toBe(2 * PRICING.lambda.invocation);
    });

    it("should calculate cost for Cognito operations", () => {
      tracker.trackCognitoOperation();
      tracker.trackCognitoOperation();

      const cost = tracker.calculateEstimatedCost();

      expect(cost.cognitoCost).toBe(2 * PRICING.cognito.operation);
      expect(cost.totalCost).toBe(2 * PRICING.cognito.operation);
    });

    it("should calculate total cost for mixed operations", () => {
      tracker.trackDynamoDBOperation("write");
      tracker.trackDynamoDBOperation("read");
      tracker.trackLambdaInvocation();
      tracker.trackCognitoOperation();

      const cost = tracker.calculateEstimatedCost();

      const expectedTotal =
        PRICING.dynamodb.writeRequest +
        PRICING.dynamodb.readRequest +
        PRICING.lambda.invocation +
        PRICING.cognito.operation;

      expect(cost.totalCost).toBeCloseTo(expectedTotal, 10);
    });

    it("should include operation counts in result", () => {
      tracker.trackDynamoDBOperation("write");
      tracker.trackLambdaInvocation();

      const cost = tracker.calculateEstimatedCost();

      expect(cost.operations.dynamodbWrites).toBe(1);
      expect(cost.operations.lambdaInvocations).toBe(1);
    });
  });

  describe("checkCostThresholds", () => {
    it("should pass when cost is within per-test threshold", () => {
      const result = tracker.checkCostThresholds(0.05, "perTest");

      expect(result.withinThreshold).toBe(true);
      expect(result.cost).toBe(0.05);
      expect(result.threshold).toBe(COST_THRESHOLDS.perTest);
    });

    it("should fail when cost exceeds per-test threshold", () => {
      const result = tracker.checkCostThresholds(0.15, "perTest");

      expect(result.withinThreshold).toBe(false);
      expect(result.cost).toBe(0.15);
      expect(result.threshold).toBe(COST_THRESHOLDS.perTest);
    });

    it("should pass when cost is within daily threshold", () => {
      const result = tracker.checkCostThresholds(3.0, "daily");

      expect(result.withinThreshold).toBe(true);
      expect(result.threshold).toBe(COST_THRESHOLDS.daily);
    });

    it("should fail when cost exceeds daily threshold", () => {
      const result = tracker.checkCostThresholds(6.0, "daily");

      expect(result.withinThreshold).toBe(false);
      expect(result.threshold).toBe(COST_THRESHOLDS.daily);
    });

    it("should pass when cost is within monthly threshold", () => {
      const result = tracker.checkCostThresholds(80.0, "monthly");

      expect(result.withinThreshold).toBe(true);
      expect(result.threshold).toBe(COST_THRESHOLDS.monthly);
    });

    it("should fail when cost exceeds monthly threshold", () => {
      const result = tracker.checkCostThresholds(120.0, "monthly");

      expect(result.withinThreshold).toBe(false);
      expect(result.threshold).toBe(COST_THRESHOLDS.monthly);
    });

    it("should throw error for invalid threshold type", () => {
      expect(() => {
        tracker.checkCostThresholds(1.0, "invalid");
      }).toThrow("Invalid threshold type: invalid");
    });

    it("should include descriptive message", () => {
      const passResult = tracker.checkCostThresholds(0.05, "perTest");
      expect(passResult.message).toContain("within");

      const failResult = tracker.checkCostThresholds(0.15, "perTest");
      expect(failResult.message).toContain("exceeds");
    });
  });

  describe("reset", () => {
    it("should reset all operation counters", () => {
      tracker.trackDynamoDBOperation("write");
      tracker.trackDynamoDBOperation("read");
      tracker.trackLambdaInvocation();
      tracker.trackCognitoOperation();

      expect(tracker.operations.dynamodbWrites).toBe(1);
      expect(tracker.operations.dynamodbReads).toBe(1);
      expect(tracker.operations.lambdaInvocations).toBe(1);
      expect(tracker.operations.cognitoOperations).toBe(1);

      tracker.reset();

      expect(tracker.operations.dynamodbWrites).toBe(0);
      expect(tracker.operations.dynamodbReads).toBe(0);
      expect(tracker.operations.lambdaInvocations).toBe(0);
      expect(tracker.operations.cognitoOperations).toBe(0);
    });
  });

  describe("getSummary", () => {
    it("should return complete summary", () => {
      tracker.trackDynamoDBOperation("write");
      tracker.trackLambdaInvocation();

      const summary = tracker.getSummary();

      expect(summary.operations).toBeDefined();
      expect(summary.cost).toBeDefined();
      expect(summary.withinThreshold).toBeDefined();
      expect(summary.thresholdCheck).toBeDefined();
    });

    it("should indicate when within threshold", () => {
      // Very small operations - should be within threshold
      tracker.trackDynamoDBOperation("write");

      const summary = tracker.getSummary();

      expect(summary.withinThreshold).toBe(true);
    });

    it("should include threshold check details", () => {
      tracker.trackDynamoDBOperation("write");

      const summary = tracker.getSummary();

      expect(summary.thresholdCheck.thresholdType).toBe("perTest");
      expect(summary.thresholdCheck.threshold).toBe(COST_THRESHOLDS.perTest);
    });
  });

  describe("PRICING constants", () => {
    it("should have DynamoDB pricing", () => {
      expect(PRICING.dynamodb.writeRequest).toBeDefined();
      expect(PRICING.dynamodb.readRequest).toBeDefined();
    });

    it("should have Lambda pricing", () => {
      expect(PRICING.lambda.invocation).toBeDefined();
      expect(PRICING.lambda.gbSecond).toBeDefined();
    });

    it("should have Cognito pricing", () => {
      expect(PRICING.cognito.mau).toBeDefined();
      expect(PRICING.cognito.operation).toBeDefined();
    });
  });

  describe("COST_THRESHOLDS constants", () => {
    it("should have correct threshold values", () => {
      expect(COST_THRESHOLDS.perTest).toBe(0.1);
      expect(COST_THRESHOLDS.daily).toBe(5.0);
      expect(COST_THRESHOLDS.monthly).toBe(100.0);
    });
  });
});
