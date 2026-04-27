const request = require('supertest');
const app = require('../app');
const { pool } = require('../config/db');
const notificationService = require('../services/notification_service/notificationService');

describe('USABILITY: Fast & Easy User Interaction', () => {

  beforeAll(async () => {
    // Mock notification service
    notificationService.setIO({
      to: () => ({ emit: () => {} })
    });

    // Ensure rides exist
    const rideIds = [1, 2, 3, 4, 5];
    for (const rideId of rideIds) {
      await pool.query(
        `INSERT INTO rides (id, name, description, capacity, duration, status) 
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING`,
        [rideId, `Test Ride ${rideId}`, `Usability test ride`, 100, 5, 'OPEN']
      );
    }
  });

  beforeEach(async () => {
    // Clean queue entries before each test
    await pool.query('DELETE FROM queue_entries');
  });

  // ❌ Do NOT close pool here (handled in another test file)

  // UF-001: API response time ≤ 300 ms
  test('UF-001: joinQueue response time ≤ 300 ms', async () => {
    const start = Date.now();

    const res = await request(app)
      .post('/queue/joinQueue')
      .send({ userId: 'U_UI_1', rideId: '1' });

    const end = Date.now();
    const responseTime = end - start;

    console.log('Join Response Time:', responseTime, 'ms');

    expect(res.status).toBe(201);
    expect(responseTime).toBeLessThanOrEqual(300);
  });

  // UF-002: Minimal interaction + meaningful response
  test('UF-002: User can join queue in a single API call with useful response', async () => {
    const res = await request(app)
      .post('/queue/joinQueue')
      .send({ userId: 'U_UI_2', rideId: '2' });

    expect(res.status).toBe(201);

    // Check meaningful usability fields
    expect(res.body).toHaveProperty('position');
    expect(res.body).toHaveProperty('userId');
    expect(res.body).toHaveProperty('rideId');
    expect(res.body).toHaveProperty('peopleAhead');

    // Validate correctness
    expect(res.body.userId).toBe('U_UI_2');
    expect(res.body.rideId).toBe(2);
    expect(res.body.position).toBeGreaterThanOrEqual(1);
  });

  // UF-003: Clear error messages for bad UX scenarios
  test('UF-003: Duplicate join returns clear error message', async () => {
    const payload = { userId: 'U_UI_3', rideId: '3' };

    await request(app)
      .post('/queue/joinQueue')
      .send(payload);

    const res = await request(app)
      .post('/queue/joinQueue')
      .send(payload);

    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.toLowerCase()).toContain('already');
  });

  // UF-004: leaveQueue response time ≤ 300 ms
  test('UF-004: leaveQueue response time ≤ 300 ms', async () => {
    const userId = 'U_UI_4';
    const rideId = '4';

    // First join
    await request(app)
      .post('/queue/joinQueue')
      .send({ userId, rideId });

    const start = Date.now();

    const res = await request(app)
      .post('/queue/leaveQueue')
      .send({ userId, rideId });

    const end = Date.now();
    const responseTime = end - start;

    console.log('Leave Response Time:', responseTime, 'ms');

    expect(res.status).toBe(200);
    expect(responseTime).toBeLessThanOrEqual(300);
  });

  // UF-005: High success rate under normal usage
  test('UF-005: Multiple users can join without errors', async () => {
    const userCount = 5;

    const results = await Promise.all(
      Array(userCount).fill(null).map((_, i) =>
        request(app)
          .post('/queue/joinQueue')
          .send({ userId: `U_UI_${i}`, rideId: '5' })
      )
    );

    const successCount = results.filter(r => r.status === 201).length;

    console.log(`Successful joins: ${successCount}/${userCount}`);

    expect(successCount).toBe(userCount);
  });

});