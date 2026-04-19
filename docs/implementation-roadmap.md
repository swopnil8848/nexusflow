<<<<<<< ours
# NexusFlow Implementation Roadmap (Learning-First)

This document defines **what to build first**, **why**, and **how** in a way that matches your learning goals:

- multi-tenancy
- dynamic RBAC
- feature flags
- clean architecture boundaries
- TDD-first workflow

It intentionally starts **before database complexity**, so concepts are learned in a stable order.

---

## 0) What are we trying to implement first?

### First real implementation target

We are **not** trying to build all services at once.

We are trying to build a **single reliable foundation slice**:

1. Service/module boundaries in code (so structure is future-proof)
2. Tenant context propagation in requests
3. Permission check primitives
4. Feature-flag evaluation primitives
5. One tiny business flow proving all three (tenant + permission + flag)

This lets you validate core SaaS control rules **before** adding Prisma/Postgres/Kafka.

### Why first step should be this (even before DB)

If you start DB-first, you can end up with tables but unclear ownership and rules.

If you start rules-first, then DB schema becomes obvious:

- What must be tenant-scoped
- What is global vs tenant override
- What needs indexes/constraints
- What must be auditable

So yes — for this project, a “rules-first + test-first” start is correct.

---

## 1) Recommended Phase Plan (in order)

## Phase A — Monorepo skeleton + boundaries (No DB)

### Goal
Create the folder/service structure you described, but with minimal logic.

### Deliverables

- `apps/api-gateway`
- `apps/core-platform`
- `apps/workflow-service`
- shared package(s) for contracts/context
- common request context object (userId, tenantId, roleKeys)

### Why
Prevents “god app” growth and teaches service ownership early.

### Tenant/Permission/Flag impact

- tenant: define how tenant id enters request context
- permissions: define where checks will run (service/use-case layer)
- flags: define where evaluation is called from

### Failure scenarios to design now

- Missing tenant header/context
- Invalid auth context
- Unknown role key

### TDD target

- context parser unit tests
- auth/tenant guard tests

---

## Phase B — Control-plane core in `core-platform` (In-memory first)

### Goal
Implement core logic in memory (no DB yet) for:

- roles and permissions mapping
- feature flag resolution (global/tenant/role/plan/kill switch)

### Why
You learn business rules without persistence noise.

### Tenant/Permission/Flag impact

- tenant: all checks require tenantId input
- permissions: per-tenant role assignment simulation
- flags: support override precedence explicitly

### Failure scenarios

- cross-tenant lookup attempt
- role exists globally but not in tenant
- conflicting overrides

### TDD target

- permission evaluator tests
- feature flag evaluator tests
- cross-tenant denial tests
- platform-admin bypass tests (for approved platform operations only)

> Important: This is where your current feature-flag logic belongs conceptually, but it should be taught with a full roadmap context, not as a random isolated commit.

---

## Phase B.1 — Platform Admin Model (cross-tenant operator)

### Goal

Introduce a **platform-level admin user type** that can perform approved cross-tenant administrative operations (support, incident response, global setup).

### Why

You asked whether there is a plan for “a user who can act as admin for all tenants.”  
Yes — but this must be explicit and constrained so it doesn’t break tenant isolation accidentally.

### Core rule

- Tenant admins manage only their own tenant.
- Platform admins are **separate identities/claims**, not normal tenant role assignments.
- Platform admins can cross tenant boundaries only for whitelisted actions.

### Permission model additions

Add permission namespaces:

- tenant-scoped: `tenant.users.manage`, `cases.create`, ...
- platform-scoped: `platform.tenants.read`, `platform.memberships.repair`, `platform.flags.override`

Evaluation order for an action:

1. validate actor type (`tenant_user` or `platform_admin`)
2. if platform action, require platform permission
3. if tenant action, enforce tenant scope + tenant permission
4. evaluate feature flag gate when applicable

### Data isolation guardrails

