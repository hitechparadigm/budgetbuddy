/**
 * Create Test User with Proper Cognito Attributes
 *
 * This script creates a test user in Cognito with all required custom attributes
 * to avoid the 500 errors when loading budgets.
 */

const {
    CognitoIdentityProviderClient,
    AdminCreateUserCommand,
    AdminSetUserPasswordCommand
} = require('@aws-sdk/client-cognito-identity-provider');
const {
    DynamoDBClient
} = require('@aws-sdk/client-dynamodb');
const {
    DynamoDBDocumentClient,
    PutCommand
} = require('@aws-sdk/lib-dynamodb');

const USER_POOL_ID = 'us-east-1_LAkOBLENO';
const TABLE_NAME = 'budgetbuddy-main';
const REGION = 'us-east-1';

// Test user details
const TEST_USER = {
    email: 'test@budgetbuddy.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
};

async function createTestUser() {
    const cognitoClient = new CognitoIdentityProviderClient({
        region: REGION
    });
    const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({
        region: REGION
    }));

    try {
        console.log('Creating test user in Cognito...');

        // Generate userId
        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const familyId = `family_${userId}`;

        // Create user in Cognito with custom attributes
        const createUserCommand = new AdminCreateUserCommand({
            UserPoolId: USER_POOL_ID,
            Username: userId,
            UserAttributes: [{
                    Name: 'email',
                    Value: TEST_USER.email
                },
                {
                    Name: 'email_verified',
                    Value: 'true'
                },
                {
                    Name: 'given_name',
                    Value: TEST_USER.firstName
                },
                {
                    Name: 'family_name',
                    Value: TEST_USER.lastName
                },
                {
                    Name: 'custom:userId',
                    Value: userId
                },
                {
                    Name: 'custom:familyId',
                    Value: familyId
                },
                {
                    Name: 'custom:familyRole',
                    Value: 'primary'
                },
                {
                    Name: 'custom:accountType',
                    Value: 'single'
                },
                {
                    Name: 'custom:subscriptionTier',
                    Value: 'free'
                },
                {
                    Name: 'custom:onboardingCompleted',
                    Value: 'false'
                },
                {
                    Name: 'custom:country',
                    Value: 'US'
                },
            ],
            MessageAction: 'SUPPRESS',
            TemporaryPassword: TEST_USER.password,
        });

        await cognitoClient.send(createUserCommand);
        console.log('✅ User created in Cognito');

        // Set permanent password
        const setPasswordCommand = new AdminSetUserPasswordCommand({
            UserPoolId: USER_POOL_ID,
            Username: userId,
            Password: TEST_USER.password,
            Permanent: true,
        });

        await cognitoClient.send(setPasswordCommand);
        console.log('✅ Password set');

        // Create user profile in DynamoDB
        const userProfile = {
            PK: `USER#${userId}`,
            SK: 'PROFILE',
            GSI1PK: `FAMILY#${familyId}`,
            GSI1SK: `USER#${userId}`,
            entityType: 'USER',
            userId,
            email: TEST_USER.email,
            firstName: TEST_USER.firstName,
            lastName: TEST_USER.lastName,
            familyId,
            role: 'primary',
            subscriptionTier: 'free',
            accountType: 'single',
            onboardingCompleted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        await dynamoClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: userProfile,
        }));
        console.log('✅ User profile created in DynamoDB');

        // Create family entity
        const familyEntity = {
            PK: `FAMILY#${familyId}`,
            SK: 'METADATA',
            entityType: 'FAMILY',
            familyId,
            familyName: `${TEST_USER.firstName} ${TEST_USER.lastName}'s Family`,
            primaryUserId: userId,
            memberIds: [userId],
            familyStatus: 'single',
            adults: 1,
            children: [],
            createdAt: new Date().toISOString(),
        };

        await dynamoClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: familyEntity,
        }));
        console.log('✅ Family entity created in DynamoDB');

        console.log('\n🎉 Test user created successfully!');
        console.log('\n📋 Login Credentials:');
        console.log(`   Email: ${TEST_USER.email}`);
        console.log(`   Password: ${TEST_USER.password}`);
        console.log(`\n   User ID: ${userId}`);
        console.log(`   Family ID: ${familyId}`);
        console.log('\n✨ You can now login with these credentials at http://localhost:5173/');

    } catch (error) {
        console.error('❌ Error creating test user:', error);
        throw error;
    }
}

// Run the script
createTestUser().catch(console.error);