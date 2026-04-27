import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,           // Only 5 concurrent users
  duration: '1m',   // For 1 minute
  thresholds: {
    'http_req_duration': ['p(95)<1000'],
    'http_req_failed': ['rate<0.1'],
  },
};

export default function () {
  const response = http.post(
    'http://localhost:5000/queue/joinQueue',
    JSON.stringify({
      rideId: 1,
      userId: `user_${__VU}_${__ITER}_${Date.now()}`,  // Unique each time
      fastPass: Math.random() < 0.2,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: '30s',
    }
  );

  check(response, {
    'status 201': (r) => r.status === 201,
    'has position': (r) => r.json('position') > 0,
  });

  sleep(1);
}