- Every tenant data query still requires explicit tenant id.
- Platform admin access must pass an elevated policy check + audit reason.
- No generic “skip tenant filter” flag in repositories.

### Failure scenarios

- platform-admin token used without required platform permission
- accidental use of platform permission in tenant-only endpoints
- privileged action executed without audit log metadata

### TDD target

- deny cross-tenant operation for tenant admin
- allow cross-tenant operation for platform admin with permission
- deny platform admin when permission missing
- enforce audit reason requirement for privileged actions

---

## Phase C — Add Prisma + PostgreSQL to `core-platform`

### Goal
Move in-memory logic to persisted models.

### Minimal schema first

- Tenant
- User
- Membership (user ↔ tenant)
- PlatformAdminProfile (or `User.isPlatformAdmin` + policy metadata)
- Role
- Permission
- RolePermission
- UserRole (scoped by tenant)
- FeatureFlag
- FeatureFlagOverride (tenant/role/plan)
- AuditLog (actor type, tenant scope, reason, action, outcome)

### Why now
By now you already know required relations from tests and domain rules.

### Tenant/Permission/Flag impact

- tenant_id required in every tenant-scoped table
- query guard helpers enforce tenant filters
- seed must include baseline roles/permissions/flags

### Failure scenarios

- missing tenant filter causing leak
- stale seed mismatches
- unique constraints for role names per tenant
- over-privileged platform admin with broad unmanaged access

### TDD target

- repository tests with tenant isolation
- migration + seed smoke test

---

## Phase D — First business module in `workflow-service`

### Goal
Create one business flow: e.g. `Case.create`.

### Rule chain for this flow

1. tenant context present
2. permission `cases.create` granted
3. feature flag `workflow.case_management` enabled
4. create case only within tenant scope

### Why
This proves full platform loop (tenant + permission + flag + domain).

### Failure scenarios

- permission denied
- feature disabled
- tenant mismatch in payload

### TDD target

- use-case tests (allowed/denied paths)
- controller tests for response codes

---

## Phase E — Gateway orchestration + internal service contracts

### Goal
Use `api-gateway` only for:

- auth validation
- tenant context forwarding
- routing

No business logic.

### TDD target

- gateway contract tests
- context forwarding tests

---

## Phase F — Async events and worker setup

### Goal
Introduce Kafka only after sync rules are stable.

### Initial events

- `case.created`
- `notification.send`
- `audit.logged`

### Failure scenarios

- consumer retry/backoff
- dead-letter strategy
- idempotency keys

### TDD target

- consumer handler tests
- retry policy tests

---

## 2) Folder Structure Plan (target state)

For each service module:

```text
module/
  application/      # use-cases only
  domain/           # entities/value objects/rules
  infrastructure/   # db, kafka, external APIs
  presentation/     # controllers, dto, transport
  tests/            # unit + integration
```

### Practical adoption strategy

Do **not** force this all at once in day 1.

1. Start with `application + tests`
2. Extract `domain` once rules become non-trivial
3. Add `infrastructure` only when DB/events are introduced
4. Keep `presentation` thin always

This avoids architecture theater while still moving toward clean boundaries.

---

## 3) What should be the immediate next implementation step (now)?

Given your current repo maturity, the correct next step is:

1. create `apps/` structure in monorepo (or logical modules if monorepo split is deferred)
2. implement a shared **RequestContext** contract
3. implement in-memory permission + feature-flag evaluators with tests
4. add one tiny `workflow` use-case behind both checks

Not DB yet. DB is Phase C.

---

## 4) Definition of Done for Step 1

Step 1 is done when:

- every request has validated `tenantId`
- permission checks are callable from use-cases
- feature checks are callable from use-cases
- one business action is gated by both
- all behavior covered by tests
- no controller contains business decision logic

---

## 5) Learning cadence for each change (strict workflow)

For every feature/change:

1. Design note (ownership + tenant + permission + flag + failure)
2. Test list first
3. Minimal code to pass
4. Refactor to improve boundaries
5. Explain what changed and why

