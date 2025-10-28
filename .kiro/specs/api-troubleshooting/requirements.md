# API Troubleshooting and Resolution Requirements Document

## Introduction

This specification addresses the critical 500 Internal Server Error responses affecting the BudgetBuddy application's budget endpoints. CloudWatch logs reveal the specific error: "Invalid KeyConditionExpression: An expression attribute value used in expression is not defined; attribute value: :pk" occurring in the queryByPK function. While the utils.js file contains the correct fix, the Lambda layer appears to be using an outdated version, requiring a forced rebuild and redeployment.

## Glossary

- **Budget_Handler**: The Lambda function handling budget-related HTTP requests (/v1/budget endpoints)
- **Budget_API**: The specific API endpoints for budget CRUD operations (/v1/budget, /v1/budget/current)
- **Lambda_Layer**: The shared code layer containing common utilities including DynamoDB operations
- **DynamoDB_Utils**: The utility functions in the Lambda layer for database operations (queryByPK function)
- **ValidationException**: The specific DynamoDB error occurring when ExpressionAttributeValues are improperly merged
- **CloudWatch_Logs**: AWS logging service showing the exact error: "attribute value: :pk" not defined
- **Layer_Deployment**: The process of updating Lambda layers with latest code changes
- **CDK_Cache**: The CDK deployment cache that may prevent layer updates from being applied

## Requirements

### Requirement 1: Lambda Layer Deployment Issue Diagnosis

**User Story:** As a developer, I want to confirm that the Lambda layer is using the latest version of utils.js with the corrected queryByPK function, so that the ValidationException error is resolved.

#### Acceptance Criteria

1. WHEN investigating the ValidationException error, THE CloudWatch_Logs SHALL confirm the error occurs at line 243 in /opt/nodejs/utils.js during queryByPK execution
2. THE Lambda_Layer SHALL be verified to contain the latest version of utils.js with proper ExpressionAttributeValues merging: `':pk': pk, ...(options.ExpressionAttributeValues || {})`
3. THE Budget_Handler SHALL validate that the attached Lambda_Layer version matches the latest deployed layer version
4. WHEN the layer is outdated, THE Layer_Deployment SHALL force a rebuild by modifying layer files and clearing CDK_Cache
5. THE Budget_Handler SHALL verify that after layer update, the queryByPK function no longer throws ValidationException for :pk parameter

### Requirement 2: Forced Lambda Layer Rebuild and Deployment

**User Story:** As a DevOps engineer, I want to force a complete rebuild and redeployment of the Lambda layer, so that the Budget_Handler uses the corrected queryByPK function and stops throwing ValidationException errors.

#### Acceptance Criteria

1. THE Layer_Deployment SHALL force a rebuild by appending a timestamp to utils.js to trigger CDK change detection
2. WHEN rebuilding the layer, THE CDK_Cache SHALL be cleared using `Remove-Item -Recurse -Force cdk.out` to prevent cached deployments
3. THE Layer_Deployment SHALL use the `--force` flag in CDK deployment to ensure fresh layer creation: `npx cdk deploy budgetbuddy-dev-api --require-approval never --force`
4. THE Budget_Handler SHALL be updated to use the new layer version automatically after successful deployment
5. WHEN the layer is successfully updated, THE Budget_Handler SHALL execute queryByPK operations without ValidationException errors

### Requirement 3: DynamoDB Query Function Validation

**User Story:** As a developer, I want to verify that the queryByPK function correctly merges ExpressionAttributeValues, so that DynamoDB queries execute successfully without ValidationException errors.

#### Acceptance Criteria

1. THE DynamoDB_Utils queryByPK function SHALL use the corrected syntax: `ExpressionAttributeValues: { ':pk': pk, ...(options.ExpressionAttributeValues || {}) }`
2. WHEN the getBudgets function calls queryByPK with FilterExpression options, THE DynamoDB_Utils SHALL properly merge the :pk parameter with additional expression values
3. THE Budget_Handler SHALL successfully execute `queryByPK('FAMILY#family_userId', { FilterExpression: 'entityType = :entityType', ExpressionAttributeValues: { ':entityType': 'BUDGET' } })`
4. THE DynamoDB_Utils SHALL maintain the :pk parameter while adding additional ExpressionAttributeValues from the options parameter
5. WHEN queryByPK executes successfully, THE Budget_Handler SHALL return budget data without ValidationException errors

### Requirement 4: Budget API Endpoint Recovery

**User Story:** As a frontend developer, I want the budget API endpoints to return successful responses, so that the BudgetContext can load budget data and the dashboard displays properly.

#### Acceptance Criteria

1. THE Budget_API GET /budget endpoint SHALL return HTTP 200 status with an array of budgets for the authenticated user's family
2. WHEN the getBudgets function executes, THE Budget_API SHALL successfully query DynamoDB without ValidationException errors
3. THE Budget_API SHALL return the expected response format: `{ success: true, data: { budgets: [...], count: N }, message: "Budgets retrieved successfully" }`
4. THE Budget_API SHALL handle empty budget results gracefully, returning an empty array instead of throwing errors
5. THE Budget_API SHALL include proper CORS headers and maintain consistent response structure across all budget endpoints

### Requirement 5: End-to-End Budget Operations Validation

**User Story:** As a user, I want to successfully perform all budget operations including viewing, creating, and updating budgets, so that I can manage my family finances through the web application without encountering 500 errors.

#### Acceptance Criteria

1. WHEN accessing the dashboard at localhost:5173, THE Budget_API SHALL successfully load existing budgets via GET /v1/budget without ValidationException errors
2. THE Budget_API SHALL support creating new budgets for months that don't exist, automatically initializing default income, savings, and expense groups
3. WHEN adding budget items through the addBudgetItem operation, THE Budget_API SHALL successfully update budget data via PUT /v1/budget/{budgetId}
4. THE Budget_API SHALL handle the seamless budget item management flow where users can add categories and amounts without pre-creating budget structures
5. THE Budget_API SHALL eliminate the "ApiClientError: An error occurred processing your request" messages by resolving the underlying DynamoDB ValidationException

### Requirement 6: Error Monitoring and Alerting

**User Story:** As a system administrator, I want comprehensive error monitoring, so that I can quickly identify and respond to API issues before they impact users.

#### Acceptance Criteria

1. THE API_Service SHALL log all errors to CloudWatch_Logs with appropriate log levels
2. THE Error_Handler SHALL capture error metrics for monitoring and alerting
3. WHEN critical errors occur, THE API_Service SHALL trigger appropriate alerts for immediate attention
4. THE CloudWatch_Logs SHALL include request tracing information for debugging complex issues
5. THE API_Service SHALL provide health check endpoints for monitoring system status

### Requirement 6: Post-Deployment Verification and Testing

**User Story:** As a DevOps engineer, I want to verify that the Lambda layer deployment successfully resolves the ValidationException errors, so that the budget API operates reliably for all users.

#### Acceptance Criteria

1. THE Budget_Handler SHALL be tested immediately after layer deployment to confirm queryByPK operations execute without ValidationException errors
2. THE CloudWatch_Logs SHALL show successful budget queries with proper log messages instead of ValidationException stack traces
3. WHEN testing the budget health endpoint, THE Budget_API SHALL return HTTP 200 status: `{ success: true, data: { status: "healthy", service: "budget", version: "1.0.0" } }`
4. THE Budget_API SHALL successfully handle GET /v1/budget requests and return budget data or empty arrays without throwing 500 errors
5. THE Budget_Handler SHALL maintain consistent performance and reliability after the layer update, with no regression in functionality
