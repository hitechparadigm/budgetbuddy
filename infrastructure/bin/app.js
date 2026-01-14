#!/usr/bin/env node
"use strict";
/**
 * AWS CDK Application Entry Point for BudgetBuddy
 *
 * This file initializes the CDK app and creates all the necessary stacks
 * for the BudgetBuddy application infrastructure.
 *
 * Stacks created:
 * - DatabaseStack: DynamoDB tables and indexes
 * - AuthStack: Cognito User Pools and Identity Pools
 * - ApiStack: API Gateway and Lambda functions
 * - HostingStack: S3 buckets and CloudFront distributions
 * - MonitoringStack: CloudWatch dashboards and alarms
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const cdk = __importStar(require("aws-cdk-lib"));
const database_stack_1 = require("../lib/database-stack");
const auth_stack_1 = require("../lib/auth-stack");
const auth_onboarding_stack_1 = require("../lib/auth-onboarding-stack");
const api_stack_1 = require("../lib/api-stack");
const hosting_stack_1 = require("../lib/hosting-stack");
const monitoring_stack_1 = require("../lib/monitoring-stack");
// Initialize the CDK application
const app = new cdk.App();
// Get environment configuration from context or environment variables
const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};
// Environment-specific stack naming with budgetbuddy prefix
const envName = app.node.tryGetContext('environment') || 'dev';
const stackPrefix = `budgetbuddy-${envName}`;
/**
 * Database Stack - DynamoDB tables and indexes
 * Contains the main application data storage with single-table design
 */
const databaseStack = new database_stack_1.DatabaseStack(app, `${stackPrefix}-database`, {
    env,
    description: 'BudgetBuddy database infrastructure with DynamoDB single-table design for cost-optimized data storage',
});
/**
 * Authentication Stack - Cognito User Pools
 * Handles user authentication and authorization
 */
const authStack = new auth_stack_1.AuthStack(app, `${stackPrefix}-auth`, {
    env,
    description: 'BudgetBuddy authentication infrastructure with Cognito User Pools for secure user management',
});
/**
 * Auth Onboarding Stack - Standalone Lambda for onboarding
 * Part of architectural refactoring to split monolithic auth Lambda
 */
const authOnboardingStack = new auth_onboarding_stack_1.AuthOnboardingStack(app, `${stackPrefix}-auth-onboarding`, {
    env,
    description: 'BudgetBuddy auth onboarding Lambda - standalone function for user onboarding completion',
    table: databaseStack.table,
    authSharedLayer: authStack.authSharedLayer,
});
/**
 * API Stack - API Gateway and Lambda functions
 * Contains all backend business logic and API endpoints
 * Depends on database and auth stacks
 */
const apiStack = new api_stack_1.ApiStack(app, `${stackPrefix}-api`, {
    env,
    description: 'BudgetBuddy serverless API infrastructure with Lambda functions and API Gateway',
    // Pass resources from other stacks
    table: databaseStack.table,
    userPool: authStack.userPool,
    userPoolClient: authStack.userPoolClient,
    authOnboardingFunction: authOnboardingStack.onboardingFunction,
});
/**
 * Hosting Stack - S3 and CloudFront
 * Hosts the web application and admin dashboard
 */
const hostingStack = new hosting_stack_1.HostingStack(app, `${stackPrefix}-hosting`, {
    env,
    description: 'BudgetBuddy hosting infrastructure with S3 static hosting and CloudFront CDN for global performance',
});
/**
 * Monitoring Stack - CloudWatch dashboards and alarms
 * Provides observability and alerting for the application
 * Depends on all other stacks for resource references
 */
