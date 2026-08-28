-- ============================================================================
-- HOTEL MANAGEMENT SYSTEM (HMS) — PRODUCTION DATABASE SCHEMA
-- Target Engine: MySQL 8.0+
-- Standard: 3NF Normalized Relational Database
-- ============================================================================

CREATE DATABASE IF NOT EXISTS hotel_management_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hotel_management_db;

-- ----------------------------------------------------------------------------
-- DISABLE FOREIGN KEY CHECKS DURING INITIAL SETUP
-- ----------------------------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;

DROP VIEW IF EXISTS vw_room_occupancy;
DROP VIEW IF EXISTS vw_revenue_summary;
DROP VIEW IF EXISTS vw_reservation_summary;
DROP VIEW IF EXISTS vw_current_guests;
DROP VIEW IF EXISTS vw_available_rooms;

DROP TABLE IF EXISTS hotel_settings;
DROP TABLE IF EXISTS discounts;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS restaurant_order_items;
DROP TABLE IF EXISTS restaurant_orders;
DROP TABLE IF EXISTS menu_items;
DROP TABLE IF EXISTS menu_categories;
DROP TABLE IF EXISTS housekeeping_tasks;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS service_orders;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS invoice_items;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS check_outs;
DROP TABLE IF EXISTS check_ins;
DROP TABLE IF EXISTS reservation_rooms;
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS room_types;
DROP TABLE IF EXISTS guests;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- 1. GUESTS TABLE
-- ============================================================================
CREATE TABLE guests (
    guest_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(60) NOT NULL,
    last_name VARCHAR(60) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    phone VARCHAR(25) NOT NULL,
    date_of_birth DATE NULL,
    gender ENUM('Male', 'Female', 'Non-Binary', 'Prefer Not to Say') DEFAULT 'Prefer Not to Say',
    address VARCHAR(255) NULL,
    city VARCHAR(80) NULL,
    country VARCHAR(80) NOT NULL DEFAULT 'India',
    identification_type ENUM('Passport', 'Aadhaar', 'Driving License', 'National ID', 'Voter ID') NOT NULL DEFAULT 'Aadhaar',
    identification_number VARCHAR(80) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_guest_email (email),
    INDEX idx_guest_phone (phone),
    INDEX idx_guest_name (last_name, first_name)
) ENGINE=InnoDB;

-- ============================================================================
-- 2. ROOM TYPES TABLE
-- ============================================================================
CREATE TABLE room_types (
    room_type_id INT AUTO_INCREMENT PRIMARY KEY,
    type_name VARCHAR(60) NOT NULL UNIQUE,
    description TEXT NULL,
    capacity INT NOT NULL DEFAULT 2 CHECK (capacity > 0),
    base_price DECIMAL(10,2) NOT NULL CHECK (base_price >= 0),
    amenities JSON NULL,
    status ENUM('Active', 'Inactive', 'Under Renovation') NOT NULL DEFAULT 'Active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_room_type_name (type_name)
) ENGINE=InnoDB;

