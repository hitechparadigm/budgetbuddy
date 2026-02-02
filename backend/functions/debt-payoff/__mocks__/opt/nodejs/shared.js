/**
 * Mock for /opt/nodejs/shared Lambda layer
 */

module.exports = {
  checkPermission: jest.fn().mockReturnValue(null),

  validateInput: jest.fn().mockReturnValue({ valid: true }),

  formatCurrency: (amount, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  },
};
