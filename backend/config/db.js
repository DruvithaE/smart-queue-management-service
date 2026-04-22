const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'smart_queue_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '1234',
});

// Creates the rides table if it doesn't exist yet
const initTable = async () => {
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
  console.log('Rides table ready');
};

module.exports = { pool, initTable };