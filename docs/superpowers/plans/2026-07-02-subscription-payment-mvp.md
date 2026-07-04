# Subscription & Payment MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable local end-to-end Subscription & Payment MVP with mock payment and workspace adapters.

**Architecture:** Preserve the repository's function-module controller/service/repository pattern. Put stable contracts in the shared package, business rules in pure functions, persistence behind Knex repositories, and external systems behind mockable adapter interfaces.

**Tech Stack:** TypeScript, React, Express, Knex, PostgreSQL, Vitest, Supertest.

---

## File map

### Shared

- Create `packages/shared/src/subscription.ts`: statuses, entities, DTOs and error codes.
- Modify `packages/shared/src/index.ts`: export subscription/payment contracts.
- Modify `packages/shared/src/index.d.ts`: expose declarations consistently.

### Backend

- Modify `apps/backend/package.json`: test script and test dependencies.
- Create `apps/backend/src/domain/subscription.rules.ts`: pure action, renewal and transition rules.
- Create `apps/backend/src/domain/subscription.rules.test.ts`: domain rule tests.
- Create `apps/backend/src/db/migrations/202607020001_create_subscription_payment_tables.ts`.
- Create `apps/backend/src/repositories/plans.repository.ts`.
- Create `apps/backend/src/repositories/subscriptions.repository.ts`.
- Create `apps/backend/src/repositories/paymentTransactions.repository.ts`.
- Create `apps/backend/src/integrations/payment/paymentGateway.ts`.
- Create `apps/backend/src/integrations/payment/mockPaymentGateway.ts`.
- Create `apps/backend/src/integrations/workspace/workspaceProvisioner.ts`.
- Create `apps/backend/src/integrations/workspace/mockWorkspaceProvisioner.ts`.
- Create `apps/backend/src/services/subscriptions.service.ts`.
- Create `apps/backend/src/services/payments.service.ts`.
- Create `apps/backend/src/services/payments.service.test.ts`.
- Create `apps/backend/src/middleware/localIdentity.ts`.
- Create `apps/backend/src/errors/applicationError.ts`.
- Modify `apps/backend/src/middleware/errorHandler.ts`.
- Create `apps/backend/src/controllers/subscriptions.controller.ts`.
- Create `apps/backend/src/controllers/payments.controller.ts`.
- Create `apps/backend/src/routes/subscriptions.routes.ts`.
- Create `apps/backend/src/routes/payments.routes.ts`.
- Create `apps/backend/src/routes/mockPayments.routes.ts`.
- Modify `apps/backend/src/app.ts`.
- Modify `apps/backend/src/config/env.ts`.

### Frontend

- Create `apps/frontend/src/features/subscription/services/subscription.api.ts`.
- Create `apps/frontend/src/features/subscription/pages/PricingPage.tsx`.
- Create `apps/frontend/src/features/subscription/pages/CheckoutPage.tsx`.
- Create `apps/frontend/src/features/subscription/pages/PaymentResultPage.tsx`.
- Create `apps/frontend/src/features/subscription/pages/SubscriptionStatusPage.tsx`.
- Create `apps/frontend/src/features/subscription/pages/AdminSubscriptionsPage.tsx`.
- Create `apps/frontend/src/features/subscription/pages/MockPaymentPage.tsx`.
- Create `apps/frontend/src/features/subscription/routes/subscription.routes.tsx`.
- Create `apps/frontend/src/features/subscription/styles/subscription.css`.
- Modify `apps/frontend/src/app/router.tsx`.

### Root

- Modify `package-lock.json` through `npm install`.

## Task 1: Test harness and shared contracts

**Files:**

- Modify `apps/backend/package.json`
- Create `packages/shared/src/subscription.ts`
- Modify `packages/shared/src/index.ts`
- Modify `packages/shared/src/index.d.ts`

- [ ] Add backend script `"test": "vitest run"` and dev dependencies `vitest`, `supertest`, `@types/supertest`.
- [ ] Run `npm install`.
- [ ] Define the exact unions:

```ts
export type PlanName = "Standard" | "Premium";
export type TransactionType = "NEW" | "RENEW" | "UPGRADE";
export type TransactionStatus = "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
export type SubscriptionStatus = "ACTIVE" | "EXPIRED" | "CANCELLED";
export type WorkspaceStatus =
  | "NOT_PROVISIONED"
  | "PROVISIONING"
  | "ACTIVE"
  | "PROVISIONING_FAILED";
```

- [ ] Define `Plan`, `Subscription`, `PaymentTransaction`, `CheckoutInput`, `CheckoutResponse`, `PaymentStatusResponse`, `AdminSubscriptionListResponse` and `SubscriptionErrorCode`.
- [ ] Export all contracts from shared index files.
- [ ] Run `npm run typecheck --workspace @ai-agent-platform/shared`.
- [ ] Commit:

```bash
git add apps/backend/package.json package-lock.json packages/shared/src
git commit -m "feat(subscription): add shared contracts and test harness"
```

## Task 2: Domain rules with TDD

**Files:**

- Test `apps/backend/src/domain/subscription.rules.test.ts`
- Create `apps/backend/src/domain/subscription.rules.ts`

- [ ] Write failing tests:

```ts
describe("determineTransactionType", () => {
  it("returns NEW without a subscription", () => {
    expect(determineTransactionType(undefined, "standard")).toBe("NEW");
  });

  it("returns RENEW for the current plan", () => {
    expect(determineTransactionType({ planId: "standard" }, "standard")).toBe("RENEW");
  });

  it("returns UPGRADE from Standard to Premium", () => {
    expect(determineTransactionType({ planId: "standard" }, "premium")).toBe("UPGRADE");
  });
});

it("renews from the later of now and current end date", () => {
  expect(calculateRenewedEndDate(now, futureEnd)).toEqual(addDays(futureEnd, 30));
  expect(calculateRenewedEndDate(now, expiredEnd)).toEqual(addDays(now, 30));
});

it("only allows a pending transaction to reach a terminal status", () => {
  expect(canTransitionTransaction("PENDING", "COMPLETED")).toBe(true);
  expect(canTransitionTransaction("COMPLETED", "CANCELLED")).toBe(false);
});
```

