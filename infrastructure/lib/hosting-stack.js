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
        const envName = props?.environment || this.node.tryGetContext('environment') || 'dev';
        // Create S3 buckets for hosting
        this.createS3Buckets(envName);
        // Create CloudFront distributions
        this.createCloudFrontDistributions();
        // Create outputs for deployment pipelines
        this.createOutputs();
    }
    /**
     * Create S3 buckets for hosting web application and admin dashboard
     * Configured for static website hosting with proper security settings
     */
    createS3Buckets(envName) {
        /**
         * S3 bucket for web application (React app)
         * Hosts the main user-facing application
         */
        this.webBucket = new s3.Bucket(this, 'WebBucket', {
            bucketName: `budgetbuddy-${envName}-web-app`,
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
            bucketName: `budgetbuddy-${envName}-admin-dashboard`,
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
        // Convenience outputs for deployment workflows
        new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
            value: this.webDistribution.distributionId,
            description: 'CloudFront distribution ID (alias for deployment workflows)',
        });
        new cdk.CfnOutput(this, 'CloudFrontUrl', {
            value: `https://${this.webDistribution.distributionDomainName}`,
            description: 'Full HTTPS URL for the BudgetBuddy web application',
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9zdGluZy1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImhvc3Rpbmctc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozs7O0dBYUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILGlEQUFtQztBQUNuQyx1REFBeUM7QUFDekMsdUVBQXlEO0FBQ3pELDRFQUE4RDtBQVE5RCxNQUFhLFlBQWEsU0FBUSxHQUFHLENBQUMsS0FBSztJQXlCekMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF5QjtRQUNqRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsV0FBVyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQztRQUV0RixnQ0FBZ0M7UUFDaEMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUU5QixrQ0FBa0M7UUFDbEMsSUFBSSxDQUFDLDZCQUE2QixFQUFFLENBQUM7UUFFckMsMENBQTBDO1FBQzFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztJQUN2QixDQUFDO0lBRUQ7OztPQUdHO0lBQ0ssZUFBZSxDQUFDLE9BQWU7UUFDckM7OztXQUdHO1FBQ0gsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRTtZQUNoRCxVQUFVLEVBQUUsZUFBZSxPQUFPLFVBQVU7WUFFNUMsMkRBQTJEO1lBQzNELGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1lBRWpELDRDQUE0QztZQUM1QyxTQUFTLEVBQUUsSUFBSTtZQUVmLHFEQUFxRDtZQUNyRCxjQUFjLEVBQUUsQ0FBQztvQkFDZixFQUFFLEVBQUUsbUJBQW1CO29CQUN2QixPQUFP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RUFBRSwyQkFBMkIsRUFBRTtZQUNuRCxLQUFLLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxzQkFBc0I7WUFDbEQsV0FBVyxFQUFFLHNFQUFzRTtZQUNuRixVQUFVLEVBQUUscUNBQXFDO1NBQ2xELENBQUMsQ0FBQztRQUVILCtDQUErQztRQUMvQyxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLDBCQUEwQixFQUFFO1lBQ2xELEtBQUssRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWM7WUFDMUMsV0FBVyxFQUFFLDZEQUE2RDtTQUMzRSxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUN2QyxLQUFLLEVBQUUsV0FBVyxJQUFJLENBQUMsZUFBZSxDQUFDLHNCQUFzQixFQUFFO1lBQy9ELFdBQVcsRUFBRSxvREFBb0Q7U0FDbEUsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxxQkFBcUIsRUFBRTtZQUM3QyxLQUFLLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGNBQWM7WUFDNUMsV0FBVyxFQUFFLCtFQUErRTtZQUM1RixVQUFVLEVBQUUsbUNBQW1DO1NBQ2hELENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsNkJBQTZCLEVBQUU7WUFDckQsS0FBSyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxzQkFBc0I7WUFDcEQsV0FBVyxFQUFFLHNFQUFzRTtZQUNuRixVQUFVLEVBQUUsdUNBQXVDO1NBQ3BELENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQW5TRCxvQ0FtU0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogSG9zdGluZyBTdGFjayBmb3IgQnVkZ2V0QnVkZHkgQXBwbGljYXRpb25cclxuICpcclxuICogQ3JlYXRlcyBTMyBidWNrZXRzIGFuZCBDbG91ZEZyb250IGRpc3RyaWJ1dGlvbnMgZm9yIGhvc3RpbmcgdGhlIHdlYiBhcHBsaWNhdGlvblxyXG4gKiBhbmQgYWRtaW4gZGFzaGJvYXJkLiBQcm92aWRlcyBnbG9iYWwgY29udGVudCBkZWxpdmVyeSB3aXRoIFNTTC9UTFMgdGVybWluYXRpb25cclxuICogYW5kIGNhY2hpbmcgZm9yIG9wdGltYWwgcGVyZm9ybWFuY2UuXHJcbiAqXHJcbiAqIEtleSBGZWF0dXJlczpcclxuICogLSBTMyBidWNrZXRzIGZvciBzdGF0aWMgd2Vic2l0ZSBob3N0aW5nXHJcbiAqIC0gQ2xvdWRGcm9udCBkaXN0cmlidXRpb25zIGZvciBnbG9iYWwgQ0ROXHJcbiAqIC0gU1NML1RMUyBjZXJ0aWZpY2F0ZXMgZm9yIHNlY3VyZSBjb25uZWN0aW9uc1xyXG4gKiAtIEN1c3RvbSBkb21haW4gc3VwcG9ydFxyXG4gKiAtIENhY2hpbmcgcG9saWNpZXMgZm9yIHBlcmZvcm1hbmNlIG9wdGltaXphdGlvblxyXG4gKi9cclxuXHJcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XHJcbmltcG9ydCAqIGFzIGNsb3VkZnJvbnQgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQnO1xyXG5pbXBvcnQgKiBhcyBvcmlnaW5zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250LW9yaWdpbnMnO1xyXG5pbXBvcnQgKiBhcyBzM2RlcGxveSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMtZGVwbG95bWVudCc7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBIb3N0aW5nU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcclxuICBlbnZpcm9ubWVudD86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEhvc3RpbmdTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XHJcbiAgLyoqXHJcbiAgICogUzMgYnVja2V0IGZvciB3ZWIgYXBwbGljYXRpb24gaG9zdGluZ1xyXG4gICAqIEV4cG9zZWQgZm9yIGRlcGxveW1lbnQgcGlwZWxpbmUgYWNjZXNzXHJcbiAgICovXHJcbiAgcHVibGljIHdlYkJ1Y2tldDogczMuQnVja2V0O1xyXG5cclxuICAvKipcclxuICAgKiBTMyBidWNrZXQgZm9yIGFkbWluIGRhc2hib2FyZCBob3N0aW5nXHJcbiAgICogRXhwb3NlZCBmb3IgZGVwbG95bWVudCBwaXBlbGluZSBhY2Nlc3NcclxuICAgKi9cclxuICBwdWJsaWMgYWRtaW5CdWNrZXQ6IHMzLkJ1Y2tldDtcclxuXHJcbiAgLyoqXHJcbiAgICogQ2xvdWRGcm9udCBkaXN0cmlidXRpb24gZm9yIHdlYiBhcHBsaWNhdGlvblxyXG4gICAqIEV4cG9zZWQgZm9yIG1vbml0b3JpbmcgYW5kIEROUyBjb25maWd1cmF0aW9uXHJcbiAgICovXHJcbiAgcHVibGljIHdlYkRpc3RyaWJ1dGlvbjogY2xvdWRmcm9udC5EaXN0cmlidXRpb247XHJcblxyXG4gIC8qKlxyXG4gICAqIENsb3VkRnJvbnQgZGlzdHJpYnV0aW9uIGZvciBhZG1pbiBkYXNoYm9hcmRcclxuICAgKiBFeHBvc2VkIGZvciBtb25pdG9yaW5nIGFuZCBETlMgY29uZmlndXJhdGlvblxyXG4gICAqL1xyXG4gIHB1YmxpYyBhZG1pbkRpc3RyaWJ1dGlvbjogY2xvdWRmcm9udC5EaXN0cmlidXRpb247XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogSG9zdGluZ1N0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgIGNvbnN0IGVudk5hbWUgPSBwcm9wcz8uZW52aXJvbm1lbnQgfHwgdGhpcy5ub2RlLnRyeUdldENvbnRleHQoJ2Vudmlyb25tZW50JykgfHwgJ2Rldic7XHJcblxyXG4gICAgLy8gQ3JlYXRlIFMzIGJ1Y2tldHMgZm9yIGhvc3RpbmdcclxuICAgIHRoaXMuY3JlYXRlUzNCdWNrZXRzKGVudk5hbWUpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBDbG91ZEZyb250IGRpc3RyaWJ1dGlvbnNcclxuICAgIHRoaXMuY3JlYXRlQ2xvdWRGcm9udERpc3RyaWJ1dGlvbnMoKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgb3V0cHV0cyBmb3IgZGVwbG95bWVudCBwaXBlbGluZXNcclxuICAgIHRoaXMuY3JlYXRlT3V0cHV0cygpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlIFMzIGJ1Y2tldHMgZm9yIGhvc3Rpbmcgd2ViIGFwcGxpY2F0aW9uIGFuZCBhZG1pbiBkYXNoYm9hcmRcclxuICAgKiBDb25maWd1cmVkIGZvciBzdGF0aWMgd2Vic2l0ZSBob3N0aW5nIHdpdGggcHJvcGVyIHNlY3VyaXR5IHNldHRpbmdzXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjcmVhdGVTM0J1Y2tldHMoZW52TmFtZTogc3RyaW5nKTogdm9pZCB7XHJcbiAgICAvKipcclxuICAgICAqIFMzIGJ1Y2tldCBmb3Igd2ViIGFwcGxpY2F0aW9uIChSZWFjdCBhcHApXHJcbiAgICAgKiBIb3N0cyB0aGUgbWFpbiB1c2VyLWZhY2luZyBhcHBsaWNhdGlvblxyXG4gICAgICovXHJcbiAgICB0aGlzLndlYkJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ1dlYkJ1Y2tldCcsIHtcclxuICAgICAgYnVja2V0TmFtZTogYGJ1ZGdldGJ1ZGR5LSR7ZW52TmFtZX0td2ViLWFwcGAsXHJcblxyXG4gICAgICAvLyBCbG9jayBhbGwgcHVibGljIGFjY2VzcyAtIENsb3VkRnJvbnQgd2lsbCBhY2Nlc3MgdmlhIE9BSVxyXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxyXG5cclxuICAgICAgLy8gRW5hYmxlIHZlcnNpb25pbmcgZm9yIHJvbGxiYWNrIGNhcGFiaWxpdHlcclxuICAgICAgdmVyc2lvbmVkOiB0cnVlLFxyXG5cclxuICAgICAgLy8gQXV0b21hdGljIGNsZWFudXAgb2Ygb2xkIHZlcnNpb25zIHRvIGNvbnRyb2wgY29zdHNcclxuICAgICAgbGlmZWN5Y2xlUnVsZXM6IFt7XHJcbiAgICAgICAgaWQ6ICdEZWxldGVPbGRWZXJzaW9ucycsXHJcbiAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICBub25jdXJyZW50VmVyc2lvbkV4cGlyYXRpb246IGNkay5EdXJhdGlvbi5kYXlzKDMwKSxcclxuICAgICAgfV0sXHJcblxyXG4gICAgICAvLyBSZW1vdmUgYnVja2V0IHdoZW4gc3RhY2sgaXMgZGVsZXRlZCAoZm9yIGRldiBlbnZpcm9ubWVudHMpXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBTMyBidWNrZXQgZm9yIGFkbWluIGRhc2hib2FyZCAoUmVhY3QgYWRtaW4gYXBwKVxyXG4gICAgICogSG9zdHMgdGhlIGFkbWluaXN0cmF0aXZlIGludGVyZmFjZSBmb3IgbWFuYWdpbmcgdXNlcnMgYW5kIGNvbnRlbnRcclxuICAgICAqL1xyXG4gICAgdGhpcy5hZG1pbkJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ0FkbWluQnVja2V0Jywge1xyXG4gICAgICBidWNrZXROYW1lOiBgYnVkZ2V0YnVkZHktJHtlbnZOYW1lfS1hZG1pbi1kYXNoYm9hcmRgLFxyXG5cclxuICAgICAgLy8gQmxvY2sgYWxsIHB1YmxpYyBhY2Nlc3MgLSBDbG91ZEZyb250IHdpbGwgYWNjZXNzIHZpYSBPQUlcclxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcclxuXHJcbiAgICAgIC8vIEVuYWJsZSB2ZXJzaW9uaW5nIGZvciByb2xsYmFjayBjYXBhYmlsaXR5XHJcbiAgICAgIHZlcnNpb25lZDogdHJ1ZSxcclxuXHJcbiAgICAgIC8vIEF1dG9tYXRpYyBjbGVhbnVwIG9mIG9sZCB2ZXJzaW9uc1xyXG4gICAgICBsaWZlY3ljbGVSdWxlczogW3tcclxuICAgICAgICBpZDogJ0RlbGV0ZU9sZFZlcnNpb25zJyxcclxuICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgIG5vbmN1cnJlbnRWZXJzaW9uRXhwaXJhdGlvbjogY2RrLkR1cmF0aW9uLmRheXMoMzApLFxyXG4gICAgICB9XSxcclxuXHJcbiAgICAgIC8vIFJlbW92ZSBidWNrZXQgd2hlbiBzdGFjayBpcyBkZWxldGVkXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIGNvbXByZWhlbnNpdmUgY29zdCBhbGxvY2F0aW9uIHRhZ3NcclxuICAgIGNkay5UYWdzLm9mKHRoaXMud2ViQnVja2V0KS5hZGQoJ0NvbXBvbmVudCcsICdXZWJIb3N0aW5nJyk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzLndlYkJ1Y2tldCkuYWRkKCdTZXJ2aWNlJywgJ1MzJyk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzLndlYkJ1Y2tldCkuYWRkKCdDb250ZW50VHlwZScsICdTdGF0aWMtV2Vic2l0ZScpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy53ZWJCdWNrZXQpLmFkZCgnQ29zdENlbnRlcicsICdCdWRnZXRCdWRkeS1Gcm9udGVuZCcpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy53ZWJCdWNrZXQpLmFkZCgnQmFja3VwUmVxdWlyZWQnLCAnTm8nKTtcclxuXHJcbiAgICBjZGsuVGFncy5vZih0aGlzLmFkbWluQnVja2V0KS5hZGQoJ0NvbXBvbmVudCcsICdBZG1pbkhvc3RpbmcnKTtcclxuICAgIGNkay5UYWdzLm9mKHRoaXMuYWRtaW5CdWNrZXQpLmFkZCgnU2VydmljZScsICdTMycpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy5hZG1pbkJ1Y2tldCkuYWRkKCdDb250ZW50VHlwZScsICdBZG1pbi1EYXNoYm9hcmQnKTtcclxuICAgIGNkay5UYWdzLm9mKHRoaXMuYWRtaW5CdWNrZXQpLmFkZCgnQ29zdENlbnRlcicsICdCdWRnZXRCdWRkeS1BZG1pbicpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy5hZG1pbkJ1Y2tldCkuYWRkKCdCYWNrdXBSZXF1aXJlZCcsICdObycpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlIENsb3VkRnJvbnQgZGlzdHJpYnV0aW9ucyBmb3IgZ2xvYmFsIGNvbnRlbnQgZGVsaXZlcnlcclxuICAgKiBQcm92aWRlcyBTU0wgdGVybWluYXRpb24sIGNhY2hpbmcsIGFuZCBwZXJmb3JtYW5jZSBvcHRpbWl6YXRpb25cclxuICAgKi9cclxuICBwcml2YXRlIGNyZWF0ZUNsb3VkRnJvbnREaXN0cmlidXRpb25zKCk6IHZvaWQge1xyXG4gICAgLyoqXHJcbiAgICAgKiBDbG91ZEZyb250IGRpc3RyaWJ1dGlvbiBmb3Igd2ViIGFwcGxpY2F0aW9uXHJcbiAgICAgKiBQcm92aWRlcyBnbG9iYWwgQ0ROIHdpdGggY2FjaGluZyBvcHRpbWl6ZWQgZm9yIFNQQVxyXG4gICAgICovXHJcbiAgICB0aGlzLndlYkRpc3RyaWJ1dGlvbiA9IG5ldyBjbG91ZGZyb250LkRpc3RyaWJ1dGlvbih0aGlzLCAnV2ViRGlzdHJpYnV0aW9uJywge1xyXG4gICAgICBjb21tZW50OiAnYnVkZ2V0YnVkZHktd2ViIC0gR2xvYmFsIENETiBmb3IgUmVhY3Qgd2ViIGFwcGxpY2F0aW9uIHdpdGggU1BBIHJvdXRpbmcgc3VwcG9ydCcsXHJcblxyXG4gICAgICAvLyBTMyBvcmlnaW4gd2l0aCBPcmlnaW4gQWNjZXNzIElkZW50aXR5IGZvciBzZWN1cml0eVxyXG4gICAgICBkZWZhdWx0Um9vdE9iamVjdDogJ2luZGV4Lmh0bWwnLFxyXG5cclxuICAgICAgLy8gRGVmYXVsdCBiZWhhdmlvciBmb3IgYWxsIHJlcXVlc3RzXHJcbiAgICAgIGRlZmF1bHRCZWhhdmlvcjoge1xyXG4gICAgICAgIG9yaWdpbjogbmV3IG9yaWdpbnMuUzNPcmlnaW4odGhpcy53ZWJCdWNrZXQpLFxyXG5cclxuICAgICAgICAvLyBWaWV3ZXIgcHJvdG9jb2wgcG9saWN5IC0gcmVkaXJlY3QgSFRUUCB0byBIVFRQU1xyXG4gICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxyXG5cclxuICAgICAgICAvLyBDYWNoaW5nIHBvbGljeSBvcHRpbWl6ZWQgZm9yIFNQQVxyXG4gICAgICAgIGNhY2hlUG9saWN5OiBjbG91ZGZyb250LkNhY2hlUG9saWN5LkNBQ0hJTkdfT1BUSU1JWkVELFxyXG5cclxuICAgICAgICAvLyBBbGxvd2VkIEhUVFAgbWV0aG9kc1xyXG4gICAgICAgIGFsbG93ZWRNZXRob2RzOiBjbG91ZGZyb250LkFsbG93ZWRNZXRob2RzLkFMTE9XX0dFVF9IRUFEX09QVElPTlMsXHJcblxyXG4gICAgICAgIC8vIENvbXByZXNzIHJlc3BvbnNlcyBmb3IgYmV0dGVyIHBlcmZvcm1hbmNlXHJcbiAgICAgICAgY29tcHJlc3M6IHRydWUsXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBBZGRpdGlvbmFsIGJlaGF2aW9ycyBmb3IgQVBJIGNhbGxzIChubyBjYWNoaW5nKVxyXG4gICAgICBhZGRpdGlvbmFsQmVoYXZpb3JzOiB7XHJcbiAgICAgICAgJy9hcGkvKic6IHtcclxuICAgICAgICAgIG9yaWdpbjogbmV3IG9yaWdpbnMuUzNPcmlnaW4odGhpcy53ZWJCdWNrZXQpLFxyXG4gICAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXHJcbiAgICAgICAgICBjYWNoZVBvbGljeTogY2xvdWRmcm9udC5DYWNoZVBvbGljeS5DQUNISU5HX0RJU0FCTEVELFxyXG4gICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQWxsb3dlZE1ldGhvZHMuQUxMT1dfQUxMLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBFcnJvciBwYWdlcyBmb3IgU1BBIHJvdXRpbmdcclxuICAgICAgZXJyb3JSZXNwb25zZXM6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBodHRwU3RhdHVzOiA0MDQsXHJcbiAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCxcclxuICAgICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6ICcvaW5kZXguaHRtbCcsXHJcbiAgICAgICAgICB0dGw6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgaHR0cFN0YXR1czogNDAzLFxyXG4gICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXHJcbiAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLFxyXG4gICAgICAgICAgdHRsOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG5cclxuICAgICAgLy8gUHJpY2UgY2xhc3MgZm9yIGNvc3Qgb3B0aW1pemF0aW9uXHJcbiAgICAgIHByaWNlQ2xhc3M6IGNsb3VkZnJvbnQuUHJpY2VDbGFzcy5QUklDRV9DTEFTU18xMDAsIC8vIFVTLCBDYW5hZGEsIEV1cm9wZVxyXG5cclxuICAgICAgLy8gRW5hYmxlIElQdjYgZm9yIGJldHRlciBnbG9iYWwgcmVhY2hcclxuICAgICAgZW5hYmxlSXB2NjogdHJ1ZSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2xvdWRGcm9udCBkaXN0cmlidXRpb24gZm9yIGFkbWluIGRhc2hib2FyZFxyXG4gICAgICogU2ltaWxhciBjb25maWd1cmF0aW9uIGJ1dCBzZXBhcmF0ZSBmb3Igc2VjdXJpdHkgaXNvbGF0aW9uXHJcbiAgICAgKi9cclxuICAgIHRoaXMuYWRtaW5EaXN0cmlidXRpb24gPSBuZXcgY2xvdWRmcm9udC5EaXN0cmlidXRpb24odGhpcywgJ0FkbWluRGlzdHJpYnV0aW9uJywge1xyXG4gICAgICBjb21tZW50OiAnYnVkZ2V0YnVkZHktYWRtaW4gLSBHbG9iYWwgQ0ROIGZvciBhZG1pbiBkYXNoYm9hcmQgd2l0aCBzZWN1cml0eSBpc29sYXRpb24nLFxyXG5cclxuICAgICAgZGVmYXVsdFJvb3RPYmplY3Q6ICdpbmRleC5odG1sJyxcclxuXHJcbiAgICAgIGRlZmF1bHRCZWhhdmlvcjoge1xyXG4gICAgICAgIG9yaWdpbjogbmV3IG9yaWdpbnMuUzNPcmlnaW4odGhpcy5hZG1pbkJ1Y2tldCksXHJcbiAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXHJcbiAgICAgICAgY2FjaGVQb2xpY3k6IGNsb3VkZnJvbnQuQ2FjaGVQb2xpY3kuQ0FDSElOR19PUFRJTUlaRUQsXHJcbiAgICAgICAgYWxsb3dlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQWxsb3dlZE1ldGhvZHMuQUxMT1dfR0VUX0hFQURfT1BUSU9OUyxcclxuICAgICAgICBjb21wcmVzczogdHJ1ZSxcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIEVycm9yIHBhZ2VzIGZvciBTUEEgcm91dGluZ1xyXG4gICAgICBlcnJvclJlc3BvbnNlczogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIGh0dHBTdGF0dXM6IDQwNCxcclxuICAgICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxyXG4gICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyxcclxuICAgICAgICAgIHR0bDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBodHRwU3RhdHVzOiA0MDMsXHJcbiAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCxcclxuICAgICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6ICcvaW5kZXguaHRtbCcsXHJcbiAgICAgICAgICB0dGw6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIF0sXHJcblxyXG4gICAgICBwcmljZUNsYXNzOiBjbG91ZGZyb250LlByaWNlQ2xhc3MuUFJJQ0VfQ0xBU1NfMTAwLFxyXG4gICAgICBlbmFibGVJcHY2OiB0cnVlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIGNvbXByZWhlbnNpdmUgY29zdCBhbGxvY2F0aW9uIHRhZ3NcclxuICAgIGNkay5UYWdzLm9mKHRoaXMud2ViRGlzdHJpYnV0aW9uKS5hZGQoJ0NvbXBvbmVudCcsICdXZWJDRE4nKTtcclxuICAgIGNkay5UYWdzLm9mKHRoaXMud2ViRGlzdHJpYnV0aW9uKS5hZGQoJ1NlcnZpY2UnLCAnQ2xvdWRGcm9udCcpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy53ZWJEaXN0cmlidXRpb24pLmFkZCgnUHJpY2VDbGFzcycsICdVUy1DYW5hZGEtRXVyb3BlJyk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzLndlYkRpc3RyaWJ1dGlvbikuYWRkKCdDb3N0Q2VudGVyJywgJ0J1ZGdldEJ1ZGR5LUNETicpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy53ZWJEaXN0cmlidXRpb24pLmFkZCgnQ2FjaGluZ0VuYWJsZWQnLCAnWWVzJyk7XHJcblxyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy5hZG1pbkRpc3RyaWJ1dGlvbikuYWRkKCdDb21wb25lbnQnLCAnQWRtaW5DRE4nKTtcclxuICAgIGNkay5UYWdzLm9mKHRoaXMuYWRtaW5EaXN0cmlidXRpb24pLmFkZCgnU2VydmljZScsICdDbG91ZEZyb250Jyk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzLmFkbWluRGlzdHJpYnV0aW9uKS5hZGQoJ1ByaWNlQ2xhc3MnLCAnVVMtQ2FuYWRhLUV1cm9wZScpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy5hZG1pbkRpc3RyaWJ1dGlvbikuYWRkKCdDb3N0Q2VudGVyJywgJ0J1ZGdldEJ1ZGR5LUNETicpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy5hZG1pbkRpc3RyaWJ1dGlvbikuYWRkKCdDYWNoaW5nRW5hYmxlZCcsICdZZXMnKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBDbG91ZEZvcm1hdGlvbiBvdXRwdXRzIGZvciBkZXBsb3ltZW50IHBpcGVsaW5lcyBhbmQgRE5TIGNvbmZpZ3VyYXRpb25cclxuICAgKi9cclxuICBwcml2YXRlIGNyZWF0ZU91dHB1dHMoKTogdm9pZCB7XHJcbiAgICAvLyBXZWIgYnVja2V0IG91dHB1dHNcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdXZWJCdWNrZXROYW1lJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy53ZWJCdWNrZXQuYnVja2V0TmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdTMyBidWNrZXQgbmFtZSBmb3IgQnVkZ2V0QnVkZHkgd2ViIGFwcGxpY2F0aW9uIHN0YXRpYyBob3N0aW5nJyxcclxuICAgICAgZXhwb3J0TmFtZTogJ2J1ZGdldGJ1ZGR5LXdlYi1idWNrZXQtbmFtZScsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnV2ViQnVja2V0QXJuJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy53ZWJCdWNrZXQuYnVja2V0QXJuLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1MzIGJ1Y2tldCBBUk4gZm9yIEJ1ZGdldEJ1ZGR5IHdlYiBhcHBsaWNhdGlvbiBJQU0gcG9saWNpZXMgYW5kIGRlcGxveW1lbnQnLFxyXG4gICAgICBleHBvcnROYW1lOiAnYnVkZ2V0YnVkZHktd2ViLWJ1Y2tldC1hcm4nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRtaW4gYnVja2V0IG91dHB1dHNcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBZG1pbkJ1Y2tldE5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmFkbWluQnVja2V0LmJ1Y2tldE5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUzMgYnVja2V0IG5hbWUgZm9yIEJ1ZGdldEJ1ZGR5IGFkbWluIGRhc2hib2FyZCBzdGF0aWMgaG9zdGluZycsXHJcbiAgICAgIGV4cG9ydE5hbWU6ICdidWRnZXRidWRkeS1hZG1pbi1idWNrZXQtbmFtZScsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQWRtaW5CdWNrZXRBcm4nLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmFkbWluQnVja2V0LmJ1Y2tldEFybixcclxuICAgICAgZGVzY3JpcHRpb246ICdTMyBidWNrZXQgQVJOIGZvciBCdWRnZXRCdWRkeSBhZG1pbiBkYXNoYm9hcmQgSUFNIHBvbGljaWVzIGFuZCBkZXBsb3ltZW50JyxcclxuICAgICAgZXhwb3J0TmFtZTogJ2J1ZGdldGJ1ZGR5LWFkbWluLWJ1Y2tldC1hcm4nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ2xvdWRGcm9udCBkaXN0cmlidXRpb24gb3V0cHV0c1xyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1dlYkRpc3RyaWJ1dGlvbklkJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy53ZWJEaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uSWQsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2xvdWRGcm9udCBkaXN0cmlidXRpb24gSUQgZm9yIEJ1ZGdldEJ1ZGR5IHdlYiBhcHBsaWNhdGlvbiBjYWNoZSBpbnZhbGlkYXRpb24nLFxyXG4gICAgICBleHBvcnROYW1lOiAnYnVkZ2V0YnVkZHktd2ViLWRpc3RyaWJ1dGlvbi1pZCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnV2ViRGlzdHJpYnV0aW9uRG9tYWluTmFtZScsIHtcclxuICAgICAgdmFsdWU6IHRoaXMud2ViRGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbkRvbWFpbk5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2xvdWRGcm9udCBkb21haW4gbmFtZSBmb3IgQnVkZ2V0QnVkZHkgd2ViIGFwcGxpY2F0aW9uIHB1YmxpYyBhY2Nlc3MnLFxyXG4gICAgICBleHBvcnROYW1lOiAnYnVkZ2V0YnVkZHktd2ViLWRpc3RyaWJ1dGlvbi1kb21haW4nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ29udmVuaWVuY2Ugb3V0cHV0cyBmb3IgZGVwbG95bWVudCB3b3JrZmxvd3NcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDbG91ZEZyb250RGlzdHJpYnV0aW9uSWQnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLndlYkRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25JZCxcclxuICAgICAgZGVzY3JpcHRpb246ICdDbG91ZEZyb250IGRpc3RyaWJ1dGlvbiBJRCAoYWxpYXMgZm9yIGRlcGxveW1lbnQgd29ya2Zsb3dzKScsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ2xvdWRGcm9udFVybCcsIHtcclxuICAgICAgdmFsdWU6IGBodHRwczovLyR7dGhpcy53ZWJEaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uRG9tYWluTmFtZX1gLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0Z1bGwgSFRUUFMgVVJMIGZvciB0aGUgQnVkZ2V0QnVkZHkgd2ViIGFwcGxpY2F0aW9uJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBZG1pbkRpc3RyaWJ1dGlvbklkJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5hZG1pbkRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25JZCxcclxuICAgICAgZGVzY3JpcHRpb246ICdDbG91ZEZyb250IGRpc3RyaWJ1dGlvbiBJRCBmb3IgQnVkZ2V0QnVkZHkgYWRtaW4gZGFzaGJvYXJkIGNhY2hlIGludmFsaWRhdGlvbicsXHJcbiAgICAgIGV4cG9ydE5hbWU6ICdidWRnZXRidWRkeS1hZG1pbi1kaXN0cmlidXRpb24taWQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FkbWluRGlzdHJpYnV0aW9uRG9tYWluTmFtZScsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuYWRtaW5EaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uRG9tYWluTmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdDbG91ZEZyb250IGRvbWFpbiBuYW1lIGZvciBCdWRnZXRCdWRkeSBhZG1pbiBkYXNoYm9hcmQgcHVibGljIGFjY2VzcycsXHJcbiAgICAgIGV4cG9ydE5hbWU6ICdidWRnZXRidWRkeS1hZG1pbi1kaXN0cmlidXRpb24tZG9tYWluJyxcclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG4iXX0=