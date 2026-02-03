/**
 * Log Sanitizer Tests
 *
 * Tests for the logging sanitization utility.
 */

const {
  sanitizeLogData,
  sanitizeObject,
  sanitizeValue,
  sanitizeError,
  createSanitizedLogger,
  SENSITIVE_FIELDS,
  FIELDS_TO_REMOVE,
} = require("./log-sanitizer");

describe("Log Sanitizer", () => {
  describe("sanitizeValue", () => {
    test("should redact amount fields", () => {
      expect(sanitizeValue("amount", 150.99)).toBe("[AMOUNT_REDACTED]");
      expect(sanitizeValue("averageAmount", 200)).toBe("[AMOUNT_REDACTED]");
      expect(sanitizeValue("paidAmount", 50.5)).toBe("[AMOUNT_REDACTED]");
    });

    test("should mask merchant names", () => {
      const result = sanitizeValue("merchantName", "Netflix Inc");
      expect(result).toBe("Ne****nc");
    });

    test("should completely redact account numbers", () => {
      expect(sanitizeValue("accountNumber", "1234567890")).toBe("[REDACTED]");
      expect(sanitizeValue("ssn", "123-45-6789")).toBe("[REDACTED]");
    });

    test("should mask short strings", () => {
      expect(sanitizeValue("merchantName", "ABC")).toBe("****");
    });

    test("should redact arrays", () => {
      const result = sanitizeValue("occurrences", [1, 2, 3]);
      expect(result).toBe("[ARRAY_REDACTED:3_items]");
    });

    test("should redact objects", () => {
      const result = sanitizeValue("paymentHistory", { date: "2024-01-01" });
      expect(result).toBe("[OBJECT_REDACTED]");
    });

    test("should not sanitize non-sensitive fields", () => {
      expect(sanitizeValue("userId", "user123")).toBe("user123");
      expect(sanitizeValue("status", "pending")).toBe("pending");
    });
  });

  describe("sanitizeObject", () => {
    test("should sanitize sensitive fields in object", () => {
      const input = {
        userId: "user123",
        amount: 150.99,
        merchantName: "Netflix Inc",
        status: "pending",
      };

      const result = sanitizeObject(input);

      expect(result.userId).toBe("user123");
      expect(result.amount).toBe("[AMOUNT_REDACTED]");
      expect(result.merchantName).toBe("Ne****nc");
      expect(result.status).toBe("pending");
    });

    test("should handle nested objects", () => {
      const input = {
        pattern: {
          merchantName: "Spotify",
          averageAmount: 9.99,
        },
        familyId: "family123",
      };

      const result = sanitizeObject(input);

      expect(result.familyId).toBe("family123");
      expect(result.pattern.merchantName).toBe("Sp****fy");
      expect(result.pattern.averageAmount).toBe("[AMOUNT_REDACTED]");
    });

    test("should handle arrays of objects", () => {
      const input = {
        patterns: [
          { merchantName: "Netflix", amount: 15.99 },
          { merchantName: "Spotify", amount: 9.99 },
        ],
      };

      const result = sanitizeObject(input);

      expect(result.patterns[0].merchantName).toBe("Ne****ix");
      expect(result.patterns[0].amount).toBe("[AMOUNT_REDACTED]");
    });

    test("should handle null and undefined", () => {
      expect(sanitizeObject(null)).toBe(null);
      expect(sanitizeObject(undefined)).toBe(undefined);
    });

    test("should respect max depth", () => {
      const deepObject = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  level6: {
                    amount: 100,
                  },
                },
              },
            },
          },
        },
      };

      const result = sanitizeObject(deepObject, 0, 5);
      expect(result.level1.level2.level3.level4.level5.level6).toBe(
        "[MAX_DEPTH_REACHED]",
      );
    });
  });

  describe("sanitizeLogData", () => {
    test("should sanitize object data", () => {
      const input = {
        userId: "user123",
        amount: 150.99,
      };

      const result = sanitizeLogData(input);

      expect(result.userId).toBe("user123");
      expect(result.amount).toBe("[AMOUNT_REDACTED]");
    });

    test("should sanitize JSON string data", () => {
      const input = JSON.stringify({
        merchantName: "Netflix",
        amount: 15.99,
      });

      const result = sanitizeLogData(input);
      const parsed = JSON.parse(result);

      expect(parsed.merchantName).toBe("Ne****ix");
      expect(parsed.amount).toBe("[AMOUNT_REDACTED]");
    });

    test("should return non-JSON strings as-is", () => {
      const input = "This is a plain string";
      expect(sanitizeLogData(input)).toBe(input);
    });

    test("should handle primitive values", () => {
      expect(sanitizeLogData(123)).toBe(123);
      expect(sanitizeLogData(true)).toBe(true);
    });
  });

  describe("sanitizeError", () => {
    test("should sanitize error object", () => {
      const error = new Error("Test error message");
      const result = sanitizeError(error);

      expect(result.name).toBe("Error");
      expect(result.message).toBe("Test error message");
    });

    test("should include stack in development", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const error = new Error("Test error");
      const result = sanitizeError(error);

      expect(result.stack).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });

    test("should exclude stack in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const error = new Error("Test error");
      const result = sanitizeError(error);

      expect(result.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("createSanitizedLogger", () => {
    test("should create sanitized logger wrapper", () => {
      const mockLogger = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
      };

      const sanitizedLogger = createSanitizedLogger(mockLogger);

      sanitizedLogger.info("Test message", { amount: 100, userId: "user123" });

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Test message",
        expect.objectContaining({
          amount: "[AMOUNT_REDACTED]",
          userId: "user123",
        }),
      );
    });

    test("should handle undefined data", () => {
      const mockLogger = {
        info: jest.fn(),
      };

      const sanitizedLogger = createSanitizedLogger(mockLogger);

      sanitizedLogger.info("Test message");

      expect(mockLogger.info).toHaveBeenCalledWith("Test message", undefined);
    });
  });

  describe("SENSITIVE_FIELDS", () => {
    test("should include financial fields", () => {
      expect(SENSITIVE_FIELDS).toContain("amount");
      expect(SENSITIVE_FIELDS).toContain("averageAmount");
      expect(SENSITIVE_FIELDS).toContain("balance");
    });

    test("should include merchant fields", () => {
      expect(SENSITIVE_FIELDS).toContain("merchantName");
      expect(SENSITIVE_FIELDS).toContain("merchant");
    });

    test("should include account fields", () => {
      expect(SENSITIVE_FIELDS).toContain("accountNumber");
    });
  });

  describe("FIELDS_TO_REMOVE", () => {
    test("should include highly sensitive fields", () => {
      expect(FIELDS_TO_REMOVE).toContain("ssn");
      expect(FIELDS_TO_REMOVE).toContain("accountNumber");
      expect(FIELDS_TO_REMOVE).toContain("cardNumber");
    });
  });
});
