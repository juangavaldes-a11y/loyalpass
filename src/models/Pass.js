const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class Pass {
  /**
   * Create a new pass
   */
  static async create(businessId, customerId, applePassSerial, googlePassObjectId) {
    const id = uuidv4();
    const createdAt = new Date();

    const query = `
      INSERT INTO passes (id, business_id, customer_id, apple_pass_serial, google_pass_object_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const result = await pool.query(query, [
      id,
      businessId,
      customerId,
      applePassSerial,
      googlePassObjectId,
      createdAt,
    ]);

    return result.rows[0];
  }

  /**
   * Get pass by ID
   */
  static async getById(id) {
    const query = 'SELECT * FROM passes WHERE id = $1;';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get pass by customer ID
   */
  static async getByCustomerId(customerId) {
    const query = 'SELECT * FROM passes WHERE customer_id = $1;';
    const result = await pool.query(query, [customerId]);
    return result.rows[0] || null;
  }

  /**
   * Get passes by business ID
   */
  static async getByBusinessId(businessId) {
    const query = 'SELECT * FROM passes WHERE business_id = $1;';
    const result = await pool.query(query, [businessId]);
    return result.rows;
  }

  /**
   * Update pass
   */
  static async update(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (
        [
          'apple_pass_serial',
          'google_pass_object_id',
          'apple_push_token',
        ].includes(key)
      ) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = $${paramCount}`);
    values.push(new Date());
    values.push(id);

    const query = `
      UPDATE passes
      SET ${fields.join(', ')}
      WHERE id = $${paramCount + 1}
      RETURNING *;
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Delete pass
   */
  static async delete(id) {
    const query = 'DELETE FROM passes WHERE id = $1 RETURNING *;';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }
}

module.exports = Pass;
