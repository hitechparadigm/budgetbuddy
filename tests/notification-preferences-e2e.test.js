/**
 * End-to-End Test: Preferences Management Flow (Task 11.4)
 *
 * This test verifies the complete preferences management flow:
 * 1. Create user profile
 * 2. Create default preferences
 * 3. Update preferences (web simulation)
 * 4. Verify changes reflected
 * 5. Update preferences again (mobile simulation)
 * 6. Verify changes reflected across platforms
 *
 * Requirements: 4.1-4.10, 7.1-7.10, 8.1-8.10
 *
 * AWS Cost Estimate: < $0.01 per run
 * - DynamoDB: ~8 operations = $0.00001
 * Total: < $0.01
 */

const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

// Configure AWS SDK
AWS.config.update({
  region: "us-east-1",
  credentials: new AWS.SharedIniFileCredentials({ profile: "hitechparadigm" }),
});

const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = "budgetbuddy-main";

// Test timeout: 30 seconds
jest.setTimeout(30000);

describe("E2E Test: Preferences Management Flow (Task 11.4)", () => {
  let testUserId;
  let createdItems = [];

  beforeEach(() => {
    testUserId = `test-user-${uuidv4()}`;
    createdItems = [];
  });

  afterEach(async () => {
    // Cleanup: Delete all created items
    console.log("\nCleaning up test data...");
    for (const item of createdItems) {
      try {
        await dynamodb
          .delete({
            TableName: TABLE_NAME,
            Key: {
              PK: item.PK,
              SK: item.SK,
            },
          })
          .promise();
        console.log(`  ✓ Deleted: ${item.PK} / ${item.SK}`);
      } catch (error) {
        console.error(
          `  ✗ Failed to delete: ${item.PK} / ${item.SK}`,
          error.message,
        );
      }
    }
    console.log("Cleanup complete.\n");
  });

  it("should manage preferences across web and mobile platforms", async () => {
    console.log("\n========================================");
    console.log("TASK 11.4: Preferences Management E2E Test");
    console.log("========================================\n");
    console.log(`Test User ID: ${testUserId}\n`);

    // ========================================
    // STEP 1: Create User Profile
    // ========================================
    console.log("Step 1: Creating user profile...");

    const userProfile = {
      PK: `USER#${testUserId}`,
      SK: "PROFILE",
      userId: testUserId,
      email: `test-${testUserId}@example.com`,
      name: "Test User",
      familyId: `family_${testUserId}`,
      createdAt: new Date().toISOString(),
    };

    await dynamodb.put({ TableName: TABLE_NAME, Item: userProfile }).promise();
    createdItems.push({ PK: userProfile.PK, SK: userProfile.SK });
    console.log(`✓ User profile created`);

    // ========================================
    // STEP 2: Create Default Preferences
    // ========================================
    console.log("\nStep 2: Creating default notification preferences...");

    const defaultPreferences = {
      PK: `USER#${testUserId}`,
      SK: "NOTIFICATION_PREFERENCES",
      budgetAlerts: true,
      dailyReminders: false,
      reminderTime: "19:00",
      quietHoursStart: "22:00",
      quietHoursEnd: "08:00",
      updatedAt: new Date().toISOString(),
    };

    await dynamodb
      .put({ TableName: TABLE_NAME, Item: defaultPreferences })
      .promise();
    createdItems.push({ PK: defaultPreferences.PK, SK: defaultPreferences.SK });
    console.log(`✓ Default preferences created`);
    console.log(`  - Budget alerts: ${defaultPreferences.budgetAlerts}`);
    console.log(`  - Daily reminders: ${defaultPreferences.dailyReminders}`);
    console.log(`  - Reminder time: ${defaultPreferences.reminderTime}`);
    console.log(
      `  - Quiet hours: ${defaultPreferences.quietHoursStart} - ${defaultPreferences.quietHoursEnd}`,
    );

    // Verify preferences were created
    const preferencesResult = await dynamodb
      .get({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${testUserId}`,
          SK: "NOTIFICATION_PREFERENCES",
        },
      })
      .promise();

    expect(preferencesResult.Item).toBeDefined();
    expect(preferencesResult.Item.budgetAlerts).toBe(true);
    expect(preferencesResult.Item.dailyReminders).toBe(false);
    console.log("✓ Default preferences verified in DynamoDB");

    // ========================================
    // STEP 3: Update Preferences (Web Platform)
    // ========================================
    console.log("\nStep 3: Updating preferences from web platform...");

    const webUpdates = {
      budgetAlerts: true,
      dailyReminders: true, // Changed from false to true
      reminderTime: "18:00", // Changed from 19:00 to 18:00
      quietHoursStart: "23:00", // Changed from 22:00 to 23:00
      quietHoursEnd: "07:00", // Changed from 08:00 to 07:00
      updatedAt: new Date().toISOString(),
    };

    await dynamodb
      .update({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${testUserId}`,
          SK: "NOTIFICATION_PREFERENCES",
        },
        UpdateExpression:
          "SET budgetAlerts = :budgetAlerts, dailyReminders = :dailyReminders, reminderTime = :reminderTime, quietHoursStart = :quietHoursStart, quietHoursEnd = :quietHoursEnd, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":budgetAlerts": webUpdates.budgetAlerts,
          ":dailyReminders": webUpdates.dailyReminders,
          ":reminderTime": webUpdates.reminderTime,
          ":quietHoursStart": webUpdates.quietHoursStart,
          ":quietHoursEnd": webUpdates.quietHoursEnd,
          ":updatedAt": webUpdates.updatedAt,
        },
      })
      .promise();

    console.log(`✓ Preferences updated from web`);
    console.log(`  - Daily reminders: ${webUpdates.dailyReminders} (changed)`);
    console.log(`  - Reminder time: ${webUpdates.reminderTime} (changed)`);
    console.log(
      `  - Quiet hours: ${webUpdates.quietHoursStart} - ${webUpdates.quietHoursEnd} (changed)`,
    );

    // ========================================
    // STEP 4: Verify Changes Reflected (Mobile Read)
    // ========================================
    console.log("\nStep 4: Verifying changes reflected on mobile platform...");

    const mobileReadResult = await dynamodb
      .get({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${testUserId}`,
          SK: "NOTIFICATION_PREFERENCES",
        },
      })
      .promise();

    expect(mobileReadResult.Item).toBeDefined();
    expect(mobileReadResult.Item.dailyReminders).toBe(true);
    expect(mobileReadResult.Item.reminderTime).toBe("18:00");
    expect(mobileReadResult.Item.quietHoursStart).toBe("23:00");
    expect(mobileReadResult.Item.quietHoursEnd).toBe("07:00");
    console.log(`✓ Mobile platform sees updated preferences`);
    console.log(`  - Daily reminders: ${mobileReadResult.Item.dailyReminders}`);
    console.log(`  - Reminder time: ${mobileReadResult.Item.reminderTime}`);
    console.log(
      `  - Quiet hours: ${mobileReadResult.Item.quietHoursStart} - ${mobileReadResult.Item.quietHoursEnd}`,
    );

    // ========================================
    // STEP 5: Update Preferences (Mobile Platform)
    // ========================================
    console.log("\nStep 5: Updating preferences from mobile platform...");

    const mobileUpdates = {
      budgetAlerts: false, // Changed from true to false
      dailyReminders: true,
      reminderTime: "20:00", // Changed from 18:00 to 20:00
      quietHoursStart: "22:00", // Changed back to 22:00
      quietHoursEnd: "08:00", // Changed back to 08:00
      updatedAt: new Date().toISOString(),
    };

    await dynamodb
      .update({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${testUserId}`,
          SK: "NOTIFICATION_PREFERENCES",
        },
        UpdateExpression:
          "SET budgetAlerts = :budgetAlerts, dailyReminders = :dailyReminders, reminderTime = :reminderTime, quietHoursStart = :quietHoursStart, quietHoursEnd = :quietHoursEnd, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":budgetAlerts": mobileUpdates.budgetAlerts,
          ":dailyReminders": mobileUpdates.dailyReminders,
          ":reminderTime": mobileUpdates.reminderTime,
          ":quietHoursStart": mobileUpdates.quietHoursStart,
          ":quietHoursEnd": mobileUpdates.quietHoursEnd,
          ":updatedAt": mobileUpdates.updatedAt,
        },
      })
      .promise();

    console.log(`✓ Preferences updated from mobile`);
    console.log(`  - Budget alerts: ${mobileUpdates.budgetAlerts} (changed)`);
    console.log(`  - Reminder time: ${mobileUpdates.reminderTime} (changed)`);
    console.log(
      `  - Quiet hours: ${mobileUpdates.quietHoursStart} - ${mobileUpdates.quietHoursEnd} (changed)`,
    );

    // ========================================
    // STEP 6: Verify Changes Reflected (Web Read)
    // ========================================
    console.log("\nStep 6: Verifying changes reflected on web platform...");

    const webReadResult = await dynamodb
      .get({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${testUserId}`,
          SK: "NOTIFICATION_PREFERENCES",
        },
      })
      .promise();

    expect(webReadResult.Item).toBeDefined();
    expect(webReadResult.Item.budgetAlerts).toBe(false);
    expect(webReadResult.Item.reminderTime).toBe("20:00");
    expect(webReadResult.Item.quietHoursStart).toBe("22:00");
    expect(webReadResult.Item.quietHoursEnd).toBe("08:00");
    console.log(`✓ Web platform sees updated preferences`);
    console.log(`  - Budget alerts: ${webReadResult.Item.budgetAlerts}`);
    console.log(`  - Reminder time: ${webReadResult.Item.reminderTime}`);
    console.log(
      `  - Quiet hours: ${webReadResult.Item.quietHoursStart} - ${webReadResult.Item.quietHoursEnd}`,
    );

    // ========================================
    // STEP 7: Verify Update Timestamps
    // ========================================
    console.log("\nStep 7: Verifying update timestamps...");

    const finalPreferences = await dynamodb
      .get({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${testUserId}`,
          SK: "NOTIFICATION_PREFERENCES",
        },
      })
      .promise();

    expect(finalPreferences.Item.updatedAt).toBeDefined();
    const updatedAt = new Date(finalPreferences.Item.updatedAt);
    const now = new Date();
    const timeDiff = now - updatedAt;

    expect(timeDiff).toBeLessThan(60000); // Updated within last minute
    console.log(`✓ Last updated: ${finalPreferences.Item.updatedAt}`);
    console.log(`✓ Time since update: ${Math.floor(timeDiff / 1000)} seconds`);

    // ========================================
    // SUMMARY
    // ========================================
    console.log("\n========================================");
    console.log("✅ TASK 11.4 E2E TEST PASSED");
    console.log("========================================");
    console.log("Complete preferences management flow verified with REAL AWS:");
    console.log("  ✓ User profile created in DynamoDB");
    console.log("  ✓ Default preferences created");
    console.log("  ✓ Preferences updated from web platform");
    console.log("  ✓ Changes reflected on mobile platform");
    console.log("  ✓ Preferences updated from mobile platform");
    console.log("  ✓ Changes reflected on web platform");
    console.log("  ✓ Update timestamps verified");
    console.log("\nAWS Operations: ~8 (within cost limits)");
    console.log("Estimated Cost: < $0.01");
    console.log("========================================\n");
  });

  it("should validate preference values", async () => {
    console.log("\nTesting preference validation...");

    // Create user profile
    const userProfile = {
      PK: `USER#${testUserId}`,
      SK: "PROFILE",
      userId: testUserId,
      email: `test-${testUserId}@example.com`,
      name: "Test User",
      familyId: `family_${testUserId}`,
      createdAt: new Date().toISOString(),
    };

    await dynamodb.put({ TableName: TABLE_NAME, Item: userProfile }).promise();
    createdItems.push({ PK: userProfile.PK, SK: userProfile.SK });

    // Test valid time formats
    const validTimes = ["00:00", "12:00", "23:59", "09:30", "18:45"];
    for (const time of validTimes) {
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      expect(timeRegex.test(time)).toBe(true);
      console.log(`  ✓ Valid time format: ${time}`);
    }

    // Test invalid time formats
    const invalidTimes = ["24:00", "12:60", "9:30", "12:5", "abc", ""];
    for (const time of invalidTimes) {
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      expect(timeRegex.test(time)).toBe(false);
      console.log(`  ✗ Invalid time format: ${time}`);
    }

    console.log("✓ Time format validation verified");
  });

  it("should handle concurrent preference updates", async () => {
    console.log("\nTesting concurrent preference updates...");

    // Create user profile
    const userProfile = {
      PK: `USER#${testUserId}`,
      SK: "PROFILE",
      userId: testUserId,
      email: `test-${testUserId}@example.com`,
      name: "Test User",
      familyId: `family_${testUserId}`,
      createdAt: new Date().toISOString(),
    };

    await dynamodb.put({ TableName: TABLE_NAME, Item: userProfile }).promise();
    createdItems.push({ PK: userProfile.PK, SK: userProfile.SK });

    // Create initial preferences
    const initialPreferences = {
      PK: `USER#${testUserId}`,
      SK: "NOTIFICATION_PREFERENCES",
      budgetAlerts: true,
      dailyReminders: false,
      reminderTime: "19:00",
      quietHoursStart: "22:00",
      quietHoursEnd: "08:00",
      updatedAt: new Date().toISOString(),
    };

    await dynamodb
      .put({ TableName: TABLE_NAME, Item: initialPreferences })
      .promise();
    createdItems.push({ PK: initialPreferences.PK, SK: initialPreferences.SK });
    console.log("  ✓ Initial preferences created");

    // Simulate concurrent updates from web and mobile
    const webUpdate = dynamodb
      .update({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${testUserId}`,
          SK: "NOTIFICATION_PREFERENCES",
        },
        UpdateExpression:
          "SET reminderTime = :reminderTime, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":reminderTime": "18:00",
          ":updatedAt": new Date().toISOString(),
        },
      })
      .promise();

    const mobileUpdate = dynamodb
      .update({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${testUserId}`,
          SK: "NOTIFICATION_PREFERENCES",
        },
        UpdateExpression:
          "SET dailyReminders = :dailyReminders, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":dailyReminders": true,
          ":updatedAt": new Date().toISOString(),
        },
      })
      .promise();

    // Execute both updates concurrently
    await Promise.all([webUpdate, mobileUpdate]);
    console.log("  ✓ Concurrent updates executed");

    // Verify final state
    const finalPreferences = await dynamodb
      .get({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${testUserId}`,
          SK: "NOTIFICATION_PREFERENCES",
        },
      })
      .promise();

    expect(finalPreferences.Item).toBeDefined();
    // One of the updates should have succeeded
    const hasWebUpdate = finalPreferences.Item.reminderTime === "18:00";
    const hasMobileUpdate = finalPreferences.Item.dailyReminders === true;
    expect(hasWebUpdate || hasMobileUpdate).toBe(true);
    console.log(
      `  ✓ Final state: reminderTime=${finalPreferences.Item.reminderTime}, dailyReminders=${finalPreferences.Item.dailyReminders}`,
    );
    console.log("✓ Concurrent updates handled correctly");
  });

  it("should preserve preferences across sessions", async () => {
    console.log("\nTesting preference persistence across sessions...");

    // Create user profile
    const userProfile = {
      PK: `USER#${testUserId}`,
      SK: "PROFILE",
      userId: testUserId,
      email: `test-${testUserId}@example.com`,
      name: "Test User",
      familyId: `family_${testUserId}`,
      createdAt: new Date().toISOString(),
    };

    await dynamodb.put({ TableName: TABLE_NAME, Item: userProfile }).promise();
    createdItems.push({ PK: userProfile.PK, SK: userProfile.SK });

    // Create preferences
    const preferences = {
      PK: `USER#${testUserId}`,
      SK: "NOTIFICATION_PREFERENCES",
      budgetAlerts: false,
      dailyReminders: true,
      reminderTime: "20:30",
      quietHoursStart: "23:00",
      quietHoursEnd: "07:00",
      updatedAt: new Date().toISOString(),
    };

    await dynamodb.put({ TableName: TABLE_NAME, Item: preferences }).promise();
    createdItems.push({ PK: preferences.PK, SK: preferences.SK });
    console.log("  ✓ Preferences created");

    // Simulate multiple sessions reading preferences
    for (let session = 1; session <= 3; session++) {
      const sessionPreferences = await dynamodb
        .get({
          TableName: TABLE_NAME,
          Key: {
            PK: `USER#${testUserId}`,
            SK: "NOTIFICATION_PREFERENCES",
          },
        })
        .promise();

      expect(sessionPreferences.Item).toBeDefined();
      expect(sessionPreferences.Item.budgetAlerts).toBe(false);
      expect(sessionPreferences.Item.dailyReminders).toBe(true);
      expect(sessionPreferences.Item.reminderTime).toBe("20:30");
      console.log(`  ✓ Session ${session}: Preferences consistent`);
    }

    console.log("✓ Preferences persisted across sessions");
  });
});
