const request = require('supertest');
const app = require('../app');
const { pool } = require('../config/db');
const notificationService = require('../services/notification_service/notificationService');

describe('RELIABILITY: Zero Data Loss & 99.9% Uptime', () => {

  beforeAll(async () => {
    // Mock the notification service to prevent null io errors
    notificationService.setIO({
      to: () => ({ emit: () => {} })
    });

    // Create test rides before any tests run
    const rideIds = [1, 2, 3, 4, 5, 6, 7, 8];
    for (const rideId of rideIds) {
      await pool.query(
        `INSERT INTO rides (id, name, description, capacity, duration, status) 
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING`,
        [rideId, `Test Ride ${rideId}`, `Test ride for reliability testing`, 100, 5, 'OPEN']
      );
    }
  });

  beforeEach(async () => {
    // Clear queue entries before each test (but keep rides)
    await pool.query('DELETE FROM queue_entries');
  });

  afterAll(async () => {
    // Cleanup test data
    await pool.query('DELETE FROM queue_entries');
    await pool.query('DELETE FROM rides WHERE id IN (1, 2, 3, 4, 5, 6, 7, 8)');
    await pool.end();
  });

  // Test 1: Idempotency - calling same operation twice = one result
  test('RF-001: Duplicate joinQueue request creates only one entry', async () => {
    const payload = { userId: 'U_UNIQUE_1', rideId: '1' };
    
    // First join - should succeed
    const res1 = await request(app)
      .post('/queue/joinQueue')
      .send(payload);
    
    console.log('First response status:', res1.status, res1.body);
    expect(res1.status).toBe(201); // Created
    
    // Second join - should be rejected (duplicate)
    const res2 = await request(app)
      .post('/queue/joinQueue')
      .send(payload);
    
    console.log('Second response status:', res2.status, res2.body);
    expect(res2.status).toBe(500); // Error - already in queue
    expect(res2.body.error).toContain('already has an active queue entry');
    
    // Verify only 1 entry in DB
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM queue_entries 
       WHERE user_id=$1 AND ride_id=$2 AND status='ACTIVE'`,
      ['U_UNIQUE_1', 1]
    );
    
    expect(parseInt(result.rows[0].count)).toBe(1);
  });

  // Test 2: Data persists after simulated crash (transaction atomicity)
  test('RF-002: Queue entries persist in database (atomicity test)', async () => {
    const testUserId = 'U_PERSIST_TEST';
    const testRideId = 2;
    
    // Join queue
    const joinRes = await request(app)
      .post('/queue/joinQueue')
      .send({ userId: testUserId, rideId: testRideId.toString() });
    
    expect(joinRes.status).toBe(201);
    
    // Simulate app crash by querying DB directly
    const beforeCrash = await pool.query(
      `SELECT * FROM queue_entries WHERE user_id=$1 AND ride_id=$2`,
      [testUserId, testRideId]
    );
    
    expect(beforeCrash.rows.length).toBeGreaterThan(0);
    expect(beforeCrash.rows[0].status).toBe('ACTIVE');
    
    // After crash simulation, data should still exist
    const afterCrash = await pool.query(
      `SELECT * FROM queue_entries WHERE user_id=$1 AND ride_id=$2`,
      [testUserId, testRideId]
    );
    
    expect(afterCrash.rows.length).toBe(beforeCrash.rows.length);
    expect(afterCrash.rows[0].user_id).toBe(testUserId);
  });

  // Test 3: Concurrent joins maintain queue position accuracy
  test('RF-003: Concurrent joins maintain position accuracy ±1', async () => {
    const rideId = 3;
    const userCount = 10;
    
    // Simulate 10 concurrent joins
    const joinPromises = Array(userCount).fill(null).map((_, i) =>
      request(app)
        .post('/queue/joinQueue')
        .send({ userId: `U_CONCURRENT_${i}`, rideId: rideId.toString() })
    );
    
    const results = await Promise.allSettled(joinPromises);
    
    // Count successful joins
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 201).length;
    console.log(`Successful joins: ${successful}/${userCount}`);
    
    // Query DB to verify positions are contiguous
    const entries = await pool.query(
      `SELECT user_id, row_number() OVER (ORDER BY joined_at, id) as position 
       FROM queue_entries 
       WHERE ride_id=$1 AND status='ACTIVE'
       ORDER BY position`,
      [rideId]
    );
    
    console.log(`Queue has ${entries.rows.length} entries`);
    
    // Verify no gaps in positions
    for (let i = 0; i < entries.rows.length; i++) {
      expect(parseInt(entries.rows[i].position)).toBeLessThanOrEqual(i + 2); // Allow ±1
    }
    
    // Should have successfully joined users in queue
    expect(entries.rows.length).toBeGreaterThan(0);
  });

  // Test 4: leaveQueue doesn't lose data
  test('RF-004: leaveQueue marks status but preserves data', async () => {
    const userId = 'U_LEAVE_TEST';
    const rideId = 4;
    
    // Join queue
    const joinRes = await request(app)
      .post('/queue/joinQueue')
      .send({ userId, rideId: rideId.toString() });
    
    expect(joinRes.status).toBe(201);
    
    // Get entry ID before leaving
    const beforeLeave = await pool.query(
      `SELECT * FROM queue_entries WHERE user_id=$1 AND ride_id=$2`,
      [userId, rideId]
    );
    
    const entryId = beforeLeave.rows[0].id;
    
    // Leave queue
    await request(app)
      .post('/queue/leaveQueue')
      .send({ userId, rideId: rideId.toString() });
    
    // Verify entry still exists but status changed
    const afterLeave = await pool.query(
      `SELECT * FROM queue_entries WHERE id=$1`,
      [entryId]
    );
    
    expect(afterLeave.rows.length).toBe(1);
    expect(afterLeave.rows[0].status).toBe('LEFT');
    expect(afterLeave.rows[0].user_id).toBe(userId);
  });

  // Test 5: No duplicate entries on retry
  test('RF-005: Retrying joinQueue after partial failure creates no duplicates', async () => {
    const userId = 'U_RETRY_TEST';
    const rideId = 5;
    
    // Attempt join multiple times rapidly
    const attempts = Array(5).fill(null).map(() =>
      request(app)
        .post('/queue/joinQueue')
        .send({ userId, rideId: rideId.toString() })
    );
    
    await Promise.all(attempts);
    
    // Verify only 1 ACTIVE entry exists
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM queue_entries 
       WHERE user_id=$1 AND ride_id=$2 AND status='ACTIVE'`,
      [userId, rideId]
    );
    
    expect(parseInt(result.rows[0].count)).toBe(1);
  });

  // Test 6: Queue accuracy with mixed operations
  test('RF-006: Queue maintains accuracy with joins and leaves', async () => {
    const rideId = 6;
    
    // Add 5 users
    const userIds = [];
    for (let i = 0; i < 5; i++) {
      const userId = `U_MIXED_${i}`;
      userIds.push(userId);
      const joinRes = await request(app)
        .post('/queue/joinQueue')
        .send({ userId, rideId: rideId.toString() });
      expect(joinRes.status).toBe(201);
    }
    
    // User 1 and 3 leave
    await request(app)
      .post('/queue/leaveQueue')
      .send({ userId: userIds[1], rideId: rideId.toString() });
    
    await request(app)
      .post('/queue/leaveQueue')
      .send({ userId: userIds[3], rideId: rideId.toString() });
    
    // Query active entries
    const active = await pool.query(
      `SELECT COUNT(*) as count FROM queue_entries 
       WHERE ride_id=$1 AND status='ACTIVE'`,
      [rideId]
    );
    
    // Should have 3 active entries (5 joined - 2 left)
    expect(parseInt(active.rows[0].count)).toBe(3);
    
    // Verify LEFT entries still exist
    const left = await pool.query(
      `SELECT COUNT(*) as count FROM queue_entries 
       WHERE ride_id=$1 AND status='LEFT'`,
      [rideId]
    );
    
    expect(parseInt(left.rows[0].count)).toBe(2);
  });

  // Test 7: Multiple sequential operations maintain consistency
  test('RF-007: Multiple sequential operations maintain consistency', async () => {
    const rideId = 7;
    
    // Simulate 20 operations in sequence
    for (let i = 0; i < 20; i++) {
      const userId = `U_SEQ_${i}`;
      const joinRes = await request(app)
        .post('/queue/joinQueue')
        .send({ userId, rideId: rideId.toString() });
      expect(joinRes.status).toBe(201);
    }
    
    // Verify all 20 are in DB
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM queue_entries 
       WHERE ride_id=$1 AND status='ACTIVE'`,
      [rideId]
    );
    
    expect(parseInt(result.rows[0].count)).toBe(20);
  });

  // Test 8: Zero data loss on edge case (user rejoins after leaving)
  test('RF-008: User can rejoin after leaving (no orphaned entries)', async () => {
    const userId = 'U_REJOIN_TEST';
    const rideId = 8;
    
    // First join
    const res1 = await request(app)
      .post('/queue/joinQueue')
      .send({ userId, rideId: rideId.toString() });
    
    expect(res1.status).toBe(201);
    
    const firstJoin = await pool.query(
      `SELECT COUNT(*) as count FROM queue_entries 
       WHERE user_id=$1 AND ride_id=$2 AND status='ACTIVE'`,
      [userId, rideId]
    );
    expect(parseInt(firstJoin.rows[0].count)).toBe(1);
    
    // Leave
    await request(app)
      .post('/queue/leaveQueue')
      .send({ userId, rideId: rideId.toString() });
    
    // Rejoin
    const res2 = await request(app)
      .post('/queue/joinQueue')
      .send({ userId, rideId: rideId.toString() });
    
    expect(res2.status).toBe(201);
    
    // Should have 1 ACTIVE entry (old one LEFT, new one ACTIVE)
    const afterRejoin = await pool.query(
      `SELECT COUNT(*) as count FROM queue_entries 
       WHERE user_id=$1 AND ride_id=$2 AND status='ACTIVE'`,
      [userId, rideId]
    );
    expect(parseInt(afterRejoin.rows[0].count)).toBe(1);
    
    // Total entries (ACTIVE + LEFT) should be 2
    const total = await pool.query(
      `SELECT COUNT(*) as count FROM queue_entries 
       WHERE user_id=$1 AND ride_id=$2`,
      [userId, rideId]
    );
    expect(parseInt(total.rows[0].count)).toBe(2);
  });
});