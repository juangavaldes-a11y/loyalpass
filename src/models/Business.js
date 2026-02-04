const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class Business {
  /**
   * Create a new business
   */
  static async create(name, logoUrl, brandColor, textColor) {
    const id = uuidv4();
    const createdAt = new Date();

    const query = `
      INSERT INTO businesses (id, name, logo_url, brand_color, text_color, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const result = await pool.query(query, [
      id,
      name,
      logoUrl,
      brandColor,
      textColor,
      createdAt,
    ]);

    return result.rows[0];
  }

  /**
   * Get business by ID
   */
  static async getById(id) {
    const query = 'SELECT * FROM businesses WHERE id = $1;';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get all businesses
   */
  static async getAll() {
    const query = 'SELECT * FROM businesses;';
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Update business
   */
  static async update(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (
        ['name', 'logo_url', 'brand_color', 'text_color'].includes(key)
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
      UPDATE businesses
      SET ${fields.join(', ')}
      WHERE id = $${paramCount + 1}
      RETURNING *;
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Delete business
   */
  static async delete(id) {
    const query = 'DELETE FROM businesses WHERE id = $1 RETURNING *;';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }
}

module.exports = Business;