---

## 6) Clarifying your concern directly

> “Is this correct for first step if we have not even created DB?”

**Yes**, if framed correctly:

- Correct first step: rule boundaries + testable business primitives.
- Wrong first step: fully abstracted architecture with no context.

The fix is not “skip flags/permissions until DB”, but “teach and stage them deliberately”.
=======
=======
>>>>>>> theirs
# NexusFlow — Fresh Start Roadmap (Cloud-First, Learn-as-you-build)

> Goal: Start **very small** with a clear path from monolith to microservices.

## 1) What we are building (simple)

NexusFlow is a **multi-tenant SaaS backend** where:
- users sign up/login,
- every user belongs to a tenant (workspace/company),
- tenant-level feature flags can turn features on/off,
- architecture can later split into microservices.

For now, we will build only:
1. Auth
2. API Gateway/BFF layer
3. Tenant basics
4. Feature flag basics

No billing, no analytics pipeline, no advanced workflows yet.

---

## 2) Recommended architecture today vs later

### Phase A (Now): Modular Monolith (one repo, one deploy)
- One NestJS app with modules:
  - `auth`
  - `users`
  - `tenants`
  - `feature-flags`
  - `gateway` (BFF/API facade)
- One database (Postgres).
- Tenant isolation with `tenant_id` column on tenant-scoped tables.

### Phase B (Later): Microservices (when needed)
- Keep API Gateway as entry point.
- First services to split out:
  1. Auth Service
  2. Tenant Service
  3. Feature Flag Service
- Use message broker (NATS/RabbitMQ) only when cross-service events are needed.

**Why this path:** easiest for learning, lowest cost, still future-proof.

---

## 3) Super-simple cloud stack

- **App hosting:** Render or Railway (easy deploy)
- **Database:** Neon or Supabase Postgres
- **Cache (optional now):** Upstash Redis
- **Auth tokens:** JWT in app initially (later external IdP if needed)
- **Config/secrets:** platform env vars

Keep it boring and stable at the start.

---

## 4) Exact commands — start monolith now

> Use these commands from your workspace root.

```bash
# 1) Create a fresh Nest app (if starting new)
pnpm dlx @nestjs/cli@latest new nexusflow --package-manager pnpm

# 2) Enter project
cd nexusflow

# 3) Add baseline dependencies
pnpm add @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt class-validator class-transformer
pnpm add @prisma/client
pnpm add -D prisma @types/passport-jwt @types/bcrypt

# 4) Create first modules only (slow, focused)
pnpm nest g module auth && pnpm nest g controller auth && pnpm nest g service auth
pnpm nest g module users && pnpm nest g controller users && pnpm nest g service users
pnpm nest g module tenants && pnpm nest g controller tenants && pnpm nest g service tenants
pnpm nest g module feature-flags && pnpm nest g controller feature-flags && pnpm nest g service feature-flags
pnpm nest g module gateway && pnpm nest g controller gateway && pnpm nest g service gateway

# 5) Setup Prisma
pnpm prisma init
```

---

## 5) Data model (minimum)

Create only these core tables first:

1. `tenants`
   - `id` (uuid)
   - `name`
   - `slug`
   - timestamps

2. `users`
   - `id` (uuid)
   - `email` (unique)
   - `password_hash`
   - timestamps

3. `memberships`
   - `id`
   - `tenant_id`
   - `user_id`
   - `role` (`owner`, `admin`, `member`)
   - unique (`tenant_id`, `user_id`)

4. `feature_flags`
   - `id`
   - `tenant_id`
   - `key`
   - `enabled` (boolean)
   - unique (`tenant_id`, `key`)

---

## 6) First API scope only (MVP-0)

### Auth
- `POST /auth/register`
- `POST /auth/login`
- return JWT

### Tenant basics
- `POST /tenants` (create tenant)
- `GET /tenants/:id`

### Membership
- `POST /tenants/:id/members` (invite/add user later; for now direct add)

