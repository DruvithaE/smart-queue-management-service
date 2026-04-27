import http from 'k6/http';
import { check, group, sleep } from 'k6';

export const options = {
  vus: 5,            // Only 5 concurrent users
  duration: '30s',   // For 30 seconds
  thresholds: {
    'http_req_failed': ['rate<0.05'],  // Less than 5% failures
  },
};

export default function () {
  const rideId = 1;
  const userId = `user_${__VU}_${__ITER}_${Date.now()}`;
  
  // JOIN QUEUE
  group('Join Queue', () => {
    const response = http.post(
      'http://localhost:5000/queue/joinQueue',
      JSON.stringify({
        rideId: rideId,
        userId: userId,
        fastPass: Math.random() < 0.2,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: '30s',
      }
    );

    check(response, {
      'join success': (r) => r.status === 201,
      'has valid position': (r) => {
        try {
          const pos = r.json('position');
          return pos > 0;
        } catch {
          return false;
        }
      },
    });
  });

  sleep(1);
}