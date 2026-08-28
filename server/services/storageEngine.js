/* =========================================================
   SIDDARTHA PALACE — Production Storage Engine
   Features:
   - Automatically stores & updates all logged-in and registered customers
   - Atomic disk persistence with sub-millisecond in-memory cache
   - Real-time reflection in Admin Console and Guest Portal
   ========================================================= */

const fs = require('fs');
const path = require('path');

const STORAGE_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

const FILES = {
  customers: path.join(STORAGE_DIR, 'customers.json'),
  bookings:  path.join(STORAGE_DIR, 'bookings.json'),
  rooms:     path.join(STORAGE_DIR, 'rooms.json'),
  payments:  path.join(STORAGE_DIR, 'payments.json')
};

const memoryStore = {
  customers: new Map(),
  bookings:  [],
  rooms:     [],
  payments:  []
};

// Authoritative root admin accounts
const DEFAULT_ACCOUNTS = [
  {
    customer_id: 1001,
    full_name: 'Siddartha Beemaneni',
    email: 'siddarthabeemaneni@gmail.com',
    phone_number: '+917396704027',
    nationality: 'India',
    loyalty_tier: 'Platinum',
    auth_provider: 'google',
    password: 'Password123',
    created_at: '2026-08-28T00:00:00.000Z',
    last_login: new Date().toISOString()
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
    created_at: '2026-08-28T00:00:00.000Z',
    last_login: new Date().toISOString()
  }
];

function initializeStorage() {
  try {
    // 1. Customers
    if (fs.existsSync(FILES.customers)) {
      const data = JSON.parse(fs.readFileSync(FILES.customers, 'utf8'));
      if (Array.isArray(data)) {
        data.forEach(c => {
          if (c && c.email) {
            const cleanEmail = c.email.toLowerCase().trim();
            if (!cleanEmail.includes('stress.user') && !cleanEmail.includes('@test.com')) {
              memoryStore.customers.set(cleanEmail, c);
            }
          }
        });
      }
    }
    // Ensure default accounts exist
    DEFAULT_ACCOUNTS.forEach(acc => {
      if (!memoryStore.customers.has(acc.email.toLowerCase())) {
        memoryStore.customers.set(acc.email.toLowerCase(), acc);
      }
    });

    // 2. Bookings
    if (fs.existsSync(FILES.bookings)) {
      const data = JSON.parse(fs.readFileSync(FILES.bookings, 'utf8'));
      if (Array.isArray(data)) {
        memoryStore.bookings = data.filter(b => b && b.booking_code);
      }
    }

    console.log(`✓ Storage Initialized: ${memoryStore.customers.size} Logged-in/Registered Customers, ${memoryStore.bookings.length} Bookings.`);
  } catch (err) {
    console.warn('⚠️ [Storage Init Error]:', err.message);
    DEFAULT_ACCOUNTS.forEach(acc => memoryStore.customers.set(acc.email.toLowerCase(), acc));
  }
}

function atomicWrite(filePath, data) {
  const tempPath = `${filePath}.tmp.${Date.now()}`;
  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch (_) {}
    }
    console.error(`✗ [Storage Write Error] ${filePath}:`, err.message);
  }
}

let saveCustTimeout = null;
let saveBookTimeout = null;

function queueSaveCustomers() {
  if (saveCustTimeout) clearTimeout(saveCustTimeout);
  saveCustTimeout = setTimeout(() => {
    const list = Array.from(memoryStore.customers.values());
    atomicWrite(FILES.customers, list);
  }, 100);
}

function queueSaveBookings() {
  if (saveBookTimeout) clearTimeout(saveBookTimeout);
  saveBookTimeout = setTimeout(() => {
    atomicWrite(FILES.bookings, memoryStore.bookings);
  }, 100);
}

// -----------------------------------------------------------------------------
// CUSTOMER DATA OPERATIONS
// -----------------------------------------------------------------------------

function getCustomer(email) {
  if (!email) return null;
  return memoryStore.customers.get(email.trim().toLowerCase()) || null;
}

function getAllCustomers() {
  return Array.from(memoryStore.customers.values());
}

/**
 * Save or Update Customer Details on Login, Google Sign-in, or Registration.
 * Automatically persists to database so details are immediately visible to the Admin.
 */
function saveOrUpdateCustomer({ full_name, email, phone_number, password, nationality, loyalty_tier, auth_provider }) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) return null;

  const existing = memoryStore.customers.get(cleanEmail);
  const now = new Date().toISOString();

  let name = (full_name || cleanEmail.split('@')[0]).trim();
  // Don't overwrite an existing real full name with an email handle
  if (existing && existing.full_name && (!full_name || full_name === cleanEmail.split('@')[0])) {
    name = existing.full_name;
  }

  const updated = {
    customer_id: existing ? existing.customer_id : (Date.now() + Math.floor(Math.random() * 1000)),
    full_name: name,
    email: cleanEmail,
    phone_number: phone_number || existing?.phone_number || '',
    password: password || existing?.password || '',
    nationality: nationality || existing?.nationality || 'India',
    loyalty_tier: loyalty_tier || existing?.loyalty_tier || 'Bronze',
    auth_provider: auth_provider || existing?.auth_provider || 'email',
    created_at: existing ? existing.created_at : now,
    updated_at: now,
    last_login: now
  };

  memoryStore.customers.set(cleanEmail, updated);
  queueSaveCustomers();
  return updated;
}

/**
 * Update an existing customer without overwriting unprovided fields
 */
function updateCustomer(email, updateFields = {}) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) return null;

  const existing = memoryStore.customers.get(cleanEmail);
  if (!existing) return null;

  const updated = {
    ...existing,
    ...updateFields,
    customer_id: existing.customer_id,
    email: cleanEmail,
    updated_at: new Date().toISOString()
  };

  memoryStore.customers.set(cleanEmail, updated);
  queueSaveCustomers();
  return updated;
}

// -----------------------------------------------------------------------------
// BOOKING OPERATIONS
// -----------------------------------------------------------------------------

function getAllBookings(filter = {}) {
  let list = [...memoryStore.bookings];
  if (filter.email) {
    list = list.filter(b => b.customer_email?.toLowerCase() === filter.email.trim().toLowerCase());
  }
  if (filter.status) {
    list = list.filter(b => b.booking_status === filter.status);
  }
  return list;
}

function addBooking(bookingData) {
  const booking = {
    booking_id: bookingData.booking_id || Date.now() + Math.floor(Math.random() * 1000),
    ...bookingData,
    created_at: bookingData.created_at || new Date().toISOString()
  };

  memoryStore.bookings.unshift(booking);
  queueSaveBookings();
  return booking;
}

function cancelBooking(code) {
  const b = memoryStore.bookings.find(item => item.booking_code === code);
  if (b) {
    b.booking_status = 'cancelled';
    b.cancelled_at = new Date().toISOString();
    queueSaveBookings();
    return b;
  }
  return null;
}

function resetAllBookings() {
  memoryStore.bookings = [];
  queueSaveBookings();
}

initializeStorage();

module.exports = {
  getCustomer,
  getAllCustomers,
  saveOrUpdateCustomer,
  updateCustomer,
  getAllBookings,
  addBooking,
  cancelBooking,
  resetAllBookings
};
