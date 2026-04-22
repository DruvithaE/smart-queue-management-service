const request = require('supertest');
const app = require('../app');
const { pool, initTable } = require('../config/db');

// ─── Setup & Teardown ───────────────────────────────────────────────────────

beforeAll(async () => {
  await initTable();
});

beforeEach(async () => {
  // Clean rides table before each test for isolation
  await pool.query('DELETE FROM rides');
  await pool.query('ALTER SEQUENCE rides_id_seq RESTART WITH 1');
});

afterAll(async () => {
  await pool.end();
});

// ─── Helper ─────────────────────────────────────────────────────────────────

const createSampleRide = (overrides = {}) =>
  request(app).post('/rides').send({
    name: 'Thunder Falls',
    description: 'A thrilling water ride',
    capacity: 48,
    duration: 4.5,
    status: 'OPEN',
    ...overrides,
  });

// ─── Ride CRUD Tests ─────────────────────────────────────────────────────────

test('POST /rides - create a ride', async () => {
  const res = await createSampleRide();
  expect(res.status).toBe(201);
  expect(res.body.name).toBe('Thunder Falls');
  expect(res.body.capacity).toBe(48);
  expect(Number(res.body.duration)).toBe(4.5);
  expect(res.body.status).toBe('OPEN');
  expect(res.body.id).toBeDefined();
});

test('GET /rides - get all rides', async () => {
  await createSampleRide({ name: 'Ride A' });
  await createSampleRide({ name: 'Ride B' });
  const res = await request(app).get('/rides');
  expect(res.status).toBe(200);
  expect(res.body.length).toBe(2);
});

test('GET /rides/:id - get ride by id', async () => {
  const created = (await createSampleRide()).body;
  const res = await request(app).get(`/rides/${created.id}`);
  expect(res.status).toBe(200);
  expect(res.body.id).toBe(created.id);
  expect(res.body.capacity).toBe(48);
  expect(res.body.status).toBe('OPEN');
});

test('GET /rides/:id - returns 404 for missing ride', async () => {
  const res = await request(app).get('/rides/9999');
  expect(res.status).toBe(404);
});

test('GET /rides/getRideDetails/:id - alias route works', async () => {
  const created = (await createSampleRide()).body;
  const res = await request(app).get(`/rides/getRideDetails/${created.id}`);
  expect(res.status).toBe(200);
  expect(res.body.capacity).toBe(48);
  expect(Number(res.body.duration)).toBe(4.5);
});

test('PUT /rides/:id/status - update ride status', async () => {
  const created = (await createSampleRide()).body;
  const res = await request(app).put(`/rides/${created.id}/status`).send({ status: 'CLOSED' });
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('CLOSED');
});

test('PUT /rides/updateRideStatus/:id - alias route works', async () => {
  const created = (await createSampleRide()).body;
  const res = await request(app).put(`/rides/updateRideStatus/${created.id}`).send({ status: 'MAINTENANCE' });
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('MAINTENANCE');
});

test('PUT /rides/:id/status - rejects invalid status', async () => {
  const created = (await createSampleRide()).body;
  const res = await request(app).put(`/rides/${created.id}/status`).send({ status: 'BROKEN' });
  expect(res.status).toBe(400);
});

test('DELETE /rides/:id - delete a ride', async () => {
  const created = (await createSampleRide()).body;
  const res = await request(app).delete(`/rides/${created.id}`);
  expect(res.status).toBe(204);
  const check = await request(app).get(`/rides/${created.id}`);
  expect(check.status).toBe(404);
});

// ─── Admin Dashboard Tests ───────────────────────────────────────────────────

test('GET /admin/dashboard - empty dashboard', async () => {
  const res = await request(app).get('/admin/dashboard');
  expect(res.status).toBe(200);
  expect(res.body.total_rides).toBe(0);
  expect(res.body.total_capacity).toBe(0);
});

test('GET /admin/dashboard - correct counts', async () => {
  await createSampleRide({ name: 'R1', capacity: 50, status: 'OPEN' });
  await createSampleRide({ name: 'R2', capacity: 30, status: 'CLOSED' });
  await createSampleRide({ name: 'R3', capacity: 20, status: 'MAINTENANCE' });
  await createSampleRide({ name: 'R4', capacity: 40, status: 'FULL' });

  const res = await request(app).get('/admin/dashboard');
  expect(res.status).toBe(200);
  expect(res.body.total_rides).toBe(4);
  expect(res.body.open_rides).toBe(1);
  expect(res.body.closed_rides).toBe(1);
  expect(res.body.maintenance_rides).toBe(1);
  expect(res.body.full_rides).toBe(1);
  expect(res.body.total_capacity).toBe(140);
});

test('GET /admin/adminDashboard - alias route works', async () => {
  const res = await request(app).get('/admin/adminDashboard');
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('total_rides');
});

// ─── Data Consistency Tests ──────────────────────────────────────────────────

test('Rejects ride with missing name', async () => {
  const res = await request(app).post('/rides').send({ capacity: 10, duration: 3 });
  expect(res.status).toBe(400);
});

test('Status change persists in DB', async () => {
  const created = (await createSampleRide()).body;
  await request(app).put(`/rides/${created.id}/status`).send({ status: 'FULL' });
  const fetched = await request(app).get(`/rides/${created.id}`);
  expect(fetched.body.status).toBe('FULL');
});