# AGENTS.md — loyalpass

Multi-tenant loyalty platform: businesses enroll customers, issue/redeem
points, and generate Apple/Google Wallet passes. Includes a Next.js admin
portal, billing/subscription tracking, and audit/export/backup workflows.

## Tech Stack
**Backend:** Node.js 18+, Express 4, Sequelize (PostgreSQL prod / SQLite dev),
JWT + bcryptjs, express-validator, helmet, CORS, express-rate-limit,
nodemailer, `pkpass` (Apple Wallet), `google-auth-library` (Google Wallet),
`qrcode`, Jest.
**Frontend (`loyalpass-portal/`):** Next.js 16, `@tanstack/react-query`, axios.

## Structure
```
src/                       Backend
├── *Controller.js / *Service.js   auth, business, customer, points, pass,
                                    promotion, audit, backup, export, billing
├── models/                 Business, Customer, Points, Pass, Subscription,
                             Payment, Promotion, PromotionRedemption,
                             BusinessModule, ApiKey, PortalUser, AuditLog
├── middleware/              authMiddleware, adminAuthMiddleware,
                             moduleEntitlementMiddleware, errorMiddleware
                             (rate limiters: general/auth/write)
└── utils/                   logger.js, httpResponses.js, qrCode.js,
                             passTemplates.js, fieldMapping.js, planLimits.js,
                             tenantAccess.js (assertPlatformAdmin/assertBusinessAccess)

loyalpass-portal/src/
├── features/admin/         AdminAuditDashboard, AdminClientsDashboard, AdminModulesPanel
├── features/auth/          login/session
├── features/client/        business-client features
└── lib/api/                backend.js, backendCore.js, errors.js
```

## Build / Run / Test
```bash
npm install
cp .env.example .env
npm run dev                 # nodemon, port 3000 (SQLite by default)
npm test                    # Jest
npm run db:migrate / db:seed
docker compose --profile full up --build -d      # backend + portal + postgres
docker compose --profile backend up --build -d
docker compose --profile portal up --build -d
curl http://localhost:3000/health
```
Default seeded admin: `admin@loyalpass.local` / `change-me-in-production` —
**must be rotated before any real deployment.**

## API overview
`/api/auth/login`; `/api/businesses[...]` (onboarding, billing, subscriptions,
payments, quota-status, modules, api-keys, export, backup/restore, support);
`/api/customers`; `/api/points/issue|:customerId|:customerId/redeem`;
`/api/passes`; `/api/promotions[...]`; `/api/audit/logs`; `/health`.

## Conventions
- Everything is scoped by `business_id` — always use `tenantAccess.js`
  helpers (`assertPlatformAdmin`, `assertBusinessAccess`) rather than manual
  checks when adding tenant-scoped routes.
- Use `sendSuccess()` / `sendError()` from `httpResponses.js` for all
  responses — keep response shape consistent.
- Wallet integrations (Apple/Google) must fail gracefully if credentials are
  missing (log + skip), never crash the request.
- New paid features should be modeled as a `BusinessModule` entitlement +
  checked via `moduleEntitlementMiddleware`, consistent with `planLimits.js`.
- All destructive/business-impacting actions (export, delete, backup/restore)
  must go through `auditService.js` logging.

## Cross-repo component inventory
See [../COMPONENT_INVENTORY.md](../COMPONENT_INVENTORY.md). loyalpass is the
workspace reference for multi-tenant SaaS billing, wallet pass generation,
and per-tenant module entitlements.
