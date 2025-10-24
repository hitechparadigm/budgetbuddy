# 🚀 Quick Deployment Guide

This guide helps you deploy BudgetBuddy to AWS using the automated CI/CD pipeline with your hitechparadigm profile.

## ✅ Prerequisites Complete

- [x] GitHub Secrets configured with hitechparadigm AWS credentials
- [x] CI/CD workflows created and ready
- [x] AWS CDK infrastructure code complete
- [x] Lambda functions scaffolded

## 🎯 Deployment Steps

### 1. Test Locally (Optional but Recommended)

```bash
# Test the deployment process locally
chmod +x scripts/test-local-deployment.sh
bash scripts/test-local-deployment.sh
```

This will verify:
- ✅ All prerequisites installed
- ✅ AWS credentials working
- ✅ Code quality passes
- ✅ Infrastructure builds successfully

### 2. Deploy to Development

**Option A: Automatic Deployment (Recommended)**
```bash
# Create and push to develop branch
git checkout -b develop
git add .
git commit -m "feat: add CI/CD pipeline and infrastructure"
git push origin develop
```

**Option B: Manual Deployment (If needed)**
```bash
# Deploy directly using CDK
cd infrastructure
AWS_PROFILE=hitechparadigm npm run deploy:dev
```

### 3. Monitor Deployment

```bash
# Monitor deployment status
chmod +x scripts/monitor-deployment.sh
bash scripts/monitor-deployment.sh dev
```

Or check GitHub Actions:
- Go to your repository → Actions tab
- Watch the "Deploy to Development" workflow

### 4. Verify Deployment

The deployment will create:
- **Database Stack**: DynamoDB table with GSI indexes
- **Auth Stack**: Cognito User Pool and Client
- **API Stack**: 8 Lambda functions + API Gateway
- **Hosting Stack**: S3 buckets + CloudFront distributions
- **Monitoring Stack**: CloudWatch dashboards + SNS alerts

## 📊 Expected Results

### Successful Deployment Outputs:
```
API URL: https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod
User Pool ID: us-east-1_xxxxxxxxx
Web Domain: https://xxxxxxxxxxxxxx.cloudfront.net
```

### Health Check Results:
```
✅ Health endpoint: Responding
✅ Auth endpoint: Responding  
✅ Budget endpoint: Responding
✅ All other service endpoints: Responding
```

## 🔍 Troubleshooting

### Common Issues

#### 1. GitHub Actions Fails
- Check workflow logs in Actions tab
- Verify GitHub Secrets are set correctly
- Ensure AWS permissions are sufficient

#### 2. CDK Bootstrap Required
```bash
# Bootstrap CDK manually if needed
AWS_PROFILE=hitechparadigm cdk bootstrap aws://ACCOUNT-ID/us-east-1
```

#### 3. Stack Already Exists
```bash
# Destroy and redeploy if needed
cd infrastructure
AWS_PROFILE=hitechparadigm npm run destroy:dev
AWS_PROFILE=hitechparadigm npm run deploy:dev
```

#### 4. Permission Denied
- Verify hitechparadigm profile has required permissions
- Check IAM policies in AWS console

### Getting Help

1. **Check deployment status**: `bash scripts/monitor-deployment.sh dev`
2. **View CloudFormation events**: AWS Console → CloudFormation
3. **Check Lambda logs**: AWS Console → CloudWatch → Log groups
4. **GitHub Actions logs**: Repository → Actions tab

## 💰 Cost Estimate

Development environment costs (~$15-35/month):
- DynamoDB: ~$5-10 (on-demand)
- Lambda: ~$2-5 (free tier)
- API Gateway: ~$1-3 (1M requests free)
- S3 + CloudFront: ~$2-5
- Other services: ~$5-10

## 🎉 Next Steps After Deployment

1. **Test API Endpoints**
   ```bash
   curl https://your-api-url/health
   curl https://your-api-url/auth/health
   ```

2. **Start Frontend Development**
   - Configure API client with deployment URLs
   - Begin implementing authentication flows

3. **Set Up Monitoring**
   - Check CloudWatch dashboards
   - Configure alerts and notifications

4. **Plan Staging Environment**
   - Consider implementing task 14.3 for staging deployment

## 🔗 Useful Links

- **AWS Console**: https://console.aws.amazon.com/
- **CloudFormation**: https://console.aws.amazon.com/cloudformation/
- **Lambda Functions**: https://console.aws.amazon.com/lambda/
- **DynamoDB**: https://console.aws.amazon.com/dynamodb/
- **API Gateway**: https://console.aws.amazon.com/apigateway/

---

**Ready to deploy? Run the test script first, then push to develop branch!** 🚀