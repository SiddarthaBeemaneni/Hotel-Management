-- ============================================================================
-- HOTEL MANAGEMENT SYSTEM (HMS) — STORED PROCEDURES & AUTOMATION
-- Target Engine: MySQL 8.0+
-- Database: hotel_management_db
-- ============================================================================

USE hotel_management_db;

DELIMITER $$

-- ----------------------------------------------------------------------------
-- 1. PROCEDURE: sp_create_reservation
-- Atomically creates a reservation, calculates totals, and books room line items
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_create_reservation$$
CREATE PROCEDURE sp_create_reservation(
    IN p_guest_id INT,
    IN p_check_in_date DATE,
    IN p_check_out_date DATE,
    IN p_number_of_guests INT,
    IN p_room_id INT,
    IN p_special_requests TEXT,
    OUT p_reservation_id INT,
    OUT p_total_amount DECIMAL(10,2)
)
BEGIN
    DECLARE v_price_per_night DECIMAL(10,2);
    DECLARE v_nights INT;
    DECLARE v_subtotal DECIMAL(10,2);

    -- Start Transaction
    START TRANSACTION;

    -- Calculate number of nights
    SET v_nights = DATEDIFF(p_check_out_date, p_check_in_date);
    IF v_nights <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid date range: check_out_date must be after check_in_date.';
    END IF;

    -- Fetch room rate
    SELECT price_per_night INTO v_price_per_night
    FROM rooms
    WHERE room_id = p_room_id;

    IF v_price_per_night IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Specified room does not exist.';
    END IF;

    -- Calculate subtotal
    SET v_subtotal = v_price_per_night * v_nights;
    SET p_total_amount = v_subtotal;

    -- Insert master reservation record
    INSERT INTO reservations (
        guest_id, check_in_date, check_out_date, number_of_guests,
        reservation_status, special_requests, total_amount
    ) VALUES (
        p_guest_id, p_check_in_date, p_check_out_date, p_number_of_guests,
        'Confirmed', p_special_requests, v_subtotal
    );

    SET p_reservation_id = LAST_INSERT_ID();

    -- Insert room line item (Trigger will check for double booking)
    INSERT INTO reservation_rooms (
        reservation_id, room_id, price_per_night, number_of_nights, subtotal
    ) VALUES (
        p_reservation_id, p_room_id, v_price_per_night, v_nights, v_subtotal
    );

    COMMIT;
END$$

-- ----------------------------------------------------------------------------
-- 2. PROCEDURE: sp_process_check_in
-- Atomically processes guest arrival, issues keys, updates room and reservation
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_process_check_in$$
CREATE PROCEDURE sp_process_check_in(
    IN p_reservation_id INT,
    IN p_room_id INT,
    IN p_employee_id INT,
    IN p_remarks TEXT,
    OUT p_check_in_id INT
)
BEGIN
    DECLARE v_guest_id INT;
    DECLARE v_status ENUM('Pending', 'Confirmed', 'Checked-In', 'Checked-Out', 'Cancelled', 'No-Show');

    START TRANSACTION;

    SELECT guest_id, reservation_status INTO v_guest_id, v_status
    FROM reservations
    WHERE reservation_id = p_reservation_id;

    IF v_guest_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Reservation not found.';
    END IF;

    IF v_status NOT IN ('Pending', 'Confirmed') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Reservation is not eligible for check-in.';
    END IF;

    -- Insert into check_ins audit table
    INSERT INTO check_ins (reservation_id, guest_id, room_id, actual_check_in, checked_in_by, remarks)
    VALUES (p_reservation_id, v_guest_id, p_room_id, NOW(), p_employee_id, p_remarks);

    SET p_check_in_id = LAST_INSERT_ID();

    -- Update reservation status
    UPDATE reservations
    SET reservation_status = 'Checked-In'
    WHERE reservation_id = p_reservation_id;

    -- Update physical room status to Occupied
    UPDATE rooms
    SET status = 'Occupied'
    WHERE room_id = p_room_id;

    COMMIT;
END$$

-- ----------------------------------------------------------------------------
-- 3. PROCEDURE: sp_process_check_out
-- Atomically completes guest departure, marks room dirty for housekeeping
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_process_check_out$$
CREATE PROCEDURE sp_process_check_out(
    IN p_reservation_id INT,
    IN p_room_id INT,
    IN p_employee_id INT,
    IN p_remarks TEXT,
    OUT p_check_out_id INT
)
BEGIN
    DECLARE v_status ENUM('Pending', 'Confirmed', 'Checked-In', 'Checked-Out', 'Cancelled', 'No-Show');

    START TRANSACTION;

    SELECT reservation_status INTO v_status
    FROM reservations
    WHERE reservation_id = p_reservation_id;

    IF v_status != 'Checked-In' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Reservation is not currently checked-in.';
    END IF;

    -- Insert into check_outs audit table
    INSERT INTO check_outs (reservation_id, room_id, actual_check_out, checked_out_by, remarks)
    VALUES (p_reservation_id, p_room_id, NOW(), p_employee_id, p_remarks);

    SET p_check_out_id = LAST_INSERT_ID();

    -- Update reservation status
    UPDATE reservations
    SET reservation_status = 'Checked-Out'
    WHERE reservation_id = p_reservation_id;

    -- Update room status to Available and housekeeping status to Dirty
    UPDATE rooms
    SET status = 'Available', housekeeping_status = 'Dirty'
    WHERE room_id = p_room_id;

    -- Automatically assign a cleaning task to Housekeeping
    INSERT INTO housekeeping_tasks (room_id, employee_id, task_type, task_date, status, notes)
    VALUES (p_room_id, NULL, 'Cleaning', CURDATE(), 'Pending', 'Post-departure turnaround cleaning required.');

    COMMIT;
