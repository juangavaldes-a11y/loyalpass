# LoyalPass API Testing Guide

Complete example workflows for testing the loyalty platform.

## 1. Initial Setup

### Step 1: Start the server

```bash
npm run dev
```

Server runs on `http://localhost:3000`

### Step 2: Initialize database

```bash
npm run migrate
```

All tables are created automatically.

### Step 3: Verify server is running

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-04T10:30:00Z"
}
```

## 2. Complete Workflow Example

### 2.1 Create a Business

**Request:**
```bash
curl -X POST http://localhost:3000/api/businesses \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Coffee Corner",
    "logo_url": "https://example.com/logo.png",
    "brand_color": "#8B4513",
    "text_color": "#FFFFFF"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "business": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Coffee Corner",
      "logo_url": "https://example.com/logo.png",
      "brand_color": "#8B4513",
      "text_color": "#FFFFFF",
      "created_at": "2026-02-04T10:30:00Z"
    },
    "apiKey": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
  }
}
```

**Save these values:**
- `business.id` = `550e8400-e29b-41d4-a716-446655440000`
- `apiKey` = `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`

### 2.2 Get Business Details

**Request:**
```bash
curl -X GET http://localhost:3000/api/businesses/550e8400-e29b-41d4-a716-446655440000 \
  -H "X-API-KEY: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Coffee Corner",
    "logo_url": "https://example.com/logo.png",
    "brand_color": "#8B4513",
    "text_color": "#FFFFFF",
    "created_at": "2026-02-04T10:30:00Z"
  }
}
```

### 2.3 Create a Customer

**Request:**
```bash
curl -X POST http://localhost:3000/api/customers \
  -H "X-API-KEY: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Johnson",
    "email": "alice@example.com"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "business_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "created_at": "2026-02-04T10:31:00Z"
  }
}
```

**Save:**
- `customer.id` = `660e8400-e29b-41d4-a716-446655440001`

### 2.4 Check Customer Points

**Request:**
```bash
curl -X GET http://localhost:3000/api/points/660e8400-e29b-41d4-a716-446655440001 \
  -H "X-API-KEY: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "customer_id": "660e8400-e29b-41d4-a716-446655440001",
    "balance": 0,
    "updated_at": "2026-02-04T10:31:00Z"
  }
}
```

### 2.5 Create Wallet Pass (Apple & Google)

**Request:**
```bash
curl -X POST http://localhost:3000/api/passes/create \
  -H "X-API-KEY: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "660e8400-e29b-41d4-a716-446655440001"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pass": {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "business_id": "550e8400-e29b-41d4-a716-446655440000",
      "customer_id": "660e8400-e29b-41d4-a716-446655440001",
      "apple_pass_serial": "550e8400-abc-def",
      "google_pass_object_id": "3388000000022876589.660e8400-e2",
      "created_at": "2026-02-04T10:32:00Z"
    },
    "applePassSerial": "550e8400-abc-def",
    "googlePassObjectId": "3388000000022876589.660e8400-e2"
  }
}
```

### 2.6 Get Pass Details

**Request:**
```bash
curl -X GET http://localhost:3000/api/passes/660e8400-e29b-41d4-a716-446655440001 \
  -H "X-API-KEY: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "business_id": "550e8400-e29b-41d4-a716-446655440000",
    "customer_id": "660e8400-e29b-41d4-a716-446655440001",
    "apple_pass_serial": "550e8400-abc-def",
    "google_pass_object_id": "3388000000022876589.660e8400-e2",
    "created_at": "2026-02-04T10:32:00Z"
  }
}
```

### 2.7 Add Points to Customer

**Scenario:** Customer makes a purchase and earns 50 points

**Request:**
```bash
curl -X POST http://localhost:3000/api/points/add \
  -H "X-API-KEY: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "660e8400-e29b-41d4-a716-446655440001",
    "amount": 50
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "customer_id": "660e8400-e29b-41d4-a716-446655440001",
    "balance": 50,
    "updated_at": "2026-02-04T10:33:00Z"
  },
  "message": "50 points added successfully"
}
```

### 2.8 Add More Points

**Request:**
```bash
curl -X POST http://localhost:3000/api/points/add \
  -H "X-API-KEY: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "660e8400-e29b-41d4-a716-446655440001",
    "amount": 75
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 125,
    "updated_at": "2026-02-04T10:34:00Z"
  },
  "message": "75 points added successfully"
}
```

### 2.9 Check Updated Balance

**Request:**
```bash
curl -X GET http://localhost:3000/api/points/660e8400-e29b-41d4-a716-446655440001 \
  -H "X-API-KEY: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 125,
    "updated_at": "2026-02-04T10:34:00Z"
  }
}
```

### 2.10 Redeem Points

**Scenario:** Customer redeems 50 points for a free drink

**Request:**
```bash
curl -X POST http://localhost:3000/api/points/redeem \
  -H "X-API-KEY: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "660e8400-e29b-41d4-a716-446655440001",
    "amount": 50
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "customer_id": "660e8400-e29b-41d4-a716-446655440001",
    "balance": 75,
    "updated_at": "2026-02-04T10:35:00Z"
  },
  "message": "50 points redeemed successfully"
}
```

## 3. Multi-Customer Example

Create multiple customers:

```bash
# Customer 2
curl -X POST http://localhost:3000/api/customers \
  -H "X-API-KEY: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bob Smith",
    "email": "bob@example.com"
  }'

