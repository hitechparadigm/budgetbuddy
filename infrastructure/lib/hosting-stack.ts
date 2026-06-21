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

import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export interface HostingStackProps extends cdk.StackProps {
  environment?: string;
}

export class HostingStack extends cdk.Stack {
  /**
   * S3 bucket for web application hosting
   * Exposed for deployment pipeline access
   */
  public webBucket: s3.Bucket;

  /**
   * S3 bucket for admin dashboard hosting
   * Exposed for deployment pipeline access
   */
  public adminBucket: s3.Bucket;

  /**
   * CloudFront distribution for web application
   * Exposed for monitoring and DNS configuration
   */
  public webDistribution: cloudfront.Distribution;

  /**
   * CloudFront distribution for admin dashboard
   * Exposed for monitoring and DNS configuration
   */
  public adminDistribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props?: HostingStackProps) {
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
  private createS3Buckets(envName: string): void {
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
  private createCloudFrontDistributions(): void {
    /**
     * Cache policy for Vite content-hashed assets (/assets/*).
     * Filenames include a content hash (e.g. AccountsPage-d2d8db62.js),
     * so they are truly immutable — safe to cache for 1 year.
     * This also prevents stale-chunk errors: if the file exists it's served
     * correctly; if it doesn't exist we get a real 404, not a cached one.
     */
    const immutableAssetsCachePolicy = new cloudfront.CachePolicy(this, 'ImmutableAssets', {
      comment: 'Long-lived cache for Vite content-hashed assets (immutable)',
      defaultTtl: cdk.Duration.days(365),
      maxTtl: cdk.Duration.days(365),
      minTtl: cdk.Duration.days(365),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    /**
     * Cache policy for index.html — must NEVER be cached by CloudFront
     * so that after every deploy users get the latest entry-point immediately.
     */
    const noCachePolicy = new cloudfront.CachePolicy(this, 'NoCache', {
      comment: 'No-cache for index.html and SPA entry points',
      defaultTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.seconds(1),
      minTtl: cdk.Duration.seconds(0),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    /**
     * CloudFront distribution for web application
     * Provides global CDN with caching optimized for SPA
     */
    this.webDistribution = new cloudfront.Distribution(this, 'WebDistribution', {
      comment: 'budgetbuddy-web - Global CDN for React web application with SPA routing support',

      // S3 origin with Origin Access Identity for security
      defaultRootObject: 'index.html',

      // Default behavior — serves index.html for all SPA routes; no caching
      defaultBehavior: {
        origin: new origins.S3Origin(this.webBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        // Don't cache the SPA entry-point — always fetch fresh index.html after deploy
        cachePolicy: noCachePolicy,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        compress: true,
      },

      additionalBehaviors: {
        // Content-hashed Vite assets — safe to cache indefinitely (immutable)
        '/assets/*': {
          origin: new origins.S3Origin(this.webBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: immutableAssetsCachePolicy,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          compress: true,
        },

        // API proxy paths — no caching
        '/api/*': {
          origin: new origins.S3Origin(this.webBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        },
      },

      // Error pages for SPA routing.
      // CRITICAL: ttl MUST be Duration.seconds(0) for 404/403.
      // A non-zero TTL here is what causes the stale chunk-load error:
      // CloudFront caches the 404→index.html response, so subsequent requests
      // for a freshly-deployed asset (different hash) also get index.html
      // with Content-Type: text/html, which the browser rejects as a JS module.
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0), // Never cache 404s
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0), // Never cache 403s
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
        cachePolicy: noCachePolicy,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        compress: true,
      },

      additionalBehaviors: {
        '/assets/*': {
          origin: new origins.S3Origin(this.adminBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: immutableAssetsCachePolicy,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          compress: true,
        },
      },

      // Error pages for SPA routing — never cache error responses
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
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
  private createOutputs(): void {
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
