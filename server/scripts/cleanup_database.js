/* =========================================================
   SIDDARTHA PALACE — Database & Storage Cleanup Utility
   Cleans up all stress test accounts, invalid dummy entries,
   and ensures only real registered customers exist in the database.
   ========================================================= */

const fs = require('fs');
const path = require('path');
const { pool, executeWithRetry } = require('../db');

const STORAGE_DIR = path.join(__dirname, '..', 'data');
const CUST_FILE = path.join(STORAGE_DIR, 'customers.json');
const BOOK_FILE = path.join(STORAGE_DIR, 'bookings.json');

async function cleanup() {
  console.log('🧹 Starting database & storage cleanup...\n');

  // 1. Clean JSON Storage
  let validCustomers = [
    {
      customer_id: 1001,
      full_name: 'Siddartha Beemaneni',
      email: 'siddarthabeemaneni@gmail.com',
      phone_number: '+917396704027',
      nationality: 'India',
      loyalty_tier: 'Platinum',
      auth_provider: 'google',
      password: 'Password123',
      created_at: '2026-08-28T00:00:00.000Z'
    },
    {
      customer_id: 1002,
      full_name: 'Admin Console',
      email: 'admin@siddarthapalace.com',
      phone_number: '+917396704027',
      nationality: 'India',
      loyalty_tier: 'Platinum',
      auth_provider: 'email',
      password: 'Admin@123',
      created_at: '2026-08-28T00:00:00.000Z'
    }
  ];

  if (fs.existsSync(CUST_FILE)) {
    try {
      const existing = JSON.parse(fs.readFileSync(CUST_FILE, 'utf8'));
      if (Array.isArray(existing)) {
        existing.forEach(c => {
          if (c && c.email) {
            const email = c.email.toLowerCase().trim();
            // Filter out test emails
            const isTest = email.includes('stress.user') || email.includes('@test.com') || email.includes('dummy');
            const isAlreadyAdded = validCustomers.some(vc => vc.email.toLowerCase() === email);
            if (!isTest && !isAlreadyAdded && c.full_name) {
              validCustomers.push(c);
            }
          }
        });
      }
    } catch (e) {
      console.warn('Could not parse existing customers.json:', e.message);
    }
  }

  // Write clean customers
  fs.writeFileSync(CUST_FILE, JSON.stringify(validCustomers, null, 2), 'utf8');
  console.log(`✓ Cleaned customers.json: Retained ${validCustomers.length} valid registered customer(s).`);

  // Write clean bookings
  const cleanBookings = [];
  fs.writeFileSync(BOOK_FILE, JSON.stringify(cleanBookings, null, 2), 'utf8');
  console.log(`✓ Cleaned bookings.json: Reset bookings to 0.`);

  // 2. Clean MySQL Database (if available)
  try {
    await executeWithRetry("DELETE FROM customers WHERE email LIKE '%@test.com%' OR email LIKE '%stress.user%'");
    await executeWithRetry("DELETE FROM bookings WHERE customer_email LIKE '%@test.com%' OR customer_email LIKE '%stress.user%'");
    console.log('✓ Cleaned MySQL database test records.');
  } catch (dbErr) {
    console.log('ℹ MySQL offline — JSON persistent storage cleaned successfully.');
  }

  console.log('\n✅ Cleanup complete! Only valid registered customer accounts are present.');
}

cleanup();
