-- ============================================================================
-- HOTEL MANAGEMENT SYSTEM (HMS) — PRODUCTION SEED DATA
-- Target Engine: MySQL 8.0+
-- Database: hotel_management_db
-- ============================================================================

USE hotel_management_db;

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE hotel_settings;
TRUNCATE TABLE discounts;
TRUNCATE TABLE users;
TRUNCATE TABLE roles;
TRUNCATE TABLE restaurant_order_items;
TRUNCATE TABLE restaurant_orders;
TRUNCATE TABLE menu_items;
TRUNCATE TABLE menu_categories;
TRUNCATE TABLE housekeeping_tasks;
TRUNCATE TABLE check_outs;
TRUNCATE TABLE check_ins;
TRUNCATE TABLE service_orders;
TRUNCATE TABLE services;
TRUNCATE TABLE invoice_items;
TRUNCATE TABLE invoices;
TRUNCATE TABLE payments;
TRUNCATE TABLE reservation_rooms;
TRUNCATE TABLE reservations;
TRUNCATE TABLE employees;
TRUNCATE TABLE departments;
TRUNCATE TABLE rooms;
TRUNCATE TABLE room_types;
TRUNCATE TABLE guests;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- 1. DEPARTMENTS (5 Departments)
-- ============================================================================
INSERT INTO departments (department_id, department_name, description) VALUES
(1, 'Front Office', 'Guest check-in, concierge, reception, and guest relations'),
(2, 'Housekeeping', 'Room cleaning, linen inventory, laundry, and public area sanitation'),
(3, 'Food & Beverage', 'Main dining hall, fine dining restaurant, bar, and room service operations'),
(4, 'Maintenance & Engineering', 'HVAC, electrical, plumbing, civil infrastructure, and safety equipment'),
(5, 'Finance & Accounts', 'Billing, procurement, night audit, payroll, and revenue management');

-- ============================================================================
-- 2. EMPLOYEES (10 Employees)
-- ============================================================================
INSERT INTO employees (employee_id, first_name, last_name, email, phone, job_title, department_id, hire_date, salary, status) VALUES
(1, 'Ananya', 'Sharma', 'ananya.sharma@siddarthapalace.com', '+919811122201', 'General Manager', 1, '2020-01-15', 125000.00, 'Active'),
(2, 'Vikram', 'Rathore', 'vikram.rathore@siddarthapalace.com', '+919811122202', 'Front Desk Manager', 1, '2021-03-10', 58000.00, 'Active'),
(3, 'Priya', 'Nair', 'priya.nair@siddarthapalace.com', '+919811122203', 'Senior Receptionist', 1, '2022-06-01', 38000.00, 'Active'),
(4, 'Sunita', 'Devi', 'sunita.devi@siddarthapalace.com', '+919811122204', 'Executive Housekeeper', 2, '2019-11-20', 48000.00, 'Active'),
(5, 'Ramesh', 'Kumar', 'ramesh.kumar@siddarthapalace.com', '+919811122205', 'Housekeeping Supervisor', 2, '2023-01-12', 28000.00, 'Active'),
(6, 'Chef Sanjeev', 'Kapoor', 'sanjeev.kapoor@siddarthapalace.com', '+919811122206', 'Executive Head Chef', 3, '2021-08-01', 95000.00, 'Active'),
(7, 'Arjun', 'Mehta', 'arjun.mehta@siddarthapalace.com', '+919811122207', 'F&B Service Lead', 3, '2022-09-15', 35000.00, 'Active'),
(8, 'Rajesh', 'Verma', 'rajesh.verma@siddarthapalace.com', '+919811122208', 'Chief Engineer', 4, '2020-05-18', 65000.00, 'Active'),
(9, 'Kavita', 'Krishnan', 'kavita.krishnan@siddarthapalace.com', '+919811122209', 'Finance Controller', 5, '2021-02-01', 75000.00, 'Active'),
(10, 'Deepak', 'Patel', 'deepak.patel@siddarthapalace.com', '+919811122210', 'Night Auditor', 5, '2023-04-10', 42000.00, 'Active');

