/* =========================================================
   SIDDARTHA PALACE — MySQL Connection Pool
   ========================================================= */

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'siddartha_palace',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Return dates as strings, not JS Date objects
  dateStrings: true
});

// Quick connectivity check on startup
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✓ MySQL connected —', process.env.DB_NAME || 'siddartha_palace');
    conn.release();
  } catch (err) {
    console.error('✗ MySQL connection failed:', err.message);
    console.log('  → Server will continue, but database routes will return errors.');
    console.log('  → Make sure MySQL is running and .env credentials are correct.');
  }
}

module.exports = { pool, testConnection };
