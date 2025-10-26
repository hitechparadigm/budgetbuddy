# BudgetBuddy

A comprehensive family budgeting application similar to EveryDollar by Dave Ramsey, featuring AI-powered budget generation, multi-platform support (web, iOS, Android), family account sharing, and a freemium model with premium features.

## 🎯 Project Status

**Current Phase**: Authentication System Implementation 🔄
- **Infrastructure**: Complete AWS serverless architecture deployed ✅
- **User Registration**: Fully functional backend endpoint ✅
- **Next Priority**: Frontend authentication components and protected routes
- **Overall Progress**: ~25% complete (significant authentication progress)

### Recent Achievements
- ✅ **Complete Authentication Backend**: Both registration AND login endpoints deployed and tested
- ✅ **JWT Token Management**: Cognito authentication with proper token handling
- ✅ **Type Safety Foundation**: Comprehensive TypeScript types and Zod validation schemas
- ✅ **API Client**: Authenticated HTTP wrapper with automatic token management
- ✅ **Testing Verified**: Login, registration, validation, and error handling all working
- ✅ **Infrastructure**: All AWS resources deployed and operational

## 📚 Documentation

- **[Complete Documentation](./docs/README.md)** - Technical documentation index
- **[Development Status](./docs/development-status.md)** - Detailed current status and next steps
- **[API Endpoints](./docs/api-endpoints.md)** - Complete API documentation
- **[Development Log](./DEVELOPMENT_LOG.md)** - Detailed development history

## 🚀 Quick Start

### For Developers
- **API Base URL**: `https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1/`
- **Working Endpoints**:
  - `POST /auth/register` - User registration ✅
  - `POST /auth/login` - User authentication ✅
  - `GET /health` - Service health check ✅
- **API Client**: Ready-to-use authenticated HTTP wrapper
- **Next Priority**: Frontend authentication components

### For DevOps
- **Infrastructure**: All AWS stacks deployed and operational
- **Monitoring**: CloudWatch dashboards and logging active
- **CI/CD**: GitHub Actions with hitechparadigm AWS profile

## 🚀 Core Features

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

## 🏗️ Technical Architecture

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

## 📁 Project Structure

```
budget-buddy/
├── .kiro/specs/family-budget-app/    # 📋 Complete specification documents
│   ├── requirements.md              # 14 detailed requirements with EARS compliance
│   ├── design.md                    # Comprehensive architecture and data models
│   └── tasks.md                     # 15 major tasks with 60+ subtasks
├── packages/                        # 📦 Frontend monorepo (Yarn Workspaces)
│   ├── mobile/                      # React Native (iOS/Android) - Expo 0.76+
│   ├── web/                         # React web app - Vite + Tailwind
│   ├── admin/                       # Admin dashboard - React Admin/MUI
│   ├── shared/                      # Shared components, types, utilities
│   └── api-client/                  # API client with AWS Amplify + SWR
├── backend/                         # 🔧 AWS Lambda functions (Node.js 20)
│   ├── functions/auth/              # ✅ Authentication handler (complete)
│   ├── functions/budget/            # ✅ Budget CRUD operations (complete)
│   ├── functions/transactions/      # ✅ Transaction management (complete)
│   ├── functions/ai/                # ✅ AI budget generation (complete)
│   ├── functions/family/            # ✅ Family account management (complete)
│   ├── functions/payment/           # ✅ Stripe integration (complete)
│   ├── functions/email/             # ✅ SES email handling (complete)
│   ├── functions/admin/             # ✅ Admin operations (complete)
│   └── layers/common/               # ✅ Shared utilities and helpers (complete)
├── infrastructure/                  # 🏗️ AWS CDK infrastructure code
├── docs/                           # 📚 Technical documentation
│   ├── aws-resource-standards.md   # AWS naming, tagging, cost management
│   └── configuration.md            # Package.json and config explanations
├── scripts/                        # 🔨 Utility scripts
└── .github/workflows/              # 🚀 CI/CD pipelines
```

### Backend Lambda Functions Status
All Lambda functions are **fully scaffolded** with comprehensive documentation:

| Function | Purpose | Status | Key Features |
|----------|---------|--------|--------------|
| **auth** | User authentication | ✅ Complete | Registration, login, password reset, Cognito integration |
| **budget** | Budget management | ✅ Complete | CRUD operations, zero-based calculations, category management |
| **transactions** | Transaction handling | ✅ Complete | CRUD with auto-budget updates, filtering, search, pagination |
| **ai** | AI budget generation | ✅ Complete | Bedrock integration, regional data, fallback templates |
| **family** | Family accounts | ✅ Complete | Account creation, invitations, role management |
| **payment** | Subscription management | ✅ Complete | Stripe integration, webhook handling |
| **email** | Email notifications | ✅ Complete | SES integration, tips delivery, invitations |
| **admin** | Admin operations | ✅ Complete | User management, analytics, system monitoring |

## 🛠️ Development Setup

