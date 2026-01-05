# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a NestJS-based backend service called "shawbox-service" that implements a comprehensive authentication and authorization system with role-based access control (RBAC). The project follows modular architecture patterns with clear separation of concerns.

## Development Commands

### Package Management

```bash
pnpm install
```

### Running the Application

```bash
# Development mode with hot reload
pnpm run dev

# Debug mode
pnpm run debug

# Production build and run
pnpm run build
pnpm run start:prod
```

### Testing

```bash
# Unit tests
pnpm run test

# E2E tests
pnpm run test:e2e

# Test coverage report
pnpm run test:cov

# Watch mode for tests
pnpm run test:watch

# Debug tests
pnpm run test:debug
```

### Code Quality

```bash
# Linting
pnpm run lint
pnpm run lint:fix

# Code formatting
pnpm run format
```

## Architecture Overview

### Core Architecture

- **Framework**: NestJS v11.1.6 with Fastify adapter for performance
- **Database**: MySQL with TypeORM ORM
- **Authentication**: JWT-based with bearer token validation
- **Authorization**: RBAC system with roles and permissions
- **Caching**: Redis for performance optimization
- **Logging**: Winston with environment-specific transports

### Module Structure

The application follows a feature-based module structure:

- **app/**: Root application module
- **common/**: Shared components (guards, filters, interceptors, pipes)
- **config/**: Configuration modules using `registerAs` pattern
- **modules/**: Feature modules
  - **auth/**: JWT authentication with login/register
  - **user/**: User management with preferences
  - **role/**: Role management
  - **permission/**: Permission management
  - **user-role/**: User-role relationships
  - **role-permission/**: Role-permission relationships
  - **cache/**: Redis caching
  - **mail/**: Email service with templates

### Global Components

- **AuthGuard**: JWT authentication guard (automatically applied globally)
- **@Public() decorator**: Marks endpoints as public (bypasses AuthGuard)
- **SystemExceptionFilter**: Global exception handling with structured responses
- **LoggingInterceptor**: Request/response logging
- **TransformInterceptor**: Response standardization
- **ValidationPipe**: Global input validation

### Database Design

- MySQL database with TypeORM entities
- User entity includes preferences (JSON field) and audit fields
- Many-to-many relationships between users/roles and roles/permissions
- Automatic timestamp management for created/updated dates

### Configuration Pattern

Uses NestJS ConfigModule with environment-specific configurations:

- **appConfig**: Port, environment, global prefix
- **databaseConfig**: MySQL connection settings
- **swaggerConfig**: API documentation configuration
- **redisConfig**: Redis connection settings
- **mailConfig**: Email service configuration

## Key Development Patterns

### Module Creation

When creating new modules, follow the established pattern:

- Module file exports controller and service
- Controller handles HTTP requests with Swagger decorators
- Service contains business logic
- DTOs for request/response validation
- Entities for database models

### Error Handling

- Use SystemException for business logic errors
- Automatic HTTP status code mapping based on error codes
- Global exception filter ensures consistent error responses
- Detailed error logging with context

### Authentication Flow

- All endpoints are protected by default via global AuthGuard
- Use @Public() decorator for public endpoints
- AuthGuard injects user data into requests after JWT validation
- Tokens validated via JwtStrategy using configurable secret

### Testing Setup

- Jest configuration for unit and e2e tests
- Unit tests located alongside source files (\*.spec.ts)
- E2E tests in /test directory (\*.e2e-spec.ts)
- Coverage reports generated in /coverage directory
- Test environment uses node environment with ts-jest

### API Documentation

- Swagger documentation available at `/api/docs`
- Automatic model documentation from DTOs
- Custom Swagger configuration with security definitions
- API examples and descriptions in controller decorators

## Development Workflow

### Git Hooks

- Husky configured for pre-commit hooks
- Lint-staged runs on committed files
- Commitlint enforces conventional commit messages

### Code Style

- ESLint configuration with Ali preset
- Prettier for code formatting
- TypeScript strict mode disabled (noImplicitAny: false)
- Path mapping: `@/*` maps to `src/*`

### Environment Variables

- Development uses `.env` file (not tracked in git)
- Production variables should be set in deployment environment
- Required variables: DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE

## Performance Considerations

- Fastify adapter instead of Express for better performance
- Redis caching for frequently accessed data
- Optimized database queries with TypeORM
- Winston logger with different transports for dev/prod
- Global validation pipe with transformation enabled
