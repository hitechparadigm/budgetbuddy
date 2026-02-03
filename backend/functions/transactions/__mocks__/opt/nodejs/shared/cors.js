/**
 * Mock for /opt/nodejs/shared/cors Lambda layer
 */

module.exports = {
  getCorsHeaders: jest.fn(() => ({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  })),
};
