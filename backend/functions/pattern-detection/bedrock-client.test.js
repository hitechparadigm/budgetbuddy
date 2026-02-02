/**
 * AWS Bedrock Client Tests
 *
 * Unit tests for Bedrock client with retry logic and cost monitoring.
 */

const {
  callBedrock,
  validateJsonResponse,
  callBedrockWithValidation,
  estimateCost,
  estimateInputTokens,
  isRetryableError,
  calculateBackoffDelay,
  MODEL_ID,
  MAX_RETRIES,
  INITIAL_RETRY_DELAY_MS,
  COST_WARNING_THRESHOLD,
} = require("./bedrock-client");

// Mock AWS SDK
jest.mock("@aws-sdk/client-bedrock-runtime");

const {
  BedrockRuntimeClient,
  InvokeModelCommand,
} = require("@aws-sdk/client-bedrock-runtime");

describe("AWS Bedrock Client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    console.warn.mockRestore();
    console.error.mockRestore();
  });

  describe("estimateInputTokens", () => {
    it("should estimate tokens from prompt", () => {
      const prompt = "This is a test prompt with some text";
      const tokens = estimateInputTokens(prompt);
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBe(Math.ceil(prompt.length / 4));
    });

    it("should handle empty prompt", () => {
      const tokens = estimateInputTokens("");
      expect(tokens).toBe(0);
    });

    it("should handle long prompts", () => {
      const prompt = "a".repeat(10000);
      const tokens = estimateInputTokens(prompt);
      expect(tokens).toBe(2500); // 10000 / 4
    });
  });

  describe("estimateCost", () => {
    it("should calculate cost correctly", () => {
      const cost = estimateCost(1000, 1000);
      // (1000/1000 * 0.003) + (1000/1000 * 0.015) = 0.003 + 0.015 = 0.018
      expect(cost).toBeCloseTo(0.018, 4);
    });

    it("should handle zero tokens", () => {
      const cost = estimateCost(0, 0);
      expect(cost).toBe(0);
    });

    it("should calculate cost for large token counts", () => {
      const cost = estimateCost(10000, 5000);
      // (10000/1000 * 0.003) + (5000/1000 * 0.015) = 0.03 + 0.075 = 0.105
      expect(cost).toBeCloseTo(0.105, 4);
    });
  });

  describe("calculateBackoffDelay", () => {
    it("should calculate exponential backoff", () => {
      expect(calculateBackoffDelay(0)).toBe(1000); // 1s
      expect(calculateBackoffDelay(1)).toBe(2000); // 2s
      expect(calculateBackoffDelay(2)).toBe(4000); // 4s
      expect(calculateBackoffDelay(3)).toBe(8000); // 8s (max)
    });

    it("should cap at maximum delay", () => {
      expect(calculateBackoffDelay(10)).toBe(8000); // Still 8s
    });
  });

  describe("isRetryableError", () => {
    it("should identify throttling errors as retryable", () => {
      const error = { name: "ThrottlingException" };
      expect(isRetryableError(error)).toBe(true);
    });

    it("should identify service unavailable errors as retryable", () => {
      const error = { name: "ServiceUnavailableException" };
      expect(isRetryableError(error)).toBe(true);
    });

    it("should identify internal server errors as retryable", () => {
      const error = { name: "InternalServerException" };
      expect(isRetryableError(error)).toBe(true);
    });

    it("should identify 5xx HTTP errors as retryable", () => {
      const error = { $metadata: { httpStatusCode: 503 } };
      expect(isRetryableError(error)).toBe(true);
    });

    it("should identify timeout errors as retryable", () => {
      const error = { code: "ETIMEDOUT" };
      expect(isRetryableError(error)).toBe(true);
    });

    it("should not retry 4xx errors", () => {
      const error = { $metadata: { httpStatusCode: 400 } };
      expect(isRetryableError(error)).toBe(false);
    });

    it("should not retry validation errors", () => {
      const error = { name: "ValidationException" };
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe("validateJsonResponse", () => {
    it("should validate valid JSON array", () => {
      const json = '[{"key": "value"}]';
      const schema = { type: "array" };
      const result = validateJsonResponse(json, schema);
      expect(result.isValid).toBe(true);
      expect(result.parsed).toEqual([{ key: "value" }]);
    });

    it("should validate valid JSON object", () => {
      const json = '{"key": "value"}';
      const schema = { type: "object" };
      const result = validateJsonResponse(json, schema);
      expect(result.isValid).toBe(true);
      expect(result.parsed).toEqual({ key: "value" });
    });

    it("should detect type mismatch (array vs object)", () => {
      const json = '{"key": "value"}';
      const schema = { type: "array" };
      const result = validateJsonResponse(json, schema);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Expected array");
    });

    it("should detect type mismatch (object vs array)", () => {
      const json = '[{"key": "value"}]';
      const schema = { type: "object" };
      const result = validateJsonResponse(json, schema);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Expected object");
    });

    it("should validate required fields in array", () => {
      const json = '[{"name": "test", "value": 123}]';
      const schema = {
        type: "array",
        requiredFields: ["name", "value"],
      };
      const result = validateJsonResponse(json, schema);
      expect(result.isValid).toBe(true);
    });

    it("should detect missing required fields in array", () => {
      const json = '[{"name": "test"}]';
      const schema = {
        type: "array",
        requiredFields: ["name", "value"],
      };
      const result = validateJsonResponse(json, schema);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Missing required fields: value");
    });

    it("should validate required fields in object", () => {
      const json = '{"name": "test", "value": 123}';
      const schema = {
        type: "object",
        requiredFields: ["name", "value"],
      };
      const result = validateJsonResponse(json, schema);
      expect(result.isValid).toBe(true);
    });

    it("should detect missing required fields in object", () => {
      const json = '{"name": "test"}';
      const schema = {
        type: "object",
        requiredFields: ["name", "value"],
      };
      const result = validateJsonResponse(json, schema);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Missing required fields: value");
    });

    it("should handle invalid JSON", () => {
      const json = "not valid json";
      const result = validateJsonResponse(json);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Invalid JSON");
    });

    it("should handle empty array", () => {
      const json = "[]";
      const schema = { type: "array", requiredFields: ["name"] };
      const result = validateJsonResponse(json, schema);
      expect(result.isValid).toBe(true); // Empty array is valid
    });
  });

  describe("callBedrock", () => {
    it("should call Bedrock successfully", async () => {
      const mockResponse = {
        body: new TextEncoder().encode(
          JSON.stringify({
            content: [{ text: '{"result": "success"}' }],
            usage: { input_tokens: 100, output_tokens: 50 },
          }),
        ),
      };

      const mockSend = jest.fn().mockResolvedValue(mockResponse);
      BedrockRuntimeClient.prototype.send = mockSend;

      const result = await callBedrock("test prompt");

      expect(result.text).toBe('{"result": "success"}');
      expect(result.inputTokens).toBe(100);
      expect(result.outputTokens).toBe(50);
      expect(result.cost).toBeGreaterThan(0);
      expect(result.attempt).toBe(1);
    });

    it("should retry on transient errors", async () => {
      const mockError = {
        name: "ThrottlingException",
        message: "Rate exceeded",
      };

      const mockResponse = {
        body: new TextEncoder().encode(
          JSON.stringify({
            content: [{ text: '{"result": "success"}' }],
            usage: { input_tokens: 100, output_tokens: 50 },
          }),
        ),
      };

      const mockSend = jest
        .fn()
        .mockRejectedValueOnce(mockError)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(mockResponse);

      BedrockRuntimeClient.prototype.send = mockSend;

      const result = await callBedrock("test prompt");

      expect(mockSend).toHaveBeenCalledTimes(3);
      expect(result.attempt).toBe(3);
    });

    it("should fail after max retries", async () => {
      const mockError = {
        name: "ThrottlingException",
        message: "Rate exceeded",
      };

      const mockSend = jest.fn().mockRejectedValue(mockError);
      BedrockRuntimeClient.prototype.send = mockSend;

      await expect(
        callBedrock("test prompt", { maxRetries: 1 }),
      ).rejects.toThrow("Bedrock API call failed");

      expect(mockSend).toHaveBeenCalledTimes(2); // 1 initial + 1 retry
    }, 10000); // Increase timeout to 10 seconds

    it("should not retry non-retryable errors", async () => {
      const mockError = {
        name: "ValidationException",
        message: "Invalid input",
      };

      const mockSend = jest.fn().mockRejectedValue(mockError);
      BedrockRuntimeClient.prototype.send = mockSend;

      await expect(callBedrock("test prompt")).rejects.toThrow(
        "Bedrock API call failed",
      );

      expect(mockSend).toHaveBeenCalledTimes(1); // No retries
    });

    it("should log warning for high cost", async () => {
      const mockResponse = {
        body: new TextEncoder().encode(
          JSON.stringify({
            content: [{ text: '{"result": "success"}' }],
            usage: { input_tokens: 10000, output_tokens: 10000 },
          }),
        ),
      };

      const mockSend = jest.fn().mockResolvedValue(mockResponse);
      BedrockRuntimeClient.prototype.send = mockSend;

      await callBedrock("test prompt");

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("Cost warning"),
      );
    });

    it("should use custom options", async () => {
      const mockResponse = {
        body: new TextEncoder().encode(
          JSON.stringify({
            content: [{ text: '{"result": "success"}' }],
            usage: { input_tokens: 100, output_tokens: 50 },
          }),
        ),
      };

      const mockSend = jest.fn().mockResolvedValue(mockResponse);
      BedrockRuntimeClient.prototype.send = mockSend;

      const result = await callBedrock("test prompt", {
        temperature: 0.5,
        maxTokens: 2000,
        maxRetries: 1,
      });

      // Verify the function was called and returned successfully
      expect(mockSend).toHaveBeenCalled();
      expect(result.text).toBe('{"result": "success"}');
      expect(result.inputTokens).toBe(100);
      expect(result.outputTokens).toBe(50);
    });
  });

  describe("callBedrockWithValidation", () => {
    it("should call Bedrock and validate response", async () => {
      const mockResponse = {
        body: new TextEncoder().encode(
          JSON.stringify({
            content: [{ text: '[{"name": "test", "value": 123}]' }],
            usage: { input_tokens: 100, output_tokens: 50 },
          }),
        ),
      };

      const mockSend = jest.fn().mockResolvedValue(mockResponse);
      BedrockRuntimeClient.prototype.send = mockSend;

      const schema = {
        type: "array",
        requiredFields: ["name", "value"],
      };

      const result = await callBedrockWithValidation("test prompt", schema);

      expect(result.data).toEqual([{ name: "test", value: 123 }]);
      expect(result.inputTokens).toBe(100);
      expect(result.outputTokens).toBe(50);
    });

    it("should throw error for invalid response", async () => {
      const mockResponse = {
        body: new TextEncoder().encode(
          JSON.stringify({
            content: [{ text: '{"invalid": "response"}' }],
            usage: { input_tokens: 100, output_tokens: 50 },
          }),
        ),
      };

      const mockSend = jest.fn().mockResolvedValue(mockResponse);
      BedrockRuntimeClient.prototype.send = mockSend;

      const schema = {
        type: "array",
        requiredFields: ["name"],
      };

      await expect(
        callBedrockWithValidation("test prompt", schema),
      ).rejects.toThrow("Invalid Bedrock response");
    });
  });

  describe("Constants", () => {
    it("should export correct model ID", () => {
      expect(MODEL_ID).toBe("anthropic.claude-3-5-sonnet-20241022-v2:0");
    });

    it("should export correct retry configuration", () => {
      expect(MAX_RETRIES).toBe(3);
      expect(INITIAL_RETRY_DELAY_MS).toBe(1000);
    });

    it("should export correct cost threshold", () => {
      expect(COST_WARNING_THRESHOLD).toBe(0.1);
    });
  });
});
