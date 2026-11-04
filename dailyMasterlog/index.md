# SupportService Master Progress Log & Daily Activity

**Project:** Support Service (Modular Monolith)  
**Tech Stack:** Node.js, Express, TypeScript, PostgreSQL (`dev_support_db`), Drizzle ORM, Zod

---

## 1. Project Initialization & Database Architecture (Oct 6, 2026)

### Key Achievements

- **PostgreSQL Setup:** Created `dev_support_db` database in pgAdmin 4.
- **Environment Validation:** Built `src/config/env.ts` using Zod schema to validate required runtime variables (`PORT`, `DATABASE_URL`, `NODE_ENV`).
- **Drizzle Pool Setup:** Initialized database connection pool in `src/db/index.ts` passing `{ schema }` to enable Drizzle relational queries.
- **Database Schema (`src/db/schema.ts`):**
  - Created `users` and `tickets` tables with auto-generated UUID primary keys (`defaultRandom()`).
  - Defined PostgreSQL enums for `role` (`customer`, `agent`, `admin`), `status` (`open`, `in_progress`, `resolved`, `closed`), and `priority` (`low`, `medium`, `high`, `urgent`).
  - Configured foreign key cascading constraints (`ON DELETE CASCADE` on `customerId`, `ON DELETE SET NULL` on `assignedAgentId`).
  - Added indexes (`idx_tickets_customer_id`, `idx_tickets_status`).
- **Database Push:** Synchronized schema directly to PostgreSQL using `npx drizzle-kit push`.

---

## 2. Domain Modules Development (Oct 7, 2026)

### Key Achievements

- **Users Module (`src/modules/users/`):**
  - Built Zod schema `createUserSchema` for payload validation.
  - Implemented `POST /api/users` with email uniqueness verification.
  - Implemented `GET /api/users` returning embedded ticket arrays via Drizzle relational queries with column filtering.
- **Tickets Module (`src/modules/tickets/`):**
  - Built Zod schema `createTicketSchema`.
  - Implemented `POST /api/tickets` with customer verification prior to ticket creation.
  - Configured Drizzle `relations()` (`usersRelations` and `ticketsRelations`) in `src/db/schema.ts`.
  - Implemented `GET /api/tickets` returning nested customer details (`id`, `name`, `email`), resolving N+1 query bottlenecks.

---

## 3. Centralized Error Handling Middleware (Oct 8–9, 2026)

### Key Achievements

- **Custom Operational Error Class (`src/shared/errors/app-error.ts`):**
  - Created `AppError` class extending `Error` with `statusCode` and `isOperational = true` flags.
- **Global Error Middleware (`src/shared/middlewares/error.middleware.ts`):**
  - Intercepts Zod validation failures and formats structured array errors (`field`, `message`).
  - Intercepts operational `AppError` instances and returns respective HTTP status codes (`400`, `404`, etc.).
  - Handles unexpected server and database exceptions with a fallback `500 Internal Server Error`.
- **Controller Refactoring:** Updated all controllers to catch and delegate errors to `next(error)`.
- **Registered Middleware:** Mounted `app.use(errorHandler)` as the final middleware in `src/index.ts`.
- **Ticket Updates & Agent Assignment API (`PATCH /api/tickets/:id`):**
  - Added `updateTicketSchema` for status changes (`in_progress`, `resolved`, `closed`) and agent assignment.
  - Added role verification in service layer ensuring assigned users hold `agent` or `admin` roles.

---

## 4. Query Filtering, Pagination & Foreign Key Integrity (Oct 13, 2026)

### Key Achievements

- **Advanced Filtering & Pagination (`GET /api/tickets`):**
  - Added `getTicketsQuerySchema` in `tickets.schema.ts` using `z.coerce.number()` for page/limit handling.
  - Updated `getAllTickets` service with dynamic Drizzle `and()` and `eq()` WHERE filters (`?status=open&priority=medium`).
  - Formatted API response payload to return pagination metadata (`page`, `limit`, `data`).
- **User Deletion & Foreign Key Cascading Verification:**
  - Implemented `deleteUser` service method and `handleDeleteUser` controller.
  - Exposed `DELETE /api/users/:id` endpoint in `users.router.ts`.
  - Verified live database behavior in `dev_support_db`: deleting a customer user automatically purged their associated tickets (`ON DELETE CASCADE`).
- **Ticket Comments Schema Design:**
  - Defined `ticketComments` table schema and Drizzle relations (`ticketCommentsRelations`) in `src/db/schema.ts`.

---

## 5. Ticket Comments Sub-resource Module (Oct 14, 2026)

- **Database Schema & Relations:**
  - Created `ticket_comments` table in PostgreSQL (`dev_support_db`) using `npx drizzle-kit push`.
  - Configured foreign key rules (`ON DELETE CASCADE`) linking comments to tickets and author users.
  - Established Drizzle ORM relational definitions (`ticketCommentsRelations` & updated `ticketsRelations`).
- **Comments Module (`src/modules/comments/`):**
  - Built `createCommentSchema` using Zod for validation.
  - Implemented `createComment` service method verifying ticket and author existence.
  - Implemented `getTicketComments` service method returning chronological comment threads (`asc` by `createdAt`) with embedded author metadata (`id`, `name`, `email`, `role`).
- **API Routing:**
  - Mounted comment sub-routes under tickets router (`src/modules/tickets/tickets.router.ts`): `POST /api/tickets/:id/comments` and `GET /api/tickets/:id/comments`.

## 6. Authentication & JWT Infrastructure (Oct 15, 2026)

