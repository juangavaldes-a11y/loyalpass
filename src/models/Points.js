const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class Points {
  /**
   * Create points record for customer
   */
  static async create(customerId, balance = 0) {
    const id = uuidv4();
    const updatedAt = new Date();

    const query = `
      INSERT INTO points (id, customer_id, balance, updated_at)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    const result = await pool.query(query, [id, customerId, balance, updatedAt]);
    return result.rows[0];
  }

  /**
   * Get points by customer ID
   */
  static async getByCustomerId(customerId) {
    const query = 'SELECT * FROM points WHERE customer_id = $1;';
    const result = await pool.query(query, [customerId]);
    return result.rows[0] || null;
  }

  /**
   * Add points to customer
   */
  static async add(customerId, amount) {
    const query = `
      UPDATE points
      SET balance = balance + $1, updated_at = $2
      WHERE customer_id = $3
      RETURNING *;
    `;

    const result = await pool.query(query, [
      amount,
      new Date(),
      customerId,
    ]);

    return result.rows[0] || null;
  }

  /**
   * Redeem points from customer
   */
  static async redeem(customerId, amount) {
    const query = `
      UPDATE points
      SET balance = CASE 
                     WHEN balance >= $1 THEN balance - $1
                     ELSE balance
                   END,
          updated_at = $2
      WHERE customer_id = $3
      RETURNING *;
    `;

    const result = await pool.query(query, [
      amount,
      new Date(),
      customerId,
    ]);

    return result.rows[0] || null;
  }

  /**
   * Set balance
   */
  static async setBalance(customerId, balance) {
    const query = `
      UPDATE points
      SET balance = $1, updated_at = $2
      WHERE customer_id = $3
      RETURNING *;
    `;

    const result = await pool.query(query, [
      balance,
      new Date(),
      customerId,
    ]);

    return result.rows[0] || null;
  }

  /**
   * Get all points for a business
   */
  static async getByBusinessId(businessId) {
    const query = `
      SELECT p.* FROM points p
      JOIN customers c ON p.customer_id = c.id
      WHERE c.business_id = $1;
    `;

    const result = await pool.query(query, [businessId]);
    return result.rows;
  }
}

module.exports = Points;
