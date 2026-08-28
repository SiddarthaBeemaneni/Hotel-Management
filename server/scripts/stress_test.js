/* =========================================================
   SIDDARTHA PALACE — High-Concurrency Stress Test
   Simulates 200 concurrent user sessions performing:
   - Account Registrations
   - Room Availability Searches
   - Concurrent Room Bookings
   - Dashboard Telemetry Queries
   ========================================================= */

const http = require('http');

const CONCURRENT_USERS = 200;
const SERVER_URL = 'http://localhost:3000';

function makeRequest({ path, method = 'GET', body = null }) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const url = new URL(path, SERVER_URL);

    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const latency = Date.now() - startTime;
        resolve({
          statusCode: res.statusCode,
          latency,
          success: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });

    req.on('error', (err) => {
      const latency = Date.now() - startTime;
      resolve({
        statusCode: 0,
        latency,
        success: false,
        error: err.message
      });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runStressTest() {
  console.log(`\n🚀 Launching High-Concurrency Stress Test (${CONCURRENT_USERS} Simultaneous Users)...`);
  const testStartTime = Date.now();

  const promises = [];

  for (let i = 1; i <= CONCURRENT_USERS; i++) {
    const userIndex = i;
    promises.push((async () => {
      // 1. Concurrent Health & Telemetry Check
      const hResult = await makeRequest({ path: '/api/health' });

      // 2. Concurrent User Registration
      const regResult = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        body: {
          full_name: `Stress Test User ${userIndex}`,
          email: `stress.user.${userIndex}@test.com`,
          phone_number: `+91999000${String(userIndex).padStart(4, '0')}`,
          password: 'Password123'
        }
      });

      // 3. Concurrent Room Availability Fetch
      const bookListResult = await makeRequest({ path: '/api/bookings' });

      // 4. Concurrent Room Booking
      const bookResult = await makeRequest({
        path: '/api/bookings',
        method: 'POST',
        body: {
          email: `stress.user.${userIndex}@test.com`,
          full_name: `Stress Test User ${userIndex}`,
          phone_number: `+91999000${String(userIndex).padStart(4, '0')}`,
          room_type: userIndex % 2 === 0 ? 'Deluxe Double' : 'Executive Suite',
          check_in_date: '2026-09-10',
          check_out_date: '2026-09-12',
          nights: 2,
          total_amount: userIndex % 2 === 0 ? 11998 : 19998,
          payment_method: 'PhonePe UPI'
        }
      });

      return [hResult, regResult, bookListResult, bookResult];
    })());
  }

  const allSessionResults = await Promise.all(promises);
  const totalDuration = Date.now() - testStartTime;

  const flatResults = allSessionResults.flat();
  const totalRequests = flatResults.length;
  const successfulRequests = flatResults.filter(r => r.success).length;
  const failedRequests = flatResults.filter(r => !r.success).length;
  const avgLatency = Math.round(flatResults.reduce((acc, r) => acc + r.latency, 0) / totalRequests);
  const maxLatency = Math.max(...flatResults.map(r => r.latency));
  const minLatency = Math.min(...flatResults.map(r => r.latency));
  const reqPerSec = Math.round((totalRequests / (totalDuration / 1000)));

  console.log(`\n╔═══════════════════════════════════════════════════════╗`);
  console.log(`║      🏰 HIGH-CONCURRENCY STRESS TEST RESULTS          ║`);
  console.log(`╠═══════════════════════════════════════════════════════╣`);
  console.log(`║  Total Concurrent Simulated Users:  ${String(CONCURRENT_USERS).padEnd(18)}║`);
  console.log(`║  Total HTTP Requests Processed:     ${String(totalRequests).padEnd(18)}║`);
  console.log(`║  Successful (2xx):                  ${String(successfulRequests).padEnd(18)}║`);
  console.log(`║  Failed / Dropped (0xx/5xx):        ${String(failedRequests).padEnd(18)}║`);
  console.log(`║  Total Test Duration:               ${String(totalDuration + ' ms').padEnd(18)}║`);
  console.log(`║  Throughput:                        ${String(reqPerSec + ' req/sec').padEnd(18)}║`);
  console.log(`║  Average Latency:                   ${String(avgLatency + ' ms').padEnd(18)}║`);
  console.log(`║  Min / Max Latency:                 ${String(minLatency + 'ms / ' + maxLatency + 'ms').padEnd(18)}║`);
  console.log(`║  Server Stability:                  ${(failedRequests === 0 ? '100% ROCK SOLID ✓' : 'Errors Detected').padEnd(18)}║`);
  console.log(`╚═══════════════════════════════════════════════════════╝\n`);

  // Clean up test bookings to keep DB pristine
  await makeRequest({ path: '/api/bookings/reset', method: 'POST' });
}

runStressTest();
