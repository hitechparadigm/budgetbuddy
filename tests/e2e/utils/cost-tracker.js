/**
 * E2E Cost Tracking Utilities
 *
 * Tracks and estimates AWS costs for E2E tests:
 * - DynamoDB operations
 * - Lambda invocations
 * - Cognito operations
 * - Cost threshold checking
 *
 * Cost thresholds:
 * - Per-test: < $0.10
 * - Daily: < $5
 * - Monthly: < $100
 */

/**
 * AWS service pricing (approximate, us-east-1)
 */
const PRICING = {
  dynamodb: {
    writeRequest: 0.00000125, // $1.25 per million writes
    readRequest: 0.00000025, // $0.25 per million reads
  },
  lambda: {
    invocation: 0.0000002, // $0.20 per million invocations
    gbSecond: 0.0000166667, // $0.0000166667 per GB-second
  },
  cognito: {
    mau: 0.0055, // $0.0055 per MAU (Monthly Active User)
    operation: 0.00001, // Approximate per operation
  },
};

/**
 * Cost thresholds (in dollars)
 */
const COST_THRESHOLDS = {
  perTest: 0.1, // $0.10
  daily: 5.0, // $5.00
  monthly: 100.0, // $100.00
};

/**
 * CostTracker class for E2E tests
 */
class CostTracker {
  constructor() {
    this.operations = {
      dynamodbWrites: 0,
      dynamodbReads: 0,
      lambdaInvocations: 0,
      cognitoOperations: 0,
    };
  }

  /**
   * Track a DynamoDB operation
   * @param {string} type - Operation type ('read' or 'write')
   * @returns {void}
   */
  trackDynamoDBOperation(type) {
    if (type === "write") {
      this.operations.dynamodbWrites++;
    } else if (type === "read") {
      this.operations.dynamodbReads++;
    }
  }

  /**
   * Track a Lambda invocation
   * @returns {void}
   */
  trackLambdaInvocation() {
    this.operations.lambdaInvocations++;
  }

  /**
   * Track a Cognito operation
   * @returns {void}
   */
  trackCognitoOperation() {
    this.operations.cognitoOperations++;
  }

  /**
   * Calculate estimated cost
   * @returns {Object} Cost breakdown
   */
  calculateEstimatedCost() {
    const dynamodbWriteCost =
      this.operations.dynamodbWrites * PRICING.dynamodb.writeRequest;
    const dynamodbReadCost =
      this.operations.dynamodbReads * PRICING.dynamodb.readRequest;
    const lambdaCost =
      this.operations.lambdaInvocations * PRICING.lambda.invocation;
    const cognitoCost =
      this.operations.cognitoOperations * PRICING.cognito.operation;

    const totalCost =
      dynamodbWriteCost + dynamodbReadCost + lambdaCost + cognitoCost;

    return {
      dynamodbWriteCost,
      dynamodbReadCost,
      lambdaCost,
      cognitoCost,
      totalCost,
      operations: { ...this.operations },
    };
  }

  /**
   * Check if cost is within thresholds
   * @param {number} cost - Cost to check
   * @param {string} threshold - Threshold type ('perTest', 'daily', 'monthly')
   * @returns {Object} Threshold check result
   */
  checkCostThresholds(cost, threshold = "perTest") {
    const thresholdValue = COST_THRESHOLDS[threshold];

    if (!thresholdValue) {
      throw new Error(`Invalid threshold type: ${threshold}`);
    }

    const withinThreshold = cost <= thresholdValue;

    return {
      withinThreshold,
      cost,
      threshold: thresholdValue,
      thresholdType: threshold,
      message: withinThreshold
        ? `Cost $${cost.toFixed(4)} is within ${threshold} threshold $${thresholdValue}`
        : `Cost $${cost.toFixed(4)} exceeds ${threshold} threshold $${thresholdValue}`,
    };
  }

  /**
   * Reset operation counters
   * @returns {void}
   */
  reset() {
    this.operations = {
      dynamodbWrites: 0,
      dynamodbReads: 0,
      lambdaInvocations: 0,
      cognitoOperations: 0,
    };
  }

  /**
   * Get operation summary
   * @returns {Object} Operation summary
   */
  getSummary() {
    const cost = this.calculateEstimatedCost();
    const perTestCheck = this.checkCostThresholds(cost.totalCost, "perTest");

    return {
      operations: { ...this.operations },
      cost,
      withinThreshold: perTestCheck.withinThreshold,
      thresholdCheck: perTestCheck,
    };
  }
}

module.exports = {
  CostTracker,
  PRICING,
  COST_THRESHOLDS,
};
