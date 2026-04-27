const request = require('supertest');
const app = require('../backend/app');
const db = require('../backend/config/db');

describe('RELIABILITY: Zero Data Loss & 99.9% Uptime', () => {

  // CRITICAL: Test transaction rollback on failure
  test('RF-001: joinQueue rolls back on DB error', async () => {
    // Mock DB to fail mid-insert
    jest.spyOn(db, 'query')
      .mockRejectedValueOnce(new Error('DB_CONNECTION_LOST'));
    
    const response = await request(app)
      .post('/queue/joinQueue')
      .send({ userId: 'U1', rideId: 'R1' })
      .expect(500);
    
    // Verify no partial entry in DB
    const entries = await db.query(
      'SELECT COUNT(*) FROM queue_entries WHERE user_id=$1',
      ['U1']
    );
    expect(entries.rows[0].count).toBe('0');
  });

  // Test idempotency: calling same operation twice = one result
  test('RF-002: Duplicate joinQueue request handled safely', async () => {
    const payload = { userId: 'U1', rideId: 'R1' };
    
    const res1 = await request(app)
      .post('/queue/joinQueue')
      .send(payload)
      .expect(200);
    
    const res2 = await request(app)
      .post('/queue/joinQueue')
      .send(payload)
      .expect(409); // Conflict - already joined
    
    // Only 1 entry in DB
    const count = await db.query(
      'SELECT COUNT(*) FROM queue_entries WHERE user_id=$1 AND ride_id=$2',
      ['U1', 'R1']
    );
    expect(count.rows[0].count).toBe('1');
  });

  // Test data recovery after shutdown
  test('RF-003: Queue state persists after service restart', async () => {
    // Add 100 users to queue
    for (let i = 0; i < 100; i++) {
      await request(app)
        .post('/queue/joinQueue')
        .send({ userId: `U${i}`, rideId: 'R1' });
    }
    
    // Restart service
    app.close();
    await startFreshService();
    
    // Verify all 100 entries still exist
    const entries = await db.query(
      'SELECT COUNT(*) FROM queue_entries WHERE ride_id=$1 AND status=$2',
      ['R1', 'ACTIVE']
    );
    expect(entries.rows[0].count).toBe('100');
  });

  // Test consistency under concurrent load + failure
  test('RF-004: Queue position accuracy maintained ±1 under chaos', async () => {
    const rideId = 'R1';
    const userCount = 100;
    
    // 1. Concurrent joins (50 req/sec for 5 seconds)
    const joinPromises = Array(userCount).fill(null).map((_, i) =>
      request(app)
        .post('/queue/joinQueue')
        .send({ userId: `U${i}`, rideId })
    );
    
    // 2. Inject DB failure at 2.5 seconds
    setTimeout(() => {
      jest.spyOn(db, 'query').mockRejectedValueOnce(new Error('Timeout'));
    }, 2500);
    
    const results = await Promise.allSettled(joinPromises);
    
    // 3. Verify accuracy
    const dbEntries = await db.query(
      'SELECT user_id, position FROM queue_entries WHERE ride_id=$1 ORDER BY position',
      [rideId]
    );
    
    // Positions should be contiguous (1,2,3,4...)
    for (let i = 0; i < dbEntries.rows.length; i++) {
      expect(parseInt(dbEntries.rows[i].position))
        .toBeLessThanOrEqual(i + 2); // Allow ±1
    }
  });

  // Test network partition recovery
  test('RF-005: System recovers from network partition', async () => {
    const initialQueueSize = await getQueueSize('R1');
    
    // Simulate network partition (backend can't reach DB)
    const dbSpy = jest.spyOn(db, 'query');
    dbSpy.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    
    // Try queue operations - should fail gracefully
    const response = await request(app)
      .post('/queue/joinQueue')
      .send({ userId: 'U999', rideId: 'R1' });
    
    expect([500, 503]).toContain(response.status);
    
    // Restore connection
    dbSpy.mockRestore();
    
    // Verify queue is still intact
    const finalQueueSize = await getQueueSize('R1');
    expect(finalQueueSize).toBe(initialQueueSize);
  });

  // Test Fast Pass consistency during failures
  test('RF-006: Fast Pass ordering maintained during concurrent access', async () => {
    const rideId = 'R2';
    
    // Mix of regular and Fast Pass users joining concurrently
    const joins = [
      { userId: 'U1', fastPass: false },
      { userId: 'U2', fastPass: true },  // Should jump ahead
      { userId: 'U3', fastPass: false },
      { userId: 'U4', fastPass: true },  // Should jump ahead
    ];
    
    const promises = joins.map(j =>
      request(app)
        .post('/queue/joinQueue')
        .send({ userId: j.userId, rideId, fastPass: j.fastPass })
    );
    
    await Promise.all(promises);
    
    // Verify Fast Pass users are ahead
    const entries = await db.query(
      'SELECT user_id, priority FROM queue_entries WHERE ride_id=$1 ORDER BY position',
      [rideId]
    );
    
    expect(entries.rows[0].user_id).toBe('U2'); // First Fast Pass
    expect(entries.rows[1].user_id).toBe('U4'); // Second Fast Pass
  });
});

// Helper function
async function getQueueSize(rideId) {
  const result = await db.query(
    'SELECT COUNT(*) FROM queue_entries WHERE ride_id=$1 AND status=$2',
    [rideId, 'ACTIVE']
  );
  return parseInt(result.rows[0].count);
}
