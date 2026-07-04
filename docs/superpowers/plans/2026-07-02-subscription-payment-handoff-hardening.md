# Subscription & Payment Handoff Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the local mock gateway development-only, explain provisioning failures clearly, and document the verified local workflow before team handoff.

**Architecture:** Keep mock payment behind the existing payment adapter and Express router, but require both the mock provider and a non-production runtime. Build frontend routes from an environment flag so the mock page is absent from production builds. Pass the transaction ID to workspace adapters as an idempotency key, while keeping a user/admin retry endpoint out of scope because the approved use cases do not require one.

**Tech Stack:** TypeScript, Express, React Router, Vitest, Supertest, PostgreSQL, Docker Compose.

---

## File map

- Modify `apps/backend/src/config/env.ts`: expose the runtime environment and derived mock-gateway flag.
- Modify `apps/backend/src/routes/mockPayments.routes.ts`: return `404` unless the derived flag is enabled.
- Modify `apps/backend/src/app.subscription.test.ts`: cover disabled mock endpoints.
- Modify `apps/backend/src/services/payments.service.test.ts`: cover the provisioning idempotency key.
- Modify `apps/backend/src/services/payments.service.ts`: pass the transaction ID to provisioning.
- Modify `apps/backend/src/integrations/workspace/workspaceProvisioner.ts`: require an idempotency key.
- Modify `apps/frontend/src/features/subscription/routes/subscription.routes.tsx`: omit the mock page from production routes.
- Create `apps/frontend/src/features/subscription/routes/subscription.routes.test.tsx`: cover route inclusion/exclusion.
- Create `apps/frontend/src/features/subscription/components/workspaceStatusMessage.ts`: map failed provisioning to user-facing guidance.
- Create `apps/frontend/src/features/subscription/components/workspaceStatusMessage.test.ts`: cover failure and normal states.
- Modify `apps/frontend/src/features/subscription/pages/MockPaymentPage.tsx`: identify the page as a development tool.
- Modify `apps/frontend/src/features/subscription/pages/PaymentResultPage.tsx`: show provisioning failure guidance.
- Modify `apps/frontend/src/features/subscription/pages/SubscriptionStatusPage.tsx`: show the same guidance.
- Create `apps/frontend/src/vite-env.d.ts`: load Vite's `ImportMeta.env` declarations.
- Modify `README.md`: document database, mock flow, environment flags, URLs, tests, and production boundary.
- Modify `docs/superpowers/specs/2026-07-02-subscription-payment-mvp-design.md`: keep the approved design aligned with the hardened behavior.

## Task 1: Disable the mock gateway in production

- [x] Add an HTTP test that sets `env.mockPaymentEnabled = false`, calls `POST /api/mock-payments/transaction-1/complete`, and expects `404` without invoking `completePayment`.
- [x] Run `npm test --workspace @ai-agent-platform/backend -- app.subscription.test.ts` and verify the new test fails because the route still allows the request.
- [x] Add `nodeEnv` and `mockPaymentEnabled` to `env`, where mock payment is enabled only when `PAYMENT_PROVIDER=mock` and `NODE_ENV !== production`.
- [x] Change the mock router guard to use `env.mockPaymentEnabled`.
- [x] Run the focused backend test and verify it passes.

## Task 2: Remove the mock page from production routes

- [x] Add a frontend test for `createSubscriptionRoutes(false)` that expects no route containing `mock-payment`, plus a test that development routes include it.
- [x] Run `npm test --workspace @ai-agent-platform/frontend -- subscription.routes.test.tsx` and verify it fails because the route factory does not exist.
- [x] Refactor the route list into `createSubscriptionRoutes(mockPaymentEnabled)` and call it with `import.meta.env.DEV`.
- [x] Update the mock page heading and explanation so it explicitly says developer/test only and that a real gateway decides the payment result.
- [x] Run the focused frontend route test and verify it passes.

## Task 3: Explain provisioning failure without inventing a retry API

- [x] Add pure-helper tests expecting `PROVISIONING_FAILED` to return guidance that payment succeeded but workspace setup needs attention, and `ACTIVE` to return no warning.
- [x] Run `npm test --workspace @ai-agent-platform/frontend -- workspaceStatusMessage.test.ts` and verify it fails because the helper does not exist.
- [x] Implement the helper and render it from payment result and subscription status pages.
- [x] Run the focused helper test and verify it passes.
- [x] Add a service test requiring provisioning to receive the payment transaction ID as its idempotency key.
- [x] Run the focused service test and verify it fails with an empty key.
- [x] Require `idempotencyKey` in the workspace adapter input and pass `transaction.id`.
- [x] Run the focused service test and backend typecheck; verify both pass.

## Task 4: Document and verify handoff

- [x] Expand `README.md` with PostgreSQL startup/migration, environment variables, feature URLs, mock-gateway semantics, test commands, and the production boundary.
- [x] Confirm the issue criteria: provisioning failure keeps payment/subscription successful; retry must reuse the same idempotency key; no retry endpoint is required by the approved use cases.
- [x] Run backend and frontend tests, workspace typecheck, workspace build, `git diff --check`, and PostgreSQL migration/status queries.
- [x] Commit the verified changes.
