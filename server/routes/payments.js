/* =========================================================
   PAYMENTS API — /api/payments
   ========================================================= */

const express = require('express');
const router  = express.Router();
const { pool } = require('../db');

/* GET /api/payments — list payments (optionally filter) */
router.get('/', async (req, res) => {
  try {
    const { tenant_id, status, month_year } = req.query;
    let sql = `
      SELECT rp.*, t.full_name, t.phone_number, r.room_number
      FROM rent_payments rp
      JOIN tenants t ON rp.tenant_id = t.tenant_id
      LEFT JOIN rooms r ON t.room_id = r.room_id
      WHERE 1=1
    `;
    const params = [];

    if (tenant_id) { sql += ' AND rp.tenant_id = ?'; params.push(tenant_id); }
    if (status)    { sql += ' AND rp.payment_status = ?'; params.push(status); }
    if (month_year){ sql += ' AND rp.month_year = ?'; params.push(month_year); }

    sql += ' ORDER BY rp.created_at DESC';

    const [rows] = await pool.execute(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* GET /api/payments/summary — aggregate stats */
router.get('/summary', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
        SUM(CASE WHEN payment_status = 'paid' THEN amount_paid ELSE 0 END) as total_paid,
        SUM(CASE WHEN payment_status IN ('pending','partial') THEN (amount_due - amount_paid) ELSE 0 END) as total_pending,
        COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN payment_status = 'partial' THEN 1 END) as partial_count,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_count
      FROM rent_payments
      WHERE month_year = DATE_FORMAT(CURDATE(), '%Y-%m')
    `);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* POST /api/payments — record a new payment entry */
router.post('/', async (req, res) => {
  try {
    const { tenant_id, month_year, amount_due, amount_paid, payment_method, payment_status, payment_date } = req.body;
    const [result] = await pool.execute(
      `INSERT INTO rent_payments
       (tenant_id, month_year, amount_due, amount_paid, payment_method, payment_status, payment_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        tenant_id, month_year, amount_due,
        amount_paid || 0, payment_method || 'cash',
        payment_status || 'pending', payment_date || null
      ]
    );
    res.status(201).json({ success: true, data: { payment_id: result.insertId } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* PUT /api/payments/:id — update payment (mark as paid/partial) */
router.put('/:id', async (req, res) => {
  try {
    const { amount_paid, payment_method, payment_status, payment_date } = req.body;
    const [result] = await pool.execute(
      `UPDATE rent_payments
       SET amount_paid = ?, payment_method = ?, payment_status = ?, payment_date = ?
       WHERE payment_id = ?`,
      [
        amount_paid, payment_method, payment_status,
        payment_date || new Date().toISOString().split('T')[0],
        req.params.id
      ]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, error: 'Payment not found' });
    res.json({ success: true, message: 'Payment updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
