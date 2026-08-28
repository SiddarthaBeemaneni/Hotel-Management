/* =========================================================
   REMINDERS API — /api/reminders
   ========================================================= */

const express = require('express');
const router  = express.Router();
const { pool } = require('../db');
const { sendRemindersNow } = require('../services/reminderService');

/* GET /api/reminders/log — view reminder history */
router.get('/log', async (req, res) => {
  try {
    const { tenant_id, month_year, limit } = req.query;
    let sql = `
      SELECT rl.*, t.full_name, t.phone_number, r.room_number
      FROM reminder_logs rl
      JOIN tenants t ON rl.tenant_id = t.tenant_id
      LEFT JOIN rooms r ON t.room_id = r.room_id
      WHERE 1=1
    `;
    const params = [];

    if (tenant_id)  { sql += ' AND rl.tenant_id = ?'; params.push(tenant_id); }
    if (month_year) { sql += ' AND rl.month_year = ?'; params.push(month_year); }

    sql += ' ORDER BY rl.sent_on DESC';
    sql += ` LIMIT ${parseInt(limit) || 50}`;

    const [rows] = await pool.execute(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* GET /api/reminders/status — cron status */
router.get('/status', (req, res) => {
  const cronExpr = process.env.REMINDER_CRON || '0 9 * * *';
  const startDay = parseInt(process.env.REMINDER_START_DAY) || 1;
  const endDay   = parseInt(process.env.REMINDER_END_DAY)   || 5;
  const today    = new Date().getDate();
  const isActive = today >= startDay && today <= endDay;

  res.json({
    success: true,
    data: {
      cron_expression: cronExpr,
      reminder_window: `Day ${startDay} – ${endDay} of each month`,
      today_is_day: today,
      reminders_active_today: isActive,
      twilio_configured: !!(process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN),
      mode: (process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN) ? 'live' : 'dry-run'
    }
  });
});

/* POST /api/reminders/send-now — manually trigger reminders */
router.post('/send-now', async (req, res) => {
  try {
    const result = await sendRemindersNow();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