- [ ] Run `npm test --workspace @ai-agent-platform/backend -- subscription.rules.test.ts`; expect module-not-found failure.
- [ ] Implement `determineTransactionType`, `calculateRenewedEndDate`, `canTransitionTransaction` and `requiresWorkspaceProvisioning`.
- [ ] Run the focused test; expect all tests pass.
- [ ] Commit:

```bash
git add apps/backend/src/domain
git commit -m "feat(subscription): add tested domain rules"
```

## Task 3: Database schema and repositories

**Files:**

- Create migration and three repository files listed in the file map.

- [ ] Create migration for `plans`, `subscriptions`, `payment_transactions`, indexes and Standard/Premium seed rows.
- [ ] Ensure `down()` drops tables in reverse dependency order.
- [ ] Implement plan repository functions:

```ts
listActivePlans(): Promise<Plan[]>
getActivePlanById(id: string): Promise<Plan | undefined>
```

- [ ] Implement subscription repository functions:

```ts
getSubscriptionByUserId(userId: string): Promise<Subscription | undefined>
createSubscription(input, transaction?): Promise<Subscription>
updateSubscription(id, input, transaction?): Promise<Subscription | undefined>
listSubscriptions(query): Promise<AdminSubscriptionListResponse>
```

- [ ] Implement payment transaction repository functions:

```ts
createPaymentTransaction(input, transaction?): Promise<PaymentTransaction>
getPaymentTransactionById(id): Promise<PaymentTransaction | undefined>
findRecentPendingTransaction(userId, planId, type): Promise<PaymentTransaction | undefined>
transitionPendingTransaction(id, status, transaction?): Promise<PaymentTransaction | undefined>
markFulfilled(id, transaction?): Promise<void>
```

- [ ] Run database container and migration.
- [ ] Query seeded plans and verify two rows.
- [ ] Commit migration and repositories.

## Task 4: Payment service with dependency-injected fakes

**Files:**

- Test `apps/backend/src/services/payments.service.test.ts`
- Create adapter interfaces/mocks and service files.

- [ ] Write failing tests using in-memory repository fakes for:
  - server-side amount;
  - pending transaction reuse;
  - idempotent completion;
  - renewal calculation;
  - cancel/completion race;
  - no provisioning on renewal;
  - active subscription with `PROVISIONING_FAILED`.
- [ ] Run focused tests; expect module-not-found failure.
- [ ] Implement `PaymentGateway`:

```ts
export interface PaymentGateway {
  createPaymentSession(transaction: PaymentTransaction): Promise<{ paymentUrl: string }>;
}
```

- [ ] Implement `WorkspaceProvisioner`:

```ts
export interface WorkspaceProvisioner {
  provision(input: WorkspaceProvisionInput): Promise<void>;
  updatePlan(input: WorkspaceProvisionInput): Promise<void>;
}
```

- [ ] Implement mock adapters.
- [ ] Implement service factories with repository dependencies, then export default Knex-backed service instances.
- [ ] Run service tests; expect all pass.
- [ ] Commit service, adapters and tests.

## Task 5: Identity, errors and HTTP API

**Files:**

- Create middleware/errors/controllers/routes files and modify app/env/error handler.

- [ ] Add `LocalIdentity` Express type augmentation with user/workspace/role.
- [ ] Add `ApplicationError(code, status, message)`.
- [ ] Update error middleware to preserve typed errors and hide unknown details.
- [ ] Implement controller validation for plan ID, transaction ID and admin role.
- [ ] Mount:

```ts
app.use("/api", localIdentity);
app.use("/api/plans", plansRouter);
app.use("/api/subscriptions", subscriptionsRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/mock-payments", mockPaymentsRouter);
```

- [ ] Ensure mock routes return 404 unless `PAYMENT_PROVIDER === "mock"`.
- [ ] Run backend tests and typecheck.
- [ ] Commit HTTP layer.

## Task 6: Frontend vertical flow

**Files:**

- Create frontend files listed in the file map and modify router.

- [ ] Implement typed fetch helper that parses structured API errors.
- [ ] Implement Pricing page with current-plan labels and action selection.
- [ ] Implement Checkout page that posts only `planId`.
- [ ] Implement Mock Payment page with Complete, Fail, Provisioning Failure and Cancel actions.
- [ ] Implement Payment Result page with refresh/poll behavior.
- [ ] Implement Subscription Status page.
- [ ] Implement Admin Subscription list with status/plan filters.
- [ ] Add routes under `/app/subscription` and `/app/admin/subscriptions`.
- [ ] Add responsive CSS without changing authentication styles.
- [ ] Run frontend typecheck and build.
- [ ] Commit frontend flow.

## Task 7: End-to-end verification

- [ ] Run `npm test --workspace @ai-agent-platform/backend`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Run migrations against a clean PostgreSQL database.
- [ ] Start backend and verify:

```text
GET  /api/plans                         -> 200, two plans
POST /api/payments/checkout             -> 201, PENDING
POST /api/mock-payments/:id/complete    -> 200, COMPLETED
GET  /api/subscriptions/me              -> 200, ACTIVE
```

- [ ] Verify renewal adds 30 days without provisioning.
- [ ] Verify provisioning-failure keeps subscription active.
- [ ] Run `git diff --check` and inspect `git status`.
- [ ] Commit any final verification-only fixes separately.
