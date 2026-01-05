// Jest setup file for global test configuration

// Mock AWS SDK - only if modules exist
try {
  jest.mock("@aws-sdk/client-dynamodb");
} catch (e) {
  // Module not installed, skip mock
}

try {
  jest.mock("@aws-sdk/client-cognito-identity-provider");
} catch (e) {
  // Module not installed, skip mock
}

try {
  jest.mock("@aws-sdk/client-bedrock-runtime");
} catch (e) {
  // Module not installed, skip mock
}

// Mock environment variables
process.env.NODE_ENV = "test";
process.env.AWS_REGION = "us-east-1";

// Global test timeout
jest.setTimeout(30000);

// Console suppression for cleaner test output
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Warning: ReactDOM.render is deprecated")
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("componentWillReceiveProps has been renamed")
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});
