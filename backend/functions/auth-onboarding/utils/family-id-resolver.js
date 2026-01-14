/**
 * Family ID Resolution Utility for auth-onboarding Lambda
 *
 * Provides consistent family ID resolution to prevent partition key mismatches.
 * Extracted from common utils layer to keep the function self-contained.
 *
 * Resolution order:
 * 1. JWT token familyId (if available)
 * 2. DynamoDB user profile lookup
 * 3. Fallback pattern: family_${userId}
 */

/**
 * Resolve familyId consistently
 * @param {string} userId - User ID from JWT token
 * @param {string|null} jwtFamilyId - Family ID from JWT token (may be null)
 * @param {Object} dynamoHelpers - DynamoDB helper functions
 * @returns {Promise<string>} Resolved family ID
 */
async function resolveFamilyId(
  userId,
  jwtFamilyId = null,
  dynamoHelpers = null
) {
  const startTime = Date.now();

  console.log("FamilyIdResolver.resolveFamilyId started", {
    userId,
    jwtFamilyId,
    hasDynamoHelpers: !!dynamoHelpers,
    timestamp: new Date().toISOString(),
  });

  try {
    // Step 1: Try JWT familyId if available
    if (jwtFamilyId) {
      console.log("Using familyId from JWT token", {
        userId,
        familyId: jwtFamilyId,
        source: "jwt",
        resolutionTimeMs: Date.now() - startTime,
      });

      logFamilyIdResolution(
        "auth-onboarding",
        "resolve-family-id",
        userId,
        jwtFamilyId,
        "jwt"
      );
      return jwtFamilyId;
    }

    // Step 2: Lookup familyId from user profile in DynamoDB
    if (dynamoHelpers) {
      try {
        console.log("Looking up familyId from DynamoDB user profile", {
          userId,
          userProfileKey: `USER#${userId}`,
          sortKey: "PROFILE",
        });

        const userProfile = await dynamoHelpers.getItem(
          `USER#${userId}`,
          "PROFILE"
        );

        if (
          userProfile?.familyId &&
          typeof userProfile.familyId === "string" &&
          userProfile.familyId.trim().length > 0
        ) {
          console.log("Using familyId from DynamoDB profile", {
            userId,
            familyId: userProfile.familyId,
            source: "dynamodb",
            resolutionTimeMs: Date.now() - startTime,
          });

          logFamilyIdResolution(
            "auth-onboarding",
            "resolve-family-id",
            userId,
            userProfile.familyId,
            "dynamodb"
          );
          return userProfile.familyId;
        } else {
          console.warn("User profile found but no valid familyId field", {
            userId,
            profileExists: !!userProfile,
            profileKeys: userProfile ? Object.keys(userProfile) : [],
            familyIdType: userProfile?.familyId
              ? typeof userProfile.familyId
              : "undefined",
            familyIdValue: userProfile?.familyId,
          });
        }
      } catch (error) {
        console.error("Failed to lookup familyId from DynamoDB", error, {
          userId,
          userProfileKey: `USER#${userId}`,
          sortKey: "PROFILE",
        });
      }
    } else {
      console.warn("No DynamoDB helpers provided, skipping profile lookup", {
        userId,
      });
    }

    // Step 3: Consistent fallback pattern
    const fallbackFamilyId = `family_${userId}`;
    console.log("Using fallback familyId pattern", {
      userId,
      familyId: fallbackFamilyId,
      source: "fallback",
      resolutionTimeMs: Date.now() - startTime,
    });

    logFamilyIdResolution(
      "auth-onboarding",
      "resolve-family-id",
      userId,
      fallbackFamilyId,
      "fallback"
    );
    return fallbackFamilyId;
  } catch (error) {
    console.error("Critical error in FamilyIdResolver.resolveFamilyId", error, {
      userId,
      jwtFamilyId,
      resolutionTimeMs: Date.now() - startTime,
    });

    // Even in error case, return consistent fallback
    const fallbackFamilyId = `family_${userId}`;
    console.warn("Returning fallback familyId due to error", {
      userId,
      familyId: fallbackFamilyId,
      source: "error-fallback",
    });

    return fallbackFamilyId;
  }
}

/**
 * Log family ID resolution for debugging and monitoring
 * @param {string} service - Service name (auth-onboarding)
 * @param {string} operation - Operation name (onboarding, resolve-family-id, etc.)
 * @param {string} userId - User ID
 * @param {string} familyId - Resolved family ID
 * @param {'jwt'|'dynamodb'|'fallback'} source - Resolution source
 */
function logFamilyIdResolution(service, operation, userId, familyId, source) {
  const logData = {
    service,
    operation,
    userId,
    familyId,
    source,
    partitionKey: `FAMILY#${familyId}`,
    timestamp: new Date().toISOString(),
  };

  // Use structured logging for easy CloudWatch filtering
  console.log("FAMILY_ID_RESOLUTION:", JSON.stringify(logData, null, 2));
}

module.exports = {
  resolveFamilyId,
  logFamilyIdResolution,
};
