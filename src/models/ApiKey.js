const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class ApiKey {
  /**
   * Create API key for business
   */
  static async create(businessId) {
    const id = uuidv4();
    const key = crypto.randomBytes(32).toString('hex');
    const createdAt = new Date();

    const query = `
      INSERT INTO api_keys (id, business_id, key, active, created_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, business_id, key, active, created_at;
    `;

    const result = await pool.query(query, [id, businessId, key, true, createdAt]);
    return result.rows[0];
  }

  /**
   * Get API key by key string
   */
  static async getByKey(key) {
    const query = 'SELECT * FROM api_keys WHERE key = $1 AND active = true;';
    const result = await pool.query(query, [key]);
    return result.rows[0] || null;
  }

  /**
   * Get API keys by business ID
   */
  static async getByBusinessId(businessId) {
    const query = 'SELECT id, business_id, active, created_at FROM api_keys WHERE business_id = $1;';
    const result = await pool.query(query, [businessId]);
    return result.rows;
  }

  /**
   * Deactivate API key
   */
  static async deactivate(keyId) {
    const query = `
      UPDATE api_keys
      SET active = false
      WHERE id = $1
      RETURNING id, business_id, active;
    `;

    const result = await pool.query(query, [keyId]);
    return result.rows[0] || null;
  }

  /**
   * Activate API key
   */
  static async activate(keyId) {
    const query = `
      UPDATE api_keys
      SET active = true
      WHERE id = $1
      RETURNING id, business_id, active;
    `;

    const result = await pool.query(query, [keyId]);
    return result.rows[0] || null;
  }

  /**
   * Rotate API key (deactivate old, create new)
   */
  static async rotate(businessId) {
    // Deactivate all existing keys
    await pool.query(
      'UPDATE api_keys SET active = false WHERE business_id = $1',
      [businessId]
    );

    // Create new key
    return this.create(businessId);
  }
}

module.exports = ApiKey;