END$$

-- ----------------------------------------------------------------------------
-- 4. PROCEDURE: sp_generate_invoice
-- Consolidates room stay, service orders, restaurant bills, GST & discounts
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_generate_invoice$$
CREATE PROCEDURE sp_generate_invoice(
    IN p_reservation_id INT,
    IN p_discount_code VARCHAR(40),
    OUT p_invoice_id INT,
    OUT p_final_total DECIMAL(10,2)
)
BEGIN
    DECLARE v_guest_id INT;
    DECLARE v_room_subtotal DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_service_subtotal DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_restaurant_subtotal DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_total_subtotal DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_tax_rate DECIMAL(5,2) DEFAULT 12.00;
    DECLARE v_tax_amount DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_discount_amount DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_inv_number VARCHAR(50);

    START TRANSACTION;

    -- Fetch guest & room charges
    SELECT guest_id, total_amount INTO v_guest_id, v_room_subtotal
    FROM reservations
    WHERE reservation_id = p_reservation_id;

    IF v_guest_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Reservation not found.';
    END IF;

    -- Sum service orders
    SELECT COALESCE(SUM(total_price), 0.00) INTO v_service_subtotal
    FROM service_orders
    WHERE reservation_id = p_reservation_id AND status != 'Cancelled';

    -- Sum restaurant orders
    SELECT COALESCE(SUM(total_amount), 0.00) INTO v_restaurant_subtotal
    FROM restaurant_orders
    WHERE reservation_id = p_reservation_id AND status != 'Cancelled';

    SET v_total_subtotal = v_room_subtotal + v_service_subtotal + v_restaurant_subtotal;

    -- Apply discount if valid
    IF p_discount_code IS NOT NULL AND p_discount_code != '' THEN
        SELECT 
            CASE 
                WHEN discount_type = 'Percentage' THEN LEAST((v_total_subtotal * discount_value / 100), COALESCE(maximum_discount, 999999))
                ELSE LEAST(discount_value, v_total_subtotal)
            END INTO v_discount_amount
        FROM discounts
        WHERE discount_code = p_discount_code 
          AND status = 'Active' 
          AND CURDATE() BETWEEN start_date AND end_date
          AND v_total_subtotal >= minimum_amount;

        SET v_discount_amount = COALESCE(v_discount_amount, 0.00);
    END IF;

    -- Calculate 12% GST Tax
    SET v_tax_amount = ROUND((v_total_subtotal - v_discount_amount) * (v_tax_rate / 100), 2);
    SET p_final_total = (v_total_subtotal - v_discount_amount) + v_tax_amount;

    -- Generate Unique Invoice Number (INV-YYYY-XXXXX)
    SET v_inv_number = CONCAT('INV-', YEAR(CURDATE()), '-', LPAD(FLOOR(RAND() * 89999 + 10000), 5, '0'));

    -- Insert Invoice
    INSERT INTO invoices (
        reservation_id, guest_id, invoice_number, invoice_date,
        subtotal, tax_amount, discount_amount, total_amount, payment_status
    ) VALUES (
        p_reservation_id, v_guest_id, v_inv_number, CURDATE(),
        v_total_subtotal, v_tax_amount, v_discount_amount, p_final_total, 'Unpaid'
    );

    SET p_invoice_id = LAST_INSERT_ID();

    -- Insert Room charges line item
    INSERT INTO invoice_items (invoice_id, item_type, description, quantity, unit_price, total_price)
    VALUES (p_invoice_id, 'Room', 'Room Stay Accommodation Charges', 1, v_room_subtotal, v_room_subtotal);

    -- Insert Service orders line item if any
    IF v_service_subtotal > 0 THEN
        INSERT INTO invoice_items (invoice_id, item_type, description, quantity, unit_price, total_price)
        VALUES (p_invoice_id, 'Other', 'Hotel Amenities & Incidentals', 1, v_service_subtotal, v_service_subtotal);
    END IF;

    -- Insert Restaurant line item if any
    IF v_restaurant_subtotal > 0 THEN
        INSERT INTO invoice_items (invoice_id, item_type, description, quantity, unit_price, total_price)
        VALUES (p_invoice_id, 'Food', 'Restaurant & Room Service Dining', 1, v_restaurant_subtotal, v_restaurant_subtotal);
    END IF;

    COMMIT;
END$$

DELIMITER ;
