/**
 * Mock for the /opt/nodejs/utils Lambda layer (mapped in jest.config.js)
 */
'use strict';
const BEDROCK_MODEL_ID = 'test-model-id';
const emitEmfMetric = jest.fn();
module.exports = {
  BEDROCK_MODEL_ID,
  emitEmfMetric,
};
