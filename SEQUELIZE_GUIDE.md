# Sequelize ORM Guide

Complete guide to using Sequelize ORM in the LoyalPass project.

## Table of Contents

1. [Overview](#overview)
2. [Models](#models)
3. [CRUD Operations](#crud-operations)
4. [Associations](#associations)
5. [Querying](#querying)
6. [Transactions](#transactions)
7. [Migrations](#migrations)
8. [Validation](#validation)
9. [Hooks](#hooks)

## Overview

Sequelize is a promise-based Node.js ORM for:
- **PostgreSQL, MySQL, MariaDB, SQLite, and SQL Server**
- **Type-safe queries with TypeScript support**
- **Automatic schema management and migrations**
- **Built-in transaction support**
- **Relationship management (associations)**

### Why Sequelize?

✅ Database agnostic (swap PostgreSQL ↔ SQLite)
✅ Prevents SQL injection (parameterized queries)
✅ Automatic timestamp management
✅ Built-in validation
✅ Relationship handling (belongsTo, hasMany, etc.)
✅ Transaction support for data consistency
✅ Migration system for schema versioning

## Models

Models represent database tables and are defined in `src/models/`.

### Basic Model Definition

```javascript
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Business = sequelize.define(
  'Business',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [1, 255],
      },
    },
    logo_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    brand_color: {
      type: DataTypes.STRING(7),  // Hex color #RRGGBB
      allowNull: true,
    },
    text_color: {
      type: DataTypes.STRING(7),
      allowNull: true,
    },
  },
  {
    timestamps: true,           // Adds createdAt, updatedAt
    tableName: 'businesses',    // Explicit table name
    underscored: false,         // Use camelCase in JS, snake_case in DB
  }
);

module.exports = Business;
```

### Data Types

| Type | Database | Example |
|------|----------|---------|
| STRING | VARCHAR | `DataTypes.STRING(255)` |
| TEXT | TEXT | `DataTypes.TEXT` |
| INTEGER | INT | `DataTypes.INTEGER` |
| BIGINT | BIGINT | `DataTypes.BIGINT` |
| FLOAT | FLOAT | `DataTypes.FLOAT` |
| DECIMAL | DECIMAL(10,2) | `DataTypes.DECIMAL(10, 2)` |
| BOOLEAN | BOOLEAN | `DataTypes.BOOLEAN` |
| DATE | TIMESTAMP | `DataTypes.DATE` |
| UUID | UUID / CHAR(36) | `DataTypes.UUID` |
| JSON | JSON | `DataTypes.JSON` |
| ENUM | ENUM | `DataTypes.ENUM('active', 'inactive')` |

### Model Configuration Options

```javascript
sequelize.define('Model', {
  // Field definitions
}, {
  // Options
  timestamps: true,           // Add createdAt, updatedAt
  createdAt: 'created_at',   // Custom column name for creation
  updatedAt: 'updated_at',   // Custom column name for update
  deletedAt: 'deleted_at',   // Soft delete column (paranoid: true)
  paranoid: false,           // Enable soft deletes
  tableName: 'custom_name',  // Override table name
  freezeTableName: true,     // Don't pluralize table name
  underscored: false,        // Use snake_case in database
  indexes: [
    { fields: ['email'], unique: true },
    { fields: ['business_id', 'customer_id'] },
  ],
  defaultScope: {            // Automatically applied to queries
    where: { active: true },
  },
  scopes: {                  // Reusable query filters
    inactive: {
      where: { active: false },
    },
  },
});
```

## CRUD Operations

### Create (INSERT)

```javascript
// Create single record
const business = await Business.create({
  name: 'My Coffee Shop',
  logo_url: 'https://example.com/logo.png',
  brand_color: '#FF5733',
});

// Get the created instance
console.log(business.id);    // Auto-generated UUID
console.log(business.name);  // 'My Coffee Shop'

// Create with default values
const customer = await Customer.create({
  business_id: business.id,
  name: 'John Doe',
  email: 'john@example.com',
  // Other fields use defaults
});

// Bulk create multiple records
const customers = await Customer.bulkCreate([
  { business_id: id, name: 'Alice', email: 'alice@example.com' },
  { business_id: id, name: 'Bob', email: 'bob@example.com' },
], { 
  individualHooks: true,  // Run hooks for each record
  validate: true,         // Validate before insert
});
```

### Read (SELECT)

#### Find Single Record

```javascript
// Find by primary key
const business = await Business.findByPk('550e8400-e29b-41d4-a716-446655440000');

// Find one by condition
const customer = await Customer.findOne({
  where: { email: 'john@example.com' },
});

// Find with relationship
const customerWithPoints = await Customer.findOne({
  where: { id: customerId },
  include: ['Points'],  // Include associated model
});
```

#### Find Multiple Records

```javascript
// Find all
const allBusinesses = await Business.findAll();

// Find with conditions
const activeCustomers = await Customer.findAll({
  where: { business_id: businessId },
});

// Find with filtering, sorting, pagination
const customers = await Customer.findAll({
  where: { business_id: businessId },
  attributes: ['id', 'name', 'email'],    // Select specific columns
  order: [['created_at', 'DESC']],        // Sort descending
  limit: 10,                              // Limit rows
  offset: 20,                             // Skip first 20
});

// Count records
const totalCustomers = await Customer.count({
  where: { business_id: businessId },
});

// Find and count (pagination)
const { count, rows } = await Customer.findAndCountAll({
  where: { business_id: businessId },
  limit: 10,
  offset: 0,
});
console.log(`Found ${count} total, showing ${rows.length}`);
```

### Update (UPDATE)

```javascript
// Find and update
const customer = await Customer.findByPk(customerId);
await customer.update({
  name: 'Jane Doe',
  email: 'jane@example.com',
});

// Bulk update
await Customer.update(
  { name: 'Updated Name' },
  { where: { business_id: businessId } }
);

// Increment/Decrement (for numeric fields)
const points = await Points.findOne({ where: { customer_id } });
await points.increment('balance', { by: 50 });
await points.decrement('balance', { by: 10 });

// Save changes to instance
const business = await Business.findByPk(businessId);
business.name = 'Updated Name';
await business.save();
```

### Delete (DELETE)

```javascript
// Delete single record
const customer = await Customer.findByPk(customerId);
await customer.destroy();

// Bulk delete
await Customer.destroy({
  where: { business_id: businessId },
});

// Force delete (if using soft deletes)
await customer.destroy({ force: true });

// Soft delete (sets deletedAt timestamp)
// Define model with: paranoid: true
await customer.destroy();  // Sets deletedAt
await customer.restore();  // Undelete
```

## Associations

Define relationships between models in `src/models/index.js`:

### One-to-Many (hasMany)

```javascript
const { Business, Customer } = require('./models');

// A business has many customers
Business.hasMany(Customer, {
  foreignKey: 'business_id',
  onDelete: 'CASCADE',  // Delete customers when business deleted
});

// Use in queries
const business = await Business.findByPk(businessId, {
  include: ['Customers'],  // Include related customers
});
```

### One-to-One (hasOne / belongsTo)

```javascript
const { Customer, Points } = require('./models');

// A customer has one points record
Customer.hasOne(Points, {
  foreignKey: 'customer_id',
  onDelete: 'CASCADE',
});

// Inverse: points belong to a customer
Points.belongsTo(Customer, {
  foreignKey: 'customer_id',
});

// Use in queries
const customer = await Customer.findByPk(customerId, {
  include: ['Points'],
});
```

### Many-to-Many (belongsToMany)

```javascript
const { Business, Tag } = require('./models');

// Business and Tag have many-to-many relationship
Business.belongsToMany(Tag, {
  through: 'BusinessTags',  // Junction table name
  foreignKey: 'businessId',
});

Tag.belongsToMany(Business, {
  through: 'BusinessTags',
  foreignKey: 'tagId',
});

// Query
const businessWithTags = await Business.findByPk(businessId, {
  include: ['Tags'],
});
```

## Querying

### Operators

```javascript
const { Op } = require('sequelize');

// Comparisons
Customer.findAll({
  where: {
    id: { [Op.eq]: customerId },           // Equal
    email: { [Op.ne]: 'admin@example.com' }, // Not equal
    balance: { [Op.gt]: 100 },             // Greater than
    balance: { [Op.gte]: 100 },            // Greater than or equal
    balance: { [Op.lt]: 50 },              // Less than
    balance: { [Op.lte]: 50 },             // Less than or equal
  },
});

// String operations
Customer.findAll({
  where: {
    email: { [Op.like]: '%example.com' },  // Pattern matching
    name: { [Op.startsWith]: 'John' },     // Starts with
    name: { [Op.endsWith]: 'Doe' },        // Ends with
    name: { [Op.substring]: 'oh' },        // Contains
  },
});

// Array operations
Customer.findAll({
  where: {
    status: { [Op.in]: ['active', 'pending'] },  // In list
    status: { [Op.notIn]: ['deleted'] },         // Not in list
  },
});

// Null checks
Customer.findAll({
  where: {
    phone: { [Op.is]: null },        // IS NULL
    phone: { [Op.not]: null },       // IS NOT NULL
  },
});

// Complex conditions (OR, AND)
Customer.findAll({
  where: {
    [Op.or]: [
      { email: 'john@example.com' },
      { phone: '1234567890' },
    ],
  },
});

Customer.findAll({
  where: {
    [Op.and]: [
      { business_id: businessId },
      { status: 'active' },
    ],
  },
});
```

### Raw Queries

```javascript
// Use Sequelize.literal for complex expressions
const { Sequelize } = require('sequelize');

const customers = await Customer.findAll({
  where: Sequelize.where(
    Sequelize.fn('LOWER', Sequelize.col('email')),
    Op.like,
    '%example%'
  ),
});

// Raw SQL query
const results = await sequelize.query(
  'SELECT * FROM customers WHERE email LIKE :email',
  {
    replacements: { email: '%example%' },
    type: QueryTypes.SELECT,
  }
);
```

## Transactions

Ensure data consistency across multiple operations:

```javascript
// Manual transaction
const transaction = await sequelize.transaction();

try {
  // All operations use the same transaction
  const customer = await Customer.create({
    business_id: businessId,
    name: 'John',
    email: 'john@example.com',
  }, { transaction });

  await Points.create({
    customer_id: customer.id,
    balance: 100,
  }, { transaction });

  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  throw error;
}

// Callback transaction (recommended)
const result = await sequelize.transaction(async (transaction) => {
  const customer = await Customer.create({
    business_id: businessId,
    name: 'Jane',
    email: 'jane@example.com',
  }, { transaction });

  await Points.create({
    customer_id: customer.id,
    balance: 100,
  }, { transaction });

  return customer;  // Automatically commits on success
});
```

## Migrations

Manage database schema changes:

### Create Migration

```bash
npx sequelize-cli migration:create --name add-phone-to-customers
```

Generated file: `migrations/20240115123456-add-phone-to-customers.js`

```javascript
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('customers', 'phone', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });
  },
  
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('customers', 'phone');
  },
};
```

### Run Migrations

```bash
npm run db:migrate          # Run all pending migrations
npm run db:migrate:undo     # Undo last migration
npm run db:migrate:undo:all # Undo all migrations
```

### Common Migration Operations

```javascript
// Add column
await queryInterface.addColumn('customers', 'status', {
  type: Sequelize.ENUM('active', 'inactive'),
  defaultValue: 'active',
});

// Remove column
await queryInterface.removeColumn('customers', 'phone');

// Modify column
await queryInterface.changeColumn('customers', 'email', {
  type: Sequelize.STRING(320),
  allowNull: false,
  unique: true,
});

// Add index
await queryInterface.addIndex('customers', ['email']);

// Create table
await queryInterface.createTable('tags', {
  id: {
    type: Sequelize.UUID,
    primaryKey: true,
    defaultValue: Sequelize.UUIDV4,
  },
  name: Sequelize.STRING,
  createdAt: Sequelize.DATE,
  updatedAt: Sequelize.DATE,
});

// Drop table
await queryInterface.dropTable('tags');
```

## Validation

Validate data before saving:

```javascript
const Customer = sequelize.define('Customer', {
  email: {
    type: DataTypes.STRING,
    validate: {
      isEmail: true,                       // Built-in validators
      len: [5, 255],                       // Length check
      notEmpty: true,                      // Not empty
    },
  },
  age: {
    type: DataTypes.INTEGER,
    validate: {
      min: 0,
      max: 150,
      isNumeric: true,
    },
  },
  custom_field: {
    type: DataTypes.STRING,
    validate: {
      customValidator(value) {            // Custom validator
        if (value && value.length < 3) {
          throw new Error('Must be at least 3 characters');
        }
      },
    },
  },
});
```

### Built-in Validators

```javascript
validate: {
  isEmail: true,              // Valid email
  isUrl: true,                // Valid URL
  isNumeric: true,            // Only numbers
  isAlpha: true,              // Only letters
  isAlphanumeric: true,       // Letters and numbers
  isUppercase: true,          // All uppercase
  isLowercase: true,          // All lowercase
  is: /^[0-9]+$/,             // Regex match
  isDate: true,               // Valid date
  isBefore: '2024-12-31',     // Date is before
  isAfter: '2024-01-01',      // Date is after
  isIn: ['active', 'inactive'],  // In list
  notIn: ['admin', 'system'], // Not in list
  len: [3, 50],               // Min and max length
  min: 18,                    // Minimum value
  max: 100,                   // Maximum value
  notEmpty: true,             // Not empty string
  notNull: true,              // Not null
  equals: 'value',            // Exact match
  contains: 'substring',      // Contains substring
  matches: /regex/,           // Regex match
}
```

## Hooks

Execute code at specific points in model lifecycle:

```javascript
// Before create
Customer.beforeCreate((customer, options) => {
  customer.email = customer.email.toLowerCase();
});

// After create
Customer.afterCreate((customer, options) => {
  console.log(`Customer created: ${customer.id}`);
});

// Before update
Customer.beforeUpdate((customer, options) => {
  // Validation before update
});

// Before destroy
Customer.beforeDestroy((customer, options) => {
  // Cleanup before delete
});

// Define in model
const Customer = sequelize.define(
  'Customer',
  { /* fields */ },
  {
    hooks: {
      beforeCreate: (customer) => {
        customer.email = customer.email.toLowerCase();
      },
      afterCreate: (customer) => {
        console.log(`Created: ${customer.name}`);
      },
    },
  }
);
```

### Available Hooks

- `beforeValidate`, `afterValidate`
- `beforeCreate`, `afterCreate`
- `beforeUpdate`, `afterUpdate`
- `beforeDestroy`, `afterDestroy`
- `beforeRestore`, `afterRestore`
- `beforeSave`, `afterSave` (create + update)
- `beforeFind`
- `beforeBulkCreate`, `afterBulkCreate`
- `beforeBulkUpdate`, `afterBulkUpdate`
- `beforeBulkDestroy`, `afterBulkDestroy`

## Best Practices

### 1. Use Models Index for Centralized Access

```javascript
// Good
const { Customer, Business } = require('./models');

// Avoid
const Customer = require('./models/Customer');
```

### 2. Always Use Transactions for Multi-Step Operations

```javascript
// Good
await sequelize.transaction(async (t) => {
  await Customer.create({...}, { transaction: t });
  await Points.create({...}, { transaction: t });
});

// Avoid
await Customer.create({...});
await Points.create({...});  // If Points fails, Customer is orphaned
```

### 3. Use Raw Attributes to Exclude Sensitive Data

```javascript
// Exclude password when querying
await User.findAll({
  attributes: { exclude: ['password'] },
});
```

### 4. Use Eager Loading to Avoid N+1 Queries

```javascript
// Good - Single query with JOIN
const customers = await Customer.findAll({
  include: ['Business', 'Points'],
});

// Avoid - Multiple queries
const customers = await Customer.findAll();
for (const customer of customers) {
  customer.business = await Business.findByPk(customer.business_id);
  customer.points = await Points.findByPk(customer.id);
}
```

### 5. Use Model Scopes for Common Filters

```javascript
// Define scope
Customer.addScope('active', {
  where: { active: true },
});

// Use scope
const activeCustomers = await Customer.scope('active').findAll();
```

---

**Last Updated**: 2024
**Sequelize Version**: 6.35.2+
**Node.js Version**: 18+
