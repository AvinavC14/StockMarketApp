import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'https://stock-market-app-omega.vercel.app';

const USERS = [
  'fGMVEkFzwiGEIXORZb7OUDCYLLoNUyqI.uF%2BzNoP3HzzBIClh%2B9QWjDQmtNil1gb6iJ2Lk7GhHT4%3D',
  't7cJn8HMEoVxYTsEsTuGjFAPDPnZtQnv.7Aa%2BR6FZFJS8p2NduQAYSYhs4ny5ooSQXl652i6ahXs%3D',
];

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m',  target: 10 },
    { duration: '15s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed:   ['rate<0.05'],
  },
};

export default function () {
  const token = USERS[__VU % USERS.length];

  const headers = {
    'Cookie': `better-auth.session_token=${token}`,
  };

  const riskRes = http.get(`${BASE_URL}/api/risk-score`, { headers });

  console.log(`Risk Status: ${riskRes.status}`);
  console.log(`Risk Body: ${riskRes.body.substring(0, 200)}`);

  check(riskRes, {
    'risk-score 200': (r) => r.status === 200,
    'risk-score <2s':  (r) => r.timings.duration < 2000,
  });

  sleep(1);

  const recRes = http.get(`${BASE_URL}/api/recommendations`, { headers });

  console.log(`Rec Status: ${recRes.status}`);
  console.log(`Rec Body: ${recRes.body.substring(0, 200)}`);

  check(recRes, {
    'recommendations 200': (r) => r.status === 200,
    'recommendations <5s':  (r) => r.timings.duration < 5000,
  });

  sleep(1);
}