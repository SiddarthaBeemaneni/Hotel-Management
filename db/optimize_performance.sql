-- ============================================================================
-- SIDDARTHA PALACE HMS — HIGH-CONCURRENCY DATABASE OPTIMIZATION
-- Target Engine: MySQL 8.0+ / InnoDB High Performance
-- Purpose: Sub-millisecond queries, race-condition protection & high scalability
-- ============================================================================

USE hotel_management_db;

-- ----------------------------------------------------------------------------
-- 1. HIGH-SPEED INDEXING FOR HIGH CONCURRENCY LOOKUPS
-- ----------------------------------------------------------------------------

-- A. Customers & Guests Lookups
CREATE INDEX IF NOT EXISTS idx_customers_email_phone ON customers(email, phone_number);
CREATE INDEX IF NOT EXISTS idx_customers_loyalty ON customers(loyalty_tier);
CREATE INDEX IF NOT EXISTS idx_guests_email_phone ON guests(email, phone);

-- B. Bookings & Reservations Lookups
CREATE INDEX IF NOT EXISTS idx_bookings_lookup ON bookings(customer_id, booking_status, check_in_date);
CREATE INDEX IF NOT EXISTS idx_bookings_code ON bookings(booking_code);
CREATE INDEX IF NOT EXISTS idx_reservations_status_dates ON reservations(reservation_status, check_in_date, check_out_date);

-- C. Room Inventory & Availability Searches
CREATE INDEX IF NOT EXISTS idx_rooms_status_type ON rooms(status, room_type_id);
CREATE INDEX IF NOT EXISTS idx_rooms_rate ON rooms(price_per_night);

-- D. Invoices & Payments Ledger
CREATE INDEX IF NOT EXISTS idx_invoices_guest_date ON invoices(guest_id, invoice_date, payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_res_method ON payments(reservation_id, payment_method, payment_status);

-- ----------------------------------------------------------------------------
-- 2. INNODB ROW FORMAT & COMPRESSION OPTIMIZATIONS
-- ----------------------------------------------------------------------------
ALTER TABLE guests ENGINE=InnoDB ROW_FORMAT=DYNAMIC;
ALTER TABLE rooms ENGINE=InnoDB ROW_FORMAT=DYNAMIC;
ALTER TABLE reservations ENGINE=InnoDB ROW_FORMAT=DYNAMIC;
ALTER TABLE reservation_rooms ENGINE=InnoDB ROW_FORMAT=DYNAMIC;
ALTER TABLE invoices ENGINE=InnoDB ROW_FORMAT=DYNAMIC;
ALTER TABLE payments ENGINE=InnoDB ROW_FORMAT=DYNAMIC;
ALTER TABLE housekeeping_tasks ENGINE=InnoDB ROW_FORMAT=DYNAMIC;

-- ----------------------------------------------------------------------------
-- 3. ANALYZE & OPTIMIZE TABLE STATISTICS FOR QUERY OPTIMIZER
-- ----------------------------------------------------------------------------
ANALYZE TABLE guests, rooms, reservations, reservation_rooms, invoices, payments, users;