# Customer 3
curl -X POST http://localhost:3000/api/customers \
  -H "X-API-KEY: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Carol Davis",
    "email": "carol@example.com"
  }'
```

List all customers:

```bash
curl -X GET http://localhost:3000/api/customers \
  -H "X-API-KEY: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
```

## 4. API Key Management

### Get All API Keys for Business

```bash
curl -X GET http://localhost:3000/api/businesses/550e8400-e29b-41d4-a716-446655440000/api-keys \
  -H "X-API-KEY: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
```

### Create Additional API Key

```bash
curl -X POST http://localhost:3000/api/businesses/550e8400-e29b-41d4-a716-446655440000/api-keys \
  -H "X-API-KEY: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
```

### Rotate API Key

```bash
curl -X POST http://localhost:3000/api/businesses/550e8400-e29b-41d4-a716-446655440000/api-keys/rotate \
  -H "X-API-KEY: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
```

## 5. Error Scenarios

### Missing API Key

**Request:**
```bash
curl -X GET http://localhost:3000/api/customers
```

**Response:**
```json
{
  "success": false,
  "message": "API key is required. Use X-API-KEY header."
}
```

### Invalid API Key

**Request:**
```bash
curl -X GET http://localhost:3000/api/customers \
  -H "X-API-KEY: invalid_key"
```

**Response:**
```json
{
  "success": false,
  "message": "Invalid or inactive API key"
}
```

### Duplicate Customer Email

**Request:**
```bash
curl -X POST http://localhost:3000/api/customers \
  -H "X-API-KEY: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Another Alice",
    "email": "alice@example.com"
  }'
```

**Response:**
```json
{
  "success": false,
  "message": "Customer with this email already exists"
}
```

### Insufficient Points

**Request:**
```bash
curl -X POST http://localhost:3000/api/points/redeem \
  -H "X-API-KEY: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "660e8400-e29b-41d4-a716-446655440001",
    "amount": 1000
  }'
```

**Response:**
```json
{
  "success": false,
  "message": "Insufficient points. Current balance: 75"
}
```

## 6. Using Postman

1. **Create a new Collection** called "LoyalPass API"

2. **Create an Environment** with variables:
   - `baseUrl` = `http://localhost:3000`
   - `apiKey` = your API key from step 2.1
   - `businessId` = business ID from step 2.1
   - `customerId` = customer ID from step 2.3

3. **Create requests** using these URLs:
   - `{{baseUrl}}/api/businesses`
   - `{{baseUrl}}/api/customers`
   - `{{baseUrl}}/api/passes/create`
   - `{{baseUrl}}/api/points/add`
   - `{{baseUrl}}/api/points/redeem`

4. **Add header** to all requests except business creation:
   - Key: `X-API-KEY`
   - Value: `{{apiKey}}`

## 7. Database Queries

Check database directly:

```sql
-- Connect to database
psql -U postgres -d loyalpass

-- View all businesses
SELECT * FROM businesses;

-- View all customers for a business
SELECT * FROM customers WHERE business_id = 'uuid-here';

-- View all points
SELECT * FROM points;

-- View all passes
SELECT * FROM passes;

-- View all API keys
SELECT id, business_id, active, created_at FROM api_keys;
```

## Summary

Your loyalty system now supports:

✅ Creating businesses with branding
✅ Adding customers to businesses
✅ Generating wallet passes (Apple & Google)
✅ Managing points (add, redeem, check balance)
✅ API key authentication and management
✅ Multi-tenant data isolation
✅ Secure API endpoints

Ready to integrate with your frontend!
