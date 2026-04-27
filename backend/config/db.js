const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'smart_queue_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '1234',
});

// Creates tables if they don't exist yet
const initTable = async () => {
  try {
    // Rides table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rides (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        capacity INTEGER NOT NULL CHECK (capacity > 0),
        duration NUMERIC(5,2) NOT NULL CHECK (duration > 0),
        status VARCHAR(20) NOT NULL DEFAULT 'OPEN'
          CHECK (status IN ('OPEN', 'CLOSED', 'MAINTENANCE', 'FULL'))
      );
    `);

    // Queue entries table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS queue_entries (
        id SERIAL PRIMARY KEY,
        ride_id INTEGER NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
        user_id VARCHAR(128) NOT NULL,
        priority BOOLEAN NOT NULL DEFAULT FALSE,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
          CHECK (status IN ('ACTIVE', 'LEFT', 'SERVED')),
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        left_at TIMESTAMPTZ
      );
    `);

    // Queue indexes
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_active_queue_user_per_ride
      ON queue_entries(ride_id, user_id)
      WHERE status = 'ACTIVE';
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_queue_active_order
      ON queue_entries(ride_id, status, priority DESC, joined_at ASC, id ASC);
    `);

    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'customer')),
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Users index
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    console.log('All tables ready');
  } catch (err) {
    console.error('Error initializing tables:', err);
    throw err;
  }
};

module.exports = { pool, initTable };