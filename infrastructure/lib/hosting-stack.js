"use strict";
/**
 * Hosting Stack for BudgetBuddy Application
 *
 * Creates S3 buckets and CloudFront distributions for hosting the web application
 * and admin dashboard. Provides global content delivery with SSL/TLS termination
 * and caching for optimal performance.
 *
 * Key Features:
 * - S3 buckets for static website hosting
 * - CloudFront distributions for global CDN
 * - SSL/TLS certificates for secure connections
 * - Custom domain support
 * - Caching policies for performance optimization
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
exports.HostingStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const cloudfront = __importStar(require("aws-cdk-lib/aws-cloudfront"));
const origins = __importStar(require("aws-cdk-lib/aws-cloudfront-origins"));
class HostingStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Create S3 buckets for hosting
        this.createS3Buckets();
        // Create CloudFront distributions
        this.createCloudFrontDistributions();
        // Create outputs for deployment pipelines
        this.createOutputs();
    }
    /**
     * Create S3 buckets for hosting web application and admin dashboard
     * Configured for static website hosting with proper security settings
     */
    createS3Buckets() {
        /**
         * S3 bucket for web application (React app)
         * Hosts the main user-facing application
         */
        this.webBucket = new s3.Bucket(this, 'WebBucket', {
            bucketName: 'budgetbuddy-web-app',
            // Block all public access - CloudFront will access via OAI
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            // Enable versioning for rollback capability
            versioned: true,
            // Automatic cleanup of old versions to control costs
            lifecycleRules: [{
                    id: 'DeleteOldVersions',
                    enabled: true,
                    noncurrentVersionExpiration: cdk.Duration.days(30),
                }],
            // Remove bucket when stack is deleted (for dev environments)
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });
        /**
         * S3 bucket for admin dashboard (React admin app)
         * Hosts the administrative interface for managing users and content
         */
        this.adminBucket = new s3.Bucket(this, 'AdminBucket', {
            bucketName: 'budgetbuddy-admin-dashboard',
            // Block all public access - CloudFront will access via OAI
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            // Enable versioning for rollback capability
            versioned: true,
            // Automatic cleanup of old versions
            lifecycleRules: [{
                    id: 'DeleteOldVersions',
                    enabled: true,
                    noncurrentVersionExpiration: cdk.Duration.days(30),
                }],
            // Remove bucket when stack is deleted
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });
        // Add comprehensive cost allocation tags
        cdk.Tags.of(this.webBucket).add('Component', 'WebHosting');
        cdk.Tags.of(this.webBucket).add('Service', 'S3');
        cdk.Tags.of(this.webBucket).add('ContentType', 'Static-Website');
        cdk.Tags.of(this.webBucket).add('CostCenter', 'BudgetBuddy-Frontend');
        cdk.Tags.of(this.webBucket).add('BackupRequired', 'No');
        cdk.Tags.of(this.adminBucket).add('Component', 'AdminHosting');
        cdk.Tags.of(this.adminBucket).add('Service', 'S3');
        cdk.Tags.of(this.adminBucket).add('ContentType', 'Admin-Dashboard');
        cdk.Tags.of(this.adminBucket).add('CostCenter', 'BudgetBuddy-Admin');
        cdk.Tags.of(this.adminBucket).add('BackupRequired', 'No');
    }
    /**
     * Create CloudFront distributions for global content delivery
     * Provides SSL termination, caching, and performance optimization
     */
    createCloudFrontDistributions() {
        /**
         * CloudFront distribution for web application
         * Provides global CDN with caching optimized for SPA
         */
        this.webDistribution = new cloudfront.Distribution(this, 'WebDistribution', {
            comment: 'budgetbuddy-web - Global CDN for React web application with SPA routing support',
            // S3 origin with Origin Access Identity for security
            defaultRootObject: 'index.html',
            // Default behavior for all requests
            defaultBehavior: {
                origin: new origins.S3Origin(this.webBucket),
                // Viewer protocol policy - redirect HTTP to HTTPS
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                // Caching policy optimized for SPA
                cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
                // Allowed HTTP methods
                allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                // Compress responses for better performance
                compress: true,
            },
            // Additional behaviors for API calls (no caching)
            additionalBehaviors: {
                '/api/*': {
                    origin: new origins.S3Origin(this.webBucket),
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
                    allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
                },
            },
            // Error pages for SPA routing
            errorResponses: [
                {
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                    ttl: cdk.Duration.minutes(5),
                },
                {
                    httpStatus: 403,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                    ttl: cdk.Duration.minutes(5),
                },
            ],
            // Price class for cost optimization
            priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // US, Canada, Europe
            // Enable IPv6 for better global reach
            enableIpv6: true,
        });
        /**
         * CloudFront distribution for admin dashboard
         * Similar configuration but separate for security isolation
         */
        this.adminDistribution = new cloudfront.Distribution(this, 'AdminDistribution', {
            comment: 'budgetbuddy-admin - Global CDN for admin dashboard with security isolation',
            defaultRootObject: 'index.html',
            defaultBehavior: {
                origin: new origins.S3Origin(this.adminBucket),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
                allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                compress: true,
            },
            // Error pages for SPA routing
            errorResponses: [
                {
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                    ttl: cdk.Duration.minutes(5),
                },
                {
                    httpStatus: 403,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                    ttl: cdk.Duration.minutes(5),
                },
            ],
            priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
            enableIpv6: true,
        });
        // Add comprehensive cost allocation tags
        cdk.Tags.of(this.webDistribution).add('Component', 'WebCDN');
        cdk.Tags.of(this.webDistribution).add('Service', 'CloudFront');
        cdk.Tags.of(this.webDistribution).add('PriceClass', 'US-Canada-Europe');
        cdk.Tags.of(this.webDistribution).add('CostCenter', 'BudgetBuddy-CDN');
        cdk.Tags.of(this.webDistribution).add('CachingEnabled', 'Yes');
        cdk.Tags.of(this.adminDistribution).add('Component', 'AdminCDN');
        cdk.Tags.of(this.adminDistribution).add('Service', 'CloudFront');
        cdk.Tags.of(this.adminDistribution).add('PriceClass', 'US-Canada-Europe');
        cdk.Tags.of(this.adminDistribution).add('CostCenter', 'BudgetBuddy-CDN');
        cdk.Tags.of(this.adminDistribution).add('CachingEnabled', 'Yes');
    }
    /**
     * Create CloudFormation outputs for deployment pipelines and DNS configuration
     */
    createOutputs() {
        // Web bucket outputs
        new cdk.CfnOutput(this, 'WebBucketName', {
            value: this.webBucket.bucketName,
            description: 'S3 bucket name for BudgetBuddy web application static hosting',
            exportName: 'budgetbuddy-web-bucket-name',
        });
        new cdk.CfnOutput(this, 'WebBucketArn', {
            value: this.webBucket.bucketArn,
            description: 'S3 bucket ARN for BudgetBuddy web application IAM policies and deployment',
            exportName: 'budgetbuddy-web-bucket-arn',
        });
        // Admin bucket outputs
        new cdk.CfnOutput(this, 'AdminBucketName', {
            value: this.adminBucket.bucketName,
            description: 'S3 bucket name for BudgetBuddy admin dashboard static hosting',
            exportName: 'budgetbuddy-admin-bucket-name',
        });
        new cdk.CfnOutput(this, 'AdminBucketArn', {
            value: this.adminBucket.bucketArn,
            description: 'S3 bucket ARN for BudgetBuddy admin dashboard IAM policies and deployment',
            exportName: 'budgetbuddy-admin-bucket-arn',
        });
        // CloudFront distribution outputs
        new cdk.CfnOutput(this, 'WebDistributionId', {
            value: this.webDistribution.distributionId,
            description: 'CloudFront distribution ID for BudgetBuddy web application cache invalidation',
            exportName: 'budgetbuddy-web-distribution-id',
        });
        new cdk.CfnOutput(this, 'WebDistributionDomainName', {
            value: this.webDistribution.distributionDomainName,
            description: 'CloudFront domain name for BudgetBuddy web application public access',
            exportName: 'budgetbuddy-web-distribution-domain',
        });
        new cdk.CfnOutput(this, 'AdminDistributionId', {
            value: this.adminDistribution.distributionId,
            description: 'CloudFront distribution ID for BudgetBuddy admin dashboard cache invalidation',
            exportName: 'budgetbuddy-admin-distribution-id',
        });
        new cdk.CfnOutput(this, 'AdminDistributionDomainName', {
            value: this.adminDistribution.distributionDomainName,
            description: 'CloudFront domain name for BudgetBuddy admin dashboard public access',
            exportName: 'budgetbuddy-admin-distribution-domain',
        });
    }
}
exports.HostingStack = HostingStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9zdGluZy1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImhvc3Rpbmctc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozs7O0dBYUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILGlEQUFtQztBQUNuQyx1REFBeUM7QUFDekMsdUVBQXlEO0FBQ3pELDRFQUE4RDtBQUk5RCxNQUFhLFlBQWEsU0FBUSxHQUFHLENBQUMsS0FBSztJQXlCekMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixnQ0FBZ0M7UUFDaEMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBRXZCLGtDQUFrQztRQUNsQyxJQUFJLENBQUMsNkJBQTZCLEVBQUUsQ0FBQztRQUVyQywwQ0FBMEM7UUFDMUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQ3ZCLENBQUM7SUFFRDs7O09BR0c7SUFDSyxlQUFlO1FBQ3JCOzs7V0FHRztRQUNILElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUU7WUFDaEQsVUFBVSxFQUFFLHFCQUFxQjtZQUVqQywyREFBMkQ7WUFDM0QsaUJBQWlCLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFNBQVM7WUFFakQsNENBQTRDO1lBQzVDLFNBQVMsRUFBRSxJQUFJO1lBRWYscURBQXFEO1lBQ3JELGNBQWMsRUFBRSxDQUFDO29CQUNmLEVBQUUsRUFBRSxtQkFBbUI7b0JBQ3ZCLE9BQU8sRUFBRSxJQUFJO29CQUNiLDJCQUEyQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztpQkFDbkQsQ0FBQztZQUVGLDZEQUE2RDtZQUM3RCxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEs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QUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFO1lBQzdDLEtBQUssRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsY0FBYztZQUM1QyxXQUFXLEVBQUUsK0VBQStFO1lBQzVGLFVBQVUsRUFBRSxtQ0FBbUM7U0FDaEQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSw2QkFBNkIsRUFBRTtZQUNyRCxLQUFLLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLHNCQUFzQjtZQUNwRCxXQUFXLEVBQUUsc0VBQXNFO1lBQ25GLFVBQVUsRUFBRSx1Q0FBdUM7U0FDcEQsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBdFJELG9DQXNSQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBIb3N0aW5nIFN0YWNrIGZvciBCdWRnZXRCdWRkeSBBcHBsaWNhdGlvblxyXG4gKiBcclxuICogQ3JlYXRlcyBTMyBidWNrZXRzIGFuZCBDbG91ZEZyb250IGRpc3RyaWJ1dGlvbnMgZm9yIGhvc3RpbmcgdGhlIHdlYiBhcHBsaWNhdGlvblxyXG4gKiBhbmQgYWRtaW4gZGFzaGJvYXJkLiBQcm92aWRlcyBnbG9iYWwgY29udGVudCBkZWxpdmVyeSB3aXRoIFNTTC9UTFMgdGVybWluYXRpb25cclxuICogYW5kIGNhY2hpbmcgZm9yIG9wdGltYWwgcGVyZm9ybWFuY2UuXHJcbiAqIFxyXG4gKiBLZXkgRmVhdHVyZXM6XHJcbiAqIC0gUzMgYnVja2V0cyBmb3Igc3RhdGljIHdlYnNpdGUgaG9zdGluZ1xyXG4gKiAtIENsb3VkRnJvbnQgZGlzdHJpYnV0aW9ucyBmb3IgZ2xvYmFsIENETlxyXG4gKiAtIFNTTC9UTFMgY2VydGlmaWNhdGVzIGZvciBzZWN1cmUgY29ubmVjdGlvbnNcclxuICogLSBDdXN0b20gZG9tYWluIHN1cHBvcnRcclxuICogLSBDYWNoaW5nIHBvbGljaWVzIGZvciBwZXJmb3JtYW5jZSBvcHRpbWl6YXRpb25cclxuICovXHJcblxyXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xyXG5pbXBvcnQgKiBhcyBjbG91ZGZyb250IGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250JztcclxuaW1wb3J0ICogYXMgb3JpZ2lucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udC1vcmlnaW5zJztcclxuaW1wb3J0ICogYXMgczNkZXBsb3kgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzLWRlcGxveW1lbnQnO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuXHJcbmV4cG9ydCBjbGFzcyBIb3N0aW5nU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xyXG4gIC8qKlxyXG4gICAqIFMzIGJ1Y2tldCBmb3Igd2ViIGFwcGxpY2F0aW9uIGhvc3RpbmdcclxuICAgKiBFeHBvc2VkIGZvciBkZXBsb3ltZW50IHBpcGVsaW5lIGFjY2Vzc1xyXG4gICAqL1xyXG4gIHB1YmxpYyB3ZWJCdWNrZXQ6IHMzLkJ1Y2tldDtcclxuXHJcbiAgLyoqXHJcbiAgICogUzMgYnVja2V0IGZvciBhZG1pbiBkYXNoYm9hcmQgaG9zdGluZ1xyXG4gICAqIEV4cG9zZWQgZm9yIGRlcGxveW1lbnQgcGlwZWxpbmUgYWNjZXNzXHJcbiAgICovXHJcbiAgcHVibGljIGFkbWluQnVja2V0OiBzMy5CdWNrZXQ7XHJcblxyXG4gIC8qKlxyXG4gICAqIENsb3VkRnJvbnQgZGlzdHJpYnV0aW9uIGZvciB3ZWIgYXBwbGljYXRpb25cclxuICAgKiBFeHBvc2VkIGZvciBtb25pdG9yaW5nIGFuZCBETlMgY29uZmlndXJhdGlvblxyXG4gICAqL1xyXG4gIHB1YmxpYyB3ZWJEaXN0cmlidXRpb246IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uO1xyXG5cclxuICAvKipcclxuICAgKiBDbG91ZEZyb250IGRpc3RyaWJ1dGlvbiBmb3IgYWRtaW4gZGFzaGJvYXJkXHJcbiAgICogRXhwb3NlZCBmb3IgbW9uaXRvcmluZyBhbmQgRE5TIGNvbmZpZ3VyYXRpb25cclxuICAgKi9cclxuICBwdWJsaWMgYWRtaW5EaXN0cmlidXRpb246IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uO1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgUzMgYnVja2V0cyBmb3IgaG9zdGluZ1xyXG4gICAgdGhpcy5jcmVhdGVTM0J1Y2tldHMoKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgQ2xvdWRGcm9udCBkaXN0cmlidXRpb25zXHJcbiAgICB0aGlzLmNyZWF0ZUNsb3VkRnJvbnREaXN0cmlidXRpb25zKCk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIG91dHB1dHMgZm9yIGRlcGxveW1lbnQgcGlwZWxpbmVzXHJcbiAgICB0aGlzLmNyZWF0ZU91dHB1dHMoKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBTMyBidWNrZXRzIGZvciBob3N0aW5nIHdlYiBhcHBsaWNhdGlvbiBhbmQgYWRtaW4gZGFzaGJvYXJkXHJcbiAgICogQ29uZmlndXJlZCBmb3Igc3RhdGljIHdlYnNpdGUgaG9zdGluZyB3aXRoIHByb3BlciBzZWN1cml0eSBzZXR0aW5nc1xyXG4gICAqL1xyXG4gIHByaXZhdGUgY3JlYXRlUzNCdWNrZXRzKCk6IHZvaWQge1xyXG4gICAgLyoqXHJcbiAgICAgKiBTMyBidWNrZXQgZm9yIHdlYiBhcHBsaWNhdGlvbiAoUmVhY3QgYXBwKVxyXG4gICAgICogSG9zdHMgdGhlIG1haW4gdXNlci1mYWNpbmcgYXBwbGljYXRpb25cclxuICAgICAqL1xyXG4gICAgdGhpcy53ZWJCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdXZWJCdWNrZXQnLCB7XHJcbiAgICAgIGJ1Y2tldE5hbWU6ICdidWRnZXRidWRkeS13ZWItYXBwJyxcclxuICAgICAgXHJcbiAgICAgIC8vIEJsb2NrIGFsbCBwdWJsaWMgYWNjZXNzIC0gQ2xvdWRGcm9udCB3aWxsIGFjY2VzcyB2aWEgT0FJXHJcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXHJcbiAgICAgIFxyXG4gICAgICAvLyBFbmFibGUgdmVyc2lvbmluZyBmb3Igcm9sbGJhY2sgY2FwYWJpbGl0eVxyXG4gICAgICB2ZXJzaW9uZWQ6IHRydWUsXHJcbiAgICAgIFxyXG4gICAgICAvLyBBdXRvbWF0aWMgY2xlYW51cCBvZiBvbGQgdmVyc2lvbnMgdG8gY29udHJvbCBjb3N0c1xyXG4gICAgICBsaWZlY3ljbGVSdWxlczogW3tcclxuICAgICAgICBpZDogJ0RlbGV0ZU9sZFZlcnNpb25zJyxcclxuICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgIG5vbmN1cnJlbnRWZXJzaW9uRXhwaXJhdGlvbjogY2RrLkR1cmF0aW9uLmRheXMoMzApLFxyXG4gICAgICB9XSxcclxuICAgICAgXHJcbiAgICAgIC8vIFJlbW92ZSBidWNrZXQgd2hlbiBzdGFjayBpcyBkZWxldGVkIChmb3IgZGV2IGVudmlyb25tZW50cylcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IHRydWUsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFMzIGJ1Y2tldCBmb3IgYWRtaW4gZGFzaGJvYXJkIChSZWFjdCBhZG1pbiBhcHApXHJcbiAgICAgKiBIb3N0cyB0aGUgYWRtaW5pc3RyYXRpdmUgaW50ZXJmYWNlIGZvciBtYW5hZ2luZyB1c2VycyBhbmQgY29udGVudFxyXG4gICAgICovXHJcbiAgICB0aGlzLmFkbWluQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnQWRtaW5CdWNrZXQnLCB7XHJcbiAgICAgIGJ1Y2tldE5hbWU6ICdidWRnZXRidWRkeS1hZG1pbi1kYXNoYm9hcmQnLFxyXG4gICAgICBcclxuICAgICAgLy8gQmxvY2sgYWxsIHB1YmxpYyBhY2Nlc3MgLSBDbG91ZEZyb250IHdpbGwgYWNjZXNzIHZpYSBPQUlcclxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcclxuICAgICAgXHJcbiAgICAgIC8vIEVuYWJsZSB2ZXJzaW9uaW5nIGZvciByb2xsYmFjayBjYXBhYmlsaXR5XHJcbiAgICAgIHZlcnNpb25lZDogdHJ1ZSxcclxuICAgICAgXHJcbiAgICAgIC8vIEF1dG9tYXRpYyBjbGVhbnVwIG9mIG9sZCB2ZXJzaW9uc1xyXG4gICAgICBsaWZlY3ljbGVSdWxlczogW3tcclxuICAgICAgICBpZDogJ0RlbGV0ZU9sZFZlcnNpb25zJyxcclxuICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgIG5vbmN1cnJlbnRWZXJzaW9uRXhwaXJhdGlvbjogY2RrLkR1cmF0aW9uLmRheXMoMzApLFxyXG4gICAgICB9XSxcclxuICAgICAgXHJcbiAgICAgIC8vIFJlbW92ZSBidWNrZXQgd2hlbiBzdGFjayBpcyBkZWxldGVkXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIGNvbXByZWhlbnNpdmUgY29zdCBhbGxvY2F0aW9uIHRhZ3NcclxuICAgIGNkay5UYWdzLm9mKHRoaXMud2ViQnVja2V0KS5hZGQoJ0NvbXBvbmVudCcsICdXZWJIb3N0aW5nJyk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzLndlYkJ1Y2tldCkuYWRkKCdTZXJ2aWNlJywgJ1MzJyk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzLndlYkJ1Y2tldCkuYWRkKCdDb250ZW50VHlwZScsICdTdGF0aWMtV2Vic2l0ZScpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy53ZWJCdWNrZXQpLmFkZCgnQ29zdENlbnRlcicsICdCdWRnZXRCdWRkeS1Gcm9udGVuZCcpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy53ZWJCdWNrZXQpLmFkZCgnQmFja3VwUmVxdWlyZWQnLCAnTm8nKTtcclxuICAgIFxyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy5hZG1pbkJ1Y2tldCkuYWRkKCdDb21wb25lbnQnLCAnQWRtaW5Ib3N0aW5nJyk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzLmFkbWluQnVja2V0KS5hZGQoJ1NlcnZpY2UnLCAnUzMnKTtcclxuICAgIGNkay5UYWdzLm9mKHRoaXMuYWRtaW5CdWNrZXQpLmFkZCgnQ29udGVudFR5cGUnLCAnQWRtaW4tRGFzaGJvYXJkJyk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzLmFkbWluQnVja2V0KS5hZGQoJ0Nvc3RDZW50ZXInLCAnQnVkZ2V0QnVkZHktQWRtaW4nKTtcclxuICAgIGNkay5UYWdzLm9mKHRoaXMuYWRtaW5CdWNrZXQpLmFkZCgnQmFja3VwUmVxdWlyZWQnLCAnTm8nKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBDbG91ZEZyb250IGRpc3RyaWJ1dGlvbnMgZm9yIGdsb2JhbCBjb250ZW50IGRlbGl2ZXJ5XHJcbiAgICogUHJvdmlkZXMgU1NMIHRlcm1pbmF0aW9uLCBjYWNoaW5nLCBhbmQgcGVyZm9ybWFuY2Ugb3B0aW1pemF0aW9uXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjcmVhdGVDbG91ZEZyb250RGlzdHJpYnV0aW9ucygpOiB2b2lkIHtcclxuICAgIC8qKlxyXG4gICAgICogQ2xvdWRGcm9udCBkaXN0cmlidXRpb24gZm9yIHdlYiBhcHBsaWNhdGlvblxyXG4gICAgICogUHJvdmlkZXMgZ2xvYmFsIENETiB3aXRoIGNhY2hpbmcgb3B0aW1pemVkIGZvciBTUEFcclxuICAgICAqL1xyXG4gICAgdGhpcy53ZWJEaXN0cmlidXRpb24gPSBuZXcgY2xvdWRmcm9udC5EaXN0cmlidXRpb24odGhpcywgJ1dlYkRpc3RyaWJ1dGlvbicsIHtcclxuICAgICAgY29tbWVudDogJ2J1ZGdldGJ1ZGR5LXdlYiAtIEdsb2JhbCBDRE4gZm9yIFJlYWN0IHdlYiBhcHBsaWNhdGlvbiB3aXRoIFNQQSByb3V0aW5nIHN1cHBvcnQnLFxyXG4gICAgICBcclxuICAgICAgLy8gUzMgb3JpZ2luIHdpdGggT3JpZ2luIEFjY2VzcyBJZGVudGl0eSBmb3Igc2VjdXJpdHlcclxuICAgICAgZGVmYXVsdFJvb3RPYmplY3Q6ICdpbmRleC5odG1sJyxcclxuICAgICAgXHJcbiAgICAgIC8vIERlZmF1bHQgYmVoYXZpb3IgZm9yIGFsbCByZXF1ZXN0c1xyXG4gICAgICBkZWZhdWx0QmVoYXZpb3I6IHtcclxuICAgICAgICBvcmlnaW46IG5ldyBvcmlnaW5zLlMzT3JpZ2luKHRoaXMud2ViQnVja2V0KSxcclxuICAgICAgICBcclxuICAgICAgICAvLyBWaWV3ZXIgcHJvdG9jb2wgcG9saWN5IC0gcmVkaXJlY3QgSFRUUCB0byBIVFRQU1xyXG4gICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIENhY2hpbmcgcG9saWN5IG9wdGltaXplZCBmb3IgU1BBXHJcbiAgICAgICAgY2FjaGVQb2xpY3k6IGNsb3VkZnJvbnQuQ2FjaGVQb2xpY3kuQ0FDSElOR19PUFRJTUlaRUQsXHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gQWxsb3dlZCBIVFRQIG1ldGhvZHNcclxuICAgICAgICBhbGxvd2VkTWV0aG9kczogY2xvdWRmcm9udC5BbGxvd2VkTWV0aG9kcy5BTExPV19HRVRfSEVBRF9PUFRJT05TLFxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIENvbXByZXNzIHJlc3BvbnNlcyBmb3IgYmV0dGVyIHBlcmZvcm1hbmNlXHJcbiAgICAgICAgY29tcHJlc3M6IHRydWUsXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBBZGRpdGlvbmFsIGJlaGF2aW9ycyBmb3IgQVBJIGNhbGxzIChubyBjYWNoaW5nKVxyXG4gICAgICBhZGRpdGlvbmFsQmVoYXZpb3JzOiB7XHJcbiAgICAgICAgJy9hcGkvKic6IHtcclxuICAgICAgICAgIG9yaWdpbjogbmV3IG9yaWdpbnMuUzNPcmlnaW4odGhpcy53ZWJCdWNrZXQpLFxyXG4gICAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXHJcbiAgICAgICAgICBjYWNoZVBvbGljeTogY2xvdWRmcm9udC5DYWNoZVBvbGljeS5DQUNISU5HX0RJU0FCTEVELFxyXG4gICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQWxsb3dlZE1ldGhvZHMuQUxMT1dfQUxMLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBFcnJvciBwYWdlcyBmb3IgU1BBIHJvdXRpbmdcclxuICAgICAgZXJyb3JSZXNwb25zZXM6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBodHRwU3RhdHVzOiA0MDQsXHJcbiAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCxcclxuICAgICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6ICcvaW5kZXguaHRtbCcsXHJcbiAgICAgICAgICB0dGw6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgaHR0cFN0YXR1czogNDAzLFxyXG4gICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXHJcbiAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLFxyXG4gICAgICAgICAgdHRsOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG5cclxuICAgICAgLy8gUHJpY2UgY2xhc3MgZm9yIGNvc3Qgb3B0aW1pemF0aW9uXHJcbiAgICAgIHByaWNlQ2xhc3M6IGNsb3VkZnJvbnQuUHJpY2VDbGFzcy5QUklDRV9DTEFTU18xMDAsIC8vIFVTLCBDYW5hZGEsIEV1cm9wZVxyXG4gICAgICBcclxuICAgICAgLy8gRW5hYmxlIElQdjYgZm9yIGJldHRlciBnbG9iYWwgcmVhY2hcclxuICAgICAgZW5hYmxlSXB2NjogdHJ1ZSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2xvdWRGcm9udCBkaXN0cmlidXRpb24gZm9yIGFkbWluIGRhc2hib2FyZFxyXG4gICAgICogU2ltaWxhciBjb25maWd1cmF0aW9uIGJ1dCBzZXBhcmF0ZSBmb3Igc2VjdXJpdHkgaXNvbGF0aW9uXHJcbiAgICAgKi9cclxuICAgIHRoaXMuYWRtaW5EaXN0cmlidXRpb24gPSBuZXcgY2xvdWRmcm9udC5EaXN0cmlidXRpb24odGhpcywgJ0FkbWluRGlzdHJpYnV0aW9uJywge1xyXG4gICAgICBjb21tZW50OiAnYnVkZ2V0YnVkZHktYWRtaW4gLSBHbG9iYWwgQ0ROIGZvciBhZG1pbiBkYXNoYm9hcmQgd2l0aCBzZWN1cml0eSBpc29sYXRpb24nLFxyXG4gICAgICBcclxuICAgICAgZGVmYXVsdFJvb3RPYmplY3Q6ICdpbmRleC5odG1sJyxcclxuICAgICAgXHJcbiAgICAgIGRlZmF1bHRCZWhhdmlvcjoge1xyXG4gICAgICAgIG9yaWdpbjogbmV3IG9yaWdpbnMuUzNPcmlnaW4odGhpcy5hZG1pbkJ1Y2tldCksXHJcbiAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXHJcbiAgICAgICAgY2FjaGVQb2xpY3k6IGNsb3VkZnJvbnQuQ2FjaGVQb2xpY3kuQ0FDSElOR19PUFRJTUlaRUQsXHJcbiAgICAgICAgYWxsb3dlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQWxsb3dlZE1ldGhvZHMuQUxMT1dfR0VUX0hFQURfT1BUSU9OUyxcclxuICAgICAgICBjb21wcmVzczogdHJ1ZSxcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIEVycm9yIHBhZ2VzIGZvciBTUEEgcm91dGluZ1xyXG4gICAgICBlcnJvclJlc3BvbnNlczogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIGh0dHBTdGF0dXM6IDQwNCxcclxuICAgICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxyXG4gICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyxcclxuICAgICAgICAgIHR0bDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBodHRwU3RhdHVzOiA0MDMsXHJcbiAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCxcclxuICAgICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6ICcvaW5kZXguaHRtbCcsXHJcbiAgICAgICAgICB0dGw6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIF0sXHJcblxyXG4gICAgICBwcmljZUNsYXNzOiBjbG91ZGZyb250LlByaWNlQ2xhc3MuUFJJQ0VfQ0xBU1NfMTAwLFxyXG4gICAgICBlbmFibGVJcHY2OiB0cnVlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIGNvbXByZWhlbnNpdmUgY29zdCBhbGxvY2F0aW9uIHRhZ3NcclxuICAgIGNkay5UYWdzLm9mKHRoaXMud2ViRGlzdHJpYnV0aW9uKS5hZGQoJ0NvbXBvbmVudCcsICdXZWJDRE4nKTtcclxuICAgIGNkay5UYWdzLm9mKHRoaXMud2ViRGlzdHJpYnV0aW9uKS5hZGQoJ1NlcnZpY2UnLCAnQ2xvdWRGcm9udCcpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy53ZWJEaXN0cmlidXRpb24pLmFkZCgnUHJpY2VDbGFzcycsICdVUy1DYW5hZGEtRXVyb3BlJyk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzLndlYkRpc3RyaWJ1dGlvbikuYWRkKCdDb3N0Q2VudGVyJywgJ0J1ZGdldEJ1ZGR5LUNETicpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy53ZWJEaXN0cmlidXRpb24pLmFkZCgnQ2FjaGluZ0VuYWJsZWQnLCAnWWVzJyk7XHJcbiAgICBcclxuICAgIGNkay5UYWdzLm9mKHRoaXMuYWRtaW5EaXN0cmlidXRpb24pLmFkZCgnQ29tcG9uZW50JywgJ0FkbWluQ0ROJyk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzLmFkbWluRGlzdHJpYnV0aW9uKS5hZGQoJ1NlcnZpY2UnLCAnQ2xvdWRGcm9udCcpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy5hZG1pbkRpc3RyaWJ1dGlvbikuYWRkKCdQcmljZUNsYXNzJywgJ1VTLUNhbmFkYS1FdXJvcGUnKTtcclxuICAgIGNkay5UYWdzLm9mKHRoaXMuYWRtaW5EaXN0cmlidXRpb24pLmFkZCgnQ29zdENlbnRlcicsICdCdWRnZXRCdWRkeS1DRE4nKTtcclxuICAgIGNkay5UYWdzLm9mKHRoaXMuYWRtaW5EaXN0cmlidXRpb24pLmFkZCgnQ2FjaGluZ0VuYWJsZWQnLCAnWWVzJyk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGUgQ2xvdWRGb3JtYXRpb24gb3V0cHV0cyBmb3IgZGVwbG95bWVudCBwaXBlbGluZXMgYW5kIEROUyBjb25maWd1cmF0aW9uXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjcmVhdGVPdXRwdXRzKCk6IHZvaWQge1xyXG4gICAgLy8gV2ViIGJ1Y2tldCBvdXRwdXRzXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnV2ViQnVja2V0TmFtZScsIHtcclxuICAgICAgdmFsdWU6IHRoaXMud2ViQnVja2V0LmJ1Y2tldE5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUzMgYnVja2V0IG5hbWUgZm9yIEJ1ZGdldEJ1ZGR5IHdlYiBhcHBsaWNhdGlvbiBzdGF0aWMgaG9zdGluZycsXHJcbiAgICAgIGV4cG9ydE5hbWU6ICdidWRnZXRidWRkeS13ZWItYnVja2V0LW5hbWUnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1dlYkJ1Y2tldEFybicsIHtcclxuICAgICAgdmFsdWU6IHRoaXMud2ViQnVja2V0LmJ1Y2tldEFybixcclxuICAgICAgZGVzY3JpcHRpb246ICdTMyBidWNrZXQgQVJOIGZvciBCdWRnZXRCdWRkeSB3ZWIgYXBwbGljYXRpb24gSUFNIHBvbGljaWVzIGFuZCBkZXBsb3ltZW50JyxcclxuICAgICAgZXhwb3J0TmFtZTogJ2J1ZGdldGJ1ZGR5LXdlYi1idWNrZXQtYXJuJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkbWluIGJ1Y2tldCBvdXRwdXRzXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQWRtaW5CdWNrZXROYW1lJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5hZG1pbkJ1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1MzIGJ1Y2tldCBuYW1lIGZvciBCdWRnZXRCdWRkeSBhZG1pbiBkYXNoYm9hcmQgc3RhdGljIGhvc3RpbmcnLFxyXG4gICAgICBleHBvcnROYW1lOiAnYnVkZ2V0YnVkZHktYWRtaW4tYnVja2V0LW5hbWUnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FkbWluQnVja2V0QXJuJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5hZG1pbkJ1Y2tldC5idWNrZXRBcm4sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUzMgYnVja2V0IEFSTiBmb3IgQnVkZ2V0QnVkZHkgYWRtaW4gZGFzaGJvYXJkIElBTSBwb2xpY2llcyBhbmQgZGVwbG95bWVudCcsXHJcbiAgICAgIGV4cG9ydE5hbWU6ICdidWRnZXRidWRkeS1hZG1pbi1idWNrZXQtYXJuJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENsb3VkRnJvbnQgZGlzdHJpYnV0aW9uIG91dHB1dHNcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdXZWJEaXN0cmlidXRpb25JZCcsIHtcclxuICAgICAgdmFsdWU6IHRoaXMud2ViRGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbklkLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0Nsb3VkRnJvbnQgZGlzdHJpYnV0aW9uIElEIGZvciBCdWRnZXRCdWRkeSB3ZWIgYXBwbGljYXRpb24gY2FjaGUgaW52YWxpZGF0aW9uJyxcclxuICAgICAgZXhwb3J0TmFtZTogJ2J1ZGdldGJ1ZGR5LXdlYi1kaXN0cmlidXRpb24taWQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1dlYkRpc3RyaWJ1dGlvbkRvbWFpbk5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLndlYkRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25Eb21haW5OYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0Nsb3VkRnJvbnQgZG9tYWluIG5hbWUgZm9yIEJ1ZGdldEJ1ZGR5IHdlYiBhcHBsaWNhdGlvbiBwdWJsaWMgYWNjZXNzJyxcclxuICAgICAgZXhwb3J0TmFtZTogJ2J1ZGdldGJ1ZGR5LXdlYi1kaXN0cmlidXRpb24tZG9tYWluJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBZG1pbkRpc3RyaWJ1dGlvbklkJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5hZG1pbkRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25JZCxcclxuICAgICAgZGVzY3JpcHRpb246ICdDbG91ZEZyb250IGRpc3RyaWJ1dGlvbiBJRCBmb3IgQnVkZ2V0QnVkZHkgYWRtaW4gZGFzaGJvYXJkIGNhY2hlIGludmFsaWRhdGlvbicsXHJcbiAgICAgIGV4cG9ydE5hbWU6ICdidWRnZXRidWRkeS1hZG1pbi1kaXN0cmlidXRpb24taWQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FkbWluRGlzdHJpYnV0aW9uRG9tYWluTmFtZScsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuYWRtaW5EaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uRG9tYWluTmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdDbG91ZEZyb250IGRvbWFpbiBuYW1lIGZvciBCdWRnZXRCdWRkeSBhZG1pbiBkYXNoYm9hcmQgcHVibGljIGFjY2VzcycsXHJcbiAgICAgIGV4cG9ydE5hbWU6ICdidWRnZXRidWRkeS1hZG1pbi1kaXN0cmlidXRpb24tZG9tYWluJyxcclxuICAgIH0pO1xyXG4gIH1cclxufSJdfQ==