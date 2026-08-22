# LoyalPass Implementation Plan

## Product Outcome

Deliver a multi-tenant loyalty platform with three clear experiences:

- Platform administrators manage businesses, plans, onboarding, billing, support, and governance.
- Business operators manage customers, points, rewards, promotions, campaigns, and wallet passes.
- Customers enroll, view their balance and offers, redeem rewards, and receive approved communications.

## Delivery Rules

- Every business-owned record is tenant-scoped at the query and authorization layers.
- Provider adapters must fail clearly and never report a payment or delivery as successful without provider confirmation.
- All state-changing operations are auditable and idempotent where retries are possible.
- Each slice ships with focused backend tests, portal tests where applicable, and a migration before production use.

## Phase 1: Data and Platform Foundations

- [ ] Replace ad hoc schema initialization with versioned Sequelize migrations.
- [ ] Add promotion, redemption, campaign, customer-device, and notification-delivery models.
- [ ] Add indexes, foreign keys, retention rules, and tenant-isolation tests.
- [ ] Add shared validation and idempotency handling.
- [ ] Complete production configuration and secret validation.

**Acceptance:** A fresh PostgreSQL database can be migrated from zero, all new records are tenant-scoped, and retries do not duplicate redemptions or payment/delivery records.

## Phase 2: Promotions and Rewards

- [ ] Business operators can create, edit, publish, pause, and expire promotions.
- [ ] Support fixed points, percentage discounts, fixed discounts, and limited-use rewards.
- [ ] Add eligibility rules for dates, customer status, minimum balance, and usage limits.
- [ ] Add redemption validation, atomic redemption, and audit events.
- [ ] Add business-operator promotion management UI.

**Acceptance:** A business can publish an offer, an eligible customer can redeem it once according to its rules, and an ineligible or duplicate redemption is rejected safely.

## Phase 3: Customer-Facing Experience

- [ ] Add customer enrollment and consent capture.
- [ ] Add customer authentication or secure magic-link access.
- [ ] Add customer balance, pass, active promotions, redemption history, and profile views.
- [ ] Add responsive mobile-first customer routes.
- [ ] Add privacy, unsubscribe, and account-deletion flows.

**Acceptance:** A customer can securely access only their own account and complete the full view-offer-to-redeem workflow on mobile.

## Phase 4: Campaigns and Email

- [ ] Add campaign drafts, audiences, scheduling, sending, cancellation, and reporting.
- [ ] Add customer segmentation and consent-aware recipient selection.
- [ ] Connect the SMTP email service to invitations, password recovery, receipts, and campaigns.
- [ ] Add delivery records, retries, bounce/failure handling, and unsubscribe suppression.
- [ ] Add business-operator campaign UI and admin delivery monitoring.

**Acceptance:** A business can send a test email and a consent-filtered campaign with auditable per-recipient status.

## Phase 5: Push and Wallet Messaging

- [ ] Store and revoke Apple/Google device or wallet identifiers.
- [ ] Complete Apple pass signing, download, registration, and update push flows.
- [ ] Complete Google Wallet class/object creation, signed Save-to-Wallet JWTs, and updates.
- [ ] Add provider retries, rate limits, dead-letter handling, and delivery status.
- [ ] Add wallet configuration and campaign controls to the operator UI.

**Acceptance:** A published promotion can update eligible wallet holders and failures are visible and retryable.

## Phase 6: Billing and BAC Costa Rica

- [ ] Finalize BAC Credomatic Costa Rica E-commerce API contract from BAC documentation.
- [ ] Implement authentication, request signing/encryption, checkout/payment creation, and status lookup.
- [ ] Implement verified BAC webhooks and idempotent payment reconciliation.
- [ ] Support CRC and USD pricing with explicit plan configuration.
- [ ] Connect subscription lifecycle to access, quotas, invoices, and email receipts.
- [ ] Add billing UI for platform administrators and business operators.

**Acceptance:** Sandbox payment creation, callback verification, renewal/failure handling, and reconciliation pass against BAC’s Costa Rica test environment.

## Phase 7: Operations and Launch

- [ ] Add real readiness checks, metrics, tracing, centralized logs, and alerting.
- [ ] Move backups to encrypted durable object storage and test restore drills.
- [ ] Add CI/CD, migration gates, rollback images, and incident procedures.
- [ ] Run load, security, tenant-isolation, accessibility, and mobile tests.
- [ ] Complete privacy, terms, consent, retention, and Costa Rica payment/compliance review.

**Acceptance:** Staging passes the launch checklist, rollback and restore are rehearsed, and production has monitored failure paths.

## Iteration Order

1. Promotions and redemption backend foundation.
2. Promotion operator UI.
3. Customer-facing enrollment and offers.
4. Campaign and SMTP delivery.
5. Wallet push delivery.
6. BAC Costa Rica payment completion.
7. Production hardening and launch validation.
