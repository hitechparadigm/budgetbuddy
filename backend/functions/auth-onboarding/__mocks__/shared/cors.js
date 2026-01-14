module.exports = {
  getCorsHeaders: jest.fn((origin) => ({
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Credentials": "true",
  })),
};
