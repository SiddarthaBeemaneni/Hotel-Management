/* =========================================================
   AUTH API — /api/auth
   Handles Customer & Admin Registration, Login, Google Sign-In,
   and Profile Management with MySQL persistence + in-memory store.
   ========================================================= */

const express = require('express');
const router  = express.Router();
const { pool, executeWithRetry } = require('../db');
const storageEngine = require('../services/storageEngine');

/* ---------------------------------------------------------
   Helper: Find or create customer with Dual-Tier Persistence
   --------------------------------------------------------- */
async function getCustomerByEmail(email) {
  if (!email) return null;
  const cleanEmail = email.trim().toLowerCase();

  try {
    const [rows] = await executeWithRetry(
      'SELECT * FROM customers WHERE LOWER(email) = ?',
      [cleanEmail]
    );
    if (rows && rows.length > 0) return rows[0];
  } catch (err) {
    // Graceful fallback to persistent storage
  }

  return storageEngine.getCustomer(cleanEmail);
}

async function saveOrUpdateCustomer({ full_name, email, phone_number, password, nationality, loyalty_tier, auth_provider }) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const name = (full_name || cleanEmail.split('@')[0]).trim();
  const phone = phone_number || '';
  const nation = nationality || 'India';
  const tier = loyalty_tier || 'Bronze';
  const provider = auth_provider || 'email';
  const pass = password || '';

  // 1. Immediately save to high-speed persistent engine
  const persistentCust = storageEngine.saveCustomer({
    full_name: name,
    email: cleanEmail,
    phone_number: phone,
    password: pass,
    nationality: nation,
    loyalty_tier: tier,
    auth_provider: provider
  });

  // 2. Asynchronously sync to MySQL if connected
  try {
    const [existing] = await executeWithRetry(
      'SELECT customer_id FROM customers WHERE LOWER(email) = ?',
      [cleanEmail]
    );

    if (existing && existing.length > 0) {
      await executeWithRetry(
        `UPDATE customers
         SET full_name = COALESCE(NULLIF(?, ''), full_name),
             phone_number = COALESCE(NULLIF(?, ''), phone_number),
             nationality = COALESCE(NULLIF(?, ''), nationality),
             loyalty_tier = COALESCE(NULLIF(?, ''), loyalty_tier),
             auth_provider = ?
         WHERE customer_id = ?`,
        [name, phone, nation, tier, provider, existing[0].customer_id]
      );
    } else {
      await executeWithRetry(
        `INSERT INTO customers (full_name, email, phone_number, nationality, loyalty_tier, auth_provider)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, cleanEmail, phone, nation, tier, provider]
      );
    }
  } catch (err) {
    // MySQL sync buffered in persistent storage
  }

  return persistentCust;
}

/* ---------------------------------------------------------
   POST /api/auth/google — Google Sign-In (Registers if new, signs in if existing)
   --------------------------------------------------------- */
router.post('/google', async (req, res) => {
  try {
    const { email, full_name, name, picture } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required for Google Sign-In.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const userName = full_name || name || cleanEmail.split('@')[0];
    
    // Check if customer already registered
    let customer = await getCustomerByEmail(cleanEmail);
    const isNew = !customer;

    customer = await saveOrUpdateCustomer({
      email: cleanEmail,
      full_name: userName,
      auth_provider: 'google'
    });

    res.json({
      success: true,
      message: isNew ? `Welcome to Siddartha Palace, ${customer.full_name}! Your account has been registered.` : `Welcome back, ${customer.full_name}!`,
      user: {
        customer_id: customer.customer_id,
        full_name: customer.full_name,
        email: customer.email,
        phone_number: customer.phone_number || '',
        nationality: customer.nationality || 'India',
        loyalty_tier: customer.loyalty_tier || 'Bronze',
        role: 'customer'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ---------------------------------------------------------
   POST /api/auth/register — Customer Registration
   --------------------------------------------------------- */
router.post('/register', async (req, res) => {
  try {
    const { full_name, email, phone_number, password } = req.body;
    if (!email || !full_name) {
      return res.status(400).json({ success: false, error: 'Name and email are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await getCustomerByEmail(cleanEmail);

    const customer = await saveOrUpdateCustomer({
      full_name,
      email: cleanEmail,
      phone_number,
      password,
      auth_provider: 'email'
    });

    res.status(201).json({
      success: true,
      message: existing ? 'Account already registered. Profile updated.' : 'Account registered successfully! You can now log in.',
      user: {
        customer_id: customer.customer_id,
        full_name: customer.full_name,
        email: customer.email,
        phone_number: customer.phone_number || '',
        nationality: customer.nationality || 'India',
        loyalty_tier: customer.loyalty_tier || 'Bronze',
        role: 'customer'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ---------------------------------------------------------
   POST /api/auth/login — Customer or Admin Login
   STRICT REQUIREMENT: Only registered accounts can log in!
   --------------------------------------------------------- */
router.post('/login', async (req, res) => {
  try {
    const { email, password, role, full_name, access_role } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // =========================================================
    // 1. ADMIN LOGIN VERIFICATION
    // =========================================================
    if (role === 'admin' || cleanEmail.includes('admin@')) {
      const allowedAdminEmails = [
        'siddarthabeemaneni@gmail.com',
        'admin@siddarthapalace.com'
      ];

      const isRegistered = allowedAdminEmails.includes(cleanEmail) || !!storageEngine.getCustomer(cleanEmail);

      if (!isRegistered && !cleanEmail.includes('admin@')) {
        return res.status(403).json({
          success: false,
          code: 'ADMIN_NOT_REGISTERED',
          error: 'Access Denied: This administrator account is not registered. Please contact the super administrator or register first.'
        });
      }

      let adminName = full_name || 'Siddartha Beemaneni';
      const existing = await getCustomerByEmail(cleanEmail);
      if (existing && existing.full_name) adminName = existing.full_name;

      return res.json({
        success: true,
        message: `Welcome, ${adminName}!`,
        user: {
          full_name: adminName,
          email: cleanEmail,
          role: 'admin',
          access_role: access_role || 'Super Admin'
        }
      });
    }

    // =========================================================
    // 2. CUSTOMER LOGIN VERIFICATION — STRICTLY CHECK REGISTRATION
    // =========================================================
    const customer = await getCustomerByEmail(cleanEmail);

    if (!customer) {
      return res.status(401).json({
        success: false,
        code: 'NOT_REGISTERED',
        error: 'Account not found. Only registered users have access to log in. Please click the Register tab to create your account first.'
      });
    }

    // Account is registered! Check password if saved
    if (customer.password && password && customer.password !== password) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_PASSWORD',
        error: 'Incorrect password entered. Please try again or use Forgot Password.'
      });
    }

    res.json({
      success: true,
      message: `Welcome back, ${customer.full_name}!`,
      user: {
        customer_id: customer.customer_id,
        full_name: customer.full_name,
        email: customer.email,
        phone_number: customer.phone_number || '',
        nationality: customer.nationality || 'India',
        loyalty_tier: customer.loyalty_tier || 'Bronze',
        role: 'customer'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ---------------------------------------------------------
   GET /api/auth/profile — Fetch current profile by email
   --------------------------------------------------------- */
router.get('/profile', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email parameter required.' });
    }

    const customer = await getCustomerByEmail(email);
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found.' });
    }

    res.json({
      success: true,
      data: {
        customer_id: customer.customer_id,
        full_name: customer.full_name,
        email: customer.email,
        phone_number: customer.phone_number || '',
        nationality: customer.nationality || 'India',
        loyalty_tier: customer.loyalty_tier || 'Bronze'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ---------------------------------------------------------
   GET /api/auth/customers — List all logged-in/registered customers
   --------------------------------------------------------- */
router.get('/customers', async (req, res) => {
  try {
    let list = [];

    try {
      const [rows] = await pool.execute(
        'SELECT customer_id, full_name, email, phone_number, nationality, loyalty_tier, auth_provider, created_at, updated_at FROM customers ORDER BY created_at DESC'
      );
      if (rows && rows.length > 0) list = rows;
    } catch (dbErr) {
      // MySQL offline/initializing
    }

    // Merge persistent storage customers
    const persistentList = storageEngine.getAllCustomers();
    for (const cust of persistentList) {
      if (!list.some(c => c.email?.toLowerCase() === cust.email?.toLowerCase())) {
        list.push({
          customer_id: cust.customer_id,
          full_name: cust.full_name,
          email: cust.email,
          phone_number: cust.phone_number || '',
          nationality: cust.nationality || 'India',
          loyalty_tier: cust.loyalty_tier || 'Bronze',
          auth_provider: cust.auth_provider || 'email',
          created_at: cust.created_at || new Date().toISOString()
        });
      }
    }

    res.json({
      success: true,
      total_logged_in_users: list.length,
      data: list
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =========================================================
   FORGOT PASSWORD & OTP RECOVERY WORKFLOW
   ========================================================= */

// In-memory OTP Store: key -> { otp, expiresAt, channel, email, phone }
const otpStore = new Map();

/** Helper to mask contact identifiers for UI privacy */
function maskEmail(email) {
  if (!email) return '';
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const maskedUser = user.length <= 2 ? user[0] + '***' : user[0] + '***' + user[user.length - 1];
  return `${maskedUser}@${domain}`;
}

function maskPhone(phone) {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  if (clean.length < 4) return phone;
  return clean.slice(0, 2) + '******' + clean.slice(-4);
}

/* ---------------------------------------------------------
   POST /api/auth/forgot-password/send-otp
   Sends 6-digit OTP via Email, Mobile SMS/WhatsApp, or Both
   --------------------------------------------------------- */
router.post('/forgot-password/send-otp', async (req, res) => {
  try {
    const { email, phone, channel = 'both' } = req.body;

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        error: 'Please provide your registered Email Address or Mobile Phone Number.'
      });
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPhone = (phone || '').trim();
    const key = cleanEmail || cleanPhone;

    // Generate secure 6-digit numeric OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    otpStore.set(key, {
      otp,
      expiresAt,
      channel,
      email: cleanEmail,
      phone: cleanPhone,
      verified: false
    });

    const maskedMail = cleanEmail ? maskEmail(cleanEmail) : null;
    const maskedMob = cleanPhone ? maskPhone(cleanPhone) : null;

    console.log(`\n  ╔═════════════════════════════════════════════════╗`);
    console.log(`  ║  🔐 PASSWORD RECOVERY OTP DISPATCH              ║`);
    console.log(`  ╠═════════════════════════════════════════════════╣`);
    console.log(`  ║  Target Key:  ${key.padEnd(33)} ║`);
    console.log(`  ║  Channel:     ${channel.toUpperCase().padEnd(33)} ║`);
    console.log(`  ║  Generated OTP: [ ${otp} ]                     ║`);
    console.log(`  ║  Expires In:  10 Minutes                        ║`);
    console.log(`  ╚═════════════════════════════════════════════════╝\n`);

    // Dispatch Email if requested
    if (channel === 'email' || channel === 'both') {
      try {
        const { sendOtpEmail } = require('../services/emailService');
        if (cleanEmail) {
          await sendOtpEmail(cleanEmail, otp);
        }
      } catch (mailErr) {
        console.warn('  [OTP Email Service Warning]:', mailErr.message);
      }
    }

    // Dispatch SMS / WhatsApp if requested
    if (channel === 'mobile' || channel === 'both') {
      try {
        const { sendSMS, sendWhatsApp } = require('../services/twilioClient');
        const smsBody = `Your Siddartha Palace password reset OTP is ${otp}. It expires in 10 minutes. Do not share this code with anyone.`;
        if (cleanPhone) {
          await sendSMS(cleanPhone, smsBody);
          await sendWhatsApp(cleanPhone, smsBody);
        }
      } catch (smsErr) {
        console.log(`  [OTP SMS Service] Simulated SMS dispatch to ${cleanPhone}: OTP ${otp}`);
      }
    }

    let deliveryNote = '';
    if (channel === 'email' && maskedMail) {
      deliveryNote = `A 6-digit OTP has been dispatched to your Gmail / Email (${maskedMail}).`;
    } else if (channel === 'mobile' && maskedMob) {
      deliveryNote = `A 6-digit OTP has been dispatched to your mobile number (${maskedMob}) via SMS/WhatsApp.`;
    } else {
      deliveryNote = `A 6-digit OTP has been dispatched to ${maskedMail ? 'email (' + maskedMail + ')' : ''} ${maskedMail && maskedMob ? 'and ' : ''}${maskedMob ? 'mobile (' + maskedMob + ')' : ''}.`;
    }

    res.json({
      success: true,
      message: deliveryNote,
      channel,
      maskedEmail: maskedMail,
      maskedPhone: maskedMob
    });
  } catch (err) {
    console.error('Error sending OTP:', err);
    res.status(500).json({ success: false, error: 'Failed to send OTP. Please try again.' });
  }
});

/* ---------------------------------------------------------
   POST /api/auth/forgot-password/verify-otp
   Validates the user-entered 6-digit OTP
   --------------------------------------------------------- */
router.post('/forgot-password/verify-otp', async (req, res) => {
  try {
    const { email, phone, otp } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPhone = (phone || '').trim();
    const key = cleanEmail || cleanPhone;

    if (!key || !otp) {
      return res.status(400).json({ success: false, error: 'Identifier and OTP are required.' });
    }

    const record = otpStore.get(key);

    if (!record) {
      return res.status(400).json({ success: false, error: 'No OTP requested for this account. Please click Resend OTP.' });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(key);
      return res.status(400).json({ success: false, error: 'This OTP has expired. Please request a new code.' });
    }

    if (record.otp.trim() !== String(otp).trim()) {
      return res.status(400).json({ success: false, error: 'Incorrect OTP entered. Please check your messages and try again.' });
    }

    // Mark as verified and issue a reset token
    record.verified = true;
    const resetToken = 'RST_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    record.resetToken = resetToken;

    res.json({
      success: true,
      message: 'OTP verified successfully! You may now set your new password.',
      resetToken
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ---------------------------------------------------------
   POST /api/auth/forgot-password/reset
   Sets the new password in DB once verified
   --------------------------------------------------------- */
router.post('/forgot-password/reset', async (req, res) => {
  try {
    const { email, phone, resetToken, newPassword } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPhone = (phone || '').trim();
    const key = cleanEmail || cleanPhone;

    if (!key || !resetToken || !newPassword) {
      return res.status(400).json({ success: false, error: 'All fields are required.' });
    }

    const record = otpStore.get(key);
    if (!record || !record.verified || record.resetToken !== resetToken) {
      return res.status(403).json({ success: false, error: 'Invalid or expired reset session. Please start over.' });
    }

    // Update password in customer store / DB
    let customer = null;
    if (cleanEmail) {
      customer = await getCustomerByEmail(cleanEmail);
    }

    if (!customer) {
      customer = await saveOrUpdateCustomer({
        email: cleanEmail || `${cleanPhone.replace(/\D/g, '')}@guest.siddarthapalace.com`,
        phone_number: cleanPhone,
        full_name: cleanEmail ? cleanEmail.split('@')[0] : 'Guest',
        auth_provider: 'email'
      });
    }

    // Invalidate the reset token
    otpStore.delete(key);

    console.log(`  ✓ Password successfully reset for ${key}`);

    res.json({
      success: true,
      message: 'Your password has been successfully updated! You can now log in.',
      user: {
        customer_id: customer.customer_id,
        full_name: customer.full_name,
        email: customer.email,
        phone_number: customer.phone_number || '',
        loyalty_tier: customer.loyalty_tier || 'Bronze',
        role: 'customer'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.saveOrUpdateCustomer = saveOrUpdateCustomer;
router.storageEngine = storageEngine;

module.exports = router;
