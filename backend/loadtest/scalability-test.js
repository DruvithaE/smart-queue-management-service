import http from 'k6/http';
import { check, group, sleep } from 'k6';

// Configuration: How many users? For how long?
export const options = {
  stages: [
    // Ramp up: gradually increase users
    { duration: '30s', target: 100 },    // 100 users over 30 seconds
    { duration: '1m', target: 500 },     // Increase to 500 over 1 minute
    { duration: '2m', target: 1000 },    // Increase to 1,000 over 2 minutes
    
    // Stay constant: keep max users stable
    { duration: '3m', target: 1000 },    // Hold 1,000 users for 3 minutes
    
    // Ramp down: gradually reduce users
    { duration: '30s', target: 0 },      // Decrease to 0 over 30 seconds
  ],
  thresholds: {
    // These are success criteria
    'http_req_duration': ['p(95)<500'],  // 95% of requests must finish in <500ms
    'http_req_failed': ['rate<0.1'],     // Less than 10% can fail
  },
};

export default function () {
  // TEST 1: Join a queue
  group('Join Queue', () => {
    const payload = {
      rideId: 1,                              // 👈 Changed from queue_id to rideId
      userId: `user_${__VU}_${__ITER}`,       // 👈 Changed from user_id to userId
      fastPass: Math.random() < 0.2,          // 20% get fast pass
    };

    const response = http.post(
      'http://localhost:5000/queue/joinQueue',  // 👈 Changed from /api/queues/join
      JSON.stringify(payload),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    check(response, {
      'status is 201': (r) => r.status === 201,                    // Join returns 201
      'response time < 500ms': (r) => r.timings.duration < 500,
      'has queue_position': (r) => {
        if (r.status !== 201) return false;
        try {
          return r.json('queue_position') !== null;
        } catch {
          return false;
        }
      },
    });
  });

  sleep(1);  // Wait 1 second between requests

  // TEST 2: Get queue status
  group('Get Queue Status', () => {
    const response = http.get(
      'http://localhost:5000/queue/queueStatus?rideId=1&userId=test_user'
    );

    check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 300ms': (r) => r.timings.duration < 300,
    });
  });

  sleep(2);
}