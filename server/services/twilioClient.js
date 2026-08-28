/* =========================================================
   TWILIO CLIENT — SMS + WhatsApp messaging wrapper
   Falls back to console logging when credentials are absent
   ========================================================= */

const DRY_RUN = !(process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN);

let client = null;
if (!DRY_RUN) {
  const twilio = require('twilio');
  client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
}

/**
 * Send an SMS message via Fast2SMS (India) or Twilio
 * @param {string} to     — recipient phone number (e.g. +917396704027 or 7396704027)
 * @param {string} body   — message text or OTP
 * @returns {Promise<{success: boolean, sid?: string}>}
 */
async function sendSMS(to, body) {
  const cleanNumber = to.replace(/\D/g, '').slice(-10); // 10 digit Indian number

  // 1. Try Fast2SMS if API key is provided
  if (process.env.FAST2SMS_API_KEY) {
    try {
      const response = await fetch(`https://www.fast2sms.com/dev/bulkV2?authorization=${process.env.FAST2SMS_API_KEY}&route=q&message=${encodeURIComponent(body)}&language=english&flash=0&numbers=${cleanNumber}`);
      const data = await response.json();
      if (data.return) {
        console.log(`  ✓ Fast2SMS dispatched successfully to ${cleanNumber}`);
        return { success: true, sid: data.request_id };
      } else {
        console.warn(`  ✗ Fast2SMS failed:`, data.message);
      }
    } catch (fErr) {
      console.warn(`  ✗ Fast2SMS request error:`, fErr.message);
    }
  }

  // 2. Try Twilio if credentials are provided
  if (!DRY_RUN) {
    try {
      const formattedTo = to.startsWith('+') ? to : `+91${cleanNumber}`;
      const msg = await client.messages.create({
        body,
        from: process.env.TWILIO_SMS_NUMBER,
        to: formattedTo
      });
      return { success: true, sid: msg.sid };
    } catch (err) {
      console.error(`  ✗ Twilio SMS to ${to} failed:`, err.message);
      return { success: false, error: err.message };
    }
  }

  // 3. Fallback / Log
  console.log(`  📱 [SMS Gateway] → ${to}`);
  console.log(`     "${body}"\n`);
  return { success: true, sid: 'gateway-simulated-' + Date.now() };
}

/**
 * Send a WhatsApp message
 * @param {string} to     — recipient phone number (e.g. +919876543210)
 * @param {string} body   — message text
 * @returns {Promise<{success: boolean, sid?: string}>}
 */
async function sendWhatsApp(to, body) {
  const cleanNumber = to.replace(/\D/g, '').slice(-10);
  if (DRY_RUN) {
    console.log(`  💬 [DRY-RUN WhatsApp] → ${to}`);
    console.log(`     "${body.substring(0, 100)}…"\n`);
    return { success: true, sid: 'dry-run-wa-' + Date.now() };
  }

  try {
    const msg = await client.messages.create({
      body,
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:+91${cleanNumber}`
    });
    return { success: true, sid: msg.sid };
  } catch (err) {
    console.error(`  ✗ WhatsApp to ${to} failed:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Format and dispatch complete booking details via SMS & WhatsApp
 */
async function sendBookingConfirmationSMS(booking) {
  const {
    booking_code,
    customer_name,
    phone_number,
    room_type,
    room_number,
    floor,
    check_in_date,
    check_out_date,
    nights,
    total_amount
  } = booking;

  if (!phone_number) return { success: false, error: 'No phone number provided' };

  const smsText = `🏰 SIDDARTHA PALACE — BOOKING CONFIRMED!\n\nNamaste ${customer_name},\nYour royal stay is confirmed!\n• Ref: #${booking_code}\n• Room: ${room_type} (Room ${room_number || '101'}, Floor ${floor || '1'})\n• Check-in: ${check_in_date} (2:00 PM)\n• Check-out: ${check_out_date} (11:00 AM) - ${nights} Night(s)\n• Total Paid: ₹${Number(total_amount).toLocaleString('en-IN')}\n• Amenities: Palace Wi-Fi, Breakfast & Valet\n\n24/7 Concierge: +91 7396704027\nWe look forward to welcoming you!`;

  console.log(`\n  ╔═══════════════════════════════════════════════════════════╗`);
  console.log(`  ║  📱 [SMS/WHATSAPP DISPATCH] BOOKING CONFIRMATION          ║`);
  console.log(`  ╠═══════════════════════════════════════════════════════════╣`);
  console.log(`  ║  To:             ${phone_number.padEnd(38)} ║`);
  console.log(`  ║  Guest:          ${customer_name.padEnd(38)} ║`);
  console.log(`  ║  Booking ID:     #${booking_code.padEnd(37)} ║`);
  console.log(`  ║  Room:           ${(room_type + ' (Room ' + (room_number || '101') + ')').padEnd(38)} ║`);
  console.log(`  ║  Total Paid:     ₹${Number(total_amount).toLocaleString('en-IN').padEnd(37)} ║`);
  console.log(`  ╚═══════════════════════════════════════════════════════════╝\n`);

  const smsRes = await sendSMS(phone_number, smsText);
  const waRes  = await sendWhatsApp(phone_number, smsText);

  return { sms: smsRes, whatsapp: waRes };
}

module.exports = {
  sendSMS,
  sendWhatsApp,
  sendBookingConfirmationSMS,
  DRY_RUN
};