### Prerequisites
- **Node.js 20+** (for Lambda compatibility)
- **Yarn 3.6+** (package manager with workspaces)
- **AWS CLI** configured with appropriate permissions
- **AWS CDK CLI** (`npm install -g aws-cdk`)

### Quick Start
```bash
# 1. Install dependencies
yarn install

# 2. Build all packages
yarn build

# 3. Start development servers
yarn dev

# 4. Run tests
yarn test

# 5. Deploy infrastructure (when ready)
cd infrastructure && yarn cdk deploy --all
```

### AWS Infrastructure Deployment
The infrastructure is **ready to deploy** since all Lambda functions are complete:

```bash
# Deploy to development environment
cd infrastructure
yarn cdk deploy --all --profile dev

# Deploy specific stacks
yarn cdk deploy BudgetBuddyDatabaseStack
yarn cdk deploy BudgetBuddyApiStack
```

## 📋 Implementation Roadmap

### Phase 1: Backend Infrastructure ✅ COMPLETE
- [x] **Task 1**: Project setup and monorepo configuration
- [x] **Task 2.1**: DynamoDB table with single-table design and GSI indexes
- [x] **Task 2.3**: Complete Lambda function scaffolding (8 functions)
- [ ] **Task 2.2**: Cognito User Pool configuration ⬅️ **NEXT**

### Phase 2: Core Authentication & API (In Progress)
- [ ] **Task 4**: Authentication system implementation
- [ ] **Task 3**: Shared components and API client
- [ ] **Task 6**: Core budget management system

### Phase 3: AI & Advanced Features
- [ ] **Task 5**: AI-powered onboarding and budget generation
- [ ] **Task 7**: Transaction management system
- [ ] **Task 8**: Family account and multi-user features

### Phase 4: Frontend Applications
- [ ] **Task 9**: Mobile application development
- [ ] **Task 10**: Premium features and subscription system
- [ ] **Task 11**: Admin dashboard development

### Phase 5: Production Ready
- [ ] **Task 12**: Google AdSense integration
- [ ] **Task 13**: Testing and quality assurance
- [ ] **Task 14**: Production deployment and monitoring
- [ ] **Task 15**: Security and compliance implementation

## 💰 Cost Management Strategy

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

## 📚 Complete Documentation

### Specification Documents (Kiro Specs)
- **[Requirements](/.kiro/specs/family-budget-app/requirements.md)**: 14 detailed requirements with EARS-compliant acceptance criteria
- **[Design Document](/.kiro/specs/family-budget-app/design.md)**: Comprehensive architecture, data models, and technical specifications
- **[Implementation Tasks](/.kiro/specs/family-budget-app/tasks.md)**: 15 major tasks with 60+ actionable subtasks

### Technical Documentation
- **[AWS Resource Standards](/docs/aws-resource-standards.md)**: Mandatory naming conventions, tagging, and cost management
- **[Configuration Guide](/docs/configuration.md)**: Detailed explanation of all package.json and config files

### Key Requirements Summary
1. **User Authentication**: Email verification, password reset, profile management
2. **AI Budget Generation**: Bedrock integration with regional cost-of-living data
3. **Multi-Platform Support**: Web, iOS, Android with real-time sync
4. **Family Accounts**: Shared budgets with role-based permissions
5. **Transaction Management**: Manual entry with categorization and search
6. **Freemium Model**: Free tier with ads, premium with advanced features
7. **Regional Customization**: Canada (RRSP/TFSA) vs US (401k/IRA) categories
8. **Admin Dashboard**: User management, analytics, content management
9. **AWS Infrastructure**: Serverless architecture with CDK deployment
10. **Security & Privacy**: HTTPS, encryption, GDPR compliance

## 🔧 Development Guidelines

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

### Next Steps for New Contributors
1. **Review the spec documents** in `.kiro/specs/family-budget-app/`
2. **Check current task status** in `tasks.md`
3. **Start with Task 2.2**: Cognito User Pool configuration
4. **Deploy infrastructure** to test the API structure
5. **Implement authentication flow** in the auth Lambda function

## 🚀 Quick Commands

```bash
# Development
yarn dev                    # Start all development servers
yarn build                  # Build all packages
yarn test                   # Run tests
yarn lint                   # Lint code

# Infrastructure
cd infrastructure
yarn cdk deploy --all       # Deploy all stacks
yarn cdk destroy --all      # Destroy all stacks
yarn cdk diff               # Show changes

# Specific package development
cd packages/web && yarn dev      # Web app only
cd packages/mobile && yarn dev   # Mobile app only
```

## 📞 Support & Contributing

### For New Kiro Sessions
This README provides complete context for understanding the project status, architecture, and next steps. All implementation details are documented in the spec files.

### Development Workflow
1. Create feature branch from `develop`
2. Follow the task list in `.kiro/specs/family-budget-app/tasks.md`
3. Ensure comprehensive documentation and testing
4. Submit pull request with proper documentation

## 📄 License

This project is proprietary and confidential.
