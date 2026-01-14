/**
 * Unit tests for validation utilities
 */

const {
  validateEmail,
  validatePassword,
  validateOnboardingInput,
  validateRegistrationInput,
  validateLoginInput,
} = require("./validators");

describe("validateEmail", () => {
  test("should return null for valid email", () => {
    expect(validateEmail("test@example.com")).toBeNull();
    expect(validateEmail("user.name+tag@example.co.uk")).toBeNull();
  });

  test("should return error for missing email", () => {
    expect(validateEmail(null)).toBe("Email is required and must be a string");
    expect(validateEmail("")).toBe("Email is required and must be a string");
  });

  test("should return error for invalid email format", () => {
    expect(validateEmail("invalid")).toBe(
      "Email must be a valid email address"
    );
    expect(validateEmail("invalid@")).toBe(
      "Email must be a valid email address"
    );
    expect(validateEmail("@example.com")).toBe(
      "Email must be a valid email address"
    );
  });

  test("should return error for non-string email", () => {
    expect(validateEmail(123)).toBe("Email is required and must be a string");
    expect(validateEmail({})).toBe("Email is required and must be a string");
  });
});

describe("validatePassword", () => {
  test("should return null for valid password", () => {
    expect(validatePassword("password123")).toBeNull();
    expect(validatePassword("12345678")).toBeNull();
  });

  test("should return error for missing password", () => {
    expect(validatePassword(null)).toBe(
      "Password is required and must be a string"
    );
    expect(validatePassword("")).toBe(
      "Password is required and must be a string"
    );
  });

  test("should return error for short password", () => {
    expect(validatePassword("1234567")).toBe(
      "Password must be at least 8 characters long"
    );
    expect(validatePassword("short")).toBe(
      "Password must be at least 8 characters long"
    );
  });

  test("should return error for non-string password", () => {
    expect(validatePassword(12345678)).toBe(
      "Password is required and must be a string"
    );
    expect(validatePassword({})).toBe(
      "Password is required and must be a string"
    );
  });
});

describe("validateOnboardingInput", () => {
  const validInput = {
    city: "New York",
    country: "United States",
    familySize: 2,
    currentMonth: "2026-01",
    selectedCategories: [
      { name: "Groceries", icon: "🛒", adjustedAmount: 500 },
      { name: "Rent", icon: "🏠", adjustedAmount: 2000 },
    ],
  };

  test("should return empty array for valid input", () => {
    const errors = validateOnboardingInput(validInput);
    expect(errors).toEqual([]);
  });

  test("should return error for missing city", () => {
    const input = { ...validInput, city: null };
    const errors = validateOnboardingInput(input);
    expect(errors).toContain("City is required and must be a string");
  });

  test("should return error for missing country", () => {
    const input = { ...validInput, country: "" };
    const errors = validateOnboardingInput(input);
    expect(errors).toContain("Country is required and must be a string");
  });

  test("should return error for invalid family size", () => {
    const input1 = { ...validInput, familySize: 0 };
    const errors1 = validateOnboardingInput(input1);
    expect(errors1).toContain("Family size must be between 1 and 20");

    const input2 = { ...validInput, familySize: 25 };
    const errors2 = validateOnboardingInput(input2);
    expect(errors2).toContain("Family size must be between 1 and 20");
  });

  test("should return error for invalid month format", () => {
    const input = { ...validInput, currentMonth: "2026/01" };
    const errors = validateOnboardingInput(input);
    expect(errors).toContain("Current month must be in YYYY-MM format");
  });

  test("should return error for empty categories", () => {
    const input = { ...validInput, selectedCategories: [] };
    const errors = validateOnboardingInput(input);
    expect(errors).toContain("At least one category must be selected");
  });

  test("should return error for invalid category structure", () => {
    const input = {
      ...validInput,
      selectedCategories: [
        { name: "Groceries", icon: "🛒" }, // Missing adjustedAmount
      ],
    };
    const errors = validateOnboardingInput(input);
    expect(errors.length).toBeGreaterThan(0);
  });

  test("should return multiple errors for multiple issues", () => {
    const input = {
      city: null,
      country: null,
      familySize: 0,
      currentMonth: "invalid",
      selectedCategories: [],
    };
    const errors = validateOnboardingInput(input);
    expect(errors.length).toBeGreaterThan(3);
  });
});

describe("validateRegistrationInput", () => {
  const validInput = {
    email: "test@example.com",
    password: "password123",
    firstName: "John",
    lastName: "Doe",
  };

  test("should return empty array for valid input", () => {
    const errors = validateRegistrationInput(validInput);
    expect(errors).toEqual([]);
  });

  test("should return error for invalid email", () => {
    const input = { ...validInput, email: "invalid" };
    const errors = validateRegistrationInput(input);
    expect(errors).toContain("Email must be a valid email address");
  });

  test("should return error for short password", () => {
    const input = { ...validInput, password: "short" };
    const errors = validateRegistrationInput(input);
    expect(errors).toContain("Password must be at least 8 characters long");
  });

  test("should return error for missing first name", () => {
    const input = { ...validInput, firstName: null };
    const errors = validateRegistrationInput(input);
    expect(errors).toContain("First name is required and must be a string");
  });

  test("should return error for missing last name", () => {
    const input = { ...validInput, lastName: "" };
    const errors = validateRegistrationInput(input);
    expect(errors).toContain("Last name is required and must be a string");
  });
});

describe("validateLoginInput", () => {
  const validInput = {
    email: "test@example.com",
    password: "password123",
  };

  test("should return empty array for valid input", () => {
    const errors = validateLoginInput(validInput);
    expect(errors).toEqual([]);
  });

  test("should return error for invalid email", () => {
    const input = { ...validInput, email: "invalid" };
    const errors = validateLoginInput(input);
    expect(errors).toContain("Email must be a valid email address");
  });

  test("should return error for missing password", () => {
    const input = { ...validInput, password: null };
    const errors = validateLoginInput(input);
    expect(errors).toContain("Password is required and must be a string");
  });
});