-- ============================================================================
-- 3. ROLES & USERS (Authentication)
-- ============================================================================
INSERT INTO roles (role_id, role_name, description) VALUES
(1, 'Admin', 'Full administrative authority across all modules and reports'),
(2, 'Manager', 'Departmental management, shift oversight, and billing approvals'),
(3, 'Receptionist', 'Front desk reservations, check-ins, check-outs, and key issuing'),
(4, 'Housekeeping', 'Room status updates, inspection logging, and task completion'),
(5, 'Accountant', 'Invoice management, tax reports, accounts ledger, and refunds'),
(6, 'Restaurant Staff', 'Order taking, Kitchen Order Ticket (KOT) processing, and table billing');

-- Standard test password hash for "Admin@12345" / "Staff@12345"
INSERT INTO users (user_id, employee_id, username, password_hash, role_id, status, last_login) VALUES
(1, 1, 'admin', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQmG6W6dpEwW6y1f1f0W2', 1, 'Active', '2026-08-28 09:30:00'),
(2, 2, 'vrathore', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQmG6W6dpEwW6y1f1f0W2', 2, 'Active', '2026-08-28 08:00:00'),
(3, 3, 'pnair', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQmG6W6dpEwW6y1f1f0W2', 3, 'Active', '2026-08-28 10:15:00'),
(4, 4, 'sdevi', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQmG6W6dpEwW6y1f1f0W2', 4, 'Active', '2026-08-27 14:00:00'),
(5, 9, 'kkrishnan', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQmG6W6dpEwW6y1f1f0W2', 5, 'Active', '2026-08-28 09:00:00');

-- ============================================================================
-- 4. GUESTS (10 Guests)
-- ============================================================================
INSERT INTO guests (guest_id, first_name, last_name, email, phone, date_of_birth, gender, address, city, country, identification_type, identification_number) VALUES
(1, 'Siddartha', 'Beemaneni', 'siddarthabeemaneni@gmail.com', '+917396704027', '1995-08-14', 'Male', 'Banjara Hills Road No. 12', 'Hyderabad', 'India', 'Aadhaar', '9874-5612-3410'),
(2, 'Aditi', 'Rao', 'aditi.rao@gmail.com', '+919820011223', '1992-04-22', 'Female', 'Koregaon Park', 'Pune', 'India', 'Passport', 'Z1234567'),
(3, 'Marcus', 'Vance', 'marcus.vance@globaltravel.com', '+14155552671', '1984-11-03', 'Male', '742 Evergreen Terrace', 'San Francisco', 'United States', 'Passport', 'USA98421102'),
(4, 'Rohan', 'Deshmukh', 'rohan.deshmukh@outlook.com', '+919845099881', '1988-02-18', 'Male', 'Indiranagar 100ft Road', 'Bengaluru', 'India', 'Driving License', 'KA04201800921'),
(5, 'Sneha', 'Chatterjee', 'sneha.c@tcs.com', '+919830114477', '1994-09-30', 'Female', 'Salt Lake Sector V', 'Kolkata', 'India', 'Aadhaar', '8472-1092-4821'),
(6, 'Elena', 'Rostova', 'elena.rostova@traveler.ru', '+79165550192', '1990-07-15', 'Female', 'Nevsky Prospect 45', 'Saint Petersburg', 'Russia', 'Passport', 'RU88201944'),
(7, 'Karan', 'Johar', 'karan.johar@dharma.in', '+919821033445', '1972-05-25', 'Male', 'Bandra West Hill Road', 'Mumbai', 'India', 'Passport', 'P9823410'),
(8, 'Meera', 'Nambiar', 'meera.nambiar@gmail.com', '+919447012345', '1998-12-05', 'Female', 'Marine Drive', 'Kochi', 'India', 'Aadhaar', '5612-3849-1029'),
(9, 'David', 'Miller', 'david.miller@techcorp.co.uk', '+447700900123', '1982-03-14', 'Male', '221B Baker Street', 'London', 'United Kingdom', 'Passport', 'GBR7720194'),
(10, 'Pooja', 'Agarwal', 'pooja.agarwal@finvest.in', '+919810987654', '1991-10-10', 'Female', 'Civil Lines', 'Jaipur', 'India', 'Aadhaar', '4820-9182-3719');

-- ============================================================================
-- 5. ROOM TYPES (5 Categories)
-- ============================================================================
INSERT INTO room_types (room_type_id, type_name, description, capacity, base_price, amenities, status) VALUES
(1, 'Single', 'Elegant sanctuary tailored for the solo executive or leisure traveler', 1, 3499.00, '["High-Speed Wi-Fi", "Queen Bed", "Work Desk", "Rain Shower", "Air Conditioning"]', 'Active'),
(2, 'Double', 'Spacious royal guest room with courtyard garden views and plush bedding', 2, 4499.00, '["High-Speed Wi-Fi", "King Bed", "Courtyard View", "LED TV", "Tea/Coffee Maker", "Safe"]', 'Active'),
(3, 'Deluxe', 'Opulent heritage chambers featuring private jharokha balcony and marble bathroom', 2, 5999.00, '["Balcony", "Heritage Decor", "Mini Bar", "Marble Bathtub", "24hr Room Service", "Espresso Machine"]', 'Active'),
(4, 'Suite', 'Palatial executive suite with independent sitting parlor and bespoke butler service', 3, 9999.00, '["Separate Living Room", "Dedicated Butler", "Walk-in Wardrobe", "Jacuzzi", "Airport Transfer", "Complimentary Breakfast"]', 'Active'),
(5, 'Family', 'Expansive interconnecting suite designed for families and group stays', 4, 7499.00, '["2 King Beds", "Kids Lounge", "Dining Area", "2 Bathrooms", "Smart Entertainment System", "High-Speed Wi-Fi"]', 'Active');

-- ============================================================================
-- 6. ROOMS (20 Rooms across Floors 1, 2, 3, 4)
-- ============================================================================
INSERT INTO rooms (room_id, room_number, room_type_id, floor_number, status, housekeeping_status, price_per_night, description) VALUES
-- Floor 1
(1,  '101', 1, 1, 'Available', 'Clean', 3499.00, 'Ground floor standard single with garden path access'),
(2,  '102', 1, 1, 'Available', 'Clean', 3499.00, 'Ground floor single room near quiet library corridor'),
(3,  '103', 2, 1, 'Occupied',  'Clean', 4499.00, 'Courtyard facing double room with fountain view'),
(4,  '104', 2, 1, 'Occupied',  'Clean', 4499.00, 'East wing standard double room'),
(5,  '105', 3, 1, 'Available', 'Clean', 5999.00, 'Deluxe heritage room with private veranda'),
-- Floor 2
(6,  '201', 1, 2, 'Available', 'Clean', 3499.00, 'Second floor single room overlooking inner atrium'),
(7,  '202', 2, 2, 'Available', 'Clean', 4499.00, 'Standard double room near central elevators'),
(8,  '203', 2, 2, 'Occupied',  'Clean', 4499.00, 'Standard double room with sunrise balcony'),
(9,  '204', 3, 2, 'Reserved',  'Inspected', 5999.00, 'Deluxe chamber with hand-carved teak furnishings'),
(10, '205', 3, 2, 'Available', 'Clean', 5999.00, 'Deluxe double with marble bath and jacuzzi'),
-- Floor 3
(11, '301', 2, 3, 'Available', 'Clean', 4499.00, 'Third floor quiet standard double'),
(12, '302', 3, 3, 'Occupied',  'Clean', 5999.00, 'Deluxe room with panoramic fort views'),
(13, '303', 4, 3, 'Occupied',  'Clean', 9999.00, 'Maharaja Executive Suite with private parlor'),
(14, '304', 4, 3, 'Reserved',  'Inspected', 9999.00, 'Royal Rajput Suite with sun terrace'),
(15, '305', 5, 3, 'Available', 'Clean', 7499.00, 'Interconnected family suite with kitchenette'),
-- Floor 4
(16, '401', 1, 4, 'Maintenance', 'In Progress', 3499.00, 'Single room under AC duct maintenance'),
(17, '402', 3, 4, 'Available', 'Clean', 5999.00, 'Top floor deluxe room with sky terrace'),
(18, '403', 4, 4, 'Available', 'Clean', 9999.00, 'Imperial Suite with private rooftop plunge pool'),
(19, '404', 5, 4, 'Occupied',  'Clean', 7499.00, 'Four-sleeper luxury family apartment'),
(20, '405', 5, 4, 'Out of Service', 'Dirty', 7499.00, 'Family room scheduled for bathroom renovation');

-- ============================================================================
-- 7. HOTEL SERVICES (10 Services)
-- ============================================================================
INSERT INTO services (service_id, service_name, description, price, status) VALUES
(1,  'Airport Luxury Transfer', 'Chauffeured Mercedes/Audi pickup from International Airport', 1499.00, 'Available'),
(2,  'Ayurvedic Spa Session', '60-minute traditional Kerala Ayurvedic herbal rejuvenation massage', 2999.00, 'Available'),
(3,  'Express Laundry Service', 'Same-day wash, dry-cleaning, and pressing per load', 499.00, 'Available'),
(4,  'Heritage Palace High Tea', 'Traditional afternoon tea with royal savories in the courtyard', 799.00, 'Available'),
(5,  'Extra Rollaway Bed', 'Plush premium rollaway mattress with duvet and pillows', 1200.00, 'Available'),
(6,  'Guided Heritage City Tour', 'Private half-day heritage city monument guided tour', 2499.00, 'Available'),
(7,  'Buffet Breakfast Package', 'Unlimited multi-cuisine royal buffet breakfast per person', 650.00, 'Available'),
(8,  'Candlelight Courtyard Dinner', 'Private candlelit 5-course curated dining by the fountain', 4500.00, 'Available'),
(9,  'Yoga & Meditation Masterclass', 'Private 60-minute sunrise yoga session with master yogi', 999.00, 'Available'),
(10, 'Late Check-out Extension', 'Extended room check-out till 6:00 PM subject to availability', 1500.00, 'Available');

-- ============================================================================
-- 8. FOOD & RESTAURANT MENU (10+ Items across 4 Categories)
-- ============================================================================
INSERT INTO menu_categories (category_id, category_name, description) VALUES
(1, 'Royal Starters', 'Artisanal tikkas, kebabs, and gourmet chaats'),
(2, 'Palace Main Course', 'Heritage curries, dum biryanis, and clay oven breads'),
(3, 'Desserts & Sweets', 'Traditional royal Indian sweets and gourmet patisserie'),
(4, 'Beverages & Mocktails', 'Fresh tropical juices, artisan coffees, and signature coolers');

INSERT INTO menu_items (menu_item_id, category_id, item_name, description, price, availability_status) VALUES
(1,  1, 'Paneer Tikka Angaare', 'Smoked cottage cheese marinated in crushed royal spices', 450.00, 'Available'),
(2,  1, 'Murgh Malai Kebab', 'Tender chicken morsels in cardamom, cream, and cheese marinade', 550.00, 'Available'),
(3,  1, 'Crispy Lotus Stem Honey Chilli', 'Glazed lotus stem crisps with toasted sesame seeds', 420.00, 'Available'),
(4,  2, 'Dal Makhani Siddartha', 'Slow cooked black lentils simmered overnight with churned butter', 380.00, 'Available'),
(5,  2, 'Nawabi Dum Gosht Biryani', 'Fragrant basmati rice layered with spiced mutton and saffron', 680.00, 'Available'),
(6,  2, 'Paneer Lababdar', 'Cottage cheese cubes in a rich tomato, cashew, and onion reduction', 460.00, 'Available'),
(7,  2, 'Butter Garlic Naan', 'Clay oven leavened bread brushed with melted garlic butter', 95.00, 'Available'),
(8,  3, 'Shahi Tukda with Rabri', 'Crisp saffron brioche steeped in cardamom condensed milk', 280.00, 'Available'),
(9,  3, 'Gulab Jamun Flambé', 'Warm golden dumplings flambéed with aged spirit syrup', 250.00, 'Available'),
(10, 4, 'Royal Kesari Lassi', 'Chilled churned yogurt scented with Kashmiri saffron and pistachios', 190.00, 'Available'),
(11, 4, 'Espresso Single Origin', 'Freshly brewed artisan Arabica coffee', 150.00, 'Available');

-- ============================================================================
-- 9. DISCOUNTS & PROMOTIONS
-- ============================================================================
INSERT INTO discounts (discount_id, discount_code, description, discount_type, discount_value, start_date, end_date, minimum_amount, maximum_discount, status) VALUES
(1, 'WELCOME10', '10% discount on first royal stay reservation', 'Percentage', 10.00, '2026-01-01', '2026-12-31', 3000.00, 1500.00, 'Active'),
(2, 'PALACEVIP', 'Flat ₹2,000 off on reservations over ₹10,000', 'Fixed Amount', 2000.00, '2026-01-01', '2026-12-31', 10000.00, 2000.00, 'Active'),
(3, 'WEEKEND20', '20% off for 3+ nights weekend retreats', 'Percentage', 20.00, '2026-06-01', '2026-09-30', 8000.00, 3000.00, 'Active');

-- ============================================================================
-- 10. HOTEL SETTINGS
-- ============================================================================
INSERT INTO hotel_settings (setting_id, setting_name, setting_value, description) VALUES
(1, 'hotel_name', 'Siddartha Palace Heritage Hotel', 'Official hotel trade name'),
(2, 'hotel_currency', 'INR', 'Base operational currency ISO code'),
(3, 'hotel_currency_symbol', '₹', 'Display currency symbol'),
(4, 'default_checkin_time', '14:00', 'Standard check-in time 24-hr format'),
(5, 'default_checkout_time', '11:00', 'Standard check-out time 24-hr format'),
(6, 'gst_tax_rate_percentage', '12.00', 'Standard hospitality GST tax rate'),
(7, 'hotel_upi_id', '7396704027-2@ybl', 'Verified PhonePe UPI ID for auto-amount QR payments'),
(8, 'hotel_contact_phone', '+91 7396704027', '24/7 guest concierge telephone');

-- ============================================================================
-- 11. RESERVATIONS (10 Reservations)
-- ============================================================================
INSERT INTO reservations (reservation_id, guest_id, booking_date, check_in_date, check_out_date, number_of_guests, reservation_status, special_requests, total_amount) VALUES
(1,  1, '2026-08-25 10:00:00', '2026-08-27', '2026-08-30', 2, 'Checked-In',  'High floor, late arrival at 8 PM, extra towels', 13497.00),
(2,  2, '2026-08-26 11:30:00', '2026-08-27', '2026-08-29', 2, 'Checked-In',  'Quiet room away from elevators, feather pillows', 8998.00),
(3,  3, '2026-08-20 14:00:00', '2026-08-26', '2026-08-29', 1, 'Checked-In',  'Airport pickup required, vegetarian breakfast', 17997.00),
(4,  4, '2026-08-24 09:15:00', '2026-08-28', '2026-08-31', 3, 'Confirmed',   'Connecting rooms preferred if available', 29997.00),
(5,  5, '2026-08-25 16:45:00', '2026-08-28', '2026-08-30', 2, 'Confirmed',   'Anniversary celebration setup with flowers', 11998.00),
(6,  6, '2026-08-15 12:00:00', '2026-08-20', '2026-08-24', 2, 'Checked-Out', 'Tour guide assistance in Russian', 23996.00),
(7,  7, '2026-08-18 17:20:00', '2026-08-22', '2026-08-25', 4, 'Checked-Out', 'VIP security protocol, private dining', 22497.00),
(8,  8, '2026-08-27 08:30:00', '2026-09-01', '2026-09-04', 1, 'Pending',     'Early check-in request at 10 AM', 10497.00),
(9,  9, '2026-08-21 19:00:00', '2026-08-25', '2026-08-28', 1, 'Checked-Out', 'Business center printing access', 10497.00),
(10, 10, '2026-08-27 15:10:00', '2026-08-29', '2026-09-02', 4, 'Confirmed',  'Baby cot required in master bedroom', 29996.00);

-- ============================================================================
-- 12. RESERVATION ROOMS (Multi-Room Line Items)
-- ============================================================================
INSERT INTO reservation_rooms (reservation_room_id, reservation_id, room_id, price_per_night, number_of_nights, subtotal) VALUES
(1,  1,  3, 4499.00, 3, 13497.00),  -- Res 1: Room 103 (Double) 3 nights
(2,  2,  4, 4499.00, 2, 8998.00),   -- Res 2: Room 104 (Double) 2 nights
(3,  3, 12, 5999.00, 3, 17997.00),  -- Res 3: Room 302 (Deluxe) 3 nights
(4,  4, 13, 9999.00, 3, 29997.00),  -- Res 4: Room 303 (Suite) 3 nights
(5,  5, 10, 5999.00, 2, 11998.00),  -- Res 5: Room 205 (Deluxe) 2 nights
(6,  6,  5, 5999.00, 4, 23996.00),  -- Res 6: Room 105 (Deluxe) 4 nights
(7,  7, 19, 7499.00, 3, 22497.00),  -- Res 7: Room 404 (Family) 3 nights
(8,  8,  1, 3499.00, 3, 10497.00),  -- Res 8: Room 101 (Single) 3 nights
(9,  9,  2, 3499.00, 3, 10497.00),  -- Res 9: Room 102 (Single) 3 nights
(10, 10, 15, 7499.00, 4, 29996.00); -- Res 10: Room 305 (Family) 4 nights

-- ============================================================================
-- 13. CHECK-INS & CHECK-OUTS (Audit Tracking)
-- ============================================================================
INSERT INTO check_ins (check_in_id, reservation_id, guest_id, room_id, actual_check_in, checked_in_by, remarks) VALUES
(1, 1, 1,  3, '2026-08-27 14:15:00', 3, 'Guest checked in smoothly, issued 2 electronic key cards'),
(2, 2, 2,  4, '2026-08-27 15:30:00', 3, 'Welcome drink served, luggage assisted by bell desk'),
(3, 3, 3, 12, '2026-08-26 13:45:00', 2, 'Passport identity verified, concierge tour briefing provided'),
(4, 6, 6,  5, '2026-08-20 14:00:00', 3, 'Early check-in accommodated without surcharge'),
(5, 7, 7, 19, '2026-08-22 16:00:00', 2, 'VIP guest check-in handled directly in suite'),
(6, 9, 9,  2, '2026-08-25 14:30:00', 3, 'Business traveler check-in');

INSERT INTO check_outs (check_out_id, reservation_id, room_id, actual_check_out, checked_out_by, remarks) VALUES
(1, 6,  5, '2026-08-24 10:30:00', 3, 'Settled all incidentals, room inspection cleared'),
(2, 7, 19, '2026-08-25 11:00:00', 2, 'VIP checkout completed, limousine arranged to private airport'),
(3, 9,  2, '2026-08-28 10:45:00', 3, 'Invoice mailed to corporate email address');

-- ============================================================================
-- 14. PAYMENTS (10 Transactions across Cash, Card, UPI, Bank Transfer)
-- ============================================================================
INSERT INTO payments (payment_id, reservation_id, guest_id, payment_date, amount, payment_method, transaction_reference, payment_status, notes) VALUES
(1,  1, 1, '2026-08-25 10:05:00', 13497.00, 'UPI',           'UPI/20260825/9820194820', 'Completed', 'PhonePe Auto-Amount QR Scan payment to 7396704027-2@ybl'),
(2,  2, 2, '2026-08-26 11:35:00',  8998.00, 'Card',          'TXN_HDFC_883920192',      'Completed', 'Visa Platinum debit card payment at web portal'),
(3,  3, 3, '2026-08-20 14:05:00', 17997.00, 'Online',        'STRIPE_PI_99201948',      'Completed', 'International Mastercard authorization'),
(4,  4, 4, '2026-08-24 09:20:00', 15000.00, 'Bank Transfer', 'NEFT_ICICI_2026082498',  'Completed', '50% advance bank wire deposit'),
(5,  5, 5, '2026-08-25 16:50:00', 11998.00, 'UPI',           'UPI/20260825/4829104921', 'Completed', 'GooglePay UPI direct transfer'),
(6,  6, 6, '2026-08-20 14:10:00', 23996.00, 'Card',          'TXN_AMEX_44820192',       'Completed', 'American Express international payment'),
(7,  7, 7, '2026-08-18 17:30:00', 22497.00, 'Bank Transfer', 'RTGS_HDFC_88492019',     'Completed', 'Full stay RTGS settlement'),
(8,  8, 8, '2026-08-27 08:35:00',  5000.00, 'UPI',           'UPI/20260827/1029482019', 'Pending',   'Token reservation advance pending verification'),
(9,  9, 9, '2026-08-25 14:35:00', 10497.00, 'Card',          'TXN_CITI_98421094',       'Completed', 'Corporate Visa credit card'),
(10, 10, 10, '2026-08-27 15:15:00', 10000.00, 'Cash',        'RCPT_CASH_20260827_04',  'Completed', 'Front desk cash advance payment with receipt');

-- ============================================================================
-- 15. INVOICES & INVOICE ITEMS
-- ============================================================================
INSERT INTO invoices (invoice_id, reservation_id, guest_id, invoice_number, invoice_date, subtotal, tax_amount, discount_amount, total_amount, payment_status) VALUES
(1, 6, 6, 'INV-2026-0001', '2026-08-24', 23996.00, 2879.52, 2399.60, 24475.92, 'Paid'),
(2, 7, 7, 'INV-2026-0002', '2026-08-25', 22497.00, 2699.64, 2000.00, 23196.64, 'Paid'),
(3, 9, 9, 'INV-2026-0003', '2026-08-28', 10497.00, 1259.64, 1049.70, 10706.94, 'Paid'),
(4, 1, 1, 'INV-2026-0004', '2026-08-27', 13497.00, 1619.64, 1349.70, 13766.94, 'Paid');

INSERT INTO invoice_items (invoice_item_id, invoice_id, item_type, description, quantity, unit_price, total_price) VALUES
(1, 1, 'Room',      'Deluxe Heritage Room 105 (4 Nights)', 4, 5999.00, 23996.00),
(2, 2, 'Room',      'Luxury Family Apartment 404 (3 Nights)', 3, 7499.00, 22497.00),
(3, 3, 'Room',      'Single Chamber 102 (3 Nights)', 3, 3499.00, 10497.00),
(4, 4, 'Room',      'Double Room 103 (3 Nights)', 3, 4499.00, 13497.00),
(5, 1, 'Transport', 'Airport Luxury Transfer (Mercedes)', 1, 1499.00, 1499.00),
(6, 1, 'Spa',       'Ayurvedic Spa Session 60 Mins', 1, 2999.00, 2999.00);

-- ============================================================================
-- 16. SERVICE ORDERS
-- ============================================================================
INSERT INTO service_orders (service_order_id, reservation_id, guest_id, service_id, quantity, unit_price, total_price, order_date, status) VALUES
(1, 1, 1, 2, 1, 2999.00, 2999.00, '2026-08-27 16:00:00', 'Completed'),
(2, 1, 1, 4, 2,  799.00, 1598.00, '2026-08-28 16:30:00', 'Pending'),
(3, 2, 2, 7, 2,  650.00, 1300.00, '2026-08-28 07:30:00', 'In Progress'),
(4, 3, 3, 1, 1, 1499.00, 1499.00, '2026-08-26 12:00:00', 'Completed'),
(5, 7, 7, 8, 1, 4500.00, 4500.00, '2026-08-23 20:00:00', 'Completed');

-- ============================================================================
-- 17. HOUSEKEEPING TASKS
-- ============================================================================
INSERT INTO housekeeping_tasks (task_id, room_id, employee_id, task_type, task_date, status, notes) VALUES
(1,  1, 5, 'Inspection',          '2026-08-28', 'Completed',   'Turn-down service inspection passed 100%'),
(2,  3, 5, 'Cleaning',            '2026-08-28', 'Completed',   'Daily occupied room linen change & vacuuming'),
(3,  4, 5, 'Cleaning',            '2026-08-28', 'Completed',   'Daily occupied room refreshment'),
(4,  9, 4, 'Inspection',          '2026-08-28', 'Completed',   'Pre-arrival VIP inspection for reservation #4'),
(5, 14, 4, 'Inspection',          '2026-08-28', 'Completed',   'Pre-arrival suite setup inspection'),
(6, 16, 8, 'Maintenance Request', '2026-08-28', 'In Progress', 'Thermostat sensor replacement by Engineering'),
(7, 20, 4, 'Deep Cleaning',       '2026-08-28', 'Pending',     'Scheduled post-renovation sanitize cycle');

-- ============================================================================
-- 18. RESTAURANT ORDERS & ITEMS
-- ============================================================================
INSERT INTO restaurant_orders (order_id, guest_id, reservation_id, room_id, order_date, order_type, status, total_amount) VALUES
(1, 1, 1, 3, '2026-08-27 20:30:00', 'Room Service', 'Delivered', 1480.00),
(2, 2, 2, 4, '2026-08-27 21:00:00', 'Room Service', 'Delivered',  930.00),
(3, 3, 3, 12, '2026-08-28 13:15:00', 'Dine-In',     'Delivered',  870.00);

INSERT INTO restaurant_order_items (order_item_id, order_id, menu_item_id, quantity, unit_price, total_price) VALUES
(1, 1, 5, 1, 680.00, 680.00), -- Nawabi Dum Biryani
(2, 1, 2, 1, 550.00, 550.00), -- Murgh Malai Kebab
(3, 1, 9, 1, 250.00, 250.00), -- Gulab Jamun Flambe
(4, 2, 4, 1, 380.00, 380.00), -- Dal Makhani Siddartha
(5, 2, 6, 1, 460.00, 460.00), -- Paneer Lababdar
(6, 2, 7, 1,  90.00,  90.00), -- Butter Garlic Naan
(7, 3, 1, 1, 450.00, 450.00), -- Paneer Tikka Angaare
(8, 3, 10, 2, 190.00, 380.00),-- Royal Kesari Lassi (x2)
(9, 3, 11, 1, 150.00, 150.00);-- Espresso Single Origin
