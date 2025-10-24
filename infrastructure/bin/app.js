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
apiStack.addDependency(databaseStack);
apiStack.addDependency(authStack);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBRUE7Ozs7Ozs7Ozs7OztHQVlHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILHVDQUFxQztBQUNyQyxpREFBbUM7QUFHbkMsMERBQXNEO0FBQ3RELGtEQUE4QztBQUM5QyxnREFBNEM7QUFDNUMsd0RBQW9EO0FBQ3BELDhEQUEwRDtBQUUxRCxpQ0FBaUM7QUFDakMsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7QUFFMUIsc0VBQXNFO0FBQ3RFLE1BQU0sR0FBRyxHQUFHO0lBQ1YsT0FBTyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CO0lBQ3hDLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixJQUFJLFdBQVc7Q0FDdEQsQ0FBQztBQUVGLDREQUE0RDtBQUM1RCxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUM7QUFDL0QsTUFBTSxXQUFXLEdBQUcsZUFBZSxPQUFPLEVBQUUsQ0FBQztBQUU3Qzs7O0dBR0c7QUFDSCxNQUFNLGFBQWEsR0FBRyxJQUFJLDhCQUFhLENBQUMsR0FBRyxFQUFFLEdBQUcsV0FBVyxXQUFXLEVBQUU7SUFDdEUsR0FBRztJQUNILFdBQVcsRUFBRSx1R0FBdUc7Q0FDckgsQ0FBQyxDQUFDO0FBRUg7OztHQUdHO0FBQ0gsTUFBTSxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDLEdBQUcsRUFBRSxHQUFHLFdBQVcsT0FBTyxFQUFFO0lBQzFELEdBQUc7SUFDSCxXQUFXLEVBQUUsOEZBQThGO0NBQzVHLENBQUMsQ0FBQztBQUVIOzs7O0dBSUc7QUFDSCxNQUFNLFFBQVEsR0FBRyxJQUFJLG9CQUFRLENBQUMsR0FBRyxFQUFFLEdBQUcsV0FBVyxNQUFNLEVBQUU7SUFDdkQsR0FBRztJQUNILFdBQVcsRUFBRSxpRkFBaUY7SUFDOUYsbUNBQW1DO0lBQ25DLEtBQUssRUFBRSxhQUFhLENBQUMsS0FBSztJQUMxQixRQUFRLEVBQUUsU0FBUyxDQUFDLFFBQVE7SUFDNUIsY0FBYyxFQUFFLFNBQVMsQ0FBQyxjQUFjO0NBQ3pDLENBQUMsQ0FBQztBQUVIOzs7R0FHRztBQUNILE1BQU0sWUFBWSxHQUFHLElBQUksNEJBQVksQ0FBQyxHQUFHLEVBQUUsR0FBRyxXQUFXLFVBQVUsRUFBRTtJQUNuRSxHQUFHO0lBQ0gsV0FBVyxFQUFFLHFHQUFxRztDQUNuSCxDQUFDLENBQUM7QUFFSDs7OztHQUlHO0FBQ0gsTUFBTSxlQUFlLEdBQUcsSUFBSSxrQ0FBZSxDQUFDLEdBQUcsRUFBRSxHQUFHLFdBQVcsYUFBYSxFQUFFO0lBQzVFLEdBQUc7SUFDSCxXQUFXLEVBQUUsaUdBQWlHO0lBQzlHLGtEQUFrRDtJQUNsRCxLQUFLLEVBQUUsYUFBYSxDQUFDLEtBQUs7SUFDMUIsUUFBUSxFQUFFLFNBQVMsQ0FBQyxRQUFRO0lBQzVCLEdBQUcsRUFBRSxRQUFRLENBQUMsR0FBRztDQUNsQixDQUFDLENBQUM7QUFFSCwyREFBMkQ7QUFDM0QsUUFBUSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUN0QyxRQUFRLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ2xDLGVBQWUsQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDN0MsZUFBZSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUN6QyxlQUFlLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBRXhDLDZFQUE2RTtBQUM3RSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLGFBQWEsQ0FBQyxDQUFDO0FBQy9DLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDLENBQUM7QUFDbkQsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUM3QyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ3pDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztBQUNsRCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLDRCQUE0QixDQUFDLENBQUM7QUFDakUsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSw4QkFBOEIsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxyXG5cclxuLyoqXHJcbiAqIEFXUyBDREsgQXBwbGljYXRpb24gRW50cnkgUG9pbnQgZm9yIEJ1ZGdldEJ1ZGR5XHJcbiAqIFxyXG4gKiBUaGlzIGZpbGUgaW5pdGlhbGl6ZXMgdGhlIENESyBhcHAgYW5kIGNyZWF0ZXMgYWxsIHRoZSBuZWNlc3Nhcnkgc3RhY2tzXHJcbiAqIGZvciB0aGUgQnVkZ2V0QnVkZHkgYXBwbGljYXRpb24gaW5mcmFzdHJ1Y3R1cmUuXHJcbiAqIFxyXG4gKiBTdGFja3MgY3JlYXRlZDpcclxuICogLSBEYXRhYmFzZVN0YWNrOiBEeW5hbW9EQiB0YWJsZXMgYW5kIGluZGV4ZXNcclxuICogLSBBdXRoU3RhY2s6IENvZ25pdG8gVXNlciBQb29scyBhbmQgSWRlbnRpdHkgUG9vbHNcclxuICogLSBBcGlTdGFjazogQVBJIEdhdGV3YXkgYW5kIExhbWJkYSBmdW5jdGlvbnNcclxuICogLSBIb3N0aW5nU3RhY2s6IFMzIGJ1Y2tldHMgYW5kIENsb3VkRnJvbnQgZGlzdHJpYnV0aW9uc1xyXG4gKiAtIE1vbml0b3JpbmdTdGFjazogQ2xvdWRXYXRjaCBkYXNoYm9hcmRzIGFuZCBhbGFybXNcclxuICovXHJcblxyXG5pbXBvcnQgJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3Rlcic7XHJcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcblxyXG5kZWNsYXJlIGNvbnN0IHByb2Nlc3M6IGFueTtcclxuaW1wb3J0IHsgRGF0YWJhc2VTdGFjayB9IGZyb20gJy4uL2xpYi9kYXRhYmFzZS1zdGFjayc7XHJcbmltcG9ydCB7IEF1dGhTdGFjayB9IGZyb20gJy4uL2xpYi9hdXRoLXN0YWNrJztcclxuaW1wb3J0IHsgQXBpU3RhY2sgfSBmcm9tICcuLi9saWIvYXBpLXN0YWNrJztcclxuaW1wb3J0IHsgSG9zdGluZ1N0YWNrIH0gZnJvbSAnLi4vbGliL2hvc3Rpbmctc3RhY2snO1xyXG5pbXBvcnQgeyBNb25pdG9yaW5nU3RhY2sgfSBmcm9tICcuLi9saWIvbW9uaXRvcmluZy1zdGFjayc7XHJcblxyXG4vLyBJbml0aWFsaXplIHRoZSBDREsgYXBwbGljYXRpb25cclxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcclxuXHJcbi8vIEdldCBlbnZpcm9ubWVudCBjb25maWd1cmF0aW9uIGZyb20gY29udGV4dCBvciBlbnZpcm9ubWVudCB2YXJpYWJsZXNcclxuY29uc3QgZW52ID0ge1xyXG4gIGFjY291bnQ6IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX0FDQ09VTlQsXHJcbiAgcmVnaW9uOiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9SRUdJT04gfHwgJ3VzLWVhc3QtMScsXHJcbn07XHJcblxyXG4vLyBFbnZpcm9ubWVudC1zcGVjaWZpYyBzdGFjayBuYW1pbmcgd2l0aCBidWRnZXRidWRkeSBwcmVmaXhcclxuY29uc3QgZW52TmFtZSA9IGFwcC5ub2RlLnRyeUdldENvbnRleHQoJ2Vudmlyb25tZW50JykgfHwgJ2Rldic7XHJcbmNvbnN0IHN0YWNrUHJlZml4ID0gYGJ1ZGdldGJ1ZGR5LSR7ZW52TmFtZX1gO1xyXG5cclxuLyoqXHJcbiAqIERhdGFiYXNlIFN0YWNrIC0gRHluYW1vREIgdGFibGVzIGFuZCBpbmRleGVzXHJcbiAqIENvbnRhaW5zIHRoZSBtYWluIGFwcGxpY2F0aW9uIGRhdGEgc3RvcmFnZSB3aXRoIHNpbmdsZS10YWJsZSBkZXNpZ25cclxuICovXHJcbmNvbnN0IGRhdGFiYXNlU3RhY2sgPSBuZXcgRGF0YWJhc2VTdGFjayhhcHAsIGAke3N0YWNrUHJlZml4fS1kYXRhYmFzZWAsIHtcclxuICBlbnYsXHJcbiAgZGVzY3JpcHRpb246ICdCdWRnZXRCdWRkeSBkYXRhYmFzZSBpbmZyYXN0cnVjdHVyZSB3aXRoIER5bmFtb0RCIHNpbmdsZS10YWJsZSBkZXNpZ24gZm9yIGNvc3Qtb3B0aW1pemVkIGRhdGEgc3RvcmFnZScsXHJcbn0pO1xyXG5cclxuLyoqXHJcbiAqIEF1dGhlbnRpY2F0aW9uIFN0YWNrIC0gQ29nbml0byBVc2VyIFBvb2xzXHJcbiAqIEhhbmRsZXMgdXNlciBhdXRoZW50aWNhdGlvbiBhbmQgYXV0aG9yaXphdGlvblxyXG4gKi9cclxuY29uc3QgYXV0aFN0YWNrID0gbmV3IEF1dGhTdGFjayhhcHAsIGAke3N0YWNrUHJlZml4fS1hdXRoYCwge1xyXG4gIGVudixcclxuICBkZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IGF1dGhlbnRpY2F0aW9uIGluZnJhc3RydWN0dXJlIHdpdGggQ29nbml0byBVc2VyIFBvb2xzIGZvciBzZWN1cmUgdXNlciBtYW5hZ2VtZW50JyxcclxufSk7XHJcblxyXG4vKipcclxuICogQVBJIFN0YWNrIC0gQVBJIEdhdGV3YXkgYW5kIExhbWJkYSBmdW5jdGlvbnNcclxuICogQ29udGFpbnMgYWxsIGJhY2tlbmQgYnVzaW5lc3MgbG9naWMgYW5kIEFQSSBlbmRwb2ludHNcclxuICogRGVwZW5kcyBvbiBkYXRhYmFzZSBhbmQgYXV0aCBzdGFja3NcclxuICovXHJcbmNvbnN0IGFwaVN0YWNrID0gbmV3IEFwaVN0YWNrKGFwcCwgYCR7c3RhY2tQcmVmaXh9LWFwaWAsIHtcclxuICBlbnYsXHJcbiAgZGVzY3JpcHRpb246ICdCdWRnZXRCdWRkeSBzZXJ2ZXJsZXNzIEFQSSBpbmZyYXN0cnVjdHVyZSB3aXRoIExhbWJkYSBmdW5jdGlvbnMgYW5kIEFQSSBHYXRld2F5JyxcclxuICAvLyBQYXNzIHJlc291cmNlcyBmcm9tIG90aGVyIHN0YWNrc1xyXG4gIHRhYmxlOiBkYXRhYmFzZVN0YWNrLnRhYmxlLFxyXG4gIHVzZXJQb29sOiBhdXRoU3RhY2sudXNlclBvb2wsXHJcbiAgdXNlclBvb2xDbGllbnQ6IGF1dGhTdGFjay51c2VyUG9vbENsaWVudCxcclxufSk7XHJcblxyXG4vKipcclxuICogSG9zdGluZyBTdGFjayAtIFMzIGFuZCBDbG91ZEZyb250XHJcbiAqIEhvc3RzIHRoZSB3ZWIgYXBwbGljYXRpb24gYW5kIGFkbWluIGRhc2hib2FyZFxyXG4gKi9cclxuY29uc3QgaG9zdGluZ1N0YWNrID0gbmV3IEhvc3RpbmdTdGFjayhhcHAsIGAke3N0YWNrUHJlZml4fS1ob3N0aW5nYCwge1xyXG4gIGVudixcclxuICBkZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IGhvc3RpbmcgaW5mcmFzdHJ1Y3R1cmUgd2l0aCBTMyBzdGF0aWMgaG9zdGluZyBhbmQgQ2xvdWRGcm9udCBDRE4gZm9yIGdsb2JhbCBwZXJmb3JtYW5jZScsXHJcbn0pO1xyXG5cclxuLyoqXHJcbiAqIE1vbml0b3JpbmcgU3RhY2sgLSBDbG91ZFdhdGNoIGRhc2hib2FyZHMgYW5kIGFsYXJtc1xyXG4gKiBQcm92aWRlcyBvYnNlcnZhYmlsaXR5IGFuZCBhbGVydGluZyBmb3IgdGhlIGFwcGxpY2F0aW9uXHJcbiAqIERlcGVuZHMgb24gYWxsIG90aGVyIHN0YWNrcyBmb3IgcmVzb3VyY2UgcmVmZXJlbmNlc1xyXG4gKi9cclxuY29uc3QgbW9uaXRvcmluZ1N0YWNrID0gbmV3IE1vbml0b3JpbmdTdGFjayhhcHAsIGAke3N0YWNrUHJlZml4fS1tb25pdG9yaW5nYCwge1xyXG4gIGVudixcclxuICBkZXNjcmlwdGlvbjogJ0J1ZGdldEJ1ZGR5IG1vbml0b3JpbmcgYW5kIGFsZXJ0aW5nIGluZnJhc3RydWN0dXJlIHdpdGggQ2xvdWRXYXRjaCBkYXNoYm9hcmRzIGFuZCBjb3N0IHRyYWNraW5nJyxcclxuICAvLyBQYXNzIHJlc291cmNlcyBmcm9tIG90aGVyIHN0YWNrcyBmb3IgbW9uaXRvcmluZ1xyXG4gIHRhYmxlOiBkYXRhYmFzZVN0YWNrLnRhYmxlLFxyXG4gIHVzZXJQb29sOiBhdXRoU3RhY2sudXNlclBvb2wsXHJcbiAgYXBpOiBhcGlTdGFjay5hcGksXHJcbn0pO1xyXG5cclxuLy8gQWRkIHN0YWNrIGRlcGVuZGVuY2llcyB0byBlbnN1cmUgcHJvcGVyIGRlcGxveW1lbnQgb3JkZXJcclxuYXBpU3RhY2suYWRkRGVwZW5kZW5jeShkYXRhYmFzZVN0YWNrKTtcclxuYXBpU3RhY2suYWRkRGVwZW5kZW5jeShhdXRoU3RhY2spO1xyXG5tb25pdG9yaW5nU3RhY2suYWRkRGVwZW5kZW5jeShkYXRhYmFzZVN0YWNrKTtcclxubW9uaXRvcmluZ1N0YWNrLmFkZERlcGVuZGVuY3koYXV0aFN0YWNrKTtcclxubW9uaXRvcmluZ1N0YWNrLmFkZERlcGVuZGVuY3koYXBpU3RhY2spO1xyXG5cclxuLy8gQWRkIGNvbXByZWhlbnNpdmUgdGFncyB0byBhbGwgcmVzb3VyY2VzIGZvciBjb3N0IHRyYWNraW5nIGFuZCBvcmdhbml6YXRpb25cclxuY2RrLlRhZ3Mub2YoYXBwKS5hZGQoJ1Byb2plY3QnLCAnQnVkZ2V0QnVkZHknKTtcclxuY2RrLlRhZ3Mub2YoYXBwKS5hZGQoJ0FwcGxpY2F0aW9uJywgJ2J1ZGdldGJ1ZGR5Jyk7XHJcbmNkay5UYWdzLm9mKGFwcCkuYWRkKCdFbnZpcm9ubWVudCcsIGVudk5hbWUpO1xyXG5jZGsuVGFncy5vZihhcHApLmFkZCgnTWFuYWdlZEJ5JywgJ0NESycpO1xyXG5jZGsuVGFncy5vZihhcHApLmFkZCgnT3duZXInLCAnQnVkZ2V0QnVkZHktVGVhbScpO1xyXG5jZGsuVGFncy5vZihhcHApLmFkZCgnQ29zdENlbnRlcicsICdCdWRnZXRCdWRkeS1JbmZyYXN0cnVjdHVyZScpO1xyXG5jZGsuVGFncy5vZihhcHApLmFkZCgnUHVycG9zZScsICdGYW1pbHktQnVkZ2V0aW5nLUFwcGxpY2F0aW9uJyk7Il19