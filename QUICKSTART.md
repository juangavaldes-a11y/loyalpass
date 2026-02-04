# Quick Start Guide

Get your loyalty platform running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL running locally
- Terminal/Command prompt

## Step 1: Install Dependencies

```bash
npm install
```

This installs all required packages (express, pg, qrcode, etc.)

## Step 2: Setup Database

Create a PostgreSQL database:

```bash
createdb loyalpass
```

**On Windows (psql):**
```sql
CREATE DATABASE loyalpass;
```

## Step 3: Configure Environment

Copy and fill in environment variables:

```bash
cp .env.example .env
```

**Minimum required for basic testing (.env):**
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=loyalpass
DB_USER=postgres
DB_PASSWORD=your_password
PORT=3000
NODE_ENV=development
```

## Step 4: Initialize Database

Run migrations to create tables:

```bash
npm run migrate
```

You should see:
```
✓ Businesses table created
✓ Customers table created
✓ Points table created
✓ Passes table created
✓ API Keys table created
✓ Indexes created
Database initialized successfully!
```

## Step 5: Start Server

```bash
npm run dev
```

Server should print:
```
Server running on port 3000
Database connected successfully
```

## Step 6: Test API

In another terminal, create a business:

```bash
curl -X POST http://localhost:3000/api/businesses \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Business",
    "brand_color": "#FF6600",
    "text_color": "#FFFFFF"
  }'
```

You'll get back an API key - save it!

Then create a customer:

```bash
curl -X POST http://localhost:3000/api/customers \
  -H "X-API-KEY: YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com"
  }'
```

See [TESTING.md](./TESTING.md) for complete workflows.

## What's Included

✅ **Database** - PostgreSQL with 5 tables
✅ **API** - 15+ endpoints (businesses, customers, passes, points)
✅ **Authentication** - API key validation middleware
✅ **Wallet Integration** - Apple Wallet & Google Wallet ready
✅ **Points System** - Add, redeem, check balance
✅ **Logging** - Winston logger with file output
✅ **Error Handling** - Structured error responses

## Next Steps

1. **Enable Apple Wallet**
   - Download certificate from Apple Developer
   - Set `APPLE_CERTIFICATE_PATH` in `.env`
   - Set `APPLE_TEAM_ID` and `APPLE_KEY_ID`

2. **Enable Google Wallet**
   - Create Google Cloud project
   - Download service account JSON
   - Set `GOOGLE_SERVICE_ACCOUNT_PATH` in `.env`

3. **Deploy to Production**
   - Use `npm start` instead of `npm run dev`
   - Set `NODE_ENV=production`
   - Use proper database URL
   - Configure CORS for your domain

## Troubleshooting

**Database connection error?**
- Verify PostgreSQL is running: `psql -U postgres`
- Check `DB_PASSWORD` in `.env`
- Ensure `loyalpass` database exists: `createdb loyalpass`

**API key not working?**
- Verify you're sending `X-API-KEY` header
- Check the key matches what was returned from business creation
- Keys are case-sensitive

**Ports in use?**
- Change `PORT` in `.env` to another number (e.g., 3001)

## Architecture

```
Request
  ↓
API Key Middleware (validates X-API-KEY)
  ↓
Route Handler
  ↓
Controller (parse request)
  ↓
Service (business logic)
  ↓
Model (database query)
  ↓
Response (JSON)
```

## API Overview

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/businesses` | Create business |
| GET | `/api/businesses/:id` | Get business |
| POST | `/api/customers` | Create customer |
| GET | `/api/customers` | List customers |
| POST | `/api/passes/create` | Generate wallet pass |
| POST | `/api/points/add` | Add points |
| POST | `/api/points/redeem` | Redeem points |
| GET | `/api/points/:customerId` | Check balance |

All endpoints except `/api/businesses` POST require `X-API-KEY` header.

## Files Structure

```
loyalpass/
├── src/
│   ├── app.js              # Express app
│   ├── server.js           # Start here
│   ├── config/             # Database & credentials
│   ├── models/             # Database models
│   ├── services/           # Business logic
│   ├── controllers/        # Request handlers
│   ├── routes/             # Route definitions
│   ├── middleware/         # Auth & errors
│   ├── database/           # Migrations
│   └── utils/              # Helpers
├── package.json            # Dependencies
├── .env.example            # Config template
├── README.md               # Full documentation
└── TESTING.md              # Test examples
```

## Support

For issues:
1. Check `error.log` for detailed errors
2. Review [README.md](./README.md) for full documentation
3. See [TESTING.md](./TESTING.md) for API examples

Happy coding! 🚀
