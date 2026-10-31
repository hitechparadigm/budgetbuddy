// Mock for the /opt/nodejs/utils common layer
module.exports = {
  dynamoHelpers: {
    getItem: jest.fn(),
    putItem: jest.fn(),
    queryByPK: jest.fn(),
    queryByGSI: jest.fn(),
    scan: jest.fn(),
  },
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
};
