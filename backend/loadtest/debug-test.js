import http from 'k6/http';

export const options = {
  vus: 1,  // Only 1 user
  duration: '30s',
};

export default function () {
  const response = http.post(
    'http://localhost:5000/queue/joinQueue',
    JSON.stringify({
      rideId: 1,
      userId: `user_debug_${Date.now()}`,
      fastPass: false,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  console.log('Status:', response.status);
  console.log('Body:', response.body);
  console.log('Time:', response.timings.duration + 'ms');
}