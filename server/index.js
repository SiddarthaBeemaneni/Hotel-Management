/* =========================================================
   SIDDARTHA PALACE — Express Server Entry Point
   ========================================================= */

require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const { testConnection } = require('./db');
const { startReminderCron } = require('./services/reminderService');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ---------- Middleware ---------- */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ---------- Serve static frontend ---------- */
app.use(express.static(path.join(__dirname, '..')));

/* ---------- API Routes ---------- */
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/bookings',  require('./routes/bookings'));
app.use('/api/rooms',     require('./routes/rooms'));
app.use('/api/tenants',   require('./routes/tenants'));
app.use('/api/payments',  require('./routes/payments'));
app.use('/api/reminders', require('./routes/reminders'));

/* ---------- Health check ---------- */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Siddartha Palace Hotel Management',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

/* ---------- Start ---------- */
async function start() {
  await testConnection();
  startReminderCron();

  app.listen(PORT, () => {
    console.log(`\n  ╔══════════════════════════════════════╗`);
    console.log(`  ║   Siddartha Palace — Server Ready    ║`);
    console.log(`  ╠══════════════════════════════════════╣`);
    console.log(`  ║  Local:  http://localhost:${PORT}        ║`);
    console.log(`  ║  API:    http://localhost:${PORT}/api    ║`);
    console.log(`  ╚══════════════════════════════════════╝\n`);
  });
}

start();
