# LoyalPass Developer Guide

Advanced guide for extending and customizing the loyalty platform.

## Architecture Overview

The application follows a **layered architecture**:

```
Routes → Controllers → Services → Models → Database
```

Each layer has a specific responsibility:

### 1. Routes (`src/routes/`)
Define HTTP endpoints and their paths.

```javascript
// Example: src/routes/customerRoutes.js
router.post('/', CustomerController.createCustomer);
router.get('/:id', CustomerController.getCustomer);
```

**When to modify:** Adding new endpoints or changing URL paths

### 2. Controllers (`src/controllers/`)
Parse HTTP requests and call services.

```javascript
// Example: Handle HTTP request, return JSON
static async createCustomer(req, res, next) {
  const { name, email } = req.body;
  const customer = await CustomerService.createCustomer(...);
  res.status(201).json({ success: true, data: customer });
}
```

**When to modify:** Changing request/response handling, validation rules

### 3. Services (`src/services/`)
Implement business logic and orchestrate models.

```javascript
// Example: Business logic for creating customer
static async createCustomer(businessId, name, email) {
  const customer = await Customer.create(...);
  await Points.create(customer.id, 0); // Link points
  return customer;
}
```

**When to modify:** Adding complex logic, integrating external services

### 4. Models (`src/models/`)
Perform database operations with raw SQL.

```javascript
// Example: Direct database query
static async create(businessId, name, email) {
  const result = await pool.query(
    'INSERT INTO customers...',
    [businessId, name, email]
  );
  return result.rows[0];
}
```

**When to modify:** Changing database schema or queries

## Adding a New Feature

Let's walk through adding a **Referral System** where customers earn points for referrals.

### Step 1: Create Database Model

Add to `src/models/Referral.js`:

```javascript
const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class Referral {
  static async create(referrerId, referredId) {
    const id = uuidv4();
    const query = `
      INSERT INTO referrals (id, referrer_id, referred_id, created_at)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const result = await pool.query(query, [id, referrerId, referredId, new Date()]);
    return result.rows[0];
  }

  static async getByReferrerId(referrerId) {
    const query = 'SELECT * FROM referrals WHERE referrer_id = $1;';
    const result = await pool.query(query, [referrerId]);
    return result.rows;
  }
}

module.exports = Referral;
```

### Step 2: Create Service Layer

Add to `src/services/referralService.js`:

```javascript
const Referral = require('../models/Referral');
const PointsService = require('./pointsService');

class ReferralService {
  static async referCustomer(referrerId, referredEmail) {
    // Find referred customer
    const referred = await Customer.getByEmail(referredEmail);
    if (!referred) throw new Error('Customer not found');

    // Create referral record
    const referral = await Referral.create(referrerId, referred.id);

    // Award referrer 100 points
    await PointsService.addPoints(referrerId, 100);

    return referral;
  }
}

module.exports = ReferralService;
```

### Step 3: Create Controller

Add to `src/controllers/referralController.js`:

```javascript
const ReferralService = require('../services/referralService');

class ReferralController {
  static async referCustomer(req, res, next) {
    try {
      const { customer_id, referred_email } = req.body;
      const referral = await ReferralService.referCustomer(customer_id, referred_email);
      res.status(201).json({ success: true, data: referral });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ReferralController;
```

### Step 4: Create Routes

Add to `src/routes/referralRoutes.js`:

```javascript
const express = require('express');
const ReferralController = require('../controllers/referralController');

const router = express.Router();
router.post('/', ReferralController.referCustomer);

module.exports = router;
```

### Step 5: Register Routes in App

Update `src/app.js`:

```javascript
const referralRoutes = require('./routes/referralRoutes');

// After other routes...
app.use('/api/referrals', referralRoutes);
```

### Step 6: Update Database Schema

Update `src/database/migrate.js`:

```javascript
await pool.query(`
  CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY,
    referrer_id UUID NOT NULL REFERENCES customers(id),
    referred_id UUID NOT NULL REFERENCES customers(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);
```

## Testing Your Feature

### Using cURL

```bash
curl -X POST http://localhost:3000/api/referrals \
  -H "X-API-KEY: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "uuid-1",
    "referred_email": "newcustomer@example.com"
  }'
```

### Using Postman

Create new request in Postman collection:
- Method: `POST`
- URL: `{{baseUrl}}/api/referrals`
- Header: `X-API-KEY: {{apiKey}}`
- Body (JSON): Customer ID and referred email

## Error Handling

Always use try/catch and return proper error responses:

```javascript
class ExampleService {
  static async doSomething(id) {
    try {
      const item = await Item.getById(id);
      if (!item) {
        throw new Error('Item not found');
      }
      return item;
    } catch (error) {
      logger.error('Error in doSomething:', error);
      throw error;
    }
  }
}
```

Controller catches and returns appropriate status:

```javascript
try {
  const result = await ExampleService.doSomething(id);
  res.json({ success: true, data: result });
} catch (error) {
  if (error.message.includes('not found')) {
    return res.status(404).json({ success: false, message: error.message });
  }
  next(error);
}
```

## Common Extensions

### 1. Add Email Notifications

Install `nodemailer`:

```bash
npm install nodemailer
```

Create `src/services/emailService.js`:

```javascript
const nodemailer = require('nodemailer');

class EmailService {
  static async sendPointsAdded(customer, amount) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      to: customer.email,
      subject: `You earned ${amount} points!`,
      html: `<p>Congratulations! You've earned ${amount} loyalty points.</p>`,
    });
  }
}

