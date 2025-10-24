# Configuration Files Documentation

This document explains the purpose and configuration of all JSON files in the BudgetBuddy project.

## Root Configuration Files

### `package.json` (Root)
**Purpose**: Root package.json for the BudgetBuddy monorepo that manages all packages and shared development tools.

- **workspaces**: Defines which directories contain packages (packages/*, backend, infrastructure)
- **scripts**: Turborepo commands that run across all packages
- **devDependencies**: Development tools shared across the entire monorepo
- **packageManager**: Enforces Yarn 3.6.0 for consistent dependency management

### `turbo.json`
**Purpose**: Turborepo configuration that orchestrates builds and tasks across monorepo packages.

- **globalDependencies**: Files that affect all packages (environment files)
- **pipeline**: Defines task dependencies and caching behavior
  - **build**: Compiles packages, depends on dependencies being built first
  - **dev**: Development servers, no caching, runs persistently
  - **lint**: Code quality checks, depends on dependencies
  - **typecheck**: TypeScript validation, depends on dependencies
  - **test**: Unit tests, depends on build artifacts, outputs coverage
  - **clean**: Removes build artifacts, no caching needed

### `tsconfig.json` (Root)
**Purpose**: Root TypeScript configuration that sets up path mapping and shared compiler options.

- **compilerOptions**: Shared TypeScript settings for all packages
- **paths**: Path mapping for importing shared packages
- **include/exclude**: Which files to process

### `.eslintrc.js`
**Purpose**: ESLint configuration for code quality and consistency across all packages.

- **extends**: Base configurations (recommended, TypeScript, Prettier)
- **rules**: Custom linting rules for the project
- **env**: Supported environments (browser, node, ES6)

### `.prettierrc`
**Purpose**: Prettier configuration for consistent code formatting.

- **semi**: Use semicolons
- **singleQuote**: Use single quotes
- **printWidth**: Line length limit
- **tabWidth**: Indentation size

## Package-Specific Configuration

### `packages/shared/package.json`
**Purpose**: Shared types, utilities, and constants package configuration.

- **main/types**: Entry points for the package
- **dependencies**: Runtime dependencies (zod for validation)
- **scripts**: Package-specific build, dev, lint, test commands

### `packages/api-client/package.json`
**Purpose**: HTTP client library package configuration.

- **dependencies**: AWS Amplify for API integration, SWR for caching
- **main/types**: Package entry points

### `backend/package.json`
**Purpose**: AWS Lambda functions package configuration.

- **dependencies**: AWS SDK clients, Lambda types, Stripe, UUID
- **scripts**: Lambda-specific build and deployment commands

### `infrastructure/package.json`
**Purpose**: AWS CDK infrastructure code package configuration.

- **dependencies**: AWS CDK v2 library and constructs
- **scripts**: CDK-specific commands (deploy, destroy, diff, synth)

## Infrastructure Configuration

### `infrastructure/cdk.json`
**Purpose**: AWS CDK configuration that defines how CDK behaves.

- **app**: Entry point for CDK application (bin/app.ts)
- **watch**: File watching configuration for development
- **context**: CDK feature flags and behavior settings

### `infrastructure/tsconfig.json`
**Purpose**: TypeScript configuration specific to CDK infrastructure code.

- **compilerOptions**: CDK-specific TypeScript settings
- **exclude**: Excludes CDK output directories

## CI/CD Configuration

### `.github/workflows/ci.yml`
**Purpose**: GitHub Actions workflow for continuous integration.

- **on**: Triggers (pull requests, pushes to develop)
- **jobs**: Lint, test, build, and security scanning steps
- **steps**: Individual actions (checkout, setup Node, install, test, etc.)

## Development Files

### `.gitignore`
**Purpose**: Specifies which files Git should ignore.

- **Dependencies**: node_modules, package manager files
- **Build outputs**: dist/, build/, .next/
- **Environment**: .env files
- **IDE**: Editor-specific files
- **OS**: System-generated files
- **AWS**: CDK output directories

### `README.md` (Root)
**Purpose**: Main project documentation with setup instructions and architecture overview.

Contains:
- Project overview and features
- Architecture description
- Project structure explanation
- Getting started instructions
- Development commands
- Deployment instructions