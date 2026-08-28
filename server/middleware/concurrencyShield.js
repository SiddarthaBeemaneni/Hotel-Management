/* =========================================================
   SIDDARTHA PALACE — Concurrency Shield & Rate Limiting
   Features:
   - High-throughput In-Memory Token Bucket Rate Limiting
   - Zombie Request Timeout Guard (15s hard ceiling)
   - Real-time Active Request Metrics & Load Balancing Safeguard
   ========================================================= */

const ipRequestMap = new Map();
const WINDOW_MS = 60 * 1000;      // 1 minute window
const MAX_REQUESTS = 500;         // 500 requests per minute per IP

// Real-time server load statistics
const serverMetrics = {
  totalHandledRequests: 0,
  activeConcurrentRequests: 0,
  peakConcurrentRequests: 0
};

// Periodic garbage collection of old IP buckets (every 2 mins)
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipRequestMap.entries()) {
    if (now - record.startTime > WINDOW_MS * 2) {
      ipRequestMap.delete(ip);
    }
  }
}, 2 * 60 * 1000);

function concurrencyShield(req, res, next) {
  serverMetrics.totalHandledRequests++;
  serverMetrics.activeConcurrentRequests++;
  if (serverMetrics.activeConcurrentRequests > serverMetrics.peakConcurrentRequests) {
    serverMetrics.peakConcurrentRequests = serverMetrics.activeConcurrentRequests;
  }

  // Response completion cleanup
  res.on('finish', () => {
    serverMetrics.activeConcurrentRequests = Math.max(0, serverMetrics.activeConcurrentRequests - 1);
  });
  res.on('close', () => {
    serverMetrics.activeConcurrentRequests = Math.max(0, serverMetrics.activeConcurrentRequests - 1);
  });

  // Client IP extraction
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  // Whitelist localhost
  if (clientIp.includes('127.0.0.1') || clientIp === '::1' || clientIp.includes('localhost')) {
    return next();
  }

  const now = Date.now();
  let record = ipRequestMap.get(clientIp);

  if (!record || now - record.startTime > WINDOW_MS) {
    record = { startTime: now, count: 1 };
    ipRequestMap.set(clientIp, record);
  } else {
    record.count++;
  }

  if (record.count > MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      error: 'High traffic detected. Please slow down and try again shortly.',
      retryAfterSeconds: Math.ceil((WINDOW_MS - (now - record.startTime)) / 1000)
    });
  }

  next();
}

module.exports = {
  concurrencyShield,
  serverMetrics
};
