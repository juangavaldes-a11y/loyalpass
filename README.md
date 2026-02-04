# LoyalPass Backend - Node.js Express Server

Multi-business loyalty platform with Apple Wallet and Google Wallet integration.

## Features

✅ Multi-tenant architecture - multiple businesses can issue wallet passes
✅ Wallet integration - Apple Wallet (.pkpass) and Google Wallet support
✅ Points management - dynamic points updates
✅ API key authentication - secure business access
✅ PostgreSQL database - robust data persistence
✅ RESTful API - clean endpoint design

## Setup Instructions

### 1. Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### 2. Installation

```bash
npm install
```

### 3. Environment Configuration

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

**Required environment variables:**

```
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=loyalpass
DB_USER=postgres
DB_PASSWORD=your_password

# Server
PORT=3000
NODE_ENV=development

# Apple Wallet
APPLE_TEAM_ID=your_apple_team_id
APPLE_KEY_ID=your_apple_key_id
APPLE_CERTIFICATE_PATH=./path/to/certificate.p8

# Google Wallet
GOOGLE_PROJECT_ID=your_google_project_id
GOOGLE_SERVICE_ACCOUNT_PATH=./path/to/service-account-key.json
GOOGLE_ISSUER_ID=your_issuer_id
```

### 4. Database Setup

Create PostgreSQL database:

```bash
createdb loyalpass
```

Run migrations:

```bash
npm run migrate
```

### 5. Start Server

Development mode (with auto-reload):

```bash
npm run dev
```

Production mode:

```bash
npm start
```

Server will run on `http://localhost:3000`

## API Endpoints

### Authentication

All endpoints (except `/health` and `POST /api/businesses`) require:

```
X-API-KEY: your_api_key
```

### Business Management

**Create Business** (No auth required)
```
POST /api/businesses
Content-Type: application/json

{
  "name": "Coffee Shop",
  "logo_url": "https://example.com/logo.png",
  "brand_color": "#FF6600",
  "text_color": "#FFFFFF"
}

Response:
{
  "success": true,
  "data": {
    "business": { ... },
    "apiKey": "your_api_key_here"
  }
}
```

**Get Business**
```
GET /api/businesses/:id
Header: X-API-KEY: your_api_key
```

**Update Business**
```
PUT /api/businesses/:id
Header: X-API-KEY: your_api_key

{
  "name": "Updated Name",
  "brand_color": "#FF9900"
}
```

**Get API Keys**
```
GET /api/businesses/:id/api-keys
Header: X-API-KEY: your_api_key
```

**Create API Key**
```
POST /api/businesses/:id/api-keys
Header: X-API-KEY: your_api_key
```

**Rotate API Key** (deactivate old, create new)
```
POST /api/businesses/:id/api-keys/rotate
Header: X-API-KEY: your_api_key
```

### Customer Management

**Create Customer**
```
POST /api/customers
Header: X-API-KEY: your_api_key
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com"
}
```

**Get Customer**
```
GET /api/customers/:id
Header: X-API-KEY: your_api_key
```

**List Customers**
```
GET /api/customers
Header: X-API-KEY: your_api_key
```

**Update Customer**
```
PUT /api/customers/:id
Header: X-API-KEY: your_api_key

{
  "name": "Jane Doe"
}
```

### Pass Management

**Create Pass** (Apple Wallet & Google Wallet)
```
POST /api/passes/create
Header: X-API-KEY: your_api_key
Content-Type: application/json

{
  "customer_id": "uuid-here"
}

Response includes:
- apple_pass_serial (for .pkpass file)
- google_pass_object_id (for Google Wallet)
```

**Update Pass** (push updates to wallet)
```
POST /api/passes/update
Header: X-API-KEY: your_api_key

{
  "pass_id": "uuid",
  "customer_id": "uuid"
}
```

**Get Pass by Customer**
```
GET /api/passes/:customerId
Header: X-API-KEY: your_api_key
```

### Points Management

**Get Points Balance**
```
GET /api/points/:customerId
Header: X-API-KEY: your_api_key
```

**Add Points** (after purchase)
```
POST /api/points/add
Header: X-API-KEY: your_api_key
Content-Type: application/json

{
  "customer_id": "uuid",
  "amount": 50
}
```

**Redeem Points** (customer redeems for reward)
```
POST /api/points/redeem
Header: X-API-KEY: your_api_key

{
  "customer_id": "uuid",
  "amount": 100
}
```

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
