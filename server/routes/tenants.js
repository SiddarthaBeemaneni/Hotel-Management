/* =========================================================
   TENANTS API — /api/tenants
   ========================================================= */

const express = require('express');
const router  = express.Router();
const { pool } = require('../db');

/* GET /api/tenants — list all active tenants (+ room info) */
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT t.*, r.room_number, r.room_type
      FROM tenants t
      LEFT JOIN rooms r ON t.room_id = r.room_id
      WHERE t.is_active = TRUE
      ORDER BY t.full_name
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* GET /api/tenants/all — include inactive tenants */
router.get('/all', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT t.*, r.room_number, r.room_type
      FROM tenants t
      LEFT JOIN rooms r ON t.room_id = r.room_id
      ORDER BY t.full_name
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* GET /api/tenants/:id — single tenant */
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT t.*, r.room_number, r.room_type
      FROM tenants t
      LEFT JOIN rooms r ON t.room_id = r.room_id
      WHERE t.tenant_id = ?
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Tenant not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* POST /api/tenants — add a tenant */
router.post('/', async (req, res) => {
  try {
    const {
      full_name, phone_number, email, nationality,
      room_id, check_in_date, check_out_date,
      monthly_rent, rent_due_day, loyalty_tier
    } = req.body;

    const [result] = await pool.execute(
      `INSERT INTO tenants
       (full_name, phone_number, email, nationality, room_id,
        check_in_date, check_out_date, monthly_rent, rent_due_day, loyalty_tier)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        full_name, phone_number, email || null, nationality || 'India',
        room_id || null, check_in_date || null, check_out_date || null,
        monthly_rent || 0, rent_due_day || 1, loyalty_tier || 'Bronze'
      ]
    );

    // If room_id is provided, mark the room as occupied
    if (room_id) {
      await pool.execute(
        "UPDATE rooms SET status = 'occupied' WHERE room_id = ?",
        [room_id]
      );
    }

    res.status(201).json({ success: true, data: { tenant_id: result.insertId } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* PUT /api/tenants/:id — update a tenant */
router.put('/:id', async (req, res) => {
  try {
    const {
      full_name, phone_number, email, nationality,
      room_id, check_in_date, check_out_date,
      monthly_rent, rent_due_day, loyalty_tier
    } = req.body;

    const [result] = await pool.execute(
      `UPDATE tenants SET
        full_name = ?, phone_number = ?, email = ?, nationality = ?,
        room_id = ?, check_in_date = ?, check_out_date = ?,
        monthly_rent = ?, rent_due_day = ?, loyalty_tier = ?
       WHERE tenant_id = ?`,
      [
        full_name, phone_number, email, nationality,
        room_id, check_in_date, check_out_date,
        monthly_rent, rent_due_day, loyalty_tier,
        req.params.id
      ]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, error: 'Tenant not found' });
    res.json({ success: true, message: 'Tenant updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* DELETE /api/tenants/:id — soft-delete (deactivate) */
router.delete('/:id', async (req, res) => {
  try {
    // Get tenant's room before deactivating
    const [tenant] = await pool.execute(
      'SELECT room_id FROM tenants WHERE tenant_id = ?',
      [req.params.id]
    );

    const [result] = await pool.execute(
      'UPDATE tenants SET is_active = FALSE WHERE tenant_id = ?',
      [req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, error: 'Tenant not found' });

    // Free up the room
    if (tenant.length && tenant[0].room_id) {
      await pool.execute(
        "UPDATE rooms SET status = 'vacant' WHERE room_id = ?",
        [tenant[0].room_id]
      );
    }

    res.json({ success: true, message: 'Tenant deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
