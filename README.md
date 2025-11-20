# BudgetBuddy

A comprehensive family budgeting application similar to EveryDollar by Dave Ramsey, featuring AI-powered budget generation, multi-platform support (web, iOS, Android), family account sharing, and a freemium model with premium features.

## Project Status

**Current Phase**: Transaction Management Complete
- **Infrastructure**: Complete AWS serverless architecture deployed âœ“
- **Authentication System**: Registration, login, and protected routes working âœ“
- **Budget Backend**: CRUD operations with zero-based budgeting calculations âœ“
- **API Foundation**: TypeScript types, validation, and authenticated HTTP client âœ“
- **Next Priority**: Budget dashboard and visualization frontend
- **Transaction System**: Full CRUD operations with budget integration ✓
- **Overall Progress**: ~98% complete (web app MVP fully operational)

### Recent Achievements (2025-11-19)
- 🤖 **CI/CD Automation System**: Complete monitoring and documentation enforcement
  - Kiro hook for automatic GitHub Actions workflow monitoring
  - Pre-push git hook enforcing mandatory documentation updates
  - Automated failure log retrieval and AI-assisted resolution
- 📚 **Comprehensive CI/CD Documentation**: Complete automation guide with diagrams
- 🔍 **Deployment Monitoring**: Real-time workflow status checking via GitHub CLI
- 📊 **Summary View**: Visual budget overview with circular progress chart
- 🎨 **Responsive Layout**: Perfect column alignment and tablet optimization

### Previous Achievements
- 🎯 **Unified Budget & Transaction System**: Complete integration between budget planning and transaction tracking
- 📊 **Real-time Budget vs Actual Tracking**: Live progress bars showing spending against planned amounts
- 🎨 **Consistent Category System**: Same categories (Salary 💰, Groceries 🛒, Entertainment 🎬) across all interfaces
- 📈 **Zero-based Budget Planning**: Visual validation ensuring Income - Savings - Expenses = 0
- 🌙 **Enhanced Dark Theme Modal**: Fixed white theme visibility issues in transaction planning
- 🔄 **Automatic Budget Updates**: Transaction entries automatically update budget progress
- 📱 **Professional UI Components**: Progress bars, category selectors, and visual indicators

### Previous Achievements
- âœ“ **Budget CRUD Operations**: Complete backend implementation with zero-based budgeting
- âœ“ **Authentication System**: Full frontend and backend authentication working
- âœ“ **API Endpoints**: Budget creation, reading, updating, and deletion
- âœ“ **Data Validation**: Comprehensive input validation and error handling
- âœ“ **AWS Deployment**: All Lambda functions deployed and operational
- âœ“ **Web App**: Complete React app at http://localhost:5173/ with authentication flow

## Documentation

- **[Complete Documentation](./docs/README.md)** - Technical documentation index
- **[Development Status](./docs/development-status.md)** - Detailed current status and next steps
- **[API Endpoints](./docs/api-endpoints.md)** - Complete API documentation
- **[API Troubleshooting](./docs/api-troubleshooting.md)** - Common API issues and solutions
- **[Development Log](./DEVELOPMENT_LOG.md)** - Detailed development history

## Current Status & Quick Start

### What's Working Right Now
- **Live Web App**: `http://localhost:5173/` - Complete authentication flow âœ“
- **Live API**: `https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1/`
- **Authentication System**:
  - `POST /auth/register` - User registration with validation âœ“
  - `POST /auth/login` - JWT authentication with Cognito âœ“
  - Frontend login/register forms with validation âœ“
  - Protected routes and session management âœ“
  - `GET /health` - Service health monitoring âœ“
- **Budget System**:
  - `POST /budget` - Create new budget âœ“
  - `GET /budget` - Get all budgets for family âœ“
  - `PUT /budget/{budgetId}` - Update budget âœ“
  - `DELETE /budget/{budgetId}` - Delete budget âœ“
  - `GET /budget/health` - Budget service health check âœ“
- **Development Tools**:
  - TypeScript types and Zod validation schemas âœ“
  - Authenticated API client with token management âœ“
  - AWS infrastructure fully deployed and operational âœ“

### For Developers
```bash
# Start the web application
cd packages/web-app && npm run dev
# Visit: http://localhost:5173/

# Test with existing user
# Email: alice.johnson@budgetbuddy.com
# Password: SecurePassword123!

# Test budget endpoints
curl -X GET "https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1/budget/health"
```

### For DevOps
- **Infrastructure**: All 5 AWS stacks deployed and operational
- **Monitoring**: CloudWatch dashboards and logging active
- **CI/CD**: GitHub Actions with automated deployment
- **Cost**: Currently ~$5-10/month (development environment)

## Core Features

