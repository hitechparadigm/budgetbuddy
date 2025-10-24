# BudgetBuddy CI/CD Workflows

This directory contains GitHub Actions workflows for automated testing and deployment of the BudgetBuddy application using the hitechparadigm AWS profile.

## Workflows

### 🔍 Pull Request Validation (`pr-check.yml`)

**Triggers**: Pull requests to `main` or `develop` branches

**Purpose**: Validates code quality, runs tests, and ensures deployability before merging.

**Jobs**:
- **Code Quality**: ESLint, Prettier, TypeScript compilation
- **Infrastructure Validation**: CDK synthesis and validation
- **Unit Tests**: Jest tests with coverage reporting
- **Security Scanning**: npm audit for dependency vulnerabilities
- **Lambda Function Tests**: Tests for all backend functions
- **Build Validation**: Ensures all packages build successfully

### 🚀 Development Deployment (`deploy-dev.yml`)

**Triggers**: Push to `develop` branch

**Purpose**: Automatically deploys to development environment for testing.

**Environment**: Development (`dev`)
**AWS Profile**: hitechparadigm

**Jobs**:
- **Pre-deployment Checks**: Linting, tests, CDK validation
- **Deploy Infrastructure**: CDK deployment of all AWS stacks
- **Health Checks**: Post-deployment validation and API testing
- **Deployment Notification**: Summary and next steps

## AWS Configuration

### Required GitHub Secrets

The following secrets must be configured in the GitHub repository:

```
HITECHPARADIGM_AWS_ACCESS_KEY_ID     # AWS Access Key for hitechparadigm profile
HITECHPARADIGM_AWS_SECRET_ACCESS_KEY # AWS Secret Key for hitechparadigm profile
```

### AWS Resources Created

The deployment creates the following AWS resources with `budgetbuddy-{env}-` prefix:

- **Database Stack**: DynamoDB table with GSI indexes
- **Auth Stack**: Cognito User Pool and Client
- **API Stack**: Lambda functions and API Gateway
- **Hosting Stack**: S3 buckets and CloudFront distributions
- **Monitoring Stack**: CloudWatch dashboards and SNS alerts

## Environment Configuration

### Development Environment

- **Stack Prefix**: `budgetbuddy-dev-`
- **Region**: `us-east-1`
- **Removal Policy**: `DESTROY` (for easy cleanup)
- **Deployment**: Automatic on `develop` branch push

### Future Environments

Additional workflows can be added for:
- **Staging**: Manual or automatic deployment from `main` branch
- **Production**: Manual deployment with approval gates

## Monitoring and Troubleshooting

### Deployment Status

Monitor deployment status through:
- GitHub Actions workflow runs
- AWS CloudFormation console
- CloudWatch logs and metrics

### Health Checks

Post-deployment health checks verify:
- ✅ All CloudFormation stacks deployed successfully
- ✅ API Gateway endpoints responding
- ✅ Lambda functions executing without errors
- ✅ DynamoDB table accessible

### Common Issues

1. **CDK Bootstrap Required**
   - First deployment may require CDK bootstrap
   - Automatically handled in deployment workflow

2. **AWS Permissions**
   - Ensure hitechparadigm profile has sufficient permissions
   - Check IAM policies for CloudFormation, Lambda, DynamoDB, etc.

3. **Resource Conflicts**
   - Stack names must be unique within AWS account
   - Use environment-specific prefixes to avoid conflicts

### Rollback Procedures

If deployment fails:
1. Check CloudFormation stack events for error details
2. Review Lambda function logs in CloudWatch
3. Manual rollback via AWS console if needed
4. Re-run deployment after fixing issues

## Cost Management

### Development Environment Costs

Estimated monthly costs for development environment:
- **DynamoDB**: ~$5-10 (on-demand pricing)
- **Lambda**: ~$2-5 (generous free tier)
- **API Gateway**: ~$1-3 (1M requests free)
- **S3 + CloudFront**: ~$2-5 (minimal usage)
- **Other services**: ~$5-10

**Total**: ~$15-35/month for development

### Cost Monitoring

- All resources tagged with cost allocation tags
- CloudWatch cost alerts configured
- Monthly cost reports available in AWS console

## Security

### Credential Management

- AWS credentials stored as GitHub Secrets
- No hardcoded credentials in code
- Least privilege IAM policies

### Security Scanning

- npm audit for dependency vulnerabilities
- Regular security updates

## Support

For deployment issues:
1. Check workflow logs in GitHub Actions
2. Review CloudFormation events in AWS console
3. Create issue using deployment issue template
4. Contact @hitechparadigm for assistance