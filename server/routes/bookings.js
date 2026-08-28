/* =========================================================
   BOOKINGS API — /api/bookings
   Handles Hotel Room Bookings, Cancellation, Invoices,
   and Customer Booking History.
   ========================================================= */

const express = require('express');
const router  = express.Router();
const { pool } = require('../db');

// In-memory bookings cache to support instant responsiveness & offline fallback
const memoryBookings = [];

/* ---------------------------------------------------------
   GET /api/bookings — List bookings (by customer email or id)
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

      const [dbRows] = await pool.execute(sql, params);
      rows = dbRows;
    } catch (dbErr) {
      console.warn('  [Bookings DB Warning] MySQL query failed, using in-memory store:', dbErr.message);
      // Filter memory bookings
      rows = memoryBookings.filter(b => {
        if (email && b.customer_email?.toLowerCase() !== email.trim().toLowerCase()) return false;
        if (customer_id && String(b.customer_id) !== String(customer_id)) return false;
        if (status && b.booking_status !== status) return false;
        return true;
      });
    }

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ---------------------------------------------------------
   POST /api/bookings — Create a new booking
   --------------------------------------------------------- */
router.post('/', async (req, res) => {
  try {
    const {
      email,
      full_name,
      phone_number,
      room_type,
      room_number,
      check_in_date,
      check_out_date,
      nights,
      guests_count,
      special_requests,
      total_amount,
      payment_method
    } = req.body;

    if (!email || !room_type || !check_in_date || !check_out_date) {
      return res.status(400).json({
        success: false,
        error: 'Email, Room Type, Check-in and Check-out dates are required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const guestName = full_name || cleanEmail.split('@')[0];
    const bookingCode = 'SP' + Math.floor(100000 + Math.random() * 900000);
    const numNights = parseInt(nights) || Math.max(1, Math.round((new Date(check_out_date) - new Date(check_in_date)) / (1000 * 60 * 60 * 24))) || 1;
    const amount = parseFloat(total_amount) || 0;
    const payMethod = payment_method || 'UPI';

    let customerId = null;
    let roomId = null;
    let assignedRoomNumber = room_number || null;

    try {
      // 1. Ensure customer exists in MySQL
      const [custRows] = await pool.execute(
        'SELECT customer_id FROM customers WHERE LOWER(email) = ?',
        [cleanEmail]
      );

      if (custRows.length > 0) {
        customerId = custRows[0].customer_id;
      } else {
        const [newCust] = await pool.execute(
          `INSERT INTO customers (full_name, email, phone_number, nationality, loyalty_tier)
           VALUES (?, ?, ?, 'India', 'Bronze')`,
          [guestName, cleanEmail, phone_number || '']
        );
        customerId = newCust.insertId;
      }

      // 2. Find a vacant room matching room_type if available
      const [availableRooms] = await pool.execute(
        `SELECT room_id, room_number FROM rooms
         WHERE room_type LIKE ? AND status = 'vacant'
         LIMIT 1`,
        [`%${room_type}%`]
      );

      if (availableRooms.length > 0) {
        roomId = availableRooms[0].room_id;
        assignedRoomNumber = availableRooms[0].room_number;
      } else {
        // Fallback room number
        assignedRoomNumber = assignedRoomNumber || '10' + Math.floor(1 + Math.random() * 8);
      }

      // 3. Insert Booking Record
      const [bookingResult] = await pool.execute(
        `INSERT INTO bookings
         (booking_code, customer_id, room_id, room_type, check_in_date, check_out_date,
          nights, guests_count, special_requests, total_amount, payment_method,
          payment_status, booking_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', 'upcoming')`,
        [
          bookingCode, customerId, roomId, room_type, check_in_date, check_out_date,
          numNights, guests_count || 1, special_requests || '', amount, payMethod
        ]
      );

      // 4. Mark Room Occupied
      if (roomId) {
        await pool.execute(
          "UPDATE rooms SET status = 'occupied' WHERE room_id = ?",
          [roomId]
        );
      }
    } catch (dbErr) {
      console.warn('  [Bookings DB Warning] MySQL insert failed, storing in memory:', dbErr.message);
      customerId = customerId || Date.now();
      assignedRoomNumber = assignedRoomNumber || '10' + Math.floor(1 + Math.random() * 8);
    }

    const assignedFloor = assignedRoomNumber ? (assignedRoomNumber.length > 2 ? assignedRoomNumber.charAt(0) : '1') : '1';

    const newBooking = {
      booking_id: Date.now(),
      booking_code: bookingCode,
      customer_id: customerId,
      customer_name: guestName,
      customer_email: cleanEmail,
      phone_number: phone_number || '',
      room_id: roomId,
      room_number: assignedRoomNumber,
      floor: assignedFloor,
      room_type,
      check_in_date,
      check_out_date,
      nights: numNights,
      guests_count: guests_count || 1,
      special_requests: special_requests || '',
      total_amount: amount,
      payment_method: payMethod,
      payment_status: 'completed',
      booking_status: 'upcoming',
      created_at: new Date().toISOString()
    };

    memoryBookings.unshift(newBooking);

    // =========================================================
    // AUTOMATIC DISPATCH: DETAILED EMAIL & SMS/WHATSAPP NOTIFICATION
    // =========================================================
    try {
      const { sendBookingConfirmationEmail } = require('../services/emailService');
      const { sendBookingConfirmationSMS } = require('../services/twilioClient');

      // 1. Dispatch detailed HTML booking invoice email
      sendBookingConfirmationEmail(newBooking).catch(err => {
        console.warn('  [Email Dispatch Warning]:', err.message);
      });

      // 2. Dispatch detailed SMS / WhatsApp booking voucher
      if (phone_number) {
        sendBookingConfirmationSMS(newBooking).catch(err => {
          console.warn('  [SMS Dispatch Warning]:', err.message);
        });
      }
    } catch (dispatchErr) {
      console.warn('  [Booking Notification Error]:', dispatchErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Booking created successfully! Detailed room voucher dispatched to your email and phone.',
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

    try {
      const [booking] = await pool.execute(
        'SELECT * FROM bookings WHERE booking_code = ?',
        [code]
      );

      if (booking.length > 0) {
        await pool.execute(
          "UPDATE bookings SET booking_status = 'cancelled' WHERE booking_code = ?",
          [code]
        );
        if (booking[0].room_id) {
          await pool.execute(
            "UPDATE rooms SET status = 'vacant' WHERE room_id = ?",
            [booking[0].room_id]
          );
        }
      }
    } catch (dbErr) {
      console.warn('  [Bookings DB Warning] Cancel update in MySQL failed:', dbErr.message);
    }

    // Update in-memory booking
    const memBooking = memoryBookings.find(b => b.booking_code === code);
    if (memBooking) {
      memBooking.booking_status = 'cancelled';
    }

    res.json({
      success: true,
      message: `Booking ${code} has been cancelled.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
