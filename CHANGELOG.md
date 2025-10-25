# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **ESLint Issues**: Resolved all ESLint errors in Lambda functions
  - Fixed unused `context` parameter errors by prefixing with underscore (`_context`)
  - Fixed `eqeqeq` rule violations by replacing `!=` with `!==` in generated code
  - Re-enabled ESLint validation in GitHub Actions CI/CD pipeline
  - All 8 Lambda functions now pass ESLint validation without errors
- **CI/CD Pipeline**: GitHub Actions workflow now properly validates code quality
  - ESLint step re-enabled after fixing all linting errors
  - Syntax validation continues to pass for all Lambda functions
  - Deployment pipeline should now complete successfully
- **Lambda Function Corruption**: Restored proper Lambda function code
  - Fixed file corruption issue where Lambda functions contained CDK infrastructure code
  - Recreated all 8 Lambda functions with proper handler implementations
  - Added comprehensive health check endpoints for all services
  - Root `/health` endpoint now properly routes to auth handler
  - Fixed transactions function that was corrupted with admin function code
- **Health Check Endpoints**: Implemented proper API health monitoring
  - Added `/health` root endpoint for overall API health
  - Added service-specific health endpoints: `/auth/health`, `/budget/health`, etc.
  - All endpoints return proper JSON responses with service status
  - CORS headers configured for cross-origin requests
- **Transactions Service Fix**: Resolved final health check failure
  - Fixed transactions Lambda function that was incorrectly checking `/admin/health`
  - Corrected health endpoint path to `/transactions/health`
  - Updated service identifier from 'admin' to 'transactions' in responses
  - All health check endpoints now properly configured and responding
- **Payment Service Fix**: Resolved payment health endpoint 403 error
  - Fixed health check script to use correct `/payments/health` endpoint (plural)
  - Updated payment Lambda function to handle `/payments/health` path
  - Corrected API Gateway resource naming mismatch between script and infrastructure
  - Payment service health check now properly configured

### Changed
- Updated all Lambda function signatures from `(event, context)` to `(event, _context)`
- Modified generated code to use strict equality operators (`!==` instead of `!=`)

### Technical Details
- **Files Updated**:
  - `backend/functions/admin/index.js`
  - `backend/functions/ai/index.js`
  - `backend/functions/auth/index.js`
  - `backend/functions/budget/index.js`
  - `backend/functions/email/index.js`
  - `backend/functions/family/index.js`
  - `backend/functions/payment/index.js`
  - `backend/functions/transactions/index.js`
  - `.github/workflows/pr-check.yml`

### Impact
- ✅ ESLint validation now passes without errors
- ✅ GitHub Actions CI/CD pipeline should complete successfully
- ✅ Code quality standards maintained across all Lambda functions
- ✅ Deployment readiness improved for AWS infrastructure
- ✅ Health check endpoints now respond properly
- ✅ API Gateway routing functions correctly
- ✅ Lambda functions contain proper handler code instead of corrupted CDK code
- ✅ Post-deployment health checks should now pass
