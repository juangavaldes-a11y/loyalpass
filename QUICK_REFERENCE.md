# 🚀 QUICK REFERENCE CARD

## Project: LoyalPass - Multi-Business Loyalty Platform

### ⚡ Start Here

```bash
# 1. Install
npm install

# 2. Create database
createdb loyalpass

# 3. Setup environment
cp .env.example .env
# Edit .env with DB credentials

# 4. Initialize database
npm run migrate

# 5. Start server
npm run dev
```

Server runs at: `http://localhost:3000`

---

### 🔑 First API Call

```bash
# Create business (get API key)
curl -X POST http://localhost:3000/api/businesses \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Business",
    "brand_color": "#FF6600",
    "text_color": "#FFFFFF"
  }'
```

**Save the API key from response!**

---

### 📡 Core Endpoints

**Create Customer**
```bash
curl -X POST http://localhost:3000/api/customers \
  -H "X-API-KEY: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "John", "email": "john@example.com"}'
```

**Add Points**
```bash
curl -X POST http://localhost:3000/api/points/add \
  -H "X-API-KEY: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"customer_id": "UUID", "amount": 50}'
```

**Get Points**
```bash
curl -X GET http://localhost:3000/api/points/CUSTOMER_UUID \
  -H "X-API-KEY: YOUR_API_KEY"
```

**Redeem Points**
```bash
curl -X POST http://localhost:3000/api/points/redeem \
  -H "X-API-KEY: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"customer_id": "UUID", "amount": 25}'
```

**Create Wallet Pass**
```bash
curl -X POST http://localhost:3000/api/passes/create \
  -H "X-API-KEY: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"customer_id": "UUID"}'
```

---

### 📚 Documentation

| File | Purpose |
|------|---------|
| **README.md** | Complete API reference & setup |
| **QUICKSTART.md** | 5-minute setup guide |
| **TESTING.md** | Full workflow examples |
| **DEVELOPER_GUIDE.md** | How to extend the system |
| **IMPLEMENTATION_SUMMARY.md** | What was built |

---

### 📁 File Structure

```
src/
├── server.js                 ← Entry point
├── app.js                    ← Express setup
├── config/                   ← Database & credentials
├── models/                   ← Database operations
├── services/                 ← Business logic
├── controllers/              ← HTTP handlers
├── routes/                   ← API endpoints
├── middleware/               ← Auth & errors
├── database/                 ← Migrations
└── utils/                    ← Helpers
```

---

### 🔐 Authentication

All endpoints except `POST /api/businesses` require:

```
Header: X-API-KEY: your_api_key_here
```

---

### 🗄️ Database

PostgreSQL tables:
- `businesses` - Business profiles
- `customers` - Customers per business
- `points` - Points balance
- `passes` - Wallet pass info
- `api_keys` - API authentication

Initialize with: `npm run migrate`

---

### 🔄 Complete Flow

1. **Create Business**
   ```
   POST /api/businesses
   ↓ Returns API key
   ```

2. **Create Customer**
   ```
   POST /api/customers (with API key)
   ↓ Auto-creates points record
   ```

3. **Generate Pass**
   ```
   POST /api/passes/create
   ↓ Returns Apple & Google pass info
   ```

4. **Add Points**
   ```
   POST /api/points/add
   ↓ Updates customer balance
   ```

5. **Check Balance**
   ```
   GET /api/points/:customerId
   ↓ Returns current points
   ```

6. **Redeem Points**
   ```
   POST /api/points/redeem
   ↓ Deducts from balance
   ```

---

### ⚙️ Configuration

**Environment variables (.env)**
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=loyalpass
DB_USER=postgres
DB_PASSWORD=your_password
PORT=3000
NODE_ENV=development

# Optional: Apple Wallet
APPLE_TEAM_ID=ABC123
APPLE_KEY_ID=XYZ789
APPLE_CERTIFICATE_PATH=./certs/apple.p8

# Optional: Google Wallet
GOOGLE_PROJECT_ID=project-id
GOOGLE_SERVICE_ACCOUNT_PATH=./certs/google.json
GOOGLE_ISSUER_ID=3388000000022876589
```

---

### 🧪 Test with Postman

1. Import `postman_collection.json`
2. Set environment variables:
   - `baseUrl` = `http://localhost:3000`
   - `apiKey` = Your API key
   - `businessId` = Business UUID
   - `customerId` = Customer UUID
3. Run requests

---

### 🔍 Check Database

```bash
# Connect
psql -U postgres -d loyalpass

# View businesses
SELECT * FROM businesses;

# View customers
SELECT * FROM customers;

# View points
SELECT * FROM points;

# View API keys
SELECT id, business_id, active FROM api_keys;
```

---

### 📊 API Endpoints (15 Total)

**Business** (6)
- `POST /api/businesses`
- `GET /api/businesses/:id`
- `PUT /api/businesses/:id`
- `GET /api/businesses/:id/api-keys`
- `POST /api/businesses/:id/api-keys`
- `POST /api/businesses/:id/api-keys/rotate`

**Customers** (4)
- `POST /api/customers`
- `GET /api/customers`
- `GET /api/customers/:id`
- `PUT /api/customers/:id`

**Passes** (3)
- `POST /api/passes/create`
- `POST /api/passes/update`
- `GET /api/passes/:customerId`

**Points** (3)
- `GET /api/points/:customerId`
- `POST /api/points/add`
- `POST /api/points/redeem`

---

### 🚨 Common Issues

**"Database connection failed"**
- Check PostgreSQL is running
- Verify DB credentials in .env
- Ensure `loyalpass` database exists

**"Invalid API key"**
- Keys are case-sensitive
- Verify key format (64 chars)
- Check X-API-KEY header spelling

**Port 3000 in use**
- Change PORT in .env
- Or kill process: `lsof -i :3000`

---

### 📖 Architecture Pattern

```
Request
  ↓
API Key Middleware (validates header)
  ↓
Route (matches URL)
  ↓
Controller (parses JSON)
  ↓
Service (executes business logic)
  ↓
Model (database query)
  ↓
Response (JSON back to client)
```

---

### 💡 Key Features

✅ Multi-tenant (many businesses)
✅ API key authentication
✅ Points management (add, redeem, check)
✅ Wallet pass generation (Apple & Google)
✅ QR code embedding
✅ PostgreSQL persistence
✅ Error handling
✅ Logging
✅ CORS enabled
✅ Security headers (Helmet.js)

---

### 🔧 npm Scripts

```bash
npm start      # Production mode
npm run dev    # Development (auto-reload)
npm run migrate # Initialize database
npm test       # Run tests
```

---

### 📞 Need Help?

1. **Setup issues?** → See QUICKSTART.md
2. **API examples?** → See TESTING.md
3. **Architecture?** → See README.md
4. **Extending?** → See DEVELOPER_GUIDE.md
5. **Quick ref?** → See this file (PROJECT_COMPLETE.md)

---

### 🎯 Next Steps

1. ✅ Run setup (npm install, createdb, migrate)
2. ✅ Test first endpoint (create business)
3. ✅ Follow TESTING.md workflow
4. ✅ Verify database operations
5. ✅ Configure wallet credentials
6. ✅ Integrate with your system

---

### 🚀 Ready to Launch!

Your loyalty platform is production-ready. Just add:
- Database backups
- Monitoring
- SSL/HTTPS
- Load balancing
- CDN for images

See DEVELOPER_GUIDE.md for extension ideas.

**Happy coding! 🎉**