- **Password Security:** Added `password` column to `users` schema, integrated `bcryptjs` hashing (10 salt rounds) on registration, and sanitized user output schemas to prevent hash exposure.
- **JWT Environment Config:** Added Zod schema validation for `JWT_SECRET` and `JWT_EXPIRES_IN` in `src/config/env.ts`.
- **Auth Module (`src/modules/auth/`):**
  - Created `registerSchema` and `loginSchema` in `auth.schema.ts`.
  - Built `registerUser` service for encrypted user creation.
  - Built `loginUser` service validating credentials via `bcrypt.compare` and issuing signed JWTs containing `userId` and `userRole` claims.
  - Exposed `POST /api/auth/register` and `POST /api/auth/login` endpoints in `auth.router.ts`.

## 7. Middleware Security & Role-Based Access Control (Oct 21, 2026)

- **Express Type Declaration (`src/types/express.d.ts`):** Extended `Express.Request` type definition to recognize `req.user` containing `userId` and `userRole`.
- **Authentication Middleware (`src/shared/middlewares/auth.middleware.ts`):**
  - Built `authenticate` middleware parsing `Authorization: Bearer <token>` headers.
  - Decodes and verifies signed JWT payloads using `jwt.verify` and attaches `userId` and `userRole` to request context.
- **Identity Injection & Anti-Spoofing Refactor:**
  - Removed client-submitted identity fields (`customerId`, `authorId`) from Zod validation schemas across ticket and comment sub-resources.
  - Dynamically bound `req.user!.userId` to service invocations across `POST /api/tickets` and `POST /api/tickets/:id/comments`.
- **RBAC Middleware (`src/shared/middlewares/role.middleware.ts`):**
  - Built `requireRole` middleware factory checking `req.user.userRole` against permitted route roles.
  - Enforced `requireRole('agent', 'admin')` on `PATCH /api/tickets/:id`.
  - Enforced `requireRole('admin')` on `DELETE /api/users/:id`.

## 8. Query Validation, Pagination, and Resource Authorization (Oct 22, 2026)

- **Resource Ownership Scoping:**
  - Enforced customer isolation across `GET /api/tickets` and `GET /api/tickets/:id`.
  - Populated relation graphs for `customer` and `assignedAgent`.
- **Paginated List Metadata:**
  - Implemented dynamic Drizzle SQL expression arrays (`SQL[]`) with safety filters.
  - Added concurrent total count execution via `count()` to supply client-friendly pagination metadata (`totalCount`, `totalPages`, `hasNextPage`, etc.).
- **Comment Access Control:**
  - Hardened `POST /api/tickets/:id/comments` to block unauthorized users from posting comments on arbitrary ticket IDs.

## 9. Ticket Lifecycle & State Transition Enforcement (Oct 26, 2026)

- **Lifecycle Transition Map (`src/modules/tickets/tickets.schema.ts`):**
  - Defined declarative `ALLOWED_STATUS_TRANSITIONS` map (`open` -> `in_progress` / `closed`, `in_progress` -> `resolved` / `closed`, `resolved` -> `in_progress` / `closed`).
  - Added strict status transition checks in service layer with clear `400 Bad Request` messages on invalid transitions.
- **Role-Based Update Scoping (`src/modules/tickets/tickets.service.ts`):**
  - Restricted reopening of `closed` tickets to `admin` roles only.
  - Enforced agent assignment checks ensuring non-admin agents can only modify tickets explicitly assigned to their user identity.

## 10. Audit Logging & Activity Tracking System (Oct 27, 2026)

- **Audit Logging System (`src/modules/audit-logs/`):**
  - Created `audit_logs` table storing JSON diffs of modified fields (`oldValues`, `newValues`).
  - Integrated auto-logging inside `updateTicket` service for status, assignment, and priority changes.
- **Audit Activity Trail Endpoint:**
  - Added `GET /api/tickets/:id/audit-logs` returning ordered activity logs with performer metadata (`id`, `name`, `email`, `role`).
  - Scoped access to ticket owners (`customer`), assigned agents, and global admins.

## 11. Ticket File Attachments & Multer Storage (Oct 29, 2026)

- **Attachment Schema & Relations (`src/db/schema.ts`):**
  - Created `ticket_attachments` table mapped to tickets and uploading users.
- **File Upload Middleware (`src/shared/middlewares/upload.middleware.ts`):**
  - Configured Multer disk storage and filename generation.
  - Implemented standard MIME type allowlist and 5MB payload ceiling.
- **Attachment Endpoints (`src/modules/attachments/`):**
  - Added upload (`POST /api/tickets/:id/attachments`) and listing (`GET /api/tickets/:id/attachments`) routes with role-based scoping.

## 12. Integration Testing & Jest/Supertest Infrastructure (Nov 02, 2026)

- **App Decoupling Refactor (`src/app.ts` & `src/index.ts`):**
  - Separated Express routing and middleware pipeline into `src/app.ts` to allow in-memory HTTP assertions without binding live network ports.
- **Testing Setup (`jest.config.ts` & `tsconfig.json`):**
  - Configured `ts-jest` for end-to-end integration testing.
  - Added Jest types globally to TypeScript config.
- **Auth Module Integration Tests (`tests/auth.test.ts`):**
  - Built automated integration test cases verifying `POST /api/auth/login` status codes (`400`, `401`) and standard JSON error response structures.

## 13. Auth & Ticket Integration Suite Expansion (Nov 04, 2026)

- **Auth Validation & Token Issuance (`tests/auth.test.ts`):**
  - Completed test assertions for JWT issuance on valid login and Zod payload validation failures on registration.
- **Ticket Endpoint Guards & Creation (`tests/tickets.test.ts`):**
  - Implemented initial integration suite covering auth header guards (401), ticket creation (201 Created), and ticket collection retrieval (200 OK).
  - Verified total passing integration test suite (2 suites, 7 tests).
