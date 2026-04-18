## Plan: Splitwise Full-Stack MVP (Your Stack)

This is refined for Node.js + Express + TypeScript backend, React + TypeScript frontend, Prisma ORM, and PostgreSQL, with object-oriented domain modeling and Strategy pattern for split logic.

**Phase 1: Foundation and Setup**
1. Create two apps: backend (Express) and frontend (React + TypeScript).
2. Configure shared standards: linting, formatting, test runners, env management, API error shape, and API versioning.
3. Set up PostgreSQL connection and Prisma baseline with migrations and seed pipeline.

**Phase 2: Domain and Database Design**
1. Define Prisma models for User, UserPhone, Group, GroupMember, Expense, ExpenseShare, Settlement, LedgerEntry, PairBalance.
2. Enforce constraints: unique email, unique membership per group, relational integrity, and lookup indexes.
3. Use integer minor units for money to avoid floating-point issues.

**Phase 3: Core Backend Modules**
1. Implement layered backend modules: controllers, services, repositories/domain components.
2. Build user and group/member APIs with admin role enforcement for add/remove member.
3. Add request validation and centralized error middleware.
4. Keep services transactional for state-changing flows.

**Phase 4: Expense Split Engine**
1. Implement SplitStrategy interface with Equal, Exact, and Percentage strategies.
2. Build ExpenseService orchestration:
3. Validate participants and payer as active members.
4. Compute and validate shares so total equals expense total.
5. Persist expense and shares in one transaction.
6. Expose expense APIs for frontend forms and history views.

**Phase 5: Ledger, Balances, and Settlement**
1. Post immutable ledger entries for every expense and settlement.
2. Aggregate ledger to pairwise balances and net opposite directions.
3. Implement settlement recording with validation and idempotency protection.
4. Expose balance APIs for “who owes whom” and per-user summary.

**Phase 6: Frontend Integration and Quality Gate**
1. Build MVP screens: group management, expense creation (split type switch), balances, settlement recording.
2. Implement typed API client and robust error handling aligned with backend contracts.
3. Add tests:
4. Backend unit/integration tests for split logic, roles, and invariants.
5. Frontend tests for split input validation and main user flows.
6. Run end-to-end scenario: create group -> add members -> add expenses -> view balances -> settle -> verify updated balances.

## Scope and Boundaries
1. Included: full MVP for required features across backend and frontend.
2. Excluded for now: recurring expenses, notifications, OCR receipts, multi-currency conversion, production-grade auth hardening.

## Two Decisions to Lock Before Build
1. Authentication style for MVP:
2. Option A: lightweight mock user header (fastest development).
3. Option B: JWT-based auth (more realistic, slower).
4. Balance read model:
5. Option A: compute from ledger on demand (simpler correctness path).
6. Option B: maintain materialized pair balances (faster reads, more complexity).

If you want, I can next convert this into a sprint board style plan with estimated effort per phase and a recommended order for parallel team work.