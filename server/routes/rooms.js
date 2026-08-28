/* =========================================================
   ROOMS API — /api/rooms
   ========================================================= */

const express = require('express');
const router  = express.Router();
const { pool } = require('../db');

/* GET /api/rooms — list all rooms */
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM rooms ORDER BY room_number'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* GET /api/rooms/:id — single room */
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM rooms WHERE room_id = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Room not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* POST /api/rooms — add a room */
router.post('/', async (req, res) => {
  try {
    const { room_number, room_type, floor, rent_amount, status } = req.body;
    const [result] = await pool.execute(
      `INSERT INTO rooms (room_number, room_type, floor, rent_amount, status)
       VALUES (?, ?, ?, ?, ?)`,
      [room_number, room_type, floor || 1, rent_amount, status || 'vacant']
    );
    res.status(201).json({ success: true, data: { room_id: result.insertId } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* PUT /api/rooms/:id — update a room */
router.put('/:id', async (req, res) => {
  try {
    const { room_number, room_type, floor, rent_amount, status } = req.body;
    const [result] = await pool.execute(
      `UPDATE rooms SET room_number = ?, room_type = ?, floor = ?, rent_amount = ?, status = ?
       WHERE room_id = ?`,
      [room_number, room_type, floor, rent_amount, status, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, error: 'Room not found' });
    res.json({ success: true, message: 'Room updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* DELETE /api/rooms/:id — remove a room */
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM rooms WHERE room_id = ?',
      [req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, error: 'Room not found' });
    res.json({ success: true, message: 'Room deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
