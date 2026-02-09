# LoyalPass Backend - Multi-Business Loyalty Platform

A robust Node.js Express backend for managing multi-business loyalty programs with Apple Wallet and Google Wallet integration.

## 🚀 Features

- **Multi-Tenant Architecture**: Support multiple businesses with isolated data
- **Wallet Integration**: Apple Wallet (.pkpass) and Google Wallet pass generation
- **Points Management**: Real-time loyalty points tracking and redemption
- **API Key Authentication**: Secure business access with key rotation
- **Database ORM**: Sequelize ORM with automatic migrations
- **Multi-Database Support**: PostgreSQL (production), SQLite (development/testing)
- **Environment Configuration**: Hierarchical config system with node-config
- **Docker Deployment**: Complete containerization with docker-compose
- **RESTful API**: 15 well-designed endpoints
- **Comprehensive Logging**: Structured logging with Winston

## 🛠️ Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | 18+ |
| Framework | Express.js | 4.18.2 |
| ORM | Sequelize | 6.35.2 |
| Database | PostgreSQL / SQLite | 15 / 5.1 |
| Config | node-config | 3.3.11 |
| Authentication | API Keys | Custom |
| Logging | Winston | 3.x |
| Documentation | OpenAPI / Postman | - |

## 📋 Prerequisites

- **Node.js 18+** ([Download](https://nodejs.org/))
- **npm 8+** (comes with Node.js)
- **PostgreSQL 12+** (for production) OR **SQLite 3** (for development)
- **Docker & Docker Compose** (optional, for containerized deployment)

## 🚀 Quick Start

### Development Setup (SQLite)

```bash
# 1. Clone repository
git clone <repository-url>
cd loyalpass

# 2. Install dependencies
npm install

# 3. Start development server (uses SQLite by default)
npm run dev
```

The server will start on `http://localhost:3000` with an in-memory SQLite database.

### Production Setup (PostgreSQL)

```bash
# 1. Install dependencies
npm install

# 2. Set up PostgreSQL database
createdb loyalpass
psql loyalpass < schema.sql  # If schema file exists

# 3. Configure environment
export NODE_ENV=production
export DB_DIALECT=postgres
export DB_HOST=localhost
export DB_PORT=5432
export DB_USERNAME=postgres
export DB_PASSWORD=your_password
export DB_NAME=loyalpass

# 4. Run migrations (if needed)
npm run db:migrate

# 5. Start server
npm start
```

### 🐳 Docker Deployment (Recommended)

#### Using Docker Compose (Complete Stack)

```bash
# Start app and database
docker-compose up -d

# Check logs
docker-compose logs -f app

# Stop services
docker-compose down
```

This will:
- Build and run the Node.js application
- Start PostgreSQL 15 database
- Create volumes for data persistence
- Set up networking between containers

#### Manual Docker Build

```bash
# Build image
docker build -t loyalpass:latest .

# Run container
docker run -d \
  --name loyalpass \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_DIALECT=postgres \
  -e DB_HOST=db \
  -e DB_PORT=5432 \
  -e DB_USERNAME=loyalpass \
  -e DB_PASSWORD=secure_password \
  -e DB_NAME=loyalpass_db \
  loyalpass:latest
```

## 📁 Project Structure

```
loyalpass/
├── src/
│   ├── config/              # Configuration files
│   │   ├── db.js           # Database connection (Sequelize)
│   │   └── env.js          # Environment & config setup
│   ├── models/             # Sequelize ORM models
│   │   ├── Business.js     # Business entity
│   │   ├── Customer.js     # Customer entity
│   │   ├── Points.js       # Loyalty points
│   │   ├── Pass.js         # Wallet passes
│   │   ├── ApiKey.js       # API authentication
│   │   └── index.js        # Model associations
│   ├── controllers/        # Request handlers
│   ├── services/           # Business logic
│   │   ├── businessService.js
│   │   ├── customerService.js
│   │   ├── pointsService.js
│   │   ├── passService.js
│   │   ├── applePassService.js
│   │   └── googlePassService.js
│   ├── routes/             # API endpoints
│   ├── middleware/         # Express middleware
│   ├── utils/              # Utility functions
│   └── app.js             # Express app setup
├── config/                # Environment configs
│   ├── default.json       # Default settings (SQLite)
│   ├── development.json   # Development overrides (PostgreSQL)
│   ├── production.json    # Production settings
│   └── test.json          # Test configuration
├── Dockerfile             # Container definition
├── docker-compose.yml     # Multi-container orchestration
├── .env.example           # Environment template
├── .gitignore             # Git ignore rules
├── .dockerignore          # Docker ignore rules
└── package.json           # Dependencies & scripts
```

## 🗄️ Database Models

### Business
```javascript
const Business = sequelize.define('Business', {
  id: UUID (primary key),
  name: String(255),
  logo_url: String,
  brand_color: String,
  text_color: String,
  createdAt: Timestamp,
  updatedAt: Timestamp
});
```

### Customer
```javascript
const Customer = sequelize.define('Customer', {
  id: UUID,
  business_id: UUID (FK -> Business),
  name: String(255),
  email: String(255),
  createdAt: Timestamp,
  updatedAt: Timestamp
}, { 
  indexes: [{ fields: ['business_id', 'email'], unique: true }]
});
```

### Points
```javascript
const Points = sequelize.define('Points', {
  id: UUID,
  customer_id: UUID (FK -> Customer, unique),
  balance: Integer (default: 0),
  updatedAt: Timestamp
});
```

### Pass
```javascript
const Pass = sequelize.define('Pass', {
  id: UUID,
  business_id: UUID (FK -> Business),
  customer_id: UUID (FK -> Customer, unique),
  apple_pass_serial: String,
  google_pass_object_id: String,
  apple_push_token: String,
  createdAt: Timestamp,
  updatedAt: Timestamp
});
```

### ApiKey
```javascript
const ApiKey = sequelize.define('ApiKey', {
  id: UUID,
  business_id: UUID (FK -> Business),
  key: String(255, unique),
  active: Boolean (default: true),
  createdAt: Timestamp,
  updatedAt: Timestamp
});
```

## 🔌 API Endpoints

### Business Endpoints
- `POST /api/businesses` - Create business
- `GET /api/businesses/:id` - Get business details
- `PUT /api/businesses/:id` - Update business
- `GET /api/businesses/:id/keys` - List API keys
- `POST /api/businesses/:id/keys` - Create API key
- `POST /api/businesses/:id/keys/rotate` - Rotate API key

### Customer Endpoints
- `POST /api/customers` - Create customer
- `GET /api/customers/:id` - Get customer
- `PUT /api/customers/:id` - Update customer
- `GET /api/businesses/:businessId/customers` - List customers

### Points Endpoints
- `GET /api/customers/:id/points` - Get points balance
- `POST /api/customers/:id/points/add` - Add points
- `POST /api/customers/:id/points/redeem` - Redeem points
- `POST /api/customers/:id/points/set` - Set balance

### Pass Endpoints
- `POST /api/passes` - Create wallet pass
- `GET /api/customers/:customerId/pass` - Get customer pass
- `PUT /api/passes/:id` - Update pass

**Authentication**: All endpoints require `X-API-KEY` header with valid business API key

## 🔐 Using Sequelize ORM

### Creating Records

```javascript
const { Business, Customer, Points } = require('./src/models');

// Create a business
const business = await Business.create({
  name: 'My Coffee Shop',
  logo_url: 'https://...',
  brand_color: '#FF5733',
  text_color: '#FFFFFF'
});

// Create a customer with associated points
const customer = await Customer.create({
  business_id: business.id,
  name: 'John Doe',
  email: 'john@example.com'
});

const points = await Points.create({
  customer_id: customer.id,
  balance: 100
});
```

### Querying Records

```javascript
// Find by primary key
const business = await Business.findByPk(businessId);

// Find with conditions
const customer = await Customer.findOne({
  where: { business_id: businessId, email: 'john@example.com' }
});

// Find all with filtering
const customers = await Customer.findAll({
  where: { business_id: businessId },
  include: ['Points'], // Include relationships
  limit: 10,
  offset: 0
});
```

### Updating Records

```javascript
// Update and save
const business = await Business.findByPk(businessId);
await business.update({
  brand_color: '#FF5733'
});

// Bulk update
await Customer.update(
  { name: 'Jane Doe' },
  { where: { business_id: businessId, id: customerId } }
);
```

### Incrementing/Decrementing

```javascript
// Add points
const points = await Points.findOne({ where: { customer_id } });
await points.increment('balance', { by: 50 });

// Redeem points
await points.decrement('balance', { by: 10 });
```

### Deleting Records

```javascript
// Delete single
const customer = await Customer.findByPk(customerId);
await customer.destroy();

// Bulk delete with cascade
await Customer.destroy({
  where: { business_id: businessId }
});
```

## ⚙️ Configuration System

The application uses `node-config` for hierarchical configuration management.

### Configuration Hierarchy

1. **default.json** - Base configuration (SQLite, development defaults)
2. **{NODE_ENV}.json** - Environment-specific overrides
3. **Environment Variables** - Runtime overrides

### Example: development.json

```json
{
  "db": {
    "dialect": "postgres",
    "host": "localhost",
    "port": 5432,
    "username": "postgres",
    "database": "loyalpass_dev",
    "logging": true
  },
  "app": {
    "port": 3000
  },
  "logging": {
    "level": "debug"
  }
}
```

### Access Config in Code

```javascript
const config = require('./src/config/env');

console.log(config.db.host);        // localhost
console.log(config.app.port);       // 3000
console.log(config.logging.level);  // debug

// Or with defaults
const port = config.app.port || 3000;
```

### Override via Environment Variables

```bash
export NODE_ENV=production
export DB_HOST=prod-db.aws.com
export DB_PORT=5432
export DB_USERNAME=produser
export DB_PASSWORD=secret
export PORT=8080

npm start
```

## 📚 Database Migrations

Sequelize provides CLI tools for managing database schema:

```bash
# Initialize sequelize-cli
npx sequelize-cli init

# Create a new migration
npx sequelize-cli migration:create --name add-user-column

# Run pending migrations
npm run db:migrate

# Undo last migration
npm run db:migrate:undo

# Seed database
npx sequelize-cli seed:create --name demo-businesses
npm run db:seed
```

## 📝 NPM Scripts

```bash
npm start              # Start production server
npm run dev            # Start with nodemon (development)
npm run test           # Run test suite
npm run db:migrate     # Run database migrations
npm run db:migrate:undo  # Undo migrations
npm run db:seed        # Seed database
npm run docker:build   # Build Docker image
npm run docker:run     # Run Docker container
npm run docker:compose # Run docker-compose stack
```

## 🐛 Troubleshooting

### Database Connection Issues

**Problem**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution**:
```bash
# Check PostgreSQL is running
psql -U postgres

# Or use SQLite for development
export NODE_ENV=development
npm run dev
```

### Model Sync Issues

**Problem**: Tables not created automatically

**Solution**: Models sync automatically in development. For production, use migrations:
```bash
npm run db:migrate
```

### Docker Networking

**Problem**: Cannot connect to database from app container

**Solution**: Use service name `db` as hostname in docker-compose environment:
```yaml
DB_HOST: db  # Service name, not localhost
```

## 📖 Documentation

- [QUICKSTART.md](./QUICKSTART.md) - Get started in 5 minutes
- [TESTING.md](./TESTING.md) - API testing guide with Postman
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Extended developer documentation
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Architecture overview

## 🤝 Contributing

1. Create a feature branch
2. Make changes with tests
3. Submit pull request

## 📄 License

MIT

## 📞 Support

For issues or questions:
- Create an issue on GitHub
- Check existing documentation
- Review test files for usage examples

---

**Last Updated**: 2024
**Sequelize Version**: 6.35.2+
**Node.js Version**: 18+
**Database Support**: PostgreSQL 12+ / SQLite 3+