### User Experience
- **AI-Powered Budget Generation**: Personalized budgets using AWS Bedrock Claude 3.5 Sonnet with regional cost-of-living data
- **Comprehensive Onboarding**: Dynamic questionnaire based on location, family situation, and lifestyle
- **Zero-Based Budgeting**: Ensure every dollar is allocated with automatic balance calculations
- **Multi-Platform Support**: Web (React), iOS/Android (React Native) with real-time synchronization
- **Family Account Sharing**: Collaborative budgeting with role-based permissions (primary, spouse, viewer)

### Business Model
- **Freemium Model**: Free tier with Google AdSense ads, premium tier ($X/month) with ad-free experience
- **Premium Features**: Weekly financial tips via email, advanced reporting, data export
- **Payment Processing**: Stripe integration for subscription management

### Regional Customization
- **Canada**: RRSP, TFSA, RESP savings categories with pre-seeded data for 25+ major cities
- **United States**: 401k, IRA, HSA categories with pre-seeded data for 25+ major cities
- **Cost Optimization**: Pre-seeded regional data reduces AI API calls by 90%

## Technical Architecture

### Technology Stack
- **Frontend Monorepo**: Yarn Workspaces + Turborepo
  - Web: React 18+ with Vite + Tailwind CSS
  - Mobile: React Native with Expo 0.76+ + React Native Paper
  - Admin: React 18+ with Vite + React Admin/MUI
  - Shared: Common components, types, and utilities
- **Backend**: AWS Serverless (Lambda + Node.js 20)
- **Database**: Amazon DynamoDB with single-table design + GSI indexes
- **Authentication**: Amazon Cognito User Pools with JWT tokens
- **AI**: AWS Bedrock (Claude 3.5 Sonnet) for budget generation
- **Payments**: Stripe for subscription management
- **Email**: Amazon SES for notifications and tips
- **Infrastructure**: AWS CDK (TypeScript) for Infrastructure as Code
- **CI/CD**: GitHub Actions for automated deployment

## Implementation Roadmap

### Phase 1: Backend Infrastructure âœ“ COMPLETE
- [x] **Task 1**: Project setup and monorepo configuration
- [x] **Task 2**: AWS Infrastructure and Database Setup
- [x] **Task 4**: Authentication System Implementation
- [x] **Task 6.1**: Budget CRUD operations

### Phase 2: Frontend Foundation âœ“ COMPLETE
- [x] **Task 3**: Shared Components and API Client

### Phase 3: Core Budget Features (In Progress)
- [x] **Task 6.1**: Budget CRUD operations â† **COMPLETED**
- [ ] **Task 6.2**: Build budget dashboard and visualization â† **NEXT**
- [ ] **Task 6.3**: Create category management system

### Phase 4: Advanced Features
- [ ] **Task 5**: AI-powered onboarding and budget generation
- [ ] **Task 7**: Transaction management system
- [ ] **Task 8**: Family account and multi-user features

### Phase 5: Production Ready
- [ ] **Task 9**: Mobile application development
- [ ] **Task 10**: Premium features and subscription system
- [ ] **Task 13**: Testing and quality assurance
- [ ] **Task 14**: Production deployment and monitoring

## Cost Management Strategy

### Estimated Monthly Costs (1,000 active users)
- **AWS Services**: $80-120/month
  - Lambda: $10-15 (500K requests)
  - DynamoDB: $15-25 (2M reads, 500K writes)
  - Bedrock AI: $20-30 (reduced by 90% with pre-seeded data)
  - Other services: $35-50
- **Third-party**: $30-50/month (Stripe, Expo EAS)
- **Total**: $110-170/month ($0.11-0.17 per user)

### Cost Optimization Features
- Pre-seeded cost-of-living data for 50+ cities reduces AI API calls
- DynamoDB single-table design minimizes table costs
- Serverless architecture with pay-per-use pricing
- Efficient caching strategies to reduce backend calls

## Development Guidelines

### Code Standards
- **Documentation**: All functions must have JSDoc comments and inline explanations
- **Naming**: Use "budgetbuddy-" prefix for all AWS resources
- **Testing**: Focus on core functionality, optional comprehensive testing
- **Error Handling**: Structured responses with correlation IDs

### AWS Resource Naming Convention
```
budgetbuddy-{service}-{environment}
Examples: budgetbuddy-auth, budgetbuddy-main, budgetbuddy-api
```

## Quick Commands

```bash
# Development
cd packages/web-app && npm run dev  # Start web app
node backend/functions/budget/test-budget.js  # Test budget endpoints

# Infrastructure (use hitechparadigm profile)
cd infrastructure
npm run cdk deploy budgetbuddy-dev-api -- --profile hitechparadigm

# Documentation
./scripts/commit.ps1 "your commit message" -Progress 50
```

## Support & Contributing

### For New Kiro Sessions
This README provides complete context for understanding the project status, architecture, and next steps. All implementation details are documented in the spec files.

### Development Workflow
1. Create feature branch from `develop`
2. Follow the task list in `.kiro/specs/family-budget-app/tasks.md`
3. Use automated documentation system: `./scripts/commit.ps1 "message" -Progress X`
4. Submit pull request with proper documentation

## License

This project is proprietary and confidential.



