/* =========================================================
   EMAIL SERVICE — Nodemailer Email Dispatcher
   Supports Gmail App Passwords, Custom SMTP, and Ethereal Test Accounts
   ========================================================= */

const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  const smtpHost  = process.env.SMTP_HOST;
  const smtpPort  = parseInt(process.env.SMTP_PORT) || 587;

  if (emailUser && emailPass) {
    if (smtpHost) {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: emailUser, pass: emailPass }
      });
    } else {
      // Default to Gmail
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: emailUser, pass: emailPass }
      });
    }
  }

  return transporter;
}

/**
 * Send Detailed Room Booking Confirmation Email
 */
async function sendBookingConfirmationEmail(booking) {
  const mailer = getTransporter();

  const {
    booking_code,
    customer_name,
    customer_email,
    phone_number,
    room_type,
    room_number,
    floor,
    check_in_date,
    check_out_date,
    nights,
    guests_count,
    total_amount,
    payment_method,
    payment_status,
    special_requests
  } = booking;

  const formattedAmount = Number(total_amount).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  });

  const htmlContent = `
    <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif; max-width:620px; margin:0 auto; background:#FAF7F2; border:1px solid #E3D9C6; border-radius:14px; overflow:hidden; box-shadow:0 10px 35px rgba(27,16,48,0.1);">
      
      <!-- Palace Header -->
      <div style="background:#1B1030; padding:32px 24px; text-align:center; border-bottom:4px solid #C9A227;">
        <h1 style="color:#C9A227; margin:0; font-size:26px; letter-spacing:3px; font-family:Georgia,serif;">SIDDARTHA PALACE</h1>
        <p style="color:#F7F0E0; margin:6px 0 0; font-size:12px; letter-spacing:2px; text-transform:uppercase;">Heritage Luxury &amp; Hospitality · Confirmed Reservation</p>
      </div>

      <!-- Main Body -->
      <div style="padding:32px 28px; color:#1B1030;">
        
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #E3D9C6; padding-bottom:18px; margin-bottom:22px;">
          <div>
            <span style="font-size:12px; color:#777; text-transform:uppercase; letter-spacing:1px;">Booking Reference</span>
            <h2 style="margin:2px 0 0; color:#6E1E2B; font-size:22px; font-family:monospace; letter-spacing:1px;">#${booking_code}</h2>
          </div>
          <div style="text-align:right;">
            <span style="display:inline-block; background:#E8F5E9; color:#2E7D32; font-weight:bold; font-size:12px; padding:6px 14px; border-radius:20px; border:1px solid #A5D6A7;">
              ✓ CONFIRMED &amp; GUARANTEED
            </span>
          </div>
        </div>

        <p style="font-size:16px; margin:0 0 16px; color:#1B1030;">
          Namaste <strong>${customer_name}</strong>,
        </p>
        <p style="font-size:14px; line-height:1.6; color:#555; margin-bottom:24px;">
          We are delighted to confirm your upcoming stay at Siddartha Palace. Your royal room reservation has been secured. Below are your complete reservation and room allocation details:
        </p>

        <!-- Room & Stay Details Card -->
        <div style="background:#FFFFFF; border:1px solid #E3D9C6; border-radius:10px; padding:22px; margin-bottom:24px; box-shadow:0 2px 10px rgba(0,0,0,0.03);">
          <h3 style="margin:0 0 16px; font-size:17px; color:#6E1E2B; border-bottom:1px solid #F0E8DA; padding-bottom:8px;">
            🏰 Room &amp; Accommodation Details
          </h3>

          <table style="width:100%; border-collapse:collapse; font-size:14px;">
            <tr>
              <td style="padding:8px 0; color:#777; width:45%;">Room Category:</td>
              <td style="padding:8px 0; font-weight:600; color:#1B1030;">${room_type}</td>
            </tr>
            <tr>
              <td style="padding:8px 0; color:#777;">Assigned Room:</td>
              <td style="padding:8px 0; font-weight:600; color:#6E1E2B;">Room ${room_number || '101'} (Floor ${floor || '1'})</td>
            </tr>
            <tr>
              <td style="padding:8px 0; color:#777;">Check-in Date:</td>
              <td style="padding:8px 0; font-weight:600; color:#1B1030;">${check_in_date} <span style="font-weight:normal; color:#777;">(From 02:00 PM)</span></td>
            </tr>
            <tr>
              <td style="padding:8px 0; color:#777;">Check-out Date:</td>
              <td style="padding:8px 0; font-weight:600; color:#1B1030;">${check_out_date} <span style="font-weight:normal; color:#777;">(Until 11:00 AM)</span></td>
            </tr>
            <tr>
              <td style="padding:8px 0; color:#777;">Duration of Stay:</td>
              <td style="padding:8px 0; font-weight:600; color:#1B1030;">${nights} Night${nights > 1 ? 's' : ''}</td>
            </tr>
            <tr>
              <td style="padding:8px 0; color:#777;">Number of Guests:</td>
              <td style="padding:8px 0; font-weight:600; color:#1B1030;">${guests_count} Guest${guests_count > 1 ? 's' : ''}</td>
            </tr>
            ${special_requests ? `
            <tr>
              <td style="padding:8px 0; color:#777;">Special Requests:</td>
              <td style="padding:8px 0; color:#1B1030; font-style:italic;">${special_requests}</td>
            </tr>` : ''}
          </table>
        </div>

        <!-- Amenities Included -->
        <div style="background:#FAF5E8; border:1px solid #E8DCB8; border-radius:10px; padding:18px 22px; margin-bottom:24px;">
          <h4 style="margin:0 0 10px; font-size:14px; color:#6E1E2B; text-transform:uppercase; letter-spacing:1px;">
            ✨ Included Complimentary Amenities
          </h4>
          <ul style="margin:0; padding-left:20px; font-size:13px; color:#444; line-height:1.7;">
            <li>High-Speed Palace Fiber Wi-Fi throughout the property</li>
            <li>Complimentary Royal Morning High Tea &amp; Breakfast</li>
            <li>Welcome Traditional Garland &amp; Artisanal Cooler on arrival</li>
            <li>Full Access to Heritage Courtyard, Gardens &amp; Swimming Pool</li>
            <li>24-Hour In-Room Dining &amp; Dedicated Concierge Assistance</li>
            <li>Complimentary Valet Parking and Luggage Storage</li>
          </ul>
        </div>

        <!-- Payment & Billing Summary -->
        <div style="background:#FFFFFF; border:1px solid #E3D9C6; border-radius:10px; padding:20px 22px; margin-bottom:26px;">
          <h3 style="margin:0 0 14px; font-size:16px; color:#6E1E2B; border-bottom:1px solid #F0E8DA; padding-bottom:8px;">
            💳 Payment Summary
          </h3>
          <table style="width:100%; border-collapse:collapse; font-size:14px;">
            <tr>
              <td style="padding:6px 0; color:#777;">Payment Method:</td>
              <td style="padding:6px 0; text-align:right; font-weight:600;">${payment_method || 'UPI (PhonePe Auto-Amount)'}</td>
            </tr>
            <tr>
              <td style="padding:6px 0; color:#777;">Payment Status:</td>
              <td style="padding:6px 0; text-align:right; font-weight:600; color:#2E7D32;">${payment_status ? payment_status.toUpperCase() : 'COMPLETED'}</td>
            </tr>
            <tr style="border-top:1px solid #E3D9C6;">
              <td style="padding:12px 0 4px; font-size:16px; font-weight:bold; color:#1B1030;">Total Amount Paid:</td>
              <td style="padding:12px 0 4px; text-align:right; font-size:20px; font-weight:bold; color:#6E1E2B;">₹${formattedAmount}</td>
            </tr>
          </table>
        </div>

        <!-- Concierge & Hotel Contact -->
        <div style="border-top:1px solid #E3D9C6; padding-top:20px; font-size:13px; color:#666; line-height:1.6;">
          <p style="margin:0 0 6px;"><strong>Need any assistance or early check-in?</strong></p>
          <p style="margin:0;">📞 24/7 Concierge Hotline: <a href="tel:+917396704027" style="color:#6E1E2B; text-decoration:none; font-weight:600;">+91 7396704027</a></p>
          <p style="margin:4px 0 0;">💬 UPI Reference: <span style="font-family:monospace; color:#1B1030;">7396704027-2@ybl</span></p>
          <p style="margin:4px 0 0;">📍 Location: Siddartha Palace, Royal Heritage Enclave, India</p>
        </div>

      </div>

      <!-- Footer -->
      <div style="background:#ECE4D4; padding:16px 20px; text-align:center; font-size:12px; color:#777; border-top:1px solid #D8CCB5;">
        © 2026 Siddartha Palace Hotel. All rights reserved. · Safe travels and we look forward to welcoming you!
      </div>
    </div>
  `;

  if (!mailer) {
    console.log(`\n  ╔═══════════════════════════════════════════════════════════╗`);
    console.log(`  ║  📧 [EMAIL DISPATCH SIMULATION] BOOKING CONFIRMATION       ║`);
    console.log(`  ╠═══════════════════════════════════════════════════════════╣`);
    console.log(`  ║  To:             ${customer_email.padEnd(38)} ║`);
    console.log(`  ║  Guest:          ${customer_name.padEnd(38)} ║`);
    console.log(`  ║  Booking ID:     #${booking_code.padEnd(37)} ║`);
    console.log(`  ║  Room:           ${(room_type + ' (Room ' + (room_number || '101') + ')').padEnd(38)} ║`);
    console.log(`  ║  Dates:          ${(check_in_date + ' to ' + check_out_date).padEnd(38)} ║`);
    console.log(`  ║  Total Paid:     ₹${formattedAmount.padEnd(37)} ║`);
    console.log(`  ╚═══════════════════════════════════════════════════════════╝\n`);
    return { sent: true, simulated: true };
  }

  try {
    const info = await mailer.sendMail({
      from: `"Siddartha Palace Concierge" <${process.env.EMAIL_USER || 'concierge@siddarthapalace.com'}>`,
      to: customer_email,
      subject: `Booking Confirmed: #${booking_code} — ${room_type} at Siddartha Palace`,
      text: `Namaste ${customer_name}, your booking #${booking_code} for ${room_type} (Room ${room_number || '101'}) from ${check_in_date} to ${check_out_date} is confirmed! Total Paid: ₹${formattedAmount}. Concierge: +91 7396704027`,
      html: htmlContent
    });
    console.log(`  ✓ Real Booking Confirmation Email sent to ${customer_email} (MsgID: ${info.messageId})`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.warn(`  ✗ SMTP Email dispatch error (${err.message}). Logged to console.`);
    return { sent: false, error: err.message, simulated: true };
  }
}

