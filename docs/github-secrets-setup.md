# GitHub Secrets Setup for BudgetBuddy CI/CD

This document explains how to configure GitHub Secrets for the BudgetBuddy CI/CD pipeline using the hitechparadigm AWS profile.

## Required Secrets

Navigate to your GitHub repository → Settings → Secrets and variables → Actions, then add the following secrets:

### AWS Credentials (Required)

#### `HITECHPARADIGM_AWS_ACCESS_KEY_ID`
- **Description**: AWS Access Key ID for the hitechparadigm profile
- **Value**: Your AWS Access Key ID from the hitechparadigm profile
- **Usage**: Used by GitHub Actions to authenticate with AWS services

#### `HITECHPARADIGM_AWS_SECRET_ACCESS_KEY`
- **Description**: AWS Secret Access Key for the hitechparadigm profile  
- **Value**: Your AWS Secret Access Key from the hitechparadigm profile
- **Usage**: Used by GitHub Actions to authenticate with AWS services

### Optional Secrets



## AWS Profile Configuration

The CI/CD pipeline is configured to use the **hitechparadigm** AWS profile with the following settings:

- **Default Region**: `us-east-1`
- **Profile Name**: `hitechparadigm`
- **Account**: Your AWS account associated with hitechparadigm profile

## Required AWS Permissions

The hitechparadigm AWS profile must have the following permissions for successful deployment:

### CloudFormation
- `cloudformation:*` (full access for stack management)

### IAM
- `iam:CreateRole`
- `iam:DeleteRole`
- `iam:AttachRolePolicy`
- `iam:DetachRolePolicy`
- `iam:PutRolePolicy`
- `iam:DeleteRolePolicy`
- `iam:GetRole`
- `iam:PassRole`

### Lambda
- `lambda:*` (full access for function management)

### DynamoDB
- `dynamodb:CreateTable`
- `dynamodb:DeleteTable`
- `dynamodb:DescribeTable`
- `dynamodb:UpdateTable`
- `dynamodb:TagResource`

### S3
- `s3:CreateBucket`
- `s3:DeleteBucket`
- `s3:PutBucketPolicy`
- `s3:PutBucketPublicAccessBlock`
- `s3:PutBucketTagging`

### CloudFront
- `cloudfront:CreateDistribution`
- `cloudfront:DeleteDistribution`
- `cloudfront:UpdateDistribution`
- `cloudfront:TagResource`

### Cognito
- `cognito-idp:CreateUserPool`
- `cognito-idp:DeleteUserPool`
- `cognito-idp:CreateUserPoolClient`
- `cognito-idp:DeleteUserPoolClient`
- `cognito-idp:UpdateUserPool`

### API Gateway
- `apigateway:*` (full access for API management)

### CloudWatch
- `cloudwatch:PutDashboard`
- `cloudwatch:DeleteDashboards`
- `cloudwatch:PutMetricAlarm`
- `cloudwatch:DeleteAlarms`
- `logs:CreateLogGroup`
- `logs:DeleteLogGroup`

### SNS
- `sns:CreateTopic`
- `sns:DeleteTopic`
- `sns:Subscribe`
- `sns:Unsubscribe`

## Security Best Practices

### Secret Management
- ✅ Never commit AWS credentials to code
- ✅ Use GitHub Secrets for sensitive information
- ✅ Rotate AWS keys regularly
- ✅ Use least privilege principle for AWS permissions

### Access Control
- ✅ Limit GitHub repository access to authorized users
- ✅ Use branch protection rules
- ✅ Require pull request reviews
- ✅ Enable two-factor authentication

### Monitoring
- ✅ Monitor AWS CloudTrail for API usage
- ✅ Set up billing alerts for cost control
- ✅ Review deployment logs regularly

## Verification Steps

After setting up the secrets, verify the configuration:

1. **Test PR Workflow**
   ```bash
   # Create a test branch and PR
   git checkout -b test-cicd
   git push origin test-cicd
   # Create PR to main/develop branch
   ```

2. **Check Workflow Logs**
   - Navigate to Actions tab in GitHub
   - Verify workflows run without authentication errors
   - Check for successful AWS API calls

3. **Test Development Deployment**
   ```bash
   # Push to develop branch
   git checkout develop
   git push origin develop
   # Monitor deployment in Actions tab
   ```

## Troubleshooting

### Common Issues

#### Authentication Errors
```
Error: The security token included in the request is invalid
```
**Solution**: Verify AWS credentials are correct and not expired

#### Permission Denied
```
Error: User is not authorized to perform: cloudformation:CreateStack
```
**Solution**: Check AWS IAM permissions for the hitechparadigm profile

#### Region Mismatch
```
Error: Stack does not exist in region us-west-2
```
**Solution**: Ensure all resources are created in us-east-1 region

### Getting Help

If you encounter issues:
1. Check GitHub Actions workflow logs
2. Review AWS CloudFormation events
3. Verify AWS credentials and permissions
4. Create an issue using the deployment issue template

## Environment Variables

The following environment variables are automatically set in workflows:

```yaml
AWS_REGION: us-east-1
NODE_VERSION: '20'
ENVIRONMENT: dev|staging|prod
```

These are configured in the workflow files and don't need to be added as secrets.