module.exports = EmailService;
```

Use in service:

```javascript
static async addPoints(customerId, amount) {
  const points = await Points.add(customerId, amount);
  const customer = await Customer.getById(customerId);
  await EmailService.sendPointsAdded(customer, amount);
  return points;
}
```

### 2. Add Analytics

Create `src/services/analyticsService.js`:

```javascript
class AnalyticsService {
  static async getTopCustomers(businessId, limit = 10) {
    const query = `
      SELECT c.*, p.balance
      FROM customers c
      JOIN points p ON c.id = p.customer_id
      WHERE c.business_id = $1
      ORDER BY p.balance DESC
      LIMIT $2;
    `;
    return pool.query(query, [businessId, limit]);
  }

  static async getTotalPoints(businessId) {
    const query = `
      SELECT SUM(p.balance) as total
      FROM points p
      JOIN customers c ON p.customer_id = c.id
      WHERE c.business_id = $1;
    `;
    const result = await pool.query(query, [businessId]);
    return result.rows[0].total;
  }
}

module.exports = AnalyticsService;
```

### 3. Add Webhook Support

Create `src/services/webhookService.js`:

```javascript
const fetch = require('node-fetch');

class WebhookService {
  static async notifyPointsUpdate(webhookUrl, customer, points) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'points.updated',
          customer_id: customer.id,
          points: points.balance,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      logger.error('Webhook notification failed:', error);
    }
  }
}

module.exports = WebhookService;
```

### 4. Add Rate Limiting

Install `express-rate-limit`:

```bash
npm install express-rate-limit
```

Create `src/middleware/rateLimitMiddleware.js`:

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP',
});

module.exports = limiter;
```

Use in `src/app.js`:

```javascript
const rateLimiter = require('./middleware/rateLimitMiddleware');
app.use('/api/', rateLimiter);
```

### 5. Add Pagination

Extend `src/controllers/customerController.js`:

```javascript
static async listCustomers(req, res, next) {
  try {
    const businessId = req.businessId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const customers = await Customer.getByBusinessId(businessId, limit, offset);
    const total = await Customer.countByBusinessId(businessId);

    res.json({
      success: true,
      data: customers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}
```

## Database Optimization

### Add Indexes

Update `src/database/migrate.js`:

```javascript
await pool.query(`
  CREATE INDEX IF NOT EXISTS idx_customers_email 
  ON customers(business_id, email);
  
  CREATE INDEX IF NOT EXISTS idx_points_balance 
  ON points(balance DESC);
`);
```

### Use Connection Pooling

Already done in `src/config/db.js`:

```javascript
const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
  max: 20, // Maximum number of connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## Security Best Practices

### 1. Input Validation

Use `express-validator`:

```javascript
const { body, validationResult } = require('express-validator');

router.post('/',
  body('email').isEmail(),
  body('name').trim().notEmpty(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Process request
  }
);
```

### 2. SQL Injection Prevention

Already done - using parameterized queries:

```javascript
// ✅ Safe (parameterized)
const result = await pool.query(
  'SELECT * FROM customers WHERE id = $1',
  [customerId]
);

// ❌ Unsafe (string concatenation)
const result = await pool.query(
  `SELECT * FROM customers WHERE id = '${customerId}'`
);
```

### 3. Environment Secrets

Never commit `.env` file. Use `.env.example` as template:

```bash
# .env (git ignored)
DB_PASSWORD=actual_secret

# .env.example (committed)
DB_PASSWORD=your_password
```

## Testing

### Unit Tests

Create `src/services/__tests__/customerService.test.js`:

```javascript
const CustomerService = require('../customerService');

describe('CustomerService', () => {
  test('should create customer', async () => {
    const customer = await CustomerService.createCustomer(
      'business-id',
      'John',
      'john@example.com'
    );
    expect(customer).toHaveProperty('id');
    expect(customer.name).toBe('John');
  });

  test('should reject duplicate email', async () => {
    await expect(
      CustomerService.createCustomer('business-id', 'John', 'duplicate@example.com')
    ).rejects.toThrow('already exists');
  });
});
```

Run tests:

```bash
npm test
```

### Integration Tests

Test complete workflows with actual database.

## Performance Tips

1. **Use database indexes** for frequently queried columns
2. **Limit results** with pagination
3. **Cache** frequently accessed data (Redis)
4. **Use connection pooling** (already configured)
5. **Denormalize** data when necessary for read performance

## Monitoring

Add monitoring middleware:

```javascript
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});
```

## Documentation

When adding features, update:

1. `README.md` - Add new endpoints
2. `TESTING.md` - Add examples
3. Code comments - Document complex logic

## Code Style

Follow existing patterns:

- Use async/await (not callbacks)
- Error messages are descriptive
- HTTP status codes are correct
- JSON responses always have `success` field
- Use consistent naming (camelCase for JS, snake_case for DB)

## Resources

- [Express.js Docs](https://expressjs.com/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

Happy coding! 🚀
