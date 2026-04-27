const { pool } = require("../config/db");
const bcrypt = require("bcryptjs");

const User = {
  async create(email, password, role, name) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO users (email, password, role, name, created_at) 
      VALUES ($1, $2, $3, $4, NOW()) 
      RETURNING id, email, role, name
    `;
    const result = await pool.query(query, [email, hashedPassword, role, name]);
    return result.rows[0];
  },

  async findByEmail(email) {
    const query = `SELECT * FROM users WHERE email = $1`;
    const result = await pool.query(query, [email]);
    return result.rows[0];
  },

  async findById(id) {
    const query = `SELECT id, email, role, name, created_at FROM users WHERE id = $1`;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
};

module.exports = User;