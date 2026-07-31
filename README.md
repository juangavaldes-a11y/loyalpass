# LoyalPass Backend

LoyalPass is a multi-tenant loyalty platform backend for managing businesses, customers, wallet passes, and points. The current implementation includes tenant-aware APIs, onboarding and billing metadata, export workflows, audit logging, and health diagnostics that make it suitable for pilot service deployments.

## What the app currently does

- Creates and manages businesses with onboarding, billing, and plan metadata
- Supports platform-admin and business-scoped access control
- Creates and updates customer records for each business tenant
- Issues and updates loyalty points balances
- Generates wallet-pass records for Apple Wallet and Google Wallet integrations
- Exposes export and deletion workflows for business data
- Provides audit logs and a health endpoint for operational visibility

## Prerequisites

- Node.js 18+
- npm 9+
- Optional: Docker and Docker Compose

## Quick start

1. Install dependencies

```bash
npm install
```

2. Create your environment file

```bash
cp .env.example .env
```

3. Start the API locally

```bash
npm run dev
```

The server listens on http://localhost:3000 by default.

### Default behavior

- The default configuration uses SQLite for local development.
- Set `DB_DIALECT=postgres` and provide Postgres credentials if you want to run against PostgreSQL.
- Wallet integrations are optional; if Apple or Google credentials are missing, pass creation still succeeds but the wallet-specific payloads are skipped gracefully.

## Useful commands

```bash
npm start           # production mode
npm run dev         # development mode with nodemon
npm test            # run the Jest suite
npm run lint        # placeholder script for now
```

## Docker

```bash
docker compose up --build
```

The container uses the same environment variables as the local run and exposes the API on port 3000.

## Main API entry points

### Health

```bash
GET /health
```

### Authentication

```bash
POST /api/auth/login
```

Request body:

```json
{
  "email": "admin@loyalpass.local",
  "password": "admin123"
}
```

### Business management

```bash
POST /api/businesses
GET /api/businesses
GET /api/businesses/:id
PUT /api/businesses/:id
GET /api/businesses/:id/quota-status
GET /api/businesses/:id/export
DELETE /api/businesses/:id/export
```

### Customer management

```bash
POST /api/customers
GET /api/customers
GET /api/customers/:id
PUT /api/customers/:id
```

### Wallet passes

```bash
POST /api/passes/create
POST /api/passes/update
GET /api/passes/:customerId
```

### Points

```bash
GET /api/points/:customerId
POST /api/points/add
POST /api/points/redeem
```

### Audit logs

```bash
GET /api/audit-logs
DELETE /api/audit-logs/retention?retentionDays=90
```

The retention endpoint is restricted to platform admins and removes older audit records based on the configured retention window.

### Backup and restore

```bash
POST /api/businesses/:id/backup
POST /api/businesses/:id/restore
```

Backups are written to the local `backups/` directory by default and can be restored with the generated backup file path.

## Notes

- Most business-scoped endpoints require a valid API key or portal authorization token, depending on the route.
- The platform admin seed user defaults to `admin@loyalpass.local` / `admin123` when those values are configured through environment variables.

## Architecture

### Folder Structure

```
src/
├── app.js                 # Express app setup
├── server.js              # Server entry point
├── config/                # Configuration
│   ├── db.js              # PostgreSQL pool
│   ├── env.js             # Environment variables
│   ├── appleWallet.js     # Apple Wallet config
│   └── googleWallet.js    # Google Wallet config
├── models/                # Database models
│   ├── Business.js
│   ├── Customer.js
│   ├── Pass.js
│   ├── Points.js
│   └── ApiKey.js
├── services/              # Business logic
│   ├── businessService.js
│   ├── customerService.js
│   ├── passService.js
│   ├── applePassService.js
│   ├── googlePassService.js
│   └── pointsService.js
├── controllers/           # HTTP handlers
│   ├── businessController.js
│   ├── customerController.js
│   ├── passController.js
│   └── pointsController.js
├── routes/                # Route definitions
│   ├── businessRoutes.js
│   ├── customerRoutes.js
│   ├── passRoutes.js
│   └── pointsRoutes.js
├── middleware/            # Express middleware
│   ├── authMiddleware.js  # API key validation
│   └── errorMiddleware.js # Error handling
├── database/              # Database setup
│   └── migrate.js         # Schema initialization
└── utils/                 # Utilities
    ├── qrCode.js          # QR code generation
    ├── passTemplates.js   # Wallet pass templates
    └── logger.js          # Logging
```

