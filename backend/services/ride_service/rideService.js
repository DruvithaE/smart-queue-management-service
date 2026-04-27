// Service Layer Pattern:
// All business logic and DB queries live here.
// Controllers stay thin and just handle HTTP concerns.

const { pool } = require('../../config/db');

const VALID_STATUSES = ['OPEN', 'CLOSED', 'MAINTENANCE', 'FULL'];

const getAllRides = async () => {
  const result = await pool.query('SELECT * FROM rides ORDER BY id');
  return result.rows;
};

const getRideById = async (id) => {
  const result = await pool.query('SELECT * FROM rides WHERE id = $1', [id]);
  return result.rows[0] || null;
};

const createRide = async ({ name, description, capacity, duration, status = 'OPEN' }) => {
  if (!name || !capacity || !duration) {
    throw new Error('name, capacity, and duration are required');
  }
  if (!VALID_STATUSES.includes(status)) {
    throw new Error(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  }
  const result = await pool.query(
    `INSERT INTO rides (name, description, capacity, duration, status)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name, description || null, capacity, duration, status]
  );
  return result.rows[0];
};

const updateRideStatus = async (id, status) => {
  if (!VALID_STATUSES.includes(status)) {
    throw new Error(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  }
  const result = await pool.query(
    'UPDATE rides SET status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  );
  return result.rows[0] || null;
};

const updateRide = async (id, name, description, capacity, duration, status) => {
  // validation
  if (!name || !capacity || !duration || !status) {
    throw new Error('name, capacity, duration, and status are required');
  }

  if (!VALID_STATUSES.includes(status)) {
    throw new Error(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  const result = await pool.query(
    `UPDATE rides
     SET name = $1,
         description = $2,
         capacity = $3,
         duration = $4,
         status = $5
     WHERE id = $6
     RETURNING *`,
    [name, description || null, capacity, duration, status, id]
  );

  return result.rows[0] || null;
};

const deleteRide = async (id) => {
  const result = await pool.query('DELETE FROM rides WHERE id = $1 RETURNING *', [id]);
  return result.rows[0] || null;
};

const getAdminDashboard = async () => {
  const rides = await getAllRides();
  return {
    total_rides: rides.length,
    open_rides: rides.filter(r => r.status === 'OPEN').length,
    closed_rides: rides.filter(r => r.status === 'CLOSED').length,
    maintenance_rides: rides.filter(r => r.status === 'MAINTENANCE').length,
    full_rides: rides.filter(r => r.status === 'FULL').length,
    total_capacity: rides.reduce((sum, r) => sum + Number(r.capacity), 0),
    rides,
  };
};

module.exports = {
  getAllRides,
  getRideById,
  createRide,
  updateRideStatus,
  deleteRide,
  getAdminDashboard,
  updateRide,
};