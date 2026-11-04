<img width="1024" height="338" alt="image" src="https://github.com/user-attachments/assets/009bd164-7523-4999-935a-9dc37c7ecbc9" />

# SupportService API

A production-grade, modular monolith RESTful backend for ticket and customer support management built with Node.js, Express, TypeScript, PostgreSQL, and Drizzle ORM.

---

## Features

- **Authentication & RBAC:** Stateless JWT authentication with role-based access control (`customer`, `agent`, `admin`).
- **Resource Ownership Scoping:** Strict tenant isolation so customers only access their own tickets and comments.
- **Ticket Lifecycle Management:** Enforced state transitions (`open` -> `in_progress` -> `resolved` / `closed`) with admin-only reopening rules.
- **Paginated Filtering:** Dynamic PostgreSQL queries with metadata (`totalCount`, `totalPages`, `hasNextPage`) and Drizzle `SQL[]` conditions.
- **Type Safety & Validation:** End-to-end request validation using Zod schemas with runtime environment variable parsing.
- **Modular Monolith Architecture:** Service-oriented folder layout separating routes, controllers, services, schemas, and database relations.
- **Automated Integration Testing:** End-to-end API test runner using Jest and Supertest with native TypeScript execution.

---

## Tech Stack

- **Runtime:** Node.js, TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM (with Drizzle Kit migrations & pgAdmin 4 support)
- **Validation:** Zod
- **Authentication:** JSON Web Tokens (`jsonwebtoken`) & `bcryptjs`
- **Testing:** Jest, Supertest, `ts-jest`

---

## Project Structure

```text
├── src/
│   ├── config/             # Runtime environment configuration & validation
│   ├── db/                 # Drizzle schema, relations, pgEnum, & DB client
│   ├── modules/
│   │   ├── auth/           # Login, registration, password hashing
│   │   ├── health/         # Healthcheck monitoring endpoints
│   │   ├── tickets/        # Lifecycle logic, query filters, ownership checks
│   │   └── users/          # User management & admin endpoints
│   ├── shared/
│   │   ├── errors/         # AppError & centralized error handling middleware
│   │   └── middlewares/    # Authentication & requireRole RBAC guards
│   ├── types/              # Express Request interface context extensions
│   ├── app.ts              # Express application & route pipeline setup
│   └── index.ts            # Server bootstrap & HTTP listener entry point
├── tests/                  # Jest & Supertest integration test suites
│   ├── auth.test.ts        # Auth & validation integration tests
│   └── tickets.test.ts     # Ticket lifecycle & authorization tests
```


## Architectural Decoupling & Testing Strategy

- To maintain production-grade standards and eliminate port collisions during test runs, the application decouples initialization from network listener execution:

```code
src/app.ts: Configures Express middleware, error handlers, and route modules without starting an HTTP server.

src/index.ts: Imports app and binds to env.PORT for live deployment and local development.
```

## Automated Integration Testing

- Integration tests use Supertest to execute HTTP requests against app.ts in-memory while running assertions via Jest.

##### Execute integration test suite serially
```code
npm test
```
#### Test Suite Coverage

- Auth Module (tests/auth.test.ts):
   - POST /api/auth/login (Missing credentials validation 400, non-existent user 401, valid JWT issuance 200)
   - POST /api/auth/register (Zod schema validation bounds 400)
     
- Ticket Module (tests/tickets.test.ts):
   - POST /api/tickets (Unauthenticated request protection 401, customer creation 201)
   - GET /api/tickets (Authenticated ticket listing 200)
 
## Getting Started
 
 1. Prerequisites

    - Node.js (v18+)
    - PostgreSQL installed locally or via Docker
    - npm or pnpm

2. Environment Setup
    
   ##### Create a .env file in the root directory:

   ```code
      PORT=5000
      NODE_ENV=development
      DATABASE_URL=postgres://postgres:password@localhost:5432/support_db
      JWT_SECRET=your_super_secret_jwt_key
      JWT_EXPIRES_IN=1d
   ```

3. Installation & Database Setup

   ```code
    # Install dependencies
    npm install
    
    # Push schema to PostgreSQL database
    npx drizzle-kit push
    
    # Start development server
    npm run dev
    
    # Run automated integration tests
    npm test
   ```
## API Documentation Overview

  #### Authentication

  ```code
    POST /api/auth/register - Create a new user account
    POST /api/auth/login    - Authenticate and receive a Bearer JWT token
 ```

 #### Tickets

 ```code
    POST /api/tickets       - Create a new support ticket (customer)
    GET /api/tickets        - Fetch paginated tickets (Scoped by ownership for customer; All for agent/admin)
    GET /api/tickets/:id    - Fetch single ticket details (Ownership validated)
    PATCH /api/tickets/:id  - Update status/assignment (agent, admin - follows state transition rules)
 ```

 #### Ticket Comments

 ```code
    POST /api/tickets/:id/comments - Add a comment to a ticket (Ticket owner, assigned agent, or admin only)
 ```

 #### Security Highlights
 
  - Anti-Identity Spoofing: customerId and authorId are stripped from client request bodies and injected directly from verified JWT claims (req.user.userId).
  - Forbidden Route Guards: Middleware blocks unauthorized roles with standard 403 Forbidden responses prior to execution.
  - Parameterized Queries: All dynamic filters utilize Drizzle's SQL expression trees to prevent SQL injection.
