const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class Customer {
  /**
   * Create a new customer
   */
  static async create(businessId, name, email) {
    const id = uuidv4();
    const createdAt = new Date();

    const query = `
      INSERT INTO customers (id, business_id, name, email, created_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const result = await pool.query(query, [
      id,
      businessId,
      name,
      email,
      createdAt,
    ]);

    return result.rows[0];
  }

  /**
   * Get customer by ID
   */
  static async getById(id) {
    const query = 'SELECT * FROM customers WHERE id = $1;';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get customers by business ID
   */
  static async getByBusinessId(businessId) {
    const query = 'SELECT * FROM customers WHERE business_id = $1;';
    const result = await pool.query(query, [businessId]);
    return result.rows;
  }

  /**
   * Get customer by email in a business
   */
  static async getByEmail(businessId, email) {
    const query =
      'SELECT * FROM customers WHERE business_id = $1 AND email = $2;';
    const result = await pool.query(query, [businessId, email]);
    return result.rows[0] || null;
  }

  /**
   * Update customer
   */
  static async update(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (['name', 'email'].includes(key)) {
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
      UPDATE customers
      SET ${fields.join(', ')}
      WHERE id = $${paramCount + 1}
      RETURNING *;
    `;

    const result = await pool.query(query, value);
    return result.rows[0] || null;
  }

  /**
   * Delete customer
   */
  static async delete(id) {
    const query = 'DELETE FROM customers WHERE id = $1 RETURNING *;';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }
}

module.exports = Customer;
