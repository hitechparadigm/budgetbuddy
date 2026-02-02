/**
 * AWS Bedrock Client
 *
 * Client for interacting with AWS Bedrock (Claude 3.5 Sonnet) with retry logic,
 * response validation, and cost monitoring.
 */

const {
  BedrockRuntimeClient,
  InvokeModelCommand,
} = require("@aws-sdk/client-bedrock-runtime");

// Claude 3.5 Sonnet model ID
const MODEL_ID = "anthropic.claude-3-5-sonnet-20241022-v2:0";

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000; // 1 second
const MAX_RETRY_DELAY_MS = 8000; // 8 seconds

// Cost monitoring
const COST_PER_1K_INPUT_TOKENS = 0.003; // $0.003 per 1K input tokens
const COST_PER_1K_OUTPUT_TOKENS = 0.015; // $0.015 per 1K output tokens
const COST_WARNING_THRESHOLD = 0.1; // $0.10

/**
 * Create Bedrock Runtime client
 * @param {string} region - AWS region (default: us-east-1)
 * @returns {BedrockRuntimeClient} Bedrock client
 */
function createBedrockClient(region = "us-east-1") {
  return new BedrockRuntimeClient({ region });
}

/**
 * Calculate exponential backoff delay
 * @param {number} attempt - Retry attempt number (0-indexed)
 * @returns {number} Delay in milliseconds
 */
