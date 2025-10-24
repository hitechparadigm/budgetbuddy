# Pre-Deployment Checklist

Before deploying BudgetBuddy to AWS, ensure all these items are completed:

## ✅ Prerequisites Checklist

### AWS Setup
- [ ] AWS account created and accessible
- [ ] AWS CLI installed (`aws --version`)
- [ ] AWS CLI configured (`aws configure`)
- [ ] AWS CDK installed globally (`npm install -g aws-cdk`)
- [ ] Sufficient AWS permissions (see DEPLOYMENT.md)

### Local Environment
- [ ] Node.js installed (v18 or higher)
- [ ] Yarn installed (`yarn --version`)
- [ ] Git repository cloned
- [ ] All dependencies installed (`yarn install`)

### Code Verification
- [ ] All Lambda functions have package.json files
- [ ] Infrastructure code compiles (`cd infrastructure && yarn build`)
- [ ] No TypeScript errors in infrastructure
- [ ] All required environment variables documented

## ✅ Infrastructure Verification

### CDK Configuration
- [ ] `infrastructure/cdk.json` exists and is valid
- [ ] `infrastructure/tsconfig.json` exists and is valid
- [ ] All CDK constructs import correctly
- [ ] Stack dependencies are properly defined

### Lambda Functions
- [ ] All 8 Lambda functions exist with index.js files
- [ ] Each function has proper error handling
- [ ] Health check endpoints implemented
- [ ] Function-specific dependencies documented

### Resource Naming
- [ ] All resources use "budgetbuddy" prefix
- [ ] Consistent naming across all stacks
- [ ] Proper tagging strategy implemented
- [ ] Environment-specific configurations ready

## ✅ Security Verification

### IAM Roles
- [ ] Lambda execution roles defined
- [ ] Least privilege principle followed
- [ ] Cross-service permissions properly scoped
- [ ] No overly broad permissions

### Data Protection
- [ ] DynamoDB encryption at rest enabled
- [ ] S3 bucket public access blocked
- [ ] CloudFront HTTPS-only configuration
- [ ] Cognito security policies configured

## ✅ Cost Optimization

### Resource Configuration
- [ ] DynamoDB on-demand billing for dev
- [ ] Lambda memory allocation optimized
- [ ] CloudWatch log retention configured
- [ ] Removal policies set per environment

### Monitoring Setup
- [ ] Cost allocation tags implemented
- [ ] CloudWatch dashboards defined
- [ ] Alert thresholds configured
- [ ] SNS topics for notifications

## ✅ Deployment Readiness

### Scripts and Documentation
- [ ] Deployment scripts created and tested
- [ ] Health check script ready
- [ ] Destruction script available
- [ ] Documentation complete and accurate

### Environment Configuration
- [ ] Development environment settings
- [ ] Staging environment settings (if applicable)
- [ ] Production environment settings (if applicable)
- [ ] Environment-specific removal policies

## 🚀 Ready to Deploy!

Once all items above are checked, you can proceed with deployment:

```bash
# Deploy to development environment
bash scripts/deploy.sh dev

# Verify deployment
bash scripts/check-deployment.sh dev
```

## 🔍 Post-Deployment Verification

After deployment, verify:
- [ ] All CloudFormation stacks created successfully
- [ ] API Gateway endpoints responding
- [ ] Lambda functions executing without errors
- [ ] DynamoDB table accessible
- [ ] Cognito user pool configured
- [ ] S3 buckets created with proper permissions
- [ ] CloudFront distributions active
- [ ] Monitoring dashboards accessible

## 📞 Support

If you encounter issues during deployment:
1. Check CloudFormation stack events
2. Review Lambda function logs in CloudWatch
3. Verify IAM permissions
4. Consult the troubleshooting section in DEPLOYMENT.md