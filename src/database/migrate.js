const pool = require('../config/db');
const logger = require('../utils/logger');

const initializeDatabase = async () => {
  try {
    logger.info('Initializing database tables...');

    // Create businesses table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS businesses (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        logo_url TEXT,
        brand_color VARCHAR(7),
        text_color VARCHAR(7),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    logger.info('✓ Businesses table created');

    // Create customers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY,
        business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(business_id, email)
      );
    `);
    logger.info('✓ Customers table created');

    // Create points table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS points (
        id UUID PRIMARY KEY,
        customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        balance INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(customer_id)
      );
    `);
    logger.info('✓ Points table created');

    // Create passes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS passes (
        id UUID PRIMARY KEY,
        business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        apple_pass_serial VARCHAR(255),
        google_pass_object_id VARCHAR(255),
        apple_push_token VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(customer_id)
      );
    `);
    logger.info('✓ Passes table created');

    // Create api_keys table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY,
        business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        key VARCHAR(255) NOT NULL UNIQUE,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    logger.info('✓ API Keys table created');

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_business_id ON customers(business_id);
      CREATE INDEX IF NOT EXISTS idx_points_customer_id ON points(customer_id);
      CREATE INDEX IF NOT EXISTS idx_passes_business_id ON passes(business_id);
      CREATE INDEX IF NOT EXISTS idx_passes_customer_id ON passes(customer_id);
      CREATE INDEX IF NOT EXISTS idx_api_keys_business_id ON api_keys(business_id);
      CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
    `);
    logger.info('✓ Indexes created');

    logger.info('Database initialized successfully!');
  } catch (error) {
    logger.error('Error initializing database:', error);
    throw error;
  }
};

// Run migration if called directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      pool.end();
      process.exit(0);
    })
    .catch((error) => {
      pool.end();
      process.exit(1);
    });
}

module.exports = initializeDatabase;
