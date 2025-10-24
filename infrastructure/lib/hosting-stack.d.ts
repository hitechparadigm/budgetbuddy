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
import { Construct } from 'constructs';
export declare class HostingStack extends cdk.Stack {
    /**
     * S3 bucket for web application hosting
     * Exposed for deployment pipeline access
     */
    webBucket: s3.Bucket;
    /**
     * S3 bucket for admin dashboard hosting
     * Exposed for deployment pipeline access
     */
    adminBucket: s3.Bucket;
    /**
     * CloudFront distribution for web application
     * Exposed for monitoring and DNS configuration
     */
    webDistribution: cloudfront.Distribution;
    /**
     * CloudFront distribution for admin dashboard
     * Exposed for monitoring and DNS configuration
     */
    adminDistribution: cloudfront.Distribution;
    constructor(scope: Construct, id: string, props?: cdk.StackProps);
    /**
     * Create S3 buckets for hosting web application and admin dashboard
     * Configured for static website hosting with proper security settings
     */
    private createS3Buckets;
    /**
     * Create CloudFront distributions for global content delivery
     * Provides SSL termination, caching, and performance optimization
     */
    private createCloudFrontDistributions;
    /**
     * Create CloudFormation outputs for deployment pipelines and DNS configuration
     */
    private createOutputs;
}
