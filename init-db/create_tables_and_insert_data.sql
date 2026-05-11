USE waitlist_db;

DROP TABLE IF EXISTS waitlist_log;
DROP TABLE IF EXISTS notification;
DROP TABLE IF EXISTS waitlist_entry;
DROP TABLE IF EXISTS status;
DROP TABLE IF EXISTS staff;
DROP TABLE IF EXISTS customer;

-- Create tables

-- Customer Table
CREATE TABLE customer (
	customer_id INT PRIMARY KEY AUTO_INCREMENT,
	first_name VARCHAR(100) NOT NULL,
	last_name VARCHAR(100) NOT NULL,
	phone_number VARCHAR(20) NOT NULL,
	email VARCHAR(100),
	preferred_contact_method VARCHAR(10) NOT NULL
		CHECK (preferred_contact_method IN ('Text', 'Email'))
);	

-- Staff Table
CREATE TABLE staff (
   staff_id INT PRIMARY KEY AUTO_INCREMENT,
   first_name VARCHAR(100) NOT NULL,
   last_name VARCHAR(100) NOT NULL,
   username VARCHAR(20) NOT NULL UNIQUE,
   password_hashed VARCHAR(255) NOT NULL
);

-- Status Table
CREATE TABLE status (
    status_id INT PRIMARY KEY AUTO_INCREMENT,
    status_name VARCHAR(20) NOT NULL UNIQUE
);

-- Waitlist_Entry Table
CREATE TABLE waitlist_entry (
    entry_id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    staff_id INT NOT NULL,
    status_id INT NOT NULL,
    party_size INT NOT NULL,
    requested_reservation_time DATETIME,
    check_in_type VARCHAR(10) NOT NULL
		CHECK (check_in_type IN ('Walk-in', 'Text', 'Web-app')),
    notes TEXT,
    reservation_code VARCHAR(20),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES customer(customer_id),
	FOREIGN KEY (staff_id) REFERENCES staff(staff_id),
    FOREIGN KEY (status_id) REFERENCES status(status_id)
);

-- Notification Table
CREATE TABLE notification (
    notification_id INT PRIMARY KEY AUTO_INCREMENT,
    entry_id INT NOT NULL,
    notification_type VARCHAR(10) NOT NULL
		CHECK (notification_type IN ('Text', 'Email')),
    notification_text TEXT NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    delivery_status VARCHAR(15) NOT NULL 		
		CHECK (delivery_status IN ('Sent', 'Not-delivered')),
    
    FOREIGN KEY (entry_id) REFERENCES waitlist_entry(entry_id)
);

-- Waitlist_Log Table
CREATE TABLE waitlist_log (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    entry_id INT NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    occurrence_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    
    FOREIGN KEY (entry_id) REFERENCES waitlist_entry(entry_id)
);

-- Insert statements

-- Customer Data
INSERT INTO customer (first_name, last_name, phone_number, email, preferred_contact_method) VALUES
('Dongthi', 'Nguyen', '4435551234', 'dongthi.nguyen@gmail.com', 'Text'),
('Steven', 'Zhang', '4105555678', 'steven.zhang@gmail.com', 'Email'),
('Chris', 'Song', '3015558899', 'chris.song@gmail.com', 'Text'),
('Aaki', 'Roka', '6675551122', 'aaki.roka@gmail.com', 'Email'),
('Vivian', 'Tran', '2405553344', 'vivian.tran@gmail.com', 'Text');

-- Staff Data
INSERT INTO staff(first_name, last_name, username, password_hashed) VALUES
('Admin', 'User', 'admin', '$2b$10$5wambVD92LxRGruDsIO0ZebFDPbO3E6JymgRUTaPvZ6TMCDlt22nW'),
('Kevin', 'Nguyen', 'Knguyen', '$2b$10$2GSYicOEdyr26jKP5pmlL.yxtReCAdWeuB3uCBDMyqjKCkIvVwfy6'),
('Vivian', 'Pham', 'Vpham', '$2b$10$ttEjPCUTfBTJo4bU6qftmu4gFR1U1RnilUZNa/dEuEsepJYzyFYEG'),
('Kim', 'Tran', 'Ktran', '$2b$10$Otl5t6AB4/ImigSYk7oxb.r3XrwOtv.7BSpcYHHLihafEa8YL.Xz.');

-- Status Data
INSERT INTO status (status_name) VALUES
('Waiting'),
('Ready'),
('Notified'),
('Seated'),
('Cancelled'),
('No-Show');

-- Waitlist_Entry Data
INSERT INTO waitlist_entry (customer_id, staff_id, status_id, party_size, requested_reservation_time, check_in_type, notes) VALUES
(1, 1, 1, 2, '2026-04-04 18:30:00', 'Walk-in', 'Window seat preferred'),
(2, 1, 1, 4, '2026-04-04 19:00:00', 'Web-app', 'Birthday celebration'),
(3, 2, 2, 3, '2026-04-04 18:45:00', 'Text', 'Allergic to peanuts'),
(4, 2, 3, 5, '2026-04-04 19:15:00', 'Walk-in', NULL),
(5, 3, 4, 2, '2026-04-04 18:20:00', 'Web-app', 'VIP customer');

-- Notification Data
INSERT INTO notification (entry_id, notification_type, notification_text, delivery_status) VALUES
(3, 'Text', 'Your table is ready!', 'Sent'),
(4, 'Email', 'Please return to the host stand.', 'Sent'),
(2, 'Text', 'You are next in line.', 'Not-delivered');

-- Waitlist_Log Data
INSERT INTO waitlist_log (entry_id, action_type, notes) VALUES
(1, 'Created', 'Customer added to waitlist'),
(2, 'Created', 'Reservation made via web'),
(3, 'Status Updated', 'Changed from Waiting to Ready'),
(3, 'Notification Sent', 'Customer notified via text'),
(5, 'Seated', 'Customer has been seated'),
(4, 'Notification Sent', 'Email notification sent');

SELECT * FROM customer;
SELECT * FROM staff;
SELECT * FROM status;
SELECT * FROM waitlist_entry;
SELECT * FROM notification;
SELECT * FROM waitlist_log;