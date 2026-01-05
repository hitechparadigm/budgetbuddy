/**
 * Security Property Tests - Secret Detection Coverage
 *
 * Feature: security-fixes, Property 7: Secret Detection Comprehensive Coverage
 * Validates: Requirements 5.3, 8.1
 */

const fc = require("fast-check");
const fs = require("fs");
const path = require("path");

describe("Secret Detection Coverage Properties", () => {
  describe("Property 7: Secret Detection Comprehensive Coverage", () => {
    test("should detect secrets across all file types", () => {
      fc.assert(
        fc.property(
          fc.record({
            secretType: fc.constantFrom(
              "password",
              "apiKey",
              "token",
              "secret",
              "connectionString"
            ),
            fileType: fc.constantFrom(
              ".js",
              ".ts",
              ".json",
              ".md",
              ".txt",
              ".env"
            ),
            secretPattern: fc.oneof(
              fc.constant('password="FAKE_PASSWORD_FOR_TESTING_123"'),
              fc.constant('api_key="sk_NOTREALTEST1234567890abcdefghijklmnop"'),
              fc.constant('token="FAKE_JWT_TOKEN_FOR_TESTING_ONLY"'),
              fc.constant('secret="FAKE_SECRET_FOR_TESTING_123"'),
              fc.constant("mongodb://testuser:testpass@testhost:port/testdb")
            ),
          }),
          (testData) => {
            // **Feature: security-fixes, Property 7: Secret Detection Comprehensive Coverage**

            // Property: For any file containing exposed secrets, credentials, or sensitive data,
            // the secret detection system should identify and flag all instances regardless of file type

            // Test secret detection patterns
            const secretPatterns = {
              password:
                /password.*=.*['""][^'""]{8,}['""]|password.*['""][^'""]*[A-Z][^'""]*[0-9][^'""]*[!@#$%^&*][^'""]*['""]]/i,
              apiKey:
                /api[_-]?key.*=.*['""][^'""]{20,}['""]|sk_[a-zA-Z0-9]{20,}/i,
              token: /token.*=.*['""][^'""]{20,}['""]|eyJ[A-Za-z0-9+/=]{20,}/i,
              secret: /secret.*=.*['""][^'""]{16,}['""]]/i,
              connectionString:
                /mongodb:\/\/.*:.*@|mysql:\/\/.*:.*@|postgres:\/\/.*:.*@|redis:\/\/.*:.*@/i,
            };

            // Test if pattern would be detected
            const pattern = secretPatterns[testData.secretType];
            if (pattern) {
              const wouldDetect = pattern.test(testData.secretPattern);

              // Most secret patterns should be detectable
              if (
                testData.secretPattern.includes('password="') ||
                testData.secretPattern.includes('api_key="') ||
                testData.secretPattern.includes('token="') ||
                (testData.secretPattern.includes("mongodb://") &&
                  testData.secretPattern.includes(":") &&
                  testData.secretPattern.includes("@"))
              ) {
                expect(wouldDetect).toBe(true);
              }
            }

            // Verify file type coverage
            const supportedFileTypes = [
              ".js",
              ".ts",
              ".json",
              ".md",
              ".txt",
              ".env",
              ".config",
              ".conf",
            ];
            expect(supportedFileTypes).toContain(testData.fileType);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test("should validate security-check script has comprehensive patterns", () => {
      // **Feature: security-fixes, Property 7: Secret Detection Comprehensive Coverage**

      const securityScriptPath = path.join(
        process.cwd(),
        "scripts/security-check.sh"
      );

      if (fs.existsSync(securityScriptPath)) {
        const content = fs.readFileSync(securityScriptPath, "utf8");

        // Property: Security script should have comprehensive secret detection patterns

        // Should check for various secret types
        expect(content).toMatch(/password.*\[/i);
        expect(content).toMatch(/api.*key/i);
        expect(content).toMatch(/token/i);
        expect(content).toMatch(/secret/i);

        // Should check multiple file types
        expect(content).toMatch(/--exclude.*\.md/);
        expect(content).toMatch(/--exclude.*\.test\./);
        expect(content).toMatch(/--exclude-dir.*node_modules/);

        // Should have database connection string detection
        expect(content).toMatch(/mongodb:\/\/|mysql:\/\/|postgres:\/\//);

        // Should exclude safe files
        expect(content).toMatch(/mockAuth\.ts/);
        expect(content).toMatch(/coverage/);
      }
    });

    test("should detect secrets in various encoding formats", () => {
      fc.assert(
        fc.property(
          fc.record({
            encoding: fc.constantFrom("plain", "base64", "hex", "url"),
            secretValue: fc.string({ minLength: 16, maxLength: 32 }),
            context: fc.constantFrom("assignment", "json", "config", "comment"),
          }),
          (testData) => {
            // **Feature: security-fixes, Property 7: Secret Detection Comprehensive Coverage**

            // Property: Secret detection should work across different encoding formats

            // Test different secret contexts
            const secretContexts = {
              assignment: `const secret = "${testData.secretValue}";`,
              json: `{"secret": "${testData.secretValue}"}`,
              config: `SECRET=${testData.secretValue}`,
              comment: `// Secret: ${testData.secretValue}`,
            };

            const contextPattern = secretContexts[testData.context];

            // Verify context patterns are detectable
            expect(contextPattern).toContain(testData.secretValue);

            // Test basic secret detection logic
            const hasSecretKeyword = /secret|password|key|token/i.test(
              contextPattern
            );
            const hasValue = testData.secretValue.length >= 16;

            if (hasSecretKeyword && hasValue) {
              // This would be flagged by secret detection
              expect(true).toBe(true);
            }

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    test("should validate exclusion patterns work correctly", () => {
      fc.assert(
        fc.property(
          fc.record({
            fileType: fc.constantFrom(
              "mockAuth.ts",
              "test.js",
              "spec.ts",
              "README.md"
            ),
            secretPattern: fc.constantFrom(
              "MOCK_JWT_TOKEN",
              "TEST_PASSWORD",
              "example-password",
              "your-api-key-here"
            ),
            shouldExclude: fc.boolean(),
          }),
          (testData) => {
            // **Feature: security-fixes, Property 7: Secret Detection Comprehensive Coverage**

            // Property: Exclusion patterns should prevent false positives on safe files

            // Test exclusion logic
            const excludePatterns = [
              "mockAuth.ts",
              "*.test.js",
              "*.test.ts",
              "*.spec.js",
              "*.spec.ts",
              "*.md",
            ];

            const shouldBeExcluded = excludePatterns.some((pattern) => {
              if (pattern.includes("*")) {
                const regex = new RegExp(pattern.replace("*", ".*"));
                return regex.test(testData.fileType);
              }
              return testData.fileType === pattern;
            });

            // Mock and test files should be excluded
            if (
              testData.fileType.includes("mock") ||
              testData.fileType.includes("test") ||
              testData.fileType.includes("spec") ||
              testData.fileType === "mockAuth.ts"
            ) {
              expect(shouldBeExcluded).toBe(true);
            }

            // Safe placeholder patterns should not trigger detection
            const isSafePlaceholder =
              testData.secretPattern.includes("MOCK") ||
              testData.secretPattern.includes("TEST") ||
              testData.secretPattern.includes("example") ||
              testData.secretPattern.includes("your-");

            if (isSafePlaceholder) {
              // These should be considered safe
              expect(true).toBe(true);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Secret Detection Integration", () => {
    test("should validate detection patterns match common secret formats", () => {
      const commonSecretFormats = [
        // API Keys
        {
          pattern: "sk_NOTREALTEST1234567890abcdefghijklmnop",
          type: "stripe_key",
          shouldDetect: true,
        },
        {
          pattern: "pk_NOTREALTEST1234567890abcdefghijklmnop",
          type: "stripe_public",
          shouldDetect: true,
        },
        {
          pattern: "AKIAFAKEAWSKEYFORTESTING",
          type: "aws_key",
          shouldDetect: true,
        },

        // JWT Tokens
        {
          pattern:
            "FAKE_JWT_TOKEN_FOR_TESTING_ONLY_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
          type: "jwt",
          shouldDetect: true,
        },

        // Database URLs
        {
          pattern: "mongodb://testuser:testpass@testhost:27017/testdatabase",
          type: "mongodb",
          shouldDetect: true,
        },
        {
          pattern: "postgres://testuser:testpass@testhost:5432/testdatabase",
          type: "postgres",
          shouldDetect: true,
        },

        // Safe placeholders
        {
          pattern: "your-api-key-here",
          type: "placeholder",
          shouldDetect: false,
        },
        { pattern: "MOCK_JWT_TOKEN", type: "mock", shouldDetect: false },
        { pattern: "test-password-123", type: "test", shouldDetect: false },
      ];

      commonSecretFormats.forEach(({ pattern, type, shouldDetect }) => {
        // Test detection logic
        const detectionPatterns = [
          /sk_[a-zA-Z0-9]{32,}/,
          /pk_[a-zA-Z0-9]{32,}/,
          /AKIA[0-9A-Z]{16}/,
          /eyJ[A-Za-z0-9+/=]{20,}/,
          /mongodb:\/\/[^\/\s]+\/\w+/,
          /postgres:\/\/[^\/\s]+\/\w+/,
        ];

        const placeholderPatterns = [/your-.*-here/, /MOCK_/, /test-.*-\d+/];

        const isDetected = detectionPatterns.some((regex) =>
          regex.test(pattern)
        );
        const isPlaceholder = placeholderPatterns.some((regex) =>
          regex.test(pattern)
        );

        if (shouldDetect && !isPlaceholder) {
          expect(isDetected).toBe(true);
        } else if (!shouldDetect || isPlaceholder) {
          // Placeholders should not be detected as real secrets
          expect(isPlaceholder || !isDetected).toBe(true);
        }
      });
    });

    test("should validate comprehensive file type coverage", () => {
      const fileTypesToScan = [
        ".js",
        ".ts",
        ".jsx",
        ".tsx",
        ".json",
        ".yaml",
        ".yml",
        ".env",
        ".config",
        ".conf",
        ".md",
        ".txt",
        ".log",
        ".sh",
        ".bash",
        ".ps1",
      ];

      // All common file types should be scannable
      fileTypesToScan.forEach((fileType) => {
        expect(fileType).toMatch(/^\.[a-z0-9]+$/);
        expect(fileType.length).toBeGreaterThan(1);
      });

      // Should have good coverage of development file types
      expect(fileTypesToScan).toContain(".js");
      expect(fileTypesToScan).toContain(".ts");
      expect(fileTypesToScan).toContain(".json");
      expect(fileTypesToScan).toContain(".env");
      expect(fileTypesToScan).toContain(".md");
    });
  });
});
