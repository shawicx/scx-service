# Qwen Code Context for SCX-Service

## Project Overview

This is a NestJS-based backend service called "shawbox-service" (SCX-Service), built as a progressive Node.js framework for building efficient and scalable server-side applications. The project follows the NestJS modular architecture with a focus on authentication, user management, and role-based access control (RBAC).

### Key Technologies and Architecture

- **Framework**: NestJS v11.1.6
- **Language**: TypeScript
- **Database**: MySQL with TypeORM as the ORM
- **Web Framework**: Fastify adapter for high performance
- **Authentication**: JWT-based authentication system
- **Logging**: Winston logger with different transports for dev/prod
- **API Documentation**: Swagger/OpenAPI with custom UI
- **Testing**: Jest for unit and e2e testing
- **Code Quality**: ESLint, Prettier, Husky with lint-staged
- **Package Manager**: pnpm

### Project Structure

```
src/
├── app/                    # Main application module
├── common/                 # Shared utilities, guards, filters, interceptors
├── config/                 # Application configuration files
├── modules/                # Feature modules (auth, user, role, etc.)
│   ├── auth/               # Authentication module
│   ├── cache/              # Caching module
│   ├── mail/               # Email module
│   ├── user/               # User management module
│   ├── role/               # Role management module
│   ├── permission/         # Permission management module
│   ├── user-role/          # User-role relationships
│   └── role-permission/    # Role-permission relationships
├── templates/              # Email templates
├── main.ts                 # Application entry point
└── swagger-document.ts     # API documentation setup
```

### Key Features

1. **Authentication System**: JWT-based authentication with refresh tokens
2. **User Management**: Complete user registration, login, profile management
3. **RBAC (Role-Based Access Control)**: Roles, permissions, and their relationships
4. **Email Verification**: User email verification system with codes
5. **Database Integration**: MySQL with TypeORM entities and relationships
6. **Caching**: Redis-based caching implementation
7. **Email Service**: Mail module with nodemailer integration
8. **API Documentation**: Swagger UI with custom styling
9. **Comprehensive Logging**: Winston logger with console and file outputs
10. **Error Handling**: Global exception filters with structured error responses

### Database Model

The service uses a MySQL database with the following key entities:

- User entity with email, name, password, preferences, and audit fields
- Role entity for role management
- Permission entity for permission management
- UserRole and RolePermission for many-to-many relationships

### Configuration

The application uses NestJS ConfigModule with environment-specific configurations for:

- Application settings (port, environment)
- Database connection (MySQL)
- Redis caching
- Mail service
- Swagger documentation

### Building and Running

#### Installation

```bash
$ pnpm install
```

#### Running the Application

```bash
# Development mode
$ pnpm run dev

# Production build
$ pnpm run build
$ pnpm run start:prod

# Watch mode
$ pnpm run start:dev
```

#### Testing

```bash
# Unit tests
$ pnpm run test

# E2E tests
$ pnpm run test:e2e

# Test coverage
$ pnpm run test:cov

# Test in watch mode
$ pnpm run test:watch
```

#### Other Commands

```bash
# Linting
$ pnpm run lint
$ pnpm run lint:fix

# Formatting
$ pnpm run format

# Debug tests
$ pnpm run test:debug
```

### Development Conventions

1. **Code Style**: Follows ESLint and Prettier configuration with conventional commits
2. **Architecture**: Modular approach with feature modules
3. **API Design**: RESTful APIs with Swagger documentation
4. **Error Handling**: Global exception filters for standardized error responses
5. **Security**: Input validation with class-validator, authentication guards
6. **Logging**: Structured logging with Winston
7. **Type Safety**: Full TypeScript support with interfaces and DTOs

### Environment Variables

Key environment variables include:

- `NODE_ENV`: Environment mode (development, production)
- `PORT`: Application port
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`: Database configuration
- `SWAGGER_*`: Swagger documentation settings

### Authentication Flow

The service implements a token-based authentication system:

1. Users can register with email, name, password, and verification code
2. Login with email and password returns JWT tokens
3. Bearer tokens are required for protected routes (except those marked with `@Public()` decorator)
4. AuthGuard validates tokens and injects user data into requests

### API Documentation

The API documentation is automatically generated with Swagger and available at `/api/docs` by default. The documentation includes all endpoints with request/response models and example values.

### Testing Approach

- Unit tests for individual services and components
- E2E tests for API endpoints and integration scenarios
- Code coverage reports to ensure quality
- Jest as the testing framework with Supertest for API testing
