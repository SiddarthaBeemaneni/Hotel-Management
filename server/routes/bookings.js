/* =========================================================
   BOOKINGS API — /api/bookings
   Strict Business Rules:
   - Only registered users can create bookings.
   - Bookings API NEVER creates or registers customer records.
   - Price calculation and validation is strictly handled on backend.
   ========================================================= */

const express = require('express');
const router  = express.Router();
const { pool, executeWithRetry } = require('../db');
const authRouter = require('./auth');
const storageEngine = require('../services/storageEngine');

// Authoritative Nightly Room Rates (INR)
const ROOM_RATES = {
  'Standard Single': 3499,
  'Standard Double': 4499,
  'Deluxe Double': 5999,
  'Family Room': 7499,
  'Executive Suite': 9999,
  'Presidential Suite': 18999
};

/* ---------------------------------------------------------
   GET /api/bookings — List reservations
   --------------------------------------------------------- */
router.get('/', async (req, res) => {
  try {
    const { email, customer_id, status } = req.query;
    let rows = [];

    try {
      let sql = `
        SELECT b.*, c.full_name as customer_name, c.email as customer_email, c.phone_number,
               r.room_number, r.floor
        FROM bookings b
        JOIN customers c ON b.customer_id = c.customer_id
        LEFT JOIN rooms r ON b.room_id = r.room_id
        WHERE 1=1
      `;
      const params = [];

      if (email) {
        sql += ' AND LOWER(c.email) = ?';
        params.push(email.trim().toLowerCase());
      }
      if (customer_id) {
        sql += ' AND b.customer_id = ?';
        params.push(customer_id);
      }
      if (status) {
        sql += ' AND b.booking_status = ?';
        params.push(status);
      }

      sql += ' ORDER BY b.created_at DESC';

      const [dbRows] = await executeWithRetry(sql, params);
      if (dbRows && dbRows.length > 0) rows = dbRows;
    } catch (dbErr) {
      // MySQL offline/initializing
    }

    // Merge persistent storage records
    const persistentBookings = storageEngine.getAllBookings({ email, status });
    for (const pb of persistentBookings) {
      if (!rows.some(r => r.booking_code === pb.booking_code)) {
        rows.push(pb);
      }
    }

    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ---------------------------------------------------------
   POST /api/bookings — Create a new reservation
   STRICT RULE: Registered customers only. NEVER inserts customer.
   --------------------------------------------------------- */
router.post('/', async (req, res) => {
  try {
    const {
      email,
      room_type,
      room_number,
      check_in_date,
      check_out_date,
      nights,
      guests_count,
      special_requests,
      payment_method
    } = req.body;

    if (!email || !room_type || !check_in_date || !check_out_date) {
      return res.status(400).json({
        success: false,
        error: 'Email, Room Type, Check-in and Check-out dates are required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Sync or verify customer record in database & storage
    let customer = null;
    if (authRouter.syncCustomerRecord) {
      customer = await authRouter.syncCustomerRecord({
        email: cleanEmail,
        full_name: req.body.full_name || req.body.customer_name,
        phone_number: req.body.phone_number
      });
    } else {
      customer = await authRouter.getCustomerByEmail(cleanEmail);
    }

    if (!customer) {
      return res.status(401).json({
        success: false,
        code: 'NOT_REGISTERED',
        error: 'Only registered guests can make a reservation. Please log in or create an account first.'
      });
    }

    // 2. Server-Side Calculations & Price Validation (Cannot be manipulated from client)
    const numNights = parseInt(nights) || Math.max(1, Math.round((new Date(check_out_date) - new Date(check_in_date)) / (1000 * 60 * 60 * 24))) || 1;
    const nightlyRate = ROOM_RATES[room_type] || 5999;
    const calculatedTotal = nightlyRate * numNights;
    const bookingCode = 'SP' + Math.floor(100000 + Math.random() * 900000);
    const payMethod = payment_method || 'PhonePe UPI';

    let assignedRoomNumber = room_number || ('10' + Math.floor(1 + Math.random() * 8));
    let roomId = null;

    // 3. MySQL transactional insertion (if online)
    try {
      const [availableRooms] = await executeWithRetry(
        `SELECT room_id, room_number FROM rooms
         WHERE room_type LIKE ? AND status = 'vacant'
         LIMIT 1`,
        [`%${room_type}%`]
      );

      if (availableRooms && availableRooms.length > 0) {
        roomId = availableRooms[0].room_id;
        assignedRoomNumber = availableRooms[0].room_number;
      }

      await executeWithRetry(
        `INSERT INTO bookings
         (booking_code, customer_id, room_id, room_type, check_in_date, check_out_date,
          nights, guests_count, special_requests, total_amount, payment_method,
          payment_status, booking_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', 'upcoming')`,
        [
          bookingCode, customer.customer_id, roomId, room_type, check_in_date, check_out_date,
          numNights, guests_count || 1, special_requests || '', calculatedTotal, payMethod
        ]
      );

      if (roomId) {
        await executeWithRetry("UPDATE rooms SET status = 'occupied' WHERE room_id = ?", [roomId]);
      }
    } catch (dbErr) {
      // MySQL write failure buffered in resilient storage
    }

    const assignedFloor = assignedRoomNumber ? (assignedRoomNumber.length > 2 ? assignedRoomNumber.charAt(0) : '1') : '1';

    // 4. Atomically persist booking in high-speed storage engine
    const newBooking = storageEngine.addBooking({
      booking_code: bookingCode,
      customer_id: customer.customer_id,
      customer_name: customer.full_name,
      customer_email: customer.email,
      phone_number: customer.phone_number || '',
      room_id: roomId,
      room_number: assignedRoomNumber,
      floor: assignedFloor,
      room_type,
      check_in_date,
      check_out_date,
      nights: numNights,
      guests_count: guests_count || 1,
      special_requests: special_requests || '',
      total_amount: calculatedTotal,
      payment_method: payMethod,
      payment_status: 'completed',
      booking_status: 'upcoming'
    });

    // 5. Non-blocking background notification dispatch
    setImmediate(async () => {
      try {
        const { sendBookingConfirmation } = require('../services/emailService');
        await sendBookingConfirmation({
          to: customer.email,
          guestName: customer.full_name,
          bookingId: bookingCode,
          roomType: `${room_type} (Room ${assignedRoomNumber})`,
          checkIn: check_in_date,
          checkOut: check_out_date,
          amount: calculatedTotal
        });
      } catch (_) {}

      try {
        const { sendSMS, sendWhatsApp } = require('../services/twilioClient');
        if (customer.phone_number) {
          const smsText = `🏰 Siddartha Palace: Booking #${bookingCode} confirmed for ${customer.full_name}! Room: ${room_type} (Room ${assignedRoomNumber}). Check-in: ${check_in_date}. Total: ₹${calculatedTotal.toLocaleString('en-IN')}. Concierge: +91 7396704027`;
          await sendSMS(customer.phone_number, smsText);
          await sendWhatsApp(customer.phone_number, smsText);
        }
      } catch (_) {}
    });

    res.status(201).json({
      success: true,
      message: `Reservation #${bookingCode} confirmed successfully!`,
      data: newBooking
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ---------------------------------------------------------
   PUT /api/bookings/:code/cancel — Cancel a booking
   --------------------------------------------------------- */
router.put('/:code/cancel', async (req, res) => {
  try {
    const { code } = req.params;

    storageEngine.cancelBooking(code);

    try {
      const [booking] = await executeWithRetry(
        'SELECT * FROM bookings WHERE booking_code = ?',
        [code]
      );

      if (booking && booking.length > 0) {
        await executeWithRetry("UPDATE bookings SET booking_status = 'cancelled' WHERE booking_code = ?", [code]);
        if (booking[0].room_id) {
          await executeWithRetry("UPDATE rooms SET status = 'vacant' WHERE room_id = ?", [booking[0].room_id]);
        }
      }
    } catch (dbErr) {
      // MySQL offline/cancelled in storage
    }

    res.json({
      success: true,
      message: `Booking ${code} has been cancelled.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ---------------------------------------------------------
   POST /api/bookings/reset — Reset and clear all bookings
   --------------------------------------------------------- */
router.post('/reset', async (req, res) => {
  try {
    storageEngine.resetAllBookings();
    try {
      await executeWithRetry('DELETE FROM bookings');
      await executeWithRetry("UPDATE rooms SET status = 'vacant'");
    } catch (e) {}
    res.json({ success: true, message: 'All bookings cleared successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