-- ============================================================================
-- 3. ROOMS TABLE
-- ============================================================================
CREATE TABLE rooms (
    room_id INT AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(20) NOT NULL UNIQUE,
    room_type_id INT NOT NULL,
    floor_number INT NOT NULL CHECK (floor_number >= 0),
    status ENUM('Available', 'Occupied', 'Reserved', 'Maintenance', 'Out of Service') NOT NULL DEFAULT 'Available',
    housekeeping_status ENUM('Clean', 'Dirty', 'In Progress', 'Inspected', 'Do Not Disturb') NOT NULL DEFAULT 'Clean',
    price_per_night DECIMAL(10,2) NOT NULL CHECK (price_per_night >= 0),
    description VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_rooms_room_type
        FOREIGN KEY (room_type_id) REFERENCES room_types(room_type_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    INDEX idx_room_number (room_number),
    INDEX idx_room_status (status),
    INDEX idx_room_type (room_type_id),
    INDEX idx_room_housekeeping (housekeeping_status)
) ENGINE=InnoDB;

-- ============================================================================
-- 4. RESERVATIONS TABLE
-- ============================================================================
CREATE TABLE reservations (
    reservation_id INT AUTO_INCREMENT PRIMARY KEY,
    guest_id INT NOT NULL,
    booking_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    number_of_guests INT NOT NULL DEFAULT 1 CHECK (number_of_guests > 0),
    reservation_status ENUM('Pending', 'Confirmed', 'Checked-In', 'Checked-Out', 'Cancelled', 'No-Show') NOT NULL DEFAULT 'Pending',
    special_requests TEXT NULL,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_reservations_guest
        FOREIGN KEY (guest_id) REFERENCES guests(guest_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_reservation_dates
        CHECK (check_out_date > check_in_date),
    INDEX idx_res_guest (guest_id),
    INDEX idx_res_dates (check_in_date, check_out_date),
    INDEX idx_res_status (reservation_status),
    INDEX idx_res_booking_date (booking_date)
) ENGINE=InnoDB;

-- ============================================================================
-- 5. RESERVATION ROOMS TABLE (Supports Multi-Room Bookings)
-- ============================================================================
CREATE TABLE reservation_rooms (
    reservation_room_id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL,
    room_id INT NOT NULL,
    price_per_night DECIMAL(10,2) NOT NULL CHECK (price_per_night >= 0),
    number_of_nights INT NOT NULL CHECK (number_of_nights > 0),
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_res_rooms_reservation
        FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_res_rooms_room
        FOREIGN KEY (room_id) REFERENCES rooms(room_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    UNIQUE KEY uk_res_room (reservation_id, room_id),
    INDEX idx_res_rooms_res (reservation_id),
    INDEX idx_res_rooms_room (room_id)
) ENGINE=InnoDB;

-- ============================================================================
-- 6. CHECK-IN / CHECK-OUT AUDIT TABLES
-- ============================================================================
CREATE TABLE check_ins (
    check_in_id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL,
    guest_id INT NOT NULL,
    room_id INT NOT NULL,
    actual_check_in DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    checked_in_by INT NULL, -- references employees(employee_id)
    remarks TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_checkin_reservation
        FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_checkin_guest
        FOREIGN KEY (guest_id) REFERENCES guests(guest_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_checkin_room
        FOREIGN KEY (room_id) REFERENCES rooms(room_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    INDEX idx_checkin_res (reservation_id),
    INDEX idx_checkin_date (actual_check_in)
) ENGINE=InnoDB;

CREATE TABLE check_outs (
    check_out_id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL,
    room_id INT NOT NULL,
    actual_check_out DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    checked_out_by INT NULL, -- references employees(employee_id)
    remarks TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_checkout_reservation
        FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_checkout_room
        FOREIGN KEY (room_id) REFERENCES rooms(room_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    INDEX idx_checkout_res (reservation_id),
    INDEX idx_checkout_date (actual_check_out)
) ENGINE=InnoDB;

-- ============================================================================
-- 7. PAYMENTS TABLE
-- ============================================================================
CREATE TABLE payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL,
    guest_id INT NOT NULL,
    payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_method ENUM('Cash', 'Card', 'UPI', 'Bank Transfer', 'Online') NOT NULL DEFAULT 'UPI',
    transaction_reference VARCHAR(120) NULL UNIQUE,
    payment_status ENUM('Pending', 'Completed', 'Failed', 'Refunded', 'Partially Refunded') NOT NULL DEFAULT 'Pending',
    notes VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_reservation
        FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_payments_guest
        FOREIGN KEY (guest_id) REFERENCES guests(guest_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    INDEX idx_payment_res (reservation_id),
    INDEX idx_payment_status (payment_status),
    INDEX idx_payment_date (payment_date),
    INDEX idx_payment_ref (transaction_reference)
) ENGINE=InnoDB;

-- ============================================================================
-- 8. INVOICES TABLE
-- ============================================================================
CREATE TABLE invoices (
    invoice_id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL,
    guest_id INT NOT NULL,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    invoice_date DATE NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    payment_status ENUM('Unpaid', 'Partially Paid', 'Paid', 'Cancelled') NOT NULL DEFAULT 'Unpaid',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_invoices_reservation
        FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_invoices_guest
        FOREIGN KEY (guest_id) REFERENCES guests(guest_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    INDEX idx_invoice_number (invoice_number),
    INDEX idx_invoice_res (reservation_id),
    INDEX idx_invoice_status (payment_status)
) ENGINE=InnoDB;

-- ============================================================================
-- 9. INVOICE ITEMS TABLE
-- ============================================================================
CREATE TABLE invoice_items (
    invoice_item_id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    item_type ENUM('Room', 'Food', 'Beverage', 'Laundry', 'Room Service', 'Spa', 'Transport', 'Other') NOT NULL DEFAULT 'Room',
    description VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_invoice_items_invoice
        FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    INDEX idx_inv_item_invoice (invoice_id),
    INDEX idx_inv_item_type (item_type)
) ENGINE=InnoDB;

-- ============================================================================
-- 10. HOTEL SERVICES TABLE
-- ============================================================================
CREATE TABLE services (
    service_id INT AUTO_INCREMENT PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    status ENUM('Available', 'Unavailable', 'Seasonal') NOT NULL DEFAULT 'Available',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_service_name (service_name)
) ENGINE=InnoDB;

-- ============================================================================
-- 11. SERVICE ORDERS TABLE
-- ============================================================================
CREATE TABLE service_orders (
    service_order_id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL,
    guest_id INT NOT NULL,
    service_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
    order_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status ENUM('Pending', 'In Progress', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_service_orders_res
        FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_service_orders_guest
        FOREIGN KEY (guest_id) REFERENCES guests(guest_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_service_orders_service
        FOREIGN KEY (service_id) REFERENCES services(service_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    INDEX idx_svc_orders_res (reservation_id),
    INDEX idx_svc_orders_status (status)
) ENGINE=InnoDB;

-- ============================================================================
-- 12 & 13. DEPARTMENTS & EMPLOYEES
-- ============================================================================
CREATE TABLE departments (
    department_id INT AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(80) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_dept_name (department_name)
) ENGINE=InnoDB;

CREATE TABLE employees (
    employee_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(60) NOT NULL,
    last_name VARCHAR(60) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    phone VARCHAR(25) NOT NULL,
    job_title VARCHAR(80) NOT NULL,
    department_id INT NOT NULL,
    hire_date DATE NOT NULL,
    salary DECIMAL(10,2) NOT NULL CHECK (salary >= 0),
    status ENUM('Active', 'On Leave', 'Suspended', 'Terminated') NOT NULL DEFAULT 'Active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_employees_dept
        FOREIGN KEY (department_id) REFERENCES departments(department_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    INDEX idx_emp_dept (department_id),
    INDEX idx_emp_email (email),
    INDEX idx_emp_status (status)
) ENGINE=InnoDB;

-- Add optional foreign keys from check_ins/check_outs to employees
ALTER TABLE check_ins
    ADD CONSTRAINT fk_checkin_employee
    FOREIGN KEY (checked_in_by) REFERENCES employees(employee_id)
    ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE check_outs
    ADD CONSTRAINT fk_checkout_employee
    FOREIGN KEY (checked_out_by) REFERENCES employees(employee_id)
    ON UPDATE CASCADE ON DELETE SET NULL;

-- ============================================================================
-- 14. HOUSEKEEPING TASKS TABLE
-- ============================================================================
CREATE TABLE housekeeping_tasks (
    task_id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    employee_id INT NULL,
    task_type ENUM('Cleaning', 'Deep Cleaning', 'Inspection', 'Maintenance Request') NOT NULL DEFAULT 'Cleaning',
    task_date DATE NOT NULL,
    status ENUM('Pending', 'In Progress', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_housekeeping_room
        FOREIGN KEY (room_id) REFERENCES rooms(room_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_housekeeping_emp
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    INDEX idx_hk_room (room_id),
    INDEX idx_hk_status (status),
    INDEX idx_hk_date (task_date)
) ENGINE=InnoDB;

-- ============================================================================
-- 15. FOOD & RESTAURANT MODULE
-- ============================================================================
CREATE TABLE menu_categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(80) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE menu_items (
    menu_item_id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    item_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    availability_status ENUM('Available', 'Out of Stock', 'Discontinued') NOT NULL DEFAULT 'Available',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_menu_items_category
        FOREIGN KEY (category_id) REFERENCES menu_categories(category_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    INDEX idx_menu_category (category_id),
    INDEX idx_menu_availability (availability_status)
) ENGINE=InnoDB;

CREATE TABLE restaurant_orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    guest_id INT NULL,
    reservation_id INT NULL,
    room_id INT NULL,
    order_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    order_type ENUM('Dine-In', 'Room Service', 'Takeaway') NOT NULL DEFAULT 'Dine-In',
    status ENUM('Received', 'Preparing', 'Delivered', 'Cancelled') NOT NULL DEFAULT 'Received',
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_rest_orders_guest
        FOREIGN KEY (guest_id) REFERENCES guests(guest_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_rest_orders_res
        FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_rest_orders_room
        FOREIGN KEY (room_id) REFERENCES rooms(room_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    INDEX idx_rest_orders_date (order_date),
    INDEX idx_rest_orders_status (status)
) ENGINE=InnoDB;

CREATE TABLE restaurant_order_items (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    menu_item_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rest_item_order
        FOREIGN KEY (order_id) REFERENCES restaurant_orders(order_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_rest_item_menu
        FOREIGN KEY (menu_item_id) REFERENCES menu_items(menu_item_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    INDEX idx_rest_item_order (order_id)
) ENGINE=InnoDB;

-- ============================================================================
-- 16. USERS & ROLES AUTHENTICATION
-- ============================================================================
CREATE TABLE roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(60) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NULL UNIQUE,
    username VARCHAR(60) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    status ENUM('Active', 'Inactive', 'Locked') NOT NULL DEFAULT 'Active',
    last_login DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_employee
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id) REFERENCES roles(role_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    INDEX idx_user_username (username),
    INDEX idx_user_role (role_id)
) ENGINE=InnoDB;

-- ============================================================================
-- 17. DISCOUNTS TABLE
-- ============================================================================
CREATE TABLE discounts (
    discount_id INT AUTO_INCREMENT PRIMARY KEY,
    discount_code VARCHAR(40) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    discount_type ENUM('Percentage', 'Fixed Amount') NOT NULL DEFAULT 'Percentage',
    discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    minimum_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (minimum_amount >= 0),
    maximum_discount DECIMAL(10,2) NULL CHECK (maximum_discount >= 0),
    status ENUM('Active', 'Expired', 'Disabled') NOT NULL DEFAULT 'Active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_discount_dates CHECK (end_date >= start_date),
    INDEX idx_discount_code (discount_code),
    INDEX idx_discount_status (status)
) ENGINE=InnoDB;

-- ============================================================================
-- 18. HOTEL SETTINGS TABLE
-- ============================================================================
CREATE TABLE hotel_settings (
    setting_id INT AUTO_INCREMENT PRIMARY KEY,
    setting_name VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    description VARCHAR(255) NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_setting_name (setting_name)
) ENGINE=InnoDB;

-- ============================================================================
-- DOUBLE-BOOKING PREVENTION: TRIGGERS
-- ============================================================================
DELIMITER $$

CREATE TRIGGER trg_prevent_double_booking_insert
BEFORE INSERT ON reservation_rooms
FOR EACH ROW
BEGIN
    DECLARE v_check_in DATE;
    DECLARE v_check_out DATE;
    DECLARE v_conflict_count INT;

    -- Retrieve check-in & check-out dates of current reservation
    SELECT check_in_date, check_out_date
      INTO v_check_in, v_check_out
      FROM reservations
     WHERE reservation_id = NEW.reservation_id;

    -- Count overlapping confirmed/checked-in/pending reservations for this room
    SELECT COUNT(*)
      INTO v_conflict_count
      FROM reservation_rooms rr
      JOIN reservations r ON rr.reservation_id = r.reservation_id
     WHERE rr.room_id = NEW.room_id
       AND rr.reservation_id != NEW.reservation_id
       AND r.reservation_status IN ('Pending', 'Confirmed', 'Checked-In')
       AND NOT (r.check_out_date <= v_check_in OR r.check_in_date >= v_check_out);

    IF v_conflict_count > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Double booking conflict detected: Room is already booked for the selected overlapping date range.';
    END IF;
END$$

DELIMITER ;

-- ============================================================================
-- DATABASE VIEWS
-- ============================================================================

-- 1. Available Rooms View (Current general availability)
CREATE OR REPLACE VIEW vw_available_rooms AS
SELECT 
    r.room_id,
    r.room_number,
    rt.type_name AS room_type,
    rt.capacity,
    r.floor_number,
    r.price_per_night,
    r.status AS room_status,
    r.housekeeping_status
FROM rooms r
JOIN room_types rt ON r.room_type_id = rt.room_type_id
WHERE r.status = 'Available' AND r.housekeeping_status = 'Clean';

-- 2. Current Checked-In Guests View
CREATE OR REPLACE VIEW vw_current_guests AS
SELECT 
    ci.check_in_id,
    r.reservation_id,
    g.guest_id,
    CONCAT(g.first_name, ' ', g.last_name) AS guest_full_name,
    g.email,
    g.phone,
    rm.room_number,
    rt.type_name AS room_type,
    ci.actual_check_in,
    res.check_out_date AS scheduled_check_out,
    res.number_of_guests,
    res.total_amount
FROM check_ins ci
JOIN reservations res ON ci.reservation_id = res.reservation_id
JOIN guests g ON ci.guest_id = g.guest_id
JOIN rooms rm ON ci.room_id = rm.room_id
JOIN room_types rt ON rm.room_type_id = rt.room_type_id
LEFT JOIN check_outs co ON ci.reservation_id = co.reservation_id AND ci.room_id = co.room_id
WHERE res.reservation_status = 'Checked-In' AND co.check_out_id IS NULL;

-- 3. Comprehensive Reservation Summary View
CREATE OR REPLACE VIEW vw_reservation_summary AS
SELECT 
    r.reservation_id,
    CONCAT(g.first_name, ' ', g.last_name) AS guest_name,
    g.email AS guest_email,
    g.phone AS guest_phone,
    GROUP_CONCAT(rm.room_number ORDER BY rm.room_number SEPARATOR ', ') AS booked_rooms,
    r.check_in_date,
    r.check_out_date,
    DATEDIFF(r.check_out_date, r.check_in_date) AS total_nights,
    r.number_of_guests,
    r.reservation_status,
    r.total_amount,
    COALESCE(SUM(p.amount), 0.00) AS total_paid,
    (r.total_amount - COALESCE(SUM(p.amount), 0.00)) AS balance_due
FROM reservations r
JOIN guests g ON r.guest_id = g.guest_id
LEFT JOIN reservation_rooms rr ON r.reservation_id = rr.reservation_id
LEFT JOIN rooms rm ON rr.room_id = rm.room_id
LEFT JOIN payments p ON r.reservation_id = p.reservation_id AND p.payment_status = 'Completed'
GROUP BY r.reservation_id, g.first_name, g.last_name, g.email, g.phone, r.check_in_date, r.check_out_date, r.number_of_guests, r.reservation_status, r.total_amount;

-- 4. Monthly Revenue Summary View
CREATE OR REPLACE VIEW vw_revenue_summary AS
SELECT 
    DATE_FORMAT(payment_date, '%Y-%m') AS revenue_month,
    payment_method,
    COUNT(payment_id) AS total_transactions,
    SUM(amount) AS total_revenue
FROM payments
WHERE payment_status = 'Completed'
GROUP BY DATE_FORMAT(payment_date, '%Y-%m'), payment_method;

-- 5. Room Occupancy Rate View
CREATE OR REPLACE VIEW vw_room_occupancy AS
SELECT 
    rt.type_name AS room_type,
    COUNT(r.room_id) AS total_rooms,
    SUM(CASE WHEN r.status = 'Occupied' THEN 1 ELSE 0 END) AS occupied_rooms,
    SUM(CASE WHEN r.status = 'Available' THEN 1 ELSE 0 END) AS available_rooms,
    SUM(CASE WHEN r.status = 'Maintenance' OR r.status = 'Out of Service' THEN 1 ELSE 0 END) AS out_of_service_rooms,
    ROUND((SUM(CASE WHEN r.status = 'Occupied' THEN 1 ELSE 0 END) / COUNT(r.room_id)) * 100, 2) AS occupancy_rate_percentage
FROM rooms r
JOIN room_types rt ON r.room_type_id = rt.room_type_id
GROUP BY rt.type_name;