/**
 * Send Royal Password Reset OTP Email
 */
async function sendOtpEmail(toEmail, otp) {
  const mailer = getTransporter();

  const htmlContent = `
    <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif; max-width:560px; margin:0 auto; background:#FAF7F2; border:1px solid #E3D9C6; border-radius:12px; overflow:hidden; box-shadow:0 8px 30px rgba(27,16,48,0.08);">
      <div style="background:#1B1030; padding:28px 24px; text-align:center; border-bottom:3px solid #C9A227;">
        <h1 style="color:#C9A227; margin:0; font-size:24px; letter-spacing:2px; font-family:Georgia,serif;">SIDDARTHA PALACE</h1>
        <p style="color:#F7F0E0; margin:6px 0 0; font-size:12px; letter-spacing:1px; text-transform:uppercase;">Heritage Luxury &amp; Hospitality</p>
      </div>
      <div style="padding:32px 28px; color:#1B1030;">
        <h2 style="margin-top:0; font-size:20px; color:#6E1E2B;">Password Reset Verification</h2>
        <p style="color:#555; line-height:1.6; font-size:15px;">Namaste,</p>
        <p style="color:#555; line-height:1.6; font-size:15px;">We received a request to reset the password for your Siddartha Palace account. Please use the 6-digit verification code below to proceed:</p>
        
        <div style="text-align:center; margin:28px 0;">
          <div style="display:inline-block; background:#fff; border:2px solid #C9A227; border-radius:10px; padding:16px 36px; box-shadow:0 4px 15px rgba(201,162,39,0.15);">
            <span style="font-size:32px; font-weight:bold; letter-spacing:8px; color:#6E1E2B; font-family:monospace;">${otp}</span>
          </div>
          <p style="font-size:12px; color:#888; margin-top:8px;">Valid for 10 minutes · Do not share this code with anyone</p>
        </div>

        <p style="color:#555; line-height:1.6; font-size:14px;">If you did not request this password reset, please disregard this email or contact our 24/7 concierge.</p>
        <div style="margin-top:30px; border-top:1px solid #E3D9C6; padding-top:16px; font-size:13px; color:#777;">
          <p style="margin:0;">Warm regards,<br><strong style="color:#1B1030;">Siddartha Palace Concierge Desk</strong></p>
        </div>
      </div>
      <div style="background:#ECE4D4; padding:14px 20px; text-align:center; font-size:11px; color:#888;">
        © 2026 Siddartha Palace Hotel. All rights reserved.
      </div>
    </div>
  `;

  if (!mailer) {
    console.log(`\n  📨 [Simulated Email Dispatch] To: ${toEmail} | OTP: ${otp}`);
    return { sent: true, simulated: true };
  }

  try {
    const info = await mailer.sendMail({
      from: `"Siddartha Palace Concierge" <${process.env.EMAIL_USER || 'concierge@siddarthapalace.com'}>`,
      to: toEmail,
      subject: `Your Siddartha Palace Password Reset OTP: ${otp}`,
      text: `Your Siddartha Palace password reset OTP is ${otp}. It expires in 10 minutes.`,
      html: htmlContent
    });
    console.log(`  ✓ Real Email dispatched via SMTP to ${toEmail} (MessageId: ${info.messageId})`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.warn(`  ✗ SMTP Email dispatch failed (${err.message}). Logging OTP to console.`);
    return { sent: false, error: err.message, simulated: true };
  }
}

module.exports = {
  sendBookingConfirmationEmail,
  sendOtpEmail
};