### Data Flow

```
Request → Auth Middleware (validate API key)
         ↓
       Router (route to endpoint)
         ↓
       Controller (parse request)
         ↓
       Service (business logic)
         ↓
       Model (database operations)
         ↓
       Response
```

## Database Schema

### Businesses
- `id` (UUID): Primary key
- `name`: Business name
- `logo_url`: Logo image URL
- `brand_color`: Hex color for passes
- `text_color`: Hex color for text
- `created_at`, `updated_at`: Timestamps

### Customers
- `id` (UUID): Primary key
- `business_id` (FK): Linked business
- `name`: Customer name
- `email`: Unique per business
- `created_at`, `updated_at`: Timestamps

### Points
- `id` (UUID): Primary key
- `customer_id` (FK): Linked customer
- `balance`: Current points
- `updated_at`: Last update timestamp

### Passes
- `id` (UUID): Primary key
- `business_id` (FK): Linked business
- `customer_id` (FK): Linked customer (unique)
- `apple_pass_serial`: Apple Wallet identifier
- `google_pass_object_id`: Google Wallet identifier
- `apple_push_token`: For push updates
- `created_at`, `updated_at`: Timestamps

### API Keys
- `id` (UUID): Primary key
- `business_id` (FK): Linked business
- `key`: API key string (unique, 64 char hex)
- `active`: Boolean for enabling/disabling
- `created_at`, `updated_at`: Timestamps

## Security

✅ API key validation on all protected routes
✅ Business ID isolation - businesses can only access their own data
✅ Helmet.js for HTTP security headers
✅ CORS enabled for trusted origins
✅ Input validation and error handling
✅ Secure API key rotation mechanism

## Wallet Integration

### Apple Wallet

- Generates `.pkpass` files with business branding
- Includes QR codes for scanning
- Supports push updates to customer wallets
- Uses `pkpass` library for pass generation

To enable Apple Wallet:
1. Download certificate from Apple Developer account
2. Set `APPLE_CERTIFICATE_PATH` in `.env`
3. Set `APPLE_TEAM_ID` and `APPLE_KEY_ID`

### Google Wallet

- Creates Pass Classes (per business)
- Creates Pass Objects (per customer)
- Uses Google OAuth service account
- Supports dynamic points updates

To enable Google Wallet:
1. Create Google service account
2. Download JSON key file
3. Set `GOOGLE_SERVICE_ACCOUNT_PATH` in `.env`

## Error Handling

All errors return structured JSON:

```json
{
  "success": false,
  "message": "Error description"
}
```

HTTP Status Codes:
- `200`: Success
- `201`: Created
- `400`: Bad request
- `401`: Unauthorized (missing API key)
- `403`: Forbidden (invalid API key)
- `404`: Not found
- `409`: Conflict (duplicate)
- `500`: Server error

## Logging

Logs are written to:
- Console (development)
- `error.log` (errors only)
- `combined.log` (all events)

Set `LOG_LEVEL` in `.env` to control verbosity:
- `error`
- `warn`
- `info` (default)
- `debug`

## Development

### Testing API Locally

Using cURL:

```bash
# Create business
curl -X POST http://localhost:3000/api/businesses \
  -H "Content-Type: application/json" \
  -d '{"name":"My Business","brand_color":"#FF6600"}'

# Create customer
curl -X POST http://localhost:3000/api/customers \
  -H "X-API-KEY: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com"}'
```

Using Postman:
1. Create collection
2. Set variable `{{baseUrl}}` = `http://localhost:3000`
3. Set header `X-API-KEY` = your API key
4. Test endpoints

## License

ISC
