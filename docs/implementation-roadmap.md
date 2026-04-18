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
