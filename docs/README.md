# BudgetBuddy Documentation

**Last Updated**: 2025-12-29

## 📚 Documentation Index

### Core Documentation
- **[Development Status](./development-status.md)** - Current progress (99.5% complete), next steps, and roadmap
- **[API Endpoints](./api-endpoints.md)** - Complete API documentation with examples
- **[API Troubleshooting](./api-troubleshooting.md)** - Common API issues and solutions

### Architecture & Infrastructure
- **[AWS Stack Architecture](./aws-stack-architecture.md)** - Complete overview of all AWS stacks and their responsibilities
- **[Stack Management Guide](./stack-management-guide.md)** - How to manage, deploy, and maintain the stacks
- **[AWS Resource Standards](./aws-resource-standards.md)** - Naming conventions and tagging standards

### Configuration & Setup
- **[Configuration Guide](./configuration-guide.md)** - Environment variables, frontend config, and AWS resource tags
- **[GitHub Secrets Setup](./github-secrets-setup.md)** - How to configure GitHub Actions with AWS credentials

### CI/CD & Automation
- **[CI/CD Automation Guide](./cicd-automation-guide.md)** - Complete guide to automated monitoring and documentation enforcement

### Development Guidelines
- **[Development Best Practices](./DEVELOPMENT_BEST_PRACTICES.md)** - Consolidated best practices, lessons learned, and common pitfalls

## 🏗️ Current Infrastructure Status

### Deployed Stacks (Development Environment)
✅ **budgetbuddy-dev-auth** - Authentication & user management
✅ **budgetbuddy-dev-database** - DynamoDB data storage
✅ **budgetbuddy-dev-hosting** - S3 + CloudFront web hosting
✅ **budgetbuddy-dev-api** - Lambda functions & API Gateway
✅ **budgetbuddy-dev-monitoring** - CloudWatch dashboards & alerts

### Key URLs & Endpoints
- **API Gateway**: `https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1/`
- **Authentication**:
  - Registration: `POST /auth/register` ✅
  - Login: `POST /auth/login` ✅
  - Health Check: `GET /health` ✅
- **CloudWatch Dashboard**: AWS Console → CloudWatch → Dashboards → `budgetbuddy-dev-application-metrics`

## 🚀 Quick Start

### For Developers
1. **API Integration**: Use the API Gateway URL with the `@budget-buddy/api-client` package
2. **Authentication**: Complete backend ready - implement frontend components
3. **Type Safety**: Use `@budget-buddy/shared` types and validation schemas
4. **Health Monitoring**: Use health endpoints to verify service status

### For DevOps
1. **Monitor Stacks**: Check CloudFormation console for stack status
2. **View Metrics**: Access CloudWatch dashboard for performance monitoring
3. **Manage Deployments**: Use CDK commands for updates and rollbacks

### For Project Managers
1. **Cost Tracking**: Monitor AWS costs by stack and service tags
2. **Service Status**: Check health endpoints and monitoring dashboards
3. **Feature Progress**: Track development through deployed API endpoints

## 📞 Support & Troubleshooting

### Common Issues
- **Health Check Failures**: Redeploy Lambda functions with health endpoints
- **Authentication Errors**: Verify Cognito configuration and JWT tokens
- **API Errors**: Check Lambda function logs in CloudWatch
- **Deployment Failures**: Review CloudFormation events and stack dependencies

### Getting Help
1. Check the relevant documentation section above
2. Review CloudWatch logs and metrics
3. Use the deployment health check scripts
4. Create GitHub issues for persistent problems

---

**BudgetBuddy Infrastructure is successfully deployed and ready for development! 🎉**
