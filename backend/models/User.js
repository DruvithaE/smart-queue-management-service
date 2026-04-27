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
    const query = `
      SELECT 
        id, email, role, name,
        member1, member2, member3, member4,
        no_of_members,
        past_rides,
        created_at
      FROM users 
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  async addPastRide(userId, rideData) {
    const query = `
      UPDATE users
      SET past_rides = COALESCE(past_rides, '[]'::jsonb) || $1::jsonb,
          updated_at = NOW()
      WHERE id = $2
      RETURNING id, past_rides
    `;

    const result = await pool.query(query, [
      JSON.stringify([rideData]),
      userId,
    ]);

    return result.rows[0];
  },
  async updateMembers(userId, member1, member2, member3, member4) {
  const query = `
    UPDATE users
    SET member1 = $1,
        member2 = $2,
        member3 = $3,
        member4 = $4,
        updated_at = NOW()
    WHERE id = $5
    RETURNING id, email, role, name, member1, member2, member3, member4, no_of_members, past_rides
  `;

  const result = await pool.query(query, [
    member1 || null,
    member2 || null,
    member3 || null,
    member4 || null,
    userId,
  ]);

  return result.rows[0];
},
  async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
};

module.exports = User;