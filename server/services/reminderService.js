/* =========================================================
   REMINDER SERVICE — Cron-based rent reminder automation
   Runs daily at 9 AM, only fires on days 1–5 of the month,
   finds tenants with pending/partial rent, and sends
   personalised SMS + WhatsApp reminders via Twilio.
   ========================================================= */

const cron = require('node-cron');
const { pool } = require('../db');
const { sendSMS, sendWhatsApp, DRY_RUN } = require('./twilioClient');

/**
 * Build personalised reminder message for a tenant
 */
function buildMessage(tenant) {
  return (
    `Namaste ${tenant.full_name}, gentle reminder from Siddartha Palace — your room fee of ₹${parseFloat(tenant.monthly_rent).toLocaleString('en-IN')} ` +
    `for Room ${tenant.room_number} is due. ` +
    `Kindly make the payment via UPI / Card at your earliest convenience. ` +
    `Thank you for staying with us!\n\n— Siddartha Palace Hotel`
  );
}

/**
 * Core logic: query pending tenants and send reminders
 * Called by the cron job AND by the manual "send now" API endpoint.
 * @param {boolean} skipDayCheck — if true, sends regardless of current day
 */
async function sendRemindersNow(skipDayCheck = true) {
  const today = new Date();
  const dayOfMonth = today.getDate();
  const startDay = parseInt(process.env.REMINDER_START_DAY) || 1;
  const endDay   = parseInt(process.env.REMINDER_END_DAY)   || 5;

  // Day check (skipped for manual triggers)
  if (!skipDayCheck && (dayOfMonth < startDay || dayOfMonth > endDay)) {
    console.log(`  ⏭  Day ${dayOfMonth} is outside reminder window (${startDay}–${endDay}). Skipping.`);
    return { skipped: true, reason: `Day ${dayOfMonth} outside window` };
  }

  const monthYear = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  console.log(`\n  ╔══════════════════════════════════════╗`);
  console.log(`  ║    Rent Reminder Run — ${monthYear}      ║`);
  console.log(`  ║    Mode: ${DRY_RUN ? 'DRY-RUN (no Twilio)' : 'LIVE (Twilio)'}      ║`);
  console.log(`  ╚══════════════════════════════════════╝\n`);

  let tenants = [];

  try {
    // Find active tenants with pending/partial payments this month
    // who haven't already been reminded today
    const [rows] = await pool.execute(`
      SELECT t.tenant_id, t.full_name, t.phone_number, t.monthly_rent,
             r.room_number
      FROM tenants t
      JOIN rent_payments rp
        ON t.tenant_id = rp.tenant_id
        AND rp.month_year = ?
      LEFT JOIN rooms r ON t.room_id = r.room_id
      WHERE t.is_active = TRUE
        AND rp.payment_status IN ('pending', 'partial')
        AND t.tenant_id NOT IN (
          SELECT rl.tenant_id
          FROM reminder_logs rl
          WHERE rl.month_year = ?
            AND DATE(rl.sent_on) = CURDATE()
            AND rl.status = 'sent'
        )
    `, [monthYear, monthYear]);

    tenants = rows;
  } catch (err) {
    console.error('  ✗ Database query failed:', err.message);
    return { error: err.message, sent: 0, failed: 0 };
  }

  if (!tenants.length) {
    console.log('  ✓ No pending reminders to send today.\n');
    return { sent: 0, failed: 0, message: 'No pending reminders' };
  }

  console.log(`  Found ${tenants.length} tenant(s) with pending rent:\n`);

  let sent = 0;
  let failed = 0;
  const results = [];

  for (const tenant of tenants) {
    const message = buildMessage(tenant);
    console.log(`  → ${tenant.full_name} (Room ${tenant.room_number || 'N/A'}) — $${tenant.monthly_rent}`);

    // Send SMS
    const smsResult = await sendSMS(tenant.phone_number, message);
    await logReminder(tenant.tenant_id, monthYear, 'sms', message, smsResult.success ? 'sent' : 'failed');

    // Send WhatsApp
    const waResult = await sendWhatsApp(tenant.phone_number, message);
    await logReminder(tenant.tenant_id, monthYear, 'whatsapp', message, waResult.success ? 'sent' : 'failed');

    if (smsResult.success || waResult.success) { sent++; }
    else { failed++; }

    results.push({
      tenant_id: tenant.tenant_id,
      name: tenant.full_name,
      room: tenant.room_number,
      sms: smsResult.success ? 'sent' : 'failed',
      whatsapp: waResult.success ? 'sent' : 'failed'
    });
  }

  console.log(`\n  ═══ Summary: ${sent} sent, ${failed} failed ═══\n`);

  return { sent, failed, total: tenants.length, results };
}

/**
 * Log a reminder attempt to the database
 */
async function logReminder(tenantId, monthYear, channel, message, status) {
  try {
    await pool.execute(
      `INSERT INTO reminder_logs (tenant_id, month_year, channel, message, status)
       VALUES (?, ?, ?, ?, ?)`,
      [tenantId, monthYear, channel, message, status]
    );
  } catch (err) {
    console.error(`  ✗ Failed to log reminder for tenant ${tenantId}:`, err.message);
  }
}

/**
 * Start the cron job — called once from server/index.js
 */
function startReminderCron() {
  const cronExpr = process.env.REMINDER_CRON || '0 9 * * *';

  console.log(`✓ Reminder cron scheduled: "${cronExpr}" (days 1–5 at 9:00 AM)`);
  console.log(`  Mode: ${DRY_RUN ? 'DRY-RUN — messages logged to console' : 'LIVE — sending via Twilio'}`);

  cron.schedule(cronExpr, async () => {
    console.log('\n⏰ Cron triggered — checking for rent reminders…');
    await sendRemindersNow(false); // don't skip day check for automatic runs
  });
}

module.exports = { sendRemindersNow, startReminderCron };