function calculateBackoffDelay(attempt) {
  const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
  return Math.min(delay, MAX_RETRY_DELAY_MS);
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable (transient)
 * @param {Error} error - Error object
 * @returns {boolean} True if error is retryable
 */
function isRetryableError(error) {
  // Retry on 5xx errors, timeouts, and throttling
  if (error.name === "ThrottlingException") {
    return true;
  }
  if (error.name === "ServiceUnavailableException") {
    return true;
  }
  if (error.name === "InternalServerException") {
    return true;
  }
  if (error.$metadata && error.$metadata.httpStatusCode >= 500) {
    return true;
  }
  if (error.code === "ETIMEDOUT" || error.code === "ECONNRESET") {
    return true;
  }
  return false;
}

/**
 * Estimate cost of Bedrock API call
 * @param {number} inputTokens - Number of input tokens
 * @param {number} outputTokens - Number of output tokens
 * @returns {number} Estimated cost in dollars
 */
function estimateCost(inputTokens, outputTokens) {
  const inputCost = (inputTokens / 1000) * COST_PER_1K_INPUT_TOKENS;
  const outputCost = (outputTokens / 1000) * COST_PER_1K_OUTPUT_TOKENS;
  return inputCost + outputCost;
}

/**
 * Estimate input tokens from prompt (rough approximation: 1 token ≈ 4 characters)
 * @param {string} prompt - Input prompt
 * @returns {number} Estimated input tokens
 */
function estimateInputTokens(prompt) {
  return Math.ceil(prompt.length / 4);
}

/**
 * Call AWS Bedrock with retry logic and exponential backoff
 * @param {string} prompt - Input prompt for Claude
 * @param {Object} options - Call options
 * @returns {Promise<Object>} Response from Bedrock
 */
async function callBedrock(prompt, options = {}) {
  const {
    maxRetries = MAX_RETRIES,
    temperature = 0.1, // Low temperature for consistent, factual responses
    maxTokens = 4096,
    region = "us-east-1",
  } = options;

  const client = createBedrockClient(region);

  // Estimate input tokens for cost monitoring
  const estimatedInputTokens = estimateInputTokens(prompt);

  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Prepare request body for Claude 3.5 Sonnet
      const requestBody = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: maxTokens,
        temperature,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      };

      // Create invoke command
      const command = new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(requestBody),
      });

      // Invoke model
      const startTime = Date.now();
      const response = await client.send(command);
      const endTime = Date.now();

      // Parse response
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      // Extract text from response
      const text =
        responseBody.content && responseBody.content[0]
          ? responseBody.content[0].text
          : "";

      // Get token usage
      const inputTokens =
        responseBody.usage?.input_tokens || estimatedInputTokens;
      const outputTokens = responseBody.usage?.output_tokens || 0;

      // Calculate cost
      const cost = estimateCost(inputTokens, outputTokens);

      // Log warning if cost exceeds threshold
      if (cost > COST_WARNING_THRESHOLD) {
        console.warn(
          `[Bedrock] Cost warning: $${cost.toFixed(4)} (input: ${inputTokens} tokens, output: ${outputTokens} tokens)`,
        );
      }

      // Log successful call
      console.log(
        `[Bedrock] Success: ${endTime - startTime}ms, cost: $${cost.toFixed(4)}, attempt: ${attempt + 1}/${maxRetries + 1}`,
      );

      return {
        text,
        inputTokens,
        outputTokens,
        cost,
        latencyMs: endTime - startTime,
        attempt: attempt + 1,
      };
    } catch (error) {
      lastError = error;

      // Log error
      console.error(
        `[Bedrock] Error on attempt ${attempt + 1}/${maxRetries + 1}:`,
        error.message,
      );

      // Check if we should retry
      if (attempt < maxRetries && isRetryableError(error)) {
        const delay = calculateBackoffDelay(attempt);
        console.log(`[Bedrock] Retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      // No more retries or non-retryable error
      break;
    }
  }

  // All retries exhausted or non-retryable error
  throw new Error(
    `Bedrock API call failed after ${maxRetries + 1} attempts: ${lastError.message}`,
  );
}

/**
 * Validate JSON response against expected schema
 * @param {string} jsonString - JSON string to validate
 * @param {Object} schema - Expected schema (simplified validation)
 * @returns {Object} Validation result
 */
function validateJsonResponse(jsonString, schema = {}) {
  try {
    const parsed = JSON.parse(jsonString);

    // Check if it's an array or object as expected
    if (schema.type === "array" && !Array.isArray(parsed)) {
      return {
        isValid: false,
        error: "Expected array but got object",
        parsed: null,
      };
    }

    if (schema.type === "object" && Array.isArray(parsed)) {
      return {
        isValid: false,
        error: "Expected object but got array",
        parsed: null,
      };
    }

    // Check required fields (simplified)
    if (schema.requiredFields && Array.isArray(schema.requiredFields)) {
      const missingFields = [];

      if (Array.isArray(parsed)) {
        // For arrays, check first element
        if (parsed.length > 0) {
          const firstItem = parsed[0];
          for (const field of schema.requiredFields) {
            if (!(field in firstItem)) {
              missingFields.push(field);
            }
          }
        }
      } else {
        // For objects, check directly
        for (const field of schema.requiredFields) {
          if (!(field in parsed)) {
            missingFields.push(field);
          }
        }
      }

      if (missingFields.length > 0) {
        return {
          isValid: false,
          error: `Missing required fields: ${missingFields.join(", ")}`,
          parsed: null,
        };
      }
    }

    return {
      isValid: true,
      error: null,
      parsed,
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Invalid JSON: ${error.message}`,
      parsed: null,
    };
  }
}

/**
 * Call Bedrock and validate response
 * @param {string} prompt - Input prompt
 * @param {Object} schema - Expected response schema
 * @param {Object} options - Call options
 * @returns {Promise<Object>} Validated response
 */
async function callBedrockWithValidation(prompt, schema, options = {}) {
  const response = await callBedrock(prompt, options);

  // Validate response
  const validation = validateJsonResponse(response.text, schema);

  if (!validation.isValid) {
    throw new Error(`Invalid Bedrock response: ${validation.error}`);
  }

  return {
    ...response,
    data: validation.parsed,
  };
}

module.exports = {
  callBedrock,
  validateJsonResponse,
  callBedrockWithValidation,
  estimateCost,
  estimateInputTokens,
  isRetryableError,
  calculateBackoffDelay,
  // Export constants for testing
  MODEL_ID,
  MAX_RETRIES,
  INITIAL_RETRY_DELAY_MS,
  COST_WARNING_THRESHOLD,
};
