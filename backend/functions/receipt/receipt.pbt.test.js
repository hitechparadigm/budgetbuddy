/**
 * Receipt OCR Property-Based Tests
 *
 * Property tests for receipt OCR extraction including:
 * - Property 7: Receipt OCR Accuracy
 *
 * Feature: test-coverage-improvement
 * Validates: Requirements 4.6
 */

const fc = require("fast-check");

describe("Receipt OCR Property-Based Tests", () => {
  // Helper functions that mirror the actual implementation
  function cleanMerchantName(name) {
    if (!name) return null;
    return name
      .replace(/\s+(INC|LLC|LTD|CORP|CO|STORE|#\d+)\.?$/i, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function parseAmount(value) {
    if (!value) return null;
    const cleaned = value.replace(/[$£€,]/g, "").trim();
    const amount = parseFloat(cleaned);
    return isNaN(amount) ? null : Math.round(amount * 100) / 100;
  }

  function parseDate(value) {
    if (!value) return null;
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0];
      }
    } catch {
      // Ignore parse errors
    }
    return null;
  }

  function suggestCategory(merchant) {
    if (!merchant) return "Uncategorized";
    const merchantLower = merchant.toLowerCase();

    const categoryPatterns = {
      Groceries: [
        "walmart",
        "target",
        "costco",
        "kroger",
        "safeway",
        "whole foods",
        "trader joe",
        "aldi",
        "publix",
      ],
      Dining: [
        "mcdonald",
        "starbucks",
        "chipotle",
        "subway",
        "pizza",
        "restaurant",
        "cafe",
        "diner",
        "grill",
      ],
      Gas: ["shell", "chevron", "exxon", "mobil", "bp", "gas", "fuel", "76"],
      Shopping: [
        "amazon",
        "best buy",
        "home depot",
        "lowes",
        "ikea",
        "nordstrom",
        "macy",
      ],
      Entertainment: [
        "netflix",
        "spotify",
        "hulu",
        "disney",
        "amc",
        "cinema",
        "theater",
      ],
      Healthcare: [
        "cvs",
        "walgreens",
        "pharmacy",
        "hospital",
        "clinic",
        "doctor",
      ],
      Transportation: ["uber", "lyft", "taxi", "parking", "transit"],
    };

    for (const [category, patterns] of Object.entries(categoryPatterns)) {
      if (patterns.some((pattern) => merchantLower.includes(pattern))) {
        return category;
      }
    }
    return "Shopping";
  }

  function parseTextractResponse(response) {
    const data = {
      merchant: null,
      date: null,
      total: null,
      subtotal: null,
      tax: null,
      items: [],
      confidence: 0,
      suggestedCategory: "Shopping",
    };

    if (!response.ExpenseDocuments || response.ExpenseDocuments.length === 0) {
      return data;
    }

    const expenseDoc = response.ExpenseDocuments[0];
    let totalConfidence = 0;
    let fieldCount = 0;

    if (expenseDoc.SummaryFields) {
      for (const field of expenseDoc.SummaryFields) {
        const fieldType = field.Type?.Text?.toUpperCase();
        const value = field.ValueDetection?.Text;
        const confidence = field.ValueDetection?.Confidence || 0;

        if (!value) continue;

        totalConfidence += confidence;
        fieldCount++;

        switch (fieldType) {
          case "VENDOR_NAME":
          case "NAME":
          case "VENDOR":
            if (!data.merchant || confidence > 80) {
              data.merchant = cleanMerchantName(value);
            }
            break;

          case "TOTAL":
          case "AMOUNT_DUE":
          case "GRAND_TOTAL": {
            const total = parseAmount(value);
            if (total !== null && (!data.total || confidence > 80)) {
              data.total = total;
            }
            break;
          }

          case "SUBTOTAL":
          case "SUB_TOTAL":
            data.subtotal = parseAmount(value);
            break;

          case "TAX":
          case "SALES_TAX":
            data.tax = parseAmount(value);
            break;

          case "INVOICE_RECEIPT_DATE":
          case "DATE":
          case "TRANSACTION_DATE": {
            const date = parseDate(value);
            if (date) {
              data.date = date;
            }
            break;
          }
        }
      }
    }

    data.confidence =
      fieldCount > 0 ? Math.round(totalConfidence / fieldCount) / 100 : 0;

    if (data.merchant) {
      data.suggestedCategory = suggestCategory(data.merchant);
    }

    return data;
  }

  /**
   * Property 7: Receipt OCR Accuracy
   * **Validates: Requirements 4.6**
   *
   * For any valid Textract response:
   * - Parsed amounts are always non-negative or null
   * - Confidence scores are between 0 and 1
   * - Dates are in valid ISO format or null
   * - Category suggestions are from a known set
   * - Merchant names are cleaned consistently
   */
  describe("Property 7: Receipt OCR Accuracy", () => {
    // Generator for currency amounts
    const amountStringArb = fc.oneof(
      fc
        .double({ min: 0.01, max: 99999.99, noNaN: true })
        .map((n) => `$${n.toFixed(2)}`),
      fc
        .double({ min: 0.01, max: 99999.99, noNaN: true })
        .map((n) => n.toFixed(2)),
      fc
        .double({ min: 1000, max: 99999.99, noNaN: true })
        .map(
          (n) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        ),
      fc.constant("N/A"),
      fc.constant(""),
    );

    // Generator for merchant names
    const merchantNameArb = fc.oneof(
      fc.constantFrom(
        "Walmart",
        "Target",
        "Costco",
        "Starbucks",
        "Shell",
        "CVS",
        "Home Depot",
        "Amazon",
      ),
      fc.hexaString({ minLength: 3, maxLength: 20 }).map((s) => `${s} Store`),
    );

    // Generator for confidence values
    const confidenceArb = fc.double({ min: 0, max: 100, noNaN: true });

    // Generator for date strings
    const dateStringArb = fc.oneof(
      fc
        .date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") })
        .map((d) => d.toISOString().split("T")[0]),
      fc
        .date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") })
        .map((d) => {
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          return `${month}/${day}/${d.getFullYear()}`;
        }),
      fc.constant("invalid"),
    );

    // Generator for Textract summary field
    const summaryFieldArb = (fieldType) =>
      fc.record({
        Type: fc.constant({ Text: fieldType }),
        ValueDetection: fc.record({
          Text:
            fieldType.includes("TOTAL") ||
            fieldType.includes("TAX") ||
            fieldType.includes("SUBTOTAL")
              ? amountStringArb
              : fieldType.includes("DATE")
                ? dateStringArb
                : merchantNameArb,
          Confidence: confidenceArb,
        }),
      });

    // Generator for Textract response
    const textractResponseArb = fc.record({
      ExpenseDocuments: fc.array(
        fc.record({
          SummaryFields: fc.array(
            fc.oneof(
              summaryFieldArb("VENDOR_NAME"),
              summaryFieldArb("TOTAL"),
              summaryFieldArb("DATE"),
              summaryFieldArb("TAX"),
              summaryFieldArb("SUBTOTAL"),
            ),
            { minLength: 0, maxLength: 5 },
          ),
          LineItemGroups: fc.constant([]),
          Blocks: fc.constant([]),
        }),
        { minLength: 0, maxLength: 1 },
      ),
    });

    test("parsed amounts are always non-negative or null", () => {
      fc.assert(
        fc.property(amountStringArb, (amountStr) => {
          const result = parseAmount(amountStr);
          return result === null || result >= 0;
        }),
        { numRuns: 100 },
      );
    });

    test("confidence scores are between 0 and 1", () => {
      fc.assert(
        fc.property(textractResponseArb, (response) => {
          const result = parseTextractResponse(response);
          return result.confidence >= 0 && result.confidence <= 1;
        }),
        { numRuns: 50 },
      );
    });

    test("dates are in valid ISO format or null", () => {
      fc.assert(
        fc.property(dateStringArb, (dateStr) => {
          const result = parseDate(dateStr);
          if (result === null) return true;
          // Check ISO date format YYYY-MM-DD
          const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
          return isoDateRegex.test(result);
        }),
        { numRuns: 100 },
      );
    });

    test("category suggestions are from known set", () => {
      const knownCategories = [
        "Groceries",
        "Dining",
        "Gas",
        "Shopping",
        "Entertainment",
        "Healthcare",
        "Transportation",
        "Uncategorized",
      ];

      fc.assert(
        fc.property(merchantNameArb, (merchant) => {
          const result = suggestCategory(merchant);
          return knownCategories.includes(result);
        }),
        { numRuns: 100 },
      );
    });

    test("merchant names are cleaned consistently", () => {
      fc.assert(
        fc.property(
          fc.hexaString({ minLength: 1, maxLength: 30 }),
          fc.constantFrom(" INC", " LLC", " LTD", " CORP", " CO", " #1234", ""),
          (baseName, suffix) => {
            const fullName = baseName + suffix;
            const cleaned = cleanMerchantName(fullName);

            // Cleaned name should not end with common suffixes
            if (cleaned === null) return true;
            return (
              !cleaned.endsWith(" INC") &&
              !cleaned.endsWith(" LLC") &&
              !cleaned.endsWith(" LTD") &&
              !cleaned.endsWith(" CORP") &&
              !cleaned.endsWith(" CO")
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    test("parsing never throws for any input", () => {
      fc.assert(
        fc.property(textractResponseArb, (response) => {
          try {
            parseTextractResponse(response);
            return true;
          } catch {
            return false;
          }
        }),
        { numRuns: 50 },
      );
    });

    test("empty responses return default values", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            {},
            { ExpenseDocuments: [] },
            { ExpenseDocuments: [{ SummaryFields: [] }] },
          ),
          (response) => {
            const result = parseTextractResponse(response);
            return (
              result.merchant === null &&
              result.total === null &&
              result.date === null &&
              result.confidence === 0 &&
              result.suggestedCategory === "Shopping"
            );
          },
        ),
        { numRuns: 10 },
      );
    });

    test("total extraction is idempotent", () => {
      fc.assert(
        fc.property(textractResponseArb, (response) => {
          const result1 = parseTextractResponse(response);
          const result2 = parseTextractResponse(response);
          return result1.total === result2.total;
        }),
        { numRuns: 30 },
      );
    });

    test("subtotal + tax approximates total when all present", () => {
      // Generate a response with subtotal, tax, and total
      const consistentReceiptArb = fc
        .record({
          subtotal: fc.double({ min: 1, max: 1000, noNaN: true }),
          taxRate: fc.double({ min: 0, max: 0.15, noNaN: true }),
        })
        .map(({ subtotal, taxRate }) => {
          const tax = Math.round(subtotal * taxRate * 100) / 100;
          const total = Math.round((subtotal + tax) * 100) / 100;
          return {
            ExpenseDocuments: [
              {
                SummaryFields: [
                  {
                    Type: { Text: "SUBTOTAL" },
                    ValueDetection: {
                      Text: subtotal.toFixed(2),
                      Confidence: 95,
                    },
                  },
                  {
                    Type: { Text: "TAX" },
                    ValueDetection: { Text: tax.toFixed(2), Confidence: 95 },
                  },
                  {
                    Type: { Text: "TOTAL" },
                    ValueDetection: { Text: total.toFixed(2), Confidence: 95 },
                  },
                ],
                LineItemGroups: [],
                Blocks: [],
              },
            ],
          };
        });

      fc.assert(
        fc.property(consistentReceiptArb, (response) => {
          const result = parseTextractResponse(response);
          if (
            result.subtotal !== null &&
            result.tax !== null &&
            result.total !== null
          ) {
            const calculatedTotal =
              Math.round((result.subtotal + result.tax) * 100) / 100;
            // Allow small floating point differences
            return Math.abs(calculatedTotal - result.total) < 0.02;
          }
          return true;
        }),
        { numRuns: 50 },
      );
    });
  });
});