### Feature flags
- `POST /tenants/:id/flags`
- `GET /tenants/:id/flags`
- `PATCH /tenants/:id/flags/:key`

### Gateway/BFF
- `GET /me/context` → user + tenant + enabled flags

---

## 7) Multi-tenant rules (keep simple)

- Every request includes tenant context (header like `x-tenant-id` initially).
- Verify requesting user belongs to that tenant.
- Always query tenant-scoped data with `WHERE tenant_id = ?`.
- Add guard/interceptor once and reuse.

---

## 8) Feature flags rules (future-proof)

- Start with **boolean flags per tenant** only.
- In code, centralize checks in one service:
  - `isEnabled(tenantId, 'flag_key')`
- Don’t spread raw DB checks throughout controllers.

---

## 9) Milestones (small batches)

### Week 1
- Project scaffold
- Prisma schema + migrations
- Register/login
- Tenant create/get

### Week 2
- Membership checks + tenant guard
- Feature flag CRUD
- `/me/context` gateway endpoint

### Week 3
- Hardening:
  - DTO validation
  - basic tests
  - rate limit on auth
  - simple audit logging

Only after this decide whether to split microservices.

---

## 10) Migration path to microservices later

When monolith starts hurting (team scale, deploy bottlenecks, heavy traffic):

1. Keep public API contract stable at gateway.
2. Extract **Auth** as first service.
3. Extract **Feature Flags** next (low coupling).
4. Use async events for cross-service updates.
5. Keep one source of truth per domain.

Do not split too early.

---

## 11) Next command checklist (today)

```bash
# in current repo
pnpm add @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt class-validator class-transformer
pnpm add @prisma/client
pnpm add -D prisma @types/passport-jwt @types/bcrypt
pnpm nest g module auth && pnpm nest g controller auth && pnpm nest g service auth
pnpm nest g module gateway && pnpm nest g controller gateway && pnpm nest g service gateway
pnpm nest g module tenants && pnpm nest g module feature-flags
pnpm prisma init
```

If you follow only this checklist, you will still be on the right path.
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
# NexusFlow Implementation Roadmap (Local-first)

This roadmap is meant to be reviewed and executed **directly from your local VS Code workspace**.

## Phase 1: Minimal Auth (current scope)

### Goal
Create a simple auth flow using Prisma with two separate login routes:

- `POST /auth/user/login` (email or phone + password)
- `POST /auth/admin/login` (email + password)

### Files to review first

- `prisma/schema.prisma`
- `src/prisma/prisma.service.ts`
- `src/auth/auth.controller.ts`
- `src/auth/auth.service.ts`
- `src/auth/dto/user-login.dto.ts`
- `src/auth/dto/admin-login.dto.ts`

### Local setup

```bash
cp .env.example .env
pnpm install
pnpm prisma:generate
pnpm prisma:push
pnpm prisma:seed
pnpm start:dev
```

### Route checks

```bash
# user login by email
curl -X POST http://localhost:3000/auth/user/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"user@nexusflow.dev","password":"user1234"}'

# user login by phone
curl -X POST http://localhost:3000/auth/user/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"+15555550123","password":"user1234"}'

# admin login by email
curl -X POST http://localhost:3000/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nexusflow.dev","password":"admin123"}'
```

## Phase 2: Hardening

- Replace simple token builder with JWT (`@nestjs/jwt`)
- Add refresh token rotation
- Add auth guards and role guards
- Add login attempt rate limiting

## Phase 3: Service split (optional)

- Move auth logic into `apps/auth-service`
- Keep public routes in `apps/api-gateway`
- Share DTO/contracts in `libs/common`

## Definition of done for Phase 1

- [ ] Prisma schema applies successfully
- [ ] Seed creates one admin and one user
- [ ] User can login with email
- [ ] User can login with phone
- [ ] Admin login works only by email
- [ ] Invalid credentials return 401
>>>>>>> theirs