const monitoringStack = new monitoring_stack_1.MonitoringStack(app, `${stackPrefix}-monitoring`, {
    env,
    description: 'BudgetBuddy monitoring and alerting infrastructure with CloudWatch dashboards and cost tracking',
    // Pass resources from other stacks for monitoring
    table: databaseStack.table,
    userPool: authStack.userPool,
    api: apiStack.api,
});
// Add stack dependencies to ensure proper deployment order
authOnboardingStack.addDependency(databaseStack);
authOnboardingStack.addDependency(authStack);
apiStack.addDependency(databaseStack);
apiStack.addDependency(authStack);
apiStack.addDependency(authOnboardingStack);
monitoringStack.addDependency(databaseStack);
monitoringStack.addDependency(authStack);
monitoringStack.addDependency(apiStack);
// Add comprehensive tags to all resources for cost tracking and organization
cdk.Tags.of(app).add('Project', 'BudgetBuddy');
cdk.Tags.of(app).add('Application', 'budgetbuddy');
cdk.Tags.of(app).add('Environment', envName);
cdk.Tags.of(app).add('ManagedBy', 'CDK');
cdk.Tags.of(app).add('Owner', 'BudgetBuddy-Team');
cdk.Tags.of(app).add('CostCenter', 'BudgetBuddy-Infrastructure');
cdk.Tags.of(app).add('Purpose', 'Family-Budgeting-Application');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBRUE7Ozs7Ozs7Ozs7OztHQVlHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILHVDQUFxQztBQUNyQyxpREFBbUM7QUFHbkMsMERBQXNEO0FBQ3RELGtEQUE4QztBQUM5Qyx3RUFBbUU7QUFDbkUsZ0RBQTRDO0FBQzVDLHdEQUFvRDtBQUNwRCw4REFBMEQ7QUFFMUQsaUNBQWlDO0FBQ2pDLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBRTFCLHNFQUFzRTtBQUN0RSxNQUFNLEdBQUcsR0FBRztJQUNWLE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQjtJQUN4QyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsSUFBSSxXQUFXO0NBQ3RELENBQUM7QUFFRiw0REFBNEQ7QUFDNUQsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDO0FBQy9ELE1BQU0sV0FBVyxHQUFHLGVBQWUsT0FBTyxFQUFFLENBQUM7QUFFN0M7OztHQUdHO0FBQ0gsTUFBTSxhQUFhLEdBQUcsSUFBSSw4QkFBYSxDQUFDLEdBQUcsRUFBRSxHQUFHLFdBQVcsV0FBVyxFQUFFO0lBQ3RFLEdBQUc7SUFDSCxXQUFXLEVBQUUsdUdBQXVHO0NBQ3JILENBQUMsQ0FBQztBQUVIOzs7R0FHRztBQUNILE1BQU0sU0FBUyxHQUFHLElBQUksc0JBQVMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxXQUFXLE9BQU8sRUFBRTtJQUMxRCxHQUFHO0lBQ0gsV0FBVyxFQUFFLDhGQUE4RjtDQUM1RyxDQUFDLENBQUM7QUFFSDs7O0dBR0c7QUFDSCxNQUFNLG1CQUFtQixHQUFHLElBQUksMkNBQW1CLENBQUMsR0FBRyxFQUFFLEdBQUcsV0FBVyxrQkFBa0IsRUFBRTtJQUN6RixHQUFHO0lBQ0gsV0FBVyxFQUFFLHlGQUF5RjtJQUN0RyxLQUFLLEVBQUUsYUFBYSxDQUFDLEtBQUs7SUFDMUIsZUFBZSxFQUFFLFNBQVMsQ0FBQyxlQUFlO0NBQzNDLENBQUMsQ0FBQztBQUVIOzs7O0dBSUc7QUFDSCxNQUFNLFFBQVEsR0FBRyxJQUFJLG9CQUFRLENBQUMsR0FBRyxFQUFFLEdBQUcsV0FBVyxNQUFNLEVBQUU7SUFDdkQsR0FBRztJQUNILFdBQVcsRUFBRSxpRkFBaUY7SUFDOUYsbUNBQW1DO0lBQ25DLEtBQUssRUFBRSxhQUFhLENBQUMsS0FBSztJQUMxQixRQUFRLEVBQUUsU0FBUyxDQUFDLFFBQVE7SUFDNUIsY0FBYyxFQUFFLFNBQVMsQ0FBQyxjQUFjO0lBQ3hDLHNCQUFzQixFQUFFLG1CQUFtQixDQUFDLGtCQUFrQjtDQUMvRCxDQUFDLENBQUM7QUFFSDs7O0dBR0c7QUFDSCxNQUFNLFlBQVksR0FBRyxJQUFJLDRCQUFZLENBQUMsR0FBRyxFQUFFLEdBQUcsV0FBVyxVQUFVLEVBQUU7SUFDbkUsR0FBRztJQUNILFdBQVcsRUFBRSxxR0FBcUc7Q0FDbkgsQ0FBQyxDQUFDO0FBRUg7Ozs7R0FJRztBQUNILE1BQU0sZUFBZSxHQUFHLElBQUksa0NBQWUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxXQUFXLGFBQWEsRUFBRTtJQUM1RSxHQUFHO0lBQ0gsV0FBVyxFQUFFLGlHQUFpRztJQUM5RyxrREFBa0Q7SUFDbEQsS0FBSyxFQUFFLGFBQWEsQ0FBQyxLQUFLO0lBQzFCLFFBQVEsRUFBRSxTQUFTLENBQUMsUUFBUTtJQUM1QixHQUFHLEVBQUUsUUFBUSxDQUFDLEdBQUc7Q0FDbEIsQ0FBQyxDQUFDO0FBRUgsMkRBQTJEO0FBQzNELG1CQUFtQixDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUNqRCxtQkFBbUIsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDN0MsUUFBUSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUN0QyxRQUFRLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ2xDLFFBQVEsQ0FBQyxhQUFhLENBQUMsbUJBQW1CLENBQUMsQ0FBQztBQUM1QyxlQUFlLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQzdDLGVBQWUsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDekMsZUFBZSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUV4Qyw2RUFBNkU7QUFDN0UsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxhQUFhLENBQUMsQ0FBQztBQUMvQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLGFBQWEsQ0FBQyxDQUFDO0FBQ25ELEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDN0MsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUN6QyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLGtCQUFrQixDQUFDLENBQUM7QUFDbEQsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSw0QkFBNEIsQ0FBQyxDQUFDO0FBQ2pFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsOEJBQThCLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcclxuXHJcbi8qKlxyXG4gKiBBV1MgQ0RLIEFwcGxpY2F0aW9uIEVudHJ5IFBvaW50IGZvciBCdWRnZXRCdWRkeVxyXG4gKlxyXG4gKiBUaGlzIGZpbGUgaW5pdGlhbGl6ZXMgdGhlIENESyBhcHAgYW5kIGNyZWF0ZXMgYWxsIHRoZSBuZWNlc3Nhcnkgc3RhY2tzXHJcbiAqIGZvciB0aGUgQnVkZ2V0QnVkZHkgYXBwbGljYXRpb24gaW5mcmFzdHJ1Y3R1cmUuXHJcbiAqXHJcbiAqIFN0YWNrcyBjcmVhdGVkOlxyXG4gKiAtIERhdGFiYXNlU3RhY2s6IER5bmFtb0RCIHRhYmxlcyBhbmQgaW5kZXhlc1xyXG4gKiAtIEF1dGhTdGFjazogQ29nbml0byBVc2VyIFBvb2xzIGFuZCBJZGVudGl0eSBQb29sc1xyXG4gKiAtIEFwaVN0YWNrOiBBUEkgR2F0ZXdheSBhbmQgTGFtYmRhIGZ1bmN0aW9uc1xyXG4gKiAtIEhvc3RpbmdTdGFjazogUzMgYnVja2V0cyBhbmQgQ2xvdWRGcm9udCBkaXN0cmlidXRpb25zXHJcbiAqIC0gTW9uaXRvcmluZ1N0YWNrOiBDbG91ZFdhdGNoIGRhc2hib2FyZHMgYW5kIGFsYXJtc1xyXG4gKi9cclxuXHJcbmltcG9ydCAnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJztcclxuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuXHJcbmRlY2xhcmUgY29uc3QgcHJvY2VzczogYW55O1xyXG5pbXBvcnQgeyBEYXRhYmFzZVN0YWNrIH0gZnJvbSAnLi4vbGliL2RhdGFiYXNlLXN0YWNrJztcclxuaW1wb3J0IHsgQXV0aFN0YWNrIH0gZnJvbSAnLi4vbGliL2F1dGgtc3RhY2snO1xyXG5pbXBvcnQgeyBBdXRoT25ib2FyZGluZ1N0YWNrIH0gZnJvbSAnLi4vbGliL2F1dGgtb25ib2FyZGluZy1zdGFjayc7XHJcbmltcG9ydCB7IEFwaVN0YWNrIH0gZnJvbSAnLi4vbGliL2FwaS1zdGFjayc7XHJcbmltcG9ydCB7IEhvc3RpbmdTdGFjayB9IGZyb20gJy4uL2xpYi9ob3N0aW5nLXN0YWNrJztcclxuaW1wb3J0IHsgTW9uaXRvcmluZ1N0YWNrIH0gZnJvbSAnLi4vbGliL21vbml0b3Jpbmctc3RhY2snO1xyXG5cclxuLy8gSW5pdGlhbGl6ZSB0aGUgQ0RLIGFwcGxpY2F0aW9uXHJcbmNvbnN0IGFwcCA9IG5ldyBjZGsuQXBwKCk7XHJcblxyXG4vLyBHZXQgZW52aXJvbm1lbnQgY29uZmlndXJhdGlvbiBmcm9tIGNvbnRleHQgb3IgZW52aXJvbm1lbnQgdmFyaWFibGVzXHJcbmNvbnN0IGVudiA9IHtcclxuICBhY2NvdW50OiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9BQ0NPVU5ULFxyXG4gIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfUkVHSU9OIHx8ICd1cy1lYXN0LTEnLFxyXG59O1xyXG5cclxuLy8gRW52aXJvbm1lbnQtc3BlY2lmaWMgc3RhY2sgbmFtaW5nIHdpdGggYnVkZ2V0YnVkZHkgcHJlZml4XHJcbmNvbnN0IGVudk5hbWUgPSBhcHAubm9kZS50cnlHZXRDb250ZXh0KCdlbnZpcm9ubWVudCcpIHx8ICdkZXYnO1xyXG5jb25zdCBzdGFja1ByZWZpeCA9IGBidWRnZXRidWRkeS0ke2Vudk5hbWV9YDtcclxuXHJcbi8qKlxyXG4gKiBEYXRhYmFzZSBTdGFjayAtIER5bmFtb0RCIHRhYmxlcyBhbmQgaW5kZXhlc1xyXG4gKiBDb250YWlucyB0aGUgbWFpbiBhcHBsaWNhdGlvbiBkYXRhIHN0b3JhZ2Ugd2l0aCBzaW5nbGUtdGFibGUgZGVzaWduXHJcbiAqL1xyXG5jb25zdCBkYXRhYmFzZVN0YWNrID0gbmV3IERhdGFiYXNlU3RhY2soYXBwLCBgJHtzdGFja1ByZWZpeH0tZGF0YWJhc2VgLCB7XHJcbiAgZW52LFxyXG4gIGRlc2NyaXB0aW9uOiAnQnVkZ2V0QnVkZHkgZGF0YWJhc2UgaW5mcmFzdHJ1Y3R1cmUgd2l0aCBEeW5hbW9EQiBzaW5nbGUtdGFibGUgZGVzaWduIGZvciBjb3N0LW9wdGltaXplZCBkYXRhIHN0b3JhZ2UnLFxyXG59KTtcclxuXHJcbi8qKlxyXG4gKiBBdXRoZW50aWNhdGlvbiBTdGFjayAtIENvZ25pdG8gVXNlciBQb29sc1xyXG4gKiBIYW5kbGVzIHVzZXIgYXV0aGVudGljYXRpb24gYW5kIGF1dGhvcml6YXRpb25cclxuICovXHJcbmNvbnN0IGF1dGhTdGFjayA9IG5ldyBBdXRoU3RhY2soYXBwLCBgJHtzdGFja1ByZWZpeH0tYXV0aGAsIHtcclxuICBlbnYsXHJcbiAgZGVzY3JpcHRpb246ICdCdWRnZXRCdWRkeSBhdXRoZW50aWNhdGlvbiBpbmZyYXN0cnVjdHVyZSB3aXRoIENvZ25pdG8gVXNlciBQb29scyBmb3Igc2VjdXJlIHVzZXIgbWFuYWdlbWVudCcsXHJcbn0pO1xyXG5cclxuLyoqXHJcbiAqIEF1dGggT25ib2FyZGluZyBTdGFjayAtIFN0YW5kYWxvbmUgTGFtYmRhIGZvciBvbmJvYXJkaW5nXHJcbiAqIFBhcnQgb2YgYXJjaGl0ZWN0dXJhbCByZWZhY3RvcmluZyB0byBzcGxpdCBtb25vbGl0aGljIGF1dGggTGFtYmRhXHJcbiAqL1xyXG5jb25zdCBhdXRoT25ib2FyZGluZ1N0YWNrID0gbmV3IEF1dGhPbmJvYXJkaW5nU3RhY2soYXBwLCBgJHtzdGFja1ByZWZpeH0tYXV0aC1vbmJvYXJkaW5nYCwge1xyXG4gIGVudixcclxuICBkZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IGF1dGggb25ib2FyZGluZyBMYW1iZGEgLSBzdGFuZGFsb25lIGZ1bmN0aW9uIGZvciB1c2VyIG9uYm9hcmRpbmcgY29tcGxldGlvbicsXHJcbiAgdGFibGU6IGRhdGFiYXNlU3RhY2sudGFibGUsXHJcbiAgYXV0aFNoYXJlZExheWVyOiBhdXRoU3RhY2suYXV0aFNoYXJlZExheWVyLFxyXG59KTtcclxuXHJcbi8qKlxyXG4gKiBBUEkgU3RhY2sgLSBBUEkgR2F0ZXdheSBhbmQgTGFtYmRhIGZ1bmN0aW9uc1xyXG4gKiBDb250YWlucyBhbGwgYmFja2VuZCBidXNpbmVzcyBsb2dpYyBhbmQgQVBJIGVuZHBvaW50c1xyXG4gKiBEZXBlbmRzIG9uIGRhdGFiYXNlIGFuZCBhdXRoIHN0YWNrc1xyXG4gKi9cclxuY29uc3QgYXBpU3RhY2sgPSBuZXcgQXBpU3RhY2soYXBwLCBgJHtzdGFja1ByZWZpeH0tYXBpYCwge1xyXG4gIGVudixcclxuICBkZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IHNlcnZlcmxlc3MgQVBJIGluZnJhc3RydWN0dXJlIHdpdGggTGFtYmRhIGZ1bmN0aW9ucyBhbmQgQVBJIEdhdGV3YXknLFxyXG4gIC8vIFBhc3MgcmVzb3VyY2VzIGZyb20gb3RoZXIgc3RhY2tzXHJcbiAgdGFibGU6IGRhdGFiYXNlU3RhY2sudGFibGUsXHJcbiAgdXNlclBvb2w6IGF1dGhTdGFjay51c2VyUG9vbCxcclxuICB1c2VyUG9vbENsaWVudDogYXV0aFN0YWNrLnVzZXJQb29sQ2xpZW50LFxyXG4gIGF1dGhPbmJvYXJkaW5nRnVuY3Rpb246IGF1dGhPbmJvYXJkaW5nU3RhY2sub25ib2FyZGluZ0Z1bmN0aW9uLFxyXG59KTtcclxuXHJcbi8qKlxyXG4gKiBIb3N0aW5nIFN0YWNrIC0gUzMgYW5kIENsb3VkRnJvbnRcclxuICogSG9zdHMgdGhlIHdlYiBhcHBsaWNhdGlvbiBhbmQgYWRtaW4gZGFzaGJvYXJkXHJcbiAqL1xyXG5jb25zdCBob3N0aW5nU3RhY2sgPSBuZXcgSG9zdGluZ1N0YWNrKGFwcCwgYCR7c3RhY2tQcmVmaXh9LWhvc3RpbmdgLCB7XHJcbiAgZW52LFxyXG4gIGRlc2NyaXB0aW9uOiAnQnVkZ2V0QnVkZHkgaG9zdGluZyBpbmZyYXN0cnVjdHVyZSB3aXRoIFMzIHN0YXRpYyBob3N0aW5nIGFuZCBDbG91ZEZyb250IENETiBmb3IgZ2xvYmFsIHBlcmZvcm1hbmNlJyxcclxufSk7XHJcblxyXG4vKipcclxuICogTW9uaXRvcmluZyBTdGFjayAtIENsb3VkV2F0Y2ggZGFzaGJvYXJkcyBhbmQgYWxhcm1zXHJcbiAqIFByb3ZpZGVzIG9ic2VydmFiaWxpdHkgYW5kIGFsZXJ0aW5nIGZvciB0aGUgYXBwbGljYXRpb25cclxuICogRGVwZW5kcyBvbiBhbGwgb3RoZXIgc3RhY2tzIGZvciByZXNvdXJjZSByZWZlcmVuY2VzXHJcbiAqL1xyXG5jb25zdCBtb25pdG9yaW5nU3RhY2sgPSBuZXcgTW9uaXRvcmluZ1N0YWNrKGFwcCwgYCR7c3RhY2tQcmVmaXh9LW1vbml0b3JpbmdgLCB7XHJcbiAgZW52LFxyXG4gIGRlc2NyaXB0aW9uOiAnQnVkZ2V0QnVkZHkgbW9uaXRvcmluZyBhbmQgYWxlcnRpbmcgaW5mcmFzdHJ1Y3R1cmUgd2l0aCBDbG91ZFdhdGNoIGRhc2hib2FyZHMgYW5kIGNvc3QgdHJhY2tpbmcnLFxyXG4gIC8vIFBhc3MgcmVzb3VyY2VzIGZyb20gb3RoZXIgc3RhY2tzIGZvciBtb25pdG9yaW5nXHJcbiAgdGFibGU6IGRhdGFiYXNlU3RhY2sudGFibGUsXHJcbiAgdXNlclBvb2w6IGF1dGhTdGFjay51c2VyUG9vbCxcclxuICBhcGk6IGFwaVN0YWNrLmFwaSxcclxufSk7XHJcblxyXG4vLyBBZGQgc3RhY2sgZGVwZW5kZW5jaWVzIHRvIGVuc3VyZSBwcm9wZXIgZGVwbG95bWVudCBvcmRlclxyXG5hdXRoT25ib2FyZGluZ1N0YWNrLmFkZERlcGVuZGVuY3koZGF0YWJhc2VTdGFjayk7XHJcbmF1dGhPbmJvYXJkaW5nU3RhY2suYWRkRGVwZW5kZW5jeShhdXRoU3RhY2spO1xyXG5hcGlTdGFjay5hZGREZXBlbmRlbmN5KGRhdGFiYXNlU3RhY2spO1xyXG5hcGlTdGFjay5hZGREZXBlbmRlbmN5KGF1dGhTdGFjayk7XHJcbmFwaVN0YWNrLmFkZERlcGVuZGVuY3koYXV0aE9uYm9hcmRpbmdTdGFjayk7XHJcbm1vbml0b3JpbmdTdGFjay5hZGREZXBlbmRlbmN5KGRhdGFiYXNlU3RhY2spO1xyXG5tb25pdG9yaW5nU3RhY2suYWRkRGVwZW5kZW5jeShhdXRoU3RhY2spO1xyXG5tb25pdG9yaW5nU3RhY2suYWRkRGVwZW5kZW5jeShhcGlTdGFjayk7XHJcblxyXG4vLyBBZGQgY29tcHJlaGVuc2l2ZSB0YWdzIHRvIGFsbCByZXNvdXJjZXMgZm9yIGNvc3QgdHJhY2tpbmcgYW5kIG9yZ2FuaXphdGlvblxyXG5jZGsuVGFncy5vZihhcHApLmFkZCgnUHJvamVjdCcsICdCdWRnZXRCdWRkeScpO1xyXG5jZGsuVGFncy5vZihhcHApLmFkZCgnQXBwbGljYXRpb24nLCAnYnVkZ2V0YnVkZHknKTtcclxuY2RrLlRhZ3Mub2YoYXBwKS5hZGQoJ0Vudmlyb25tZW50JywgZW52TmFtZSk7XHJcbmNkay5UYWdzLm9mKGFwcCkuYWRkKCdNYW5hZ2VkQnknLCAnQ0RLJyk7XHJcbmNkay5UYWdzLm9mKGFwcCkuYWRkKCdPd25lcicsICdCdWRnZXRCdWRkeS1UZWFtJyk7XHJcbmNkay5UYWdzLm9mKGFwcCkuYWRkKCdDb3N0Q2VudGVyJywgJ0J1ZGdldEJ1ZGR5LUluZnJhc3RydWN0dXJlJyk7XHJcbmNkay5UYWdzLm9mKGFwcCkuYWRkKCdQdXJwb3NlJywgJ0ZhbWlseS1CdWRnZXRpbmctQXBwbGljYXRpb24nKTtcclxuIl19