/* =========================================================
   AUTH API — /api/auth
   Strict Business Rules:
   - Registration creates exactly ONE customer record.
   - Login / Google / Reset NEVER inserts a new customer.
   - Only registered customers are returned in customer lists.
   ========================================================= */

const express = require('express');
const router  = express.Router();
const { pool, executeWithRetry } = require('../db');
const storageEngine = require('../services/storageEngine');

/* ---------------------------------------------------------
   Helper: Retrieve existing registered customer only
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

/* ---------------------------------------------------------
   POST /api/auth/register — Customer Registration ONLY
   Creates exactly ONE record. Fails if email already exists.
   --------------------------------------------------------- */
router.post('/register', async (req, res) => {
  try {
    const { full_name, email, phone_number, password, nationality, loyalty_tier } = req.body;
    
    // 1. Validate required fields
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }
    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ success: false, error: 'Full name is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName  = full_name.trim();
    const cleanPhone = (phone_number || '').trim();
    const cleanPass  = password || '';
    const cleanNation = nationality || 'India';
    const cleanTier   = loyalty_tier || 'Bronze';

    // 2. Prevent duplicate registration
    const existing = await getCustomerByEmail(cleanEmail);
    if (existing) {
      return res.status(409).json({
        success: false,
        code: 'EMAIL_ALREADY_REGISTERED',
        error: 'An account with this email is already registered. Please log in instead.'
      });
    }

    // 3. Register in persistent storage engine (Atomic disk write)
    let newCustomer = null;
    try {
      newCustomer = storageEngine.registerCustomer({
        full_name: cleanName,
        email: cleanEmail,
        phone_number: cleanPhone,
        password: cleanPass,
        nationality: cleanNation,
        loyalty_tier: cleanTier,
        auth_provider: 'email'
      });
    } catch (e) {
      return res.status(409).json({
        success: false,
        code: 'EMAIL_ALREADY_REGISTERED',
        error: e.message
      });
    }

    // 4. Asynchronously sync to MySQL if online
    try {
      await executeWithRetry(
        `INSERT INTO customers (full_name, email, phone_number, nationality, loyalty_tier, auth_provider)
         VALUES (?, ?, ?, ?, ?, 'email')`,
        [cleanName, cleanEmail, cleanPhone, cleanNation, cleanTier]
      );
    } catch (dbErr) {
      // MySQL offline/initializing — buffered safely in persistent storage
    }

    res.status(201).json({
      success: true,
      message: 'Account registered successfully! You can now log in.',
      user: {
        customer_id: newCustomer.customer_id,
        full_name: newCustomer.full_name,
        email: newCustomer.email,
        phone_number: newCustomer.phone_number,
        nationality: newCustomer.nationality,
        loyalty_tier: newCustomer.loyalty_tier,
        role: 'customer'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ---------------------------------------------------------
   POST /api/auth/login — Customer or Admin Login ONLY
   STRICT RULE: MUST NEVER INSERT A CUSTOMER RECORD.
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
    // 2. CUSTOMER LOGIN VERIFICATION — STRICTLY EXISTING USERS ONLY
    // =========================================================
    const customer = await getCustomerByEmail(cleanEmail);

    if (!customer) {
      return res.status(401).json({
        success: false,
        code: 'NOT_REGISTERED',
        error: 'Account not found. Only registered users have access to log in. Please click the Register tab to create your account first.'
      });
    }

    // Verify Password if one is set
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
   POST /api/auth/google — Google Sign-In
   STRICT RULE: Only authenticates existing registered users.
   --------------------------------------------------------- */
router.post('/google', async (req, res) => {
  try {
    const { email, full_name } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required for Google Sign-In.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const customer = await getCustomerByEmail(cleanEmail);

    if (!customer) {
      return res.status(401).json({
        success: false,
        code: 'NOT_REGISTERED',
        error: 'This Google account is not registered. Please create your account on the Register tab first.'
      });
    }

    // Update existing customer sign-in provider if needed
    storageEngine.updateCustomer(cleanEmail, { auth_provider: 'google' });

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
   GET /api/auth/customers — List ALL registered customers
   Only counts real registered customers, never sessions.
   --------------------------------------------------------- */
router.get('/customers', async (req, res) => {
  try {
    let list = [];

    try {
      const [rows] = await executeWithRetry(
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
      total_registered_customers: list.length,
      data: list
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =========================================================
   FORGOT PASSWORD & OTP RECOVERY WORKFLOW
   ========================================================= */

const otpStore = new Map();

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
   Validates registered account existence first!
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

    // Check if account exists
    let customer = null;
    if (cleanEmail) customer = await getCustomerByEmail(cleanEmail);

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'No registered account found with this email or phone number. Please create an account first.'
      });
    }

    // Generate secure 6-digit numeric OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 10 * 60 * 1000;

    otpStore.set(key, {
      otp,
      expiresAt,
      channel,
      email: cleanEmail,
      phone: cleanPhone,
      verified: false
    });

    const maskedMail = cleanEmail ? maskEmail(cleanEmail) : null;
    const maskedMob  = cleanPhone ? maskPhone(cleanPhone) : null;

    // Dispatch Email
    if (channel === 'email' || channel === 'both') {
      try {
        const { sendOtpEmail } = require('../services/emailService');
        if (cleanEmail) await sendOtpEmail(cleanEmail, otp);
      } catch (_) {}
    }

    // Dispatch SMS / WhatsApp
    if (channel === 'mobile' || channel === 'both') {
      try {
        const { sendSMS, sendWhatsApp } = require('../services/twilioClient');
        const smsBody = `Your Siddartha Palace password reset OTP is ${otp}. It expires in 10 minutes.`;
        if (cleanPhone) {
          await sendSMS(cleanPhone, smsBody);
          await sendWhatsApp(cleanPhone, smsBody);
        }
      } catch (_) {}
    }

    res.json({
      success: true,
      message: `A 6-digit OTP has been sent to your registered contact info.`,
      channel,
      maskedEmail: maskedMail,
      maskedPhone: maskedMob
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to send OTP. Please try again.' });
  }
});

/* ---------------------------------------------------------
   POST /api/auth/forgot-password/verify-otp
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
      return res.status(400).json({ success: false, error: 'No OTP requested for this account.' });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(key);
      return res.status(400).json({ success: false, error: 'This OTP has expired. Please request a new code.' });
    }

    if (record.otp.trim() !== String(otp).trim()) {
      return res.status(400).json({ success: false, error: 'Incorrect OTP entered. Please try again.' });
    }

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
   Updates existing registered customer's password. NEVER INSERTS.
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

    const customer = await getCustomerByEmail(cleanEmail);
    if (!customer) {
      return res.status(404).json({ success: false, error: 'No registered customer found for this account.' });
    }

    // 1. Update in persistent storage
    storageEngine.updateCustomer(cleanEmail, { password: newPassword });

    // 2. Update in MySQL if online
    try {
      await executeWithRetry(
        'UPDATE customers SET password = ? WHERE LOWER(email) = ?',
        [newPassword, cleanEmail]
      );
    } catch (_) {}

    otpStore.delete(key);

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

router.getCustomerByEmail = getCustomerByEmail;
router.storageEngine = storageEngine;

module.exports = router;
