'use strict';
/**
 * Test stand-in for the common layer's /opt/nodejs/reminder-preferences
 * (mapped in jest.config.js). The real module is tested in
 * backend/layers/common/nodejs/reminder-preferences.test.js.
 */
module.exports = {
  upsertReminderPreferences: jest.fn(async () => ({ success: true, preferences: {}, written: true })),
};
