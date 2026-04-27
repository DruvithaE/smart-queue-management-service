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
    // Queue entries table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS queue_entries (
        id SERIAL PRIMARY KEY,
        ride_id INTEGER NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
        user_id VARCHAR(128) NOT NULL,
        priority BOOLEAN NOT NULL DEFAULT FALSE,

        group_size INTEGER NOT NULL DEFAULT 1 CHECK (group_size >= 1 AND group_size <= 5),
        selected_members JSONB DEFAULT '[]'::jsonb,

        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
          CHECK (status IN ('ACTIVE', 'LEFT', 'SERVED')),
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        left_at TIMESTAMPTZ
      );
    `);
      await pool.query(`
      ALTER TABLE queue_entries
      ADD COLUMN IF NOT EXISTS group_size INTEGER NOT NULL DEFAULT 1 CHECK (group_size >= 1 AND group_size <= 5);
    `);

    await pool.query(`
      ALTER TABLE queue_entries
      ADD COLUMN IF NOT EXISTS selected_members JSONB DEFAULT '[]'::jsonb;
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

        member1 VARCHAR(255),
        member2 VARCHAR(255),
        member3 VARCHAR(255),
        member4 VARCHAR(255),

        no_of_members INTEGER DEFAULT 0,

        past_rides JSONB DEFAULT '[]'::jsonb,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE OR REPLACE FUNCTION update_no_of_members()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.no_of_members :=
          (CASE WHEN NEW.member1 IS NOT NULL AND NEW.member1 <> '' THEN 1 ELSE 0 END) +
          (CASE WHEN NEW.member2 IS NOT NULL AND NEW.member2 <> '' THEN 1 ELSE 0 END) +
          (CASE WHEN NEW.member3 IS NOT NULL AND NEW.member3 <> '' THEN 1 ELSE 0 END) +
          (CASE WHEN NEW.member4 IS NOT NULL AND NEW.member4 <> '' THEN 1 ELSE 0 END);

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await pool.query(`
    DROP TRIGGER IF EXISTS trg_update_no_of_members ON users;
    `);

    await pool.query(`
    CREATE TRIGGER trg_update_no_of_members
    BEFORE INSERT OR UPDATE OF member1, member2, member3, member4
    ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_no_of_members();
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