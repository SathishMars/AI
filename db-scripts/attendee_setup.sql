-- DEVELOPMENT ONLY: Creates database and loads sample test data
-- ⚠️  WARNING: This script contains hardcoded test data and should NEVER be run in production
-- ⚠️  This is for local development/testing only
-- 
-- Run with: psql -U postgres -f db-scripts/attendee_setup.sql
-- 
-- For production:
--   1. Database should be created by infrastructure/DBA
--   2. Schema should be managed via migrations (not this script)
--   3. Data should come from real sources (not hardcoded INSERTs)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'attendee') THEN
    CREATE DATABASE attendee;
  END IF;
END$$;

\connect attendee

CREATE TABLE IF NOT EXISTS public.attendee (
  id BIGSERIAL PRIMARY KEY,
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  title TEXT,
  mailing_address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  company_name TEXT,
  prefix TEXT,
  employee_id TEXT,
  concur_login_id TEXT,
  attendee_type TEXT,
  registration_status TEXT,
  manual_status TEXT,
  room_status TEXT,
  air_status TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  internal_notes TEXT
);

-- Optional: a view with the original Excel column names (with spaces)
CREATE OR REPLACE VIEW public.attendee_excel AS
SELECT
  id,
  first_name AS "First Name",
  middle_name AS "Middle Name",
  last_name AS "Last Name",
  email AS "Email",
  phone AS "Phone",
  mobile AS "Mobile",
  title AS "Title",
  mailing_address AS "Mailing Address",
  city AS "City",
  state AS "State",
  postal_code AS "Postal Code",
  country AS "Country",
  company_name AS "Company Name",
  prefix AS "Prefix",
  employee_id AS "Employee Id",
  concur_login_id AS "Concur Login Id",
  attendee_type AS "Attendee Type",
  registration_status AS "Registration Status",
  manual_status AS "Manual Status",
  room_status AS "Room Status",
  air_status AS "Air Status",
  created_at AS "Created At",
  updated_at AS "Updated At",
  internal_notes AS "Internal Notes"
FROM public.attendee;

-- Load rows (will append; clear table first if you want a fresh load)
-- TRUNCATE TABLE public.attendee RESTART IDENTITY;

INSERT INTO public.attendee (
  first_name, middle_name, last_name, email, phone, mobile, title, mailing_address, city, state, postal_code, country, company_name, prefix, employee_id, concur_login_id, attendee_type, registration_status, manual_status, room_status, air_status, created_at, updated_at, internal_notes
) VALUES
  ('Meera', 'K.', 'Das', 'meera.das1@example.com', '+44 20 1791 2186', '+44 7940 661913', 'Product Manager', '242 MG Road', 'London', 'England', 'SW1A 1AA', 'United Kingdom', 'Globex', 'Mrs.', 'EMP-1001', 'meera.das@globex.com', 'Regular', 'Registered', 'Pending Review', 'Booked', 'Ticketed', '2025-09-03 00:00:00'::timestamp, '2025-09-11 00:00:00'::timestamp, 'Late registration'),
  ('Vihaan', 'P.', 'Saxena', 'vihaan.saxena2@example.com', '+44 20 3028 4657', '+44 7745 757911', 'UX Designer', '22 High St', 'Delhi', 'Delhi', '110001', 'India', 'Globex', 'Mr.', 'EMP-1002', 'vihaan.saxena@globex.com', 'VIP', 'Pending', 'Pending Review', 'Not Booked', 'Ticketed', '2025-09-18 00:00:00'::timestamp, '2025-09-19 00:00:00'::timestamp, 'Speaker coordination required'),
  ('Diya', 'M.', 'Patel', 'diya.patel3@example.com', '+44 20 2688 4078', '+44 7481 202163', 'Operations Manager', '168 High St', 'London', 'England', 'SW1A 1AA', 'United Kingdom', 'Globex', 'Mr.', 'EMP-1003', 'diya.patel@globex.com', 'Regular', 'Registered', 'Pending Review', 'Not Booked', 'Cancelled', '2025-09-15 00:00:00'::timestamp, '2025-09-20 00:00:00'::timestamp, 'VIP guest – priority handling'),
  ('Riya', 'P.', 'Patel', 'riya.patel4@example.com', '+44 20 4999 2341', '+44 7688 414834', 'Operations Manager', '83 MG Road', 'Pune', 'Maharashtra', '411001', 'India', 'Initech', 'Dr.', 'EMP-1004', 'riya.patel@initech.com', 'Staff', 'Registered', 'Pending Review', 'Booked', 'Not Ticketed', '2025-09-05 00:00:00'::timestamp, '2025-09-12 00:00:00'::timestamp, 'Late registration'),
  ('Vihaan', 'A.', 'Iyer', 'vihaan.iyer5@example.com', '+44 20 6140 6572', '+44 7811 467188', 'UX Designer', '27 King St', 'Pune', 'Maharashtra', '411001', 'India', 'Globex', 'Dr.', 'EMP-1005', 'vihaan.iyer@globex.com', 'Staff', 'Registered', 'Rejected', 'Booked', 'Ticketed', '2025-09-10 00:00:00'::timestamp, '2025-09-20 00:00:00'::timestamp, 'Speaker coordination required'),
  ('Ira', 'P.', 'Kulkarni', 'ira.kulkarni6@example.com', '+44 20 5662 7320', '+44 7784 463861', 'Data Scientist', '166 King St', 'Birmingham', 'England', 'B1 1AA', 'United Kingdom', 'Initech', 'Dr.', 'EMP-1006', 'ira.kulkarni@initech.com', 'Regular', 'Registered', 'Pending Review', 'Booked', 'Cancelled', '2025-09-08 00:00:00'::timestamp, '2025-09-14 00:00:00'::timestamp, 'Late registration'),
  ('Rahul', NULL, 'Patel', 'rahul.patel7@example.com', '+44 20 8359 7580', '+44 7662 391335', 'Event Planner', '190 Park Ave', 'Bengaluru', 'Karnataka', '560001', 'India', 'Wayne Enterprises', 'Dr.', 'EMP-1007', 'rahul.patel@wayneenterprises.com', 'Staff', 'Registered', 'Pending Review', 'Booked', 'Ticketed', '2025-09-03 00:00:00'::timestamp, '2025-09-05 00:00:00'::timestamp, 'Requires special assistance'),
  ('Riya', 'A.', 'Khan', 'riya.khan8@example.com', '+44 20 1197 8945', '+44 7951 717740', 'Event Planner', '47 Park Ave', 'London', 'England', 'SW1A 1AA', 'United Kingdom', 'Fabrikam', 'Mrs.', 'EMP-1008', 'riya.khan@fabrikam.com', 'Regular', 'Registered', 'Pending Review', 'Booked', 'Cancelled', '2025-09-17 00:00:00'::timestamp, '2025-09-26 00:00:00'::timestamp, NULL),
  ('Kavya', 'P.', 'Mehta', 'kavya.mehta9@example.com', '+44 20 7428 7521', '+44 7508 513264', 'Product Manager', '25 High St', 'Delhi', 'Delhi', '110001', 'India', 'Hooli', 'Dr.', 'EMP-1009', 'kavya.mehta@hooli.com', 'VIP', 'Registered', 'Approved', 'Booked', 'Not Ticketed', '2025-09-20 00:00:00'::timestamp, '2025-09-20 00:00:00'::timestamp, NULL),
  ('Aarav', 'M.', 'Nair', 'aarav.nair10@example.com', '+44 20 9791 2662', '+44 7472 743550', 'Data Scientist', '48 Main Rd', 'Delhi', 'Delhi', '110001', 'India', 'Contoso', 'Mr.', 'EMP-1010', 'aarav.nair@contoso.com', 'Staff', 'Registered', 'Pending Review', 'Booked', 'Ticketed', '2025-09-16 00:00:00'::timestamp, '2025-09-23 00:00:00'::timestamp, 'Late registration'),
  ('Rahul', 'R.', 'Iyer', 'rahul.iyer11@example.com', '+44 20 3361 2674', '+44 7867 459279', 'Sales Director', '62 MG Road', 'London', 'England', 'SW1A 1AA', 'United Kingdom', 'TfL', 'Dr.', 'EMP-1011', 'rahul.iyer@tfl.com', 'Regular', 'Registered', 'Approved', 'Cancelled', 'Not Ticketed', '2025-09-21 00:00:00'::timestamp, '2025-09-22 00:00:00'::timestamp, 'VIP guest – priority handling'),
  ('Karan', 'R.', 'Patel', 'karan.patel12@example.com', '+44 20 6827 4650', '+44 7645 667874', 'Operations Manager', '166 High St', 'Hyderabad', 'Telangana', '500001', 'India', 'Hooli', 'Mrs.', 'EMP-1012', 'karan.patel@hooli.com', 'Sponsor', 'Pending', 'Rejected', 'Booked', 'Ticketed', '2025-09-17 00:00:00'::timestamp, '2025-09-24 00:00:00'::timestamp, 'VIP guest – priority handling'),
  ('Zara', NULL, 'Sharma', 'zara.sharma13@example.com', '+44 20 5577 8737', '+44 7365 303051', 'UX Designer', '103 King St', 'Mumbai', 'Maharashtra', '400001', 'India', 'Stark Industries', 'Mrs.', 'EMP-1013', 'zara.sharma@starkindustries.com', 'Regular', 'Registered', 'Approved', 'Not Booked', 'Ticketed', '2025-09-16 00:00:00'::timestamp, '2025-09-25 00:00:00'::timestamp, 'Speaker coordination required'),
  ('Aarav', 'S.', 'Chatterjee', 'aarav.chatterjee14@example.com', '+44 20 2389 2964', '+44 7497 920304', 'Marketing Lead', '212 Main Rd', 'Delhi', 'Delhi', '110001', 'India', 'TfL', 'Dr.', 'EMP-1014', 'aarav.chatterjee@tfl.com', 'VIP', 'Cancelled', 'Rejected', 'Not Booked', 'Not Ticketed', '2025-09-13 00:00:00'::timestamp, '2025-09-14 00:00:00'::timestamp, 'Requires special assistance'),
  ('Ishaan', 'K.', 'Sharma', 'ishaan.sharma15@example.com', '+44 20 3476 8624', '+44 7925 787717', 'Event Planner', '49 MG Road', 'Mumbai', 'Maharashtra', '400001', 'India', 'Hooli', 'Dr.', 'EMP-1015', 'ishaan.sharma@hooli.com', 'Regular', 'Registered', 'Rejected', 'Cancelled', 'Ticketed', '2025-09-17 00:00:00'::timestamp, '2025-09-19 00:00:00'::timestamp, 'Late registration'),
  ('Kabir', 'P.', 'Gupta', 'kabir.gupta16@example.com', '+44 20 1458 5126', '+44 7317 407197', 'Operations Manager', '76 MG Road', 'Mumbai', 'Maharashtra', '400001', 'India', 'Globex', 'Ms.', 'EMP-1016', 'kabir.gupta@globex.com', 'Regular', 'Registered', 'Rejected', 'Not Booked', 'Not Ticketed', '2025-09-19 00:00:00'::timestamp, '2025-09-27 00:00:00'::timestamp, 'Late registration'),
  ('Karan', 'K.', 'Mehta', 'karan.mehta17@example.com', '+44 20 3487 9577', '+44 7622 119613', 'Consultant', '208 High St', 'London', 'England', 'SW1A 1AA', 'United Kingdom', 'Globex', 'Ms.', 'EMP-1017', 'karan.mehta@globex.com', 'Regular', 'Registered', 'Rejected', 'Booked', 'Cancelled', '2025-09-02 00:00:00'::timestamp, '2025-09-07 00:00:00'::timestamp, 'Speaker coordination required'),
  ('Karan', 'M.', 'Bose', 'karan.bose18@example.com', '+44 20 2738 1930', '+44 7354 300599', 'Sales Director', '153 King St', 'Pune', 'Maharashtra', '411001', 'India', 'Mars-Techs', 'Mr.', 'EMP-1018', 'karan.bose@mars-techs.com', 'Speaker', 'Cancelled', 'Pending Review', 'Not Booked', 'Cancelled', '2025-09-17 00:00:00'::timestamp, '2025-09-26 00:00:00'::timestamp, 'Speaker coordination required'),
  ('Kabir', 'A.', 'Singh', 'kabir.singh19@example.com', '+44 20 8411 9325', '+44 7646 946580', 'Consultant', '246 MG Road', 'Bengaluru', 'Karnataka', '560001', 'India', 'Wayne Enterprises', 'Ms.', 'EMP-1019', 'kabir.singh@wayneenterprises.com', 'Sponsor', 'Registered', 'Pending Review', 'Booked', 'Not Ticketed', '2025-09-04 00:00:00'::timestamp, '2025-09-10 00:00:00'::timestamp, 'Late registration'),
  ('Meera', NULL, 'Khan', 'meera.khan20@example.com', '+44 20 8017 2198', '+44 7317 801992', 'Sales Director', '46 Main Rd', 'Mumbai', 'Maharashtra', '400001', 'India', 'TfL', 'Mr.', 'EMP-1020', 'meera.khan@tfl.com', 'Sponsor', 'Cancelled', 'Approved', 'Cancelled', 'Ticketed', '2025-09-13 00:00:00'::timestamp, '2025-09-20 00:00:00'::timestamp, 'Requires special assistance'),
  ('Ira', 'P.', 'Khan', 'ira.khan21@example.com', '+44 20 3645 8070', '+44 7627 523425', 'Engineer', '91 King St', 'Mumbai', 'Maharashtra', '400001', 'India', 'Contoso', 'Dr.', 'EMP-1021', 'ira.khan@contoso.com', 'Speaker', 'Registered', 'Rejected', 'Not Booked', 'Not Ticketed', '2025-09-01 00:00:00'::timestamp, '2025-09-07 00:00:00'::timestamp, 'VIP guest – priority handling'),
  ('Karan', 'M.', 'Joshi', 'karan.joshi22@example.com', '+44 20 9392 2053', '+44 7215 926658', 'Marketing Lead', '79 King St', 'Bengaluru', 'Karnataka', '560001', 'India', 'Mars-Techs', 'Mr.', 'EMP-1022', 'karan.joshi@mars-techs.com', 'Staff', 'Registered', 'Approved', 'Not Booked', 'Cancelled', '2025-09-09 00:00:00'::timestamp, '2025-09-15 00:00:00'::timestamp, 'Requires special assistance'),
  ('Vivek', 'M.', 'Saxena', 'vivek.saxena23@example.com', '+44 20 9103 6358', '+44 7191 392618', 'Data Scientist', '78 King St', 'Manchester', 'England', 'M1 1AE', 'United Kingdom', 'Umbrella', 'Ms.', 'EMP-1023', 'vivek.saxena@umbrella.com', 'Regular', 'Pending', 'Approved', 'Cancelled', 'Ticketed', '2025-09-03 00:00:00'::timestamp, '2025-09-07 00:00:00'::timestamp, NULL),
  ('Kavya', NULL, 'Menon', 'kavya.menon24@example.com', '+44 20 7844 5388', '+44 7736 235502', 'Data Scientist', '77 King St', 'Birmingham', 'England', 'B1 1AA', 'United Kingdom', 'Mars-Techs', 'Ms.', 'EMP-1024', 'kavya.menon@mars-techs.com', 'Regular', 'Cancelled', 'Rejected', 'Not Booked', 'Cancelled', '2025-09-07 00:00:00'::timestamp, '2025-09-11 00:00:00'::timestamp, 'Late registration'),
  ('Karan', 'A.', 'Patel', 'karan.patel25@example.com', '+44 20 5432 6685', '+44 7922 119045', 'Sales Director', '197 MG Road', 'London', 'England', 'SW1A 1AA', 'United Kingdom', 'Groupize', 'Mr.', 'EMP-1025', 'karan.patel@groupize.com', 'Regular', 'Registered', 'Pending Review', 'Booked', 'Not Ticketed', '2025-09-04 00:00:00'::timestamp, '2025-09-14 00:00:00'::timestamp, 'Late registration'),
  ('Ira', 'S.', 'Mehta', 'ira.mehta26@example.com', '+44 20 7440 9301', '+44 7415 821149', 'Marketing Lead', '223 High St', 'Hyderabad', 'Telangana', '500001', 'India', 'Initech', 'Ms.', 'EMP-1026', 'ira.mehta@initech.com', 'Regular', 'Registered', 'Approved', 'Booked', 'Ticketed', '2025-09-03 00:00:00'::timestamp, '2025-09-13 00:00:00'::timestamp, 'VIP guest – priority handling'),
  ('Nisha', 'K.', 'Verma', 'nisha.verma27@example.com', '+44 20 2384 7240', '+44 7991 630519', 'Sales Director', '127 High St', 'London', 'England', 'SW1A 1AA', 'United Kingdom', 'Fabrikam', 'Ms.', 'EMP-1027', 'nisha.verma@fabrikam.com', 'Regular', 'Registered', 'Pending Review', 'Not Booked', 'Not Ticketed', '2025-09-18 00:00:00'::timestamp, '2025-09-23 00:00:00'::timestamp, 'Requires special assistance'),
  ('Vihaan', 'R.', 'Gupta', 'vihaan.gupta28@example.com', '+44 20 6842 3997', '+44 7101 451621', 'Analyst', '138 High St', 'Bengaluru', 'Karnataka', '560001', 'India', 'Stark Industries', 'Mr.', 'EMP-1028', 'vihaan.gupta@starkindustries.com', 'Regular', 'Pending', 'Approved', 'Not Booked', 'Ticketed', '2025-09-05 00:00:00'::timestamp, '2025-09-11 00:00:00'::timestamp, 'Speaker coordination required'),
  ('Vihaan', 'S.', 'Sharma', 'vihaan.sharma29@example.com', '+44 20 5909 5984', '+44 7744 344118', 'Product Manager', '205 Main Rd', 'Delhi', 'Delhi', '110001', 'India', 'Hooli', 'Ms.', 'EMP-1029', 'vihaan.sharma@hooli.com', 'Speaker', 'Registered', 'Pending Review', 'Cancelled', 'Cancelled', '2025-09-21 00:00:00'::timestamp, '2025-09-23 00:00:00'::timestamp, NULL),
  ('Maya', 'M.', 'Rao', 'maya.rao30@example.com', '+44 20 9282 3282', '+44 7636 889438', 'Operations Manager', '31 King St', 'Hyderabad', 'Telangana', '500001', 'India', 'Hooli', 'Mr.', 'EMP-1030', 'maya.rao@hooli.com', 'VIP', 'Registered', 'Approved', 'Not Booked', 'Not Ticketed', '2025-09-18 00:00:00'::timestamp, '2025-09-18 00:00:00'::timestamp, NULL),
  ('Pooja', 'M.', 'Khan', 'pooja.khan31@example.com', '+44 20 9016 5321', '+44 7103 579145', 'Product Manager', '200 Park Ave', 'Manchester', 'England', 'M1 1AE', 'United Kingdom', 'Hooli', 'Mr.', 'EMP-1031', 'pooja.khan@hooli.com', 'Regular', 'Registered', 'Pending Review', 'Booked', 'Cancelled', '2025-09-07 00:00:00'::timestamp, '2025-09-10 00:00:00'::timestamp, 'Late registration'),
  ('Rahul', 'P.', 'Das', 'rahul.das32@example.com', '+44 20 2257 8848', '+44 7800 401275', 'Data Scientist', '94 Main Rd', 'Birmingham', 'England', 'B1 1AA', 'United Kingdom', 'Mars-Techs', 'Ms.', 'EMP-1032', 'rahul.das@mars-techs.com', 'Regular', 'Registered', 'Rejected', 'Cancelled', 'Ticketed', '2025-09-01 00:00:00'::timestamp, '2025-09-08 00:00:00'::timestamp, NULL),
  ('Rahul', 'R.', 'Reddy', 'rahul.reddy33@example.com', '+44 20 4566 9021', '+44 7397 843305', 'Operations Manager', '129 King St', 'Pune', 'Maharashtra', '411001', 'India', 'Stark Industries', 'Mrs.', 'EMP-1033', 'rahul.reddy@starkindustries.com', 'Staff', 'Registered', 'Pending Review', 'Booked', 'Not Ticketed', '2025-09-01 00:00:00'::timestamp, '2025-09-05 00:00:00'::timestamp, 'Late registration'),
  ('Aditya', 'P.', 'Kapoor', 'aditya.kapoor34@example.com', '+44 20 8363 5401', '+44 7496 320030', 'Marketing Lead', '46 MG Road', 'Manchester', 'England', 'M1 1AE', 'United Kingdom', 'Globex', 'Mr.', 'EMP-1034', 'aditya.kapoor@globex.com', 'Regular', 'Registered', 'Rejected', 'Cancelled', 'Cancelled', '2025-09-09 00:00:00'::timestamp, '2025-09-10 00:00:00'::timestamp, 'VIP guest – priority handling'),
  ('Riya', 'S.', 'Bose', 'riya.bose35@example.com', '+44 20 7456 1406', '+44 7262 103764', 'Consultant', '196 High St', 'Bengaluru', 'Karnataka', '560001', 'India', 'Umbrella', 'Dr.', 'EMP-1035', 'riya.bose@umbrella.com', 'Regular', 'Registered', 'Approved', 'Not Booked', 'Ticketed', '2025-09-11 00:00:00'::timestamp, '2025-09-16 00:00:00'::timestamp, 'Late registration'),
  ('Arjun', 'K.', 'Sharma', 'arjun.sharma36@example.com', '+44 20 5748 5148', '+44 7481 168133', 'Analyst', '102 Park Ave', 'Manchester', 'England', 'M1 1AE', 'United Kingdom', 'Globex', 'Dr.', 'EMP-1036', 'arjun.sharma@globex.com', 'Speaker', 'Pending', 'Pending Review', 'Booked', 'Ticketed', '2025-09-10 00:00:00'::timestamp, '2025-09-20 00:00:00'::timestamp, 'Requires special assistance'),
  ('Riya', 'R.', 'Rao', 'riya.rao37@example.com', '+44 20 9371 6170', '+44 7294 910741', 'Engineer', '243 MG Road', 'Delhi', 'Delhi', '110001', 'India', 'Groupize', 'Dr.', 'EMP-1037', 'riya.rao@groupize.com', 'Regular', 'Pending', 'Approved', 'Cancelled', 'Not Ticketed', '2025-09-15 00:00:00'::timestamp, '2025-09-24 00:00:00'::timestamp, 'Requires special assistance'),
  ('Pooja', 'P.', 'Joshi', 'pooja.joshi38@example.com', '+44 20 8955 1802', '+44 7663 233495', 'Event Planner', '82 Main Rd', 'Mumbai', 'Maharashtra', '400001', 'India', 'Umbrella', 'Dr.', 'EMP-1038', 'pooja.joshi@umbrella.com', 'Regular', 'Pending', 'Rejected', 'Not Booked', 'Not Ticketed', '2025-09-21 00:00:00'::timestamp, '2025-09-24 00:00:00'::timestamp, 'VIP guest – priority handling'),
  ('Rahul', 'M.', 'Das', 'rahul.das39@example.com', '+44 20 2961 3741', '+44 7758 269509', 'Product Manager', '150 High St', 'Pune', 'Maharashtra', '411001', 'India', 'Wayne Enterprises', 'Ms.', 'EMP-1039', 'rahul.das@wayneenterprises.com', 'Regular', 'Registered', 'Pending Review', 'Not Booked', 'Ticketed', '2025-09-18 00:00:00'::timestamp, '2025-09-21 00:00:00'::timestamp, 'Requires special assistance'),
  ('Aditya', 'K.', 'Menon', 'aditya.menon40@example.com', '+44 20 2492 6231', '+44 7344 486196', 'Sales Director', '108 Park Ave', 'Delhi', 'Delhi', '110001', 'India', 'Groupize', 'Ms.', 'EMP-1040', 'aditya.menon@groupize.com', 'Speaker', 'Registered', 'Pending Review', 'Not Booked', 'Ticketed', '2025-09-16 00:00:00'::timestamp, '2025-09-20 00:00:00'::timestamp, 'Speaker coordination required'),
  ('Sara', 'K.', 'Kapoor', 'sara.kapoor41@example.com', '+44 20 9670 4538', '+44 7194 384185', 'Marketing Lead', '120 Main Rd', 'Pune', 'Maharashtra', '411001', 'India', 'Umbrella', 'Dr.', 'EMP-1041', 'sara.kapoor@umbrella.com', 'Sponsor', 'Pending', 'Approved', 'Booked', 'Ticketed', '2025-09-14 00:00:00'::timestamp, '2025-09-21 00:00:00'::timestamp, 'Speaker coordination required'),
  ('Rahul', NULL, 'Iyer', 'rahul.iyer42@example.com', '+44 20 7414 9648', '+44 7975 590892', 'Consultant', '49 High St', 'Hyderabad', 'Telangana', '500001', 'India', 'Mars-Techs', 'Ms.', 'EMP-1042', 'rahul.iyer@mars-techs.com', 'Regular', 'Registered', 'Rejected', 'Cancelled', 'Cancelled', '2025-09-15 00:00:00'::timestamp, '2025-09-16 00:00:00'::timestamp, 'Speaker coordination required'),
  ('Amit', NULL, 'Sharma', 'amit.sharma43@example.com', '+44 20 3058 4810', '+44 7683 139417', 'Sales Director', '145 Park Ave', 'Bengaluru', 'Karnataka', '560001', 'India', 'Hooli', 'Ms.', 'EMP-1043', 'amit.sharma@hooli.com', 'Regular', 'Registered', 'Approved', 'Not Booked', 'Cancelled', '2025-09-19 00:00:00'::timestamp, '2025-09-22 00:00:00'::timestamp, 'Late registration'),
  ('Ananya', 'K.', 'Banerjee', 'ananya.banerjee44@example.com', '+44 20 1018 1171', '+44 7650 416167', 'Consultant', '131 MG Road', 'Hyderabad', 'Telangana', '500001', 'India', 'Initech', 'Mrs.', 'EMP-1044', 'ananya.banerjee@initech.com', 'Regular', 'Registered', 'Pending Review', 'Cancelled', 'Cancelled', '2025-09-10 00:00:00'::timestamp, '2025-09-10 00:00:00'::timestamp, NULL),
  ('Kabir', 'S.', 'Rao', 'kabir.rao45@example.com', '+44 20 2328 5214', '+44 7333 799772', 'Analyst', '18 Main Rd', 'Pune', 'Maharashtra', '411001', 'India', 'Contoso', 'Mrs.', 'EMP-1045', 'kabir.rao@contoso.com', 'Speaker', 'Registered', 'Pending Review', 'Booked', 'Ticketed', '2025-09-10 00:00:00'::timestamp, '2025-09-18 00:00:00'::timestamp, NULL),
  ('Kabir', 'S.', 'Gupta', 'kabir.gupta46@example.com', '+44 20 6107 4177', '+44 7336 587707', 'Marketing Lead', '169 Park Ave', 'Manchester', 'England', 'M1 1AE', 'United Kingdom', 'Fabrikam', 'Mrs.', 'EMP-1046', 'kabir.gupta@fabrikam.com', 'Regular', 'Pending', 'Pending Review', 'Not Booked', 'Cancelled', '2025-09-02 00:00:00'::timestamp, '2025-09-11 00:00:00'::timestamp, 'Requires special assistance'),
  ('Aisha', NULL, 'Gupta', 'aisha.gupta47@example.com', '+44 20 1387 3325', '+44 7525 154358', 'Data Scientist', '239 Main Rd', 'Pune', 'Maharashtra', '411001', 'India', 'Umbrella', 'Ms.', 'EMP-1047', 'aisha.gupta@umbrella.com', 'Speaker', 'Cancelled', 'Approved', 'Not Booked', 'Ticketed', '2025-09-06 00:00:00'::timestamp, '2025-09-16 00:00:00'::timestamp, 'Speaker coordination required'),
  ('Zara', 'S.', 'Verma', 'zara.verma48@example.com', '+44 20 6108 7203', '+44 7959 492045', 'Engineer', '10 King St', 'Manchester', 'England', 'M1 1AE', 'United Kingdom', 'TfL', 'Dr.', 'EMP-1048', 'zara.verma@tfl.com', 'Regular', 'Registered', 'Approved', 'Cancelled', 'Ticketed', '2025-09-13 00:00:00'::timestamp, '2025-09-18 00:00:00'::timestamp, 'VIP guest – priority handling'),
  ('Nisha', NULL, 'Verma', 'nisha.verma49@example.com', '+44 20 8757 4206', '+44 7481 667834', 'Consultant', '198 Park Ave', 'Mumbai', 'Maharashtra', '400001', 'India', 'Initech', 'Ms.', 'EMP-1049', 'nisha.verma@initech.com', 'VIP', 'Registered', 'Rejected', 'Not Booked', 'Ticketed', '2025-09-13 00:00:00'::timestamp, '2025-09-13 00:00:00'::timestamp, 'Late registration'),
  ('Aditya', 'P.', 'Verma', 'aditya.verma50@example.com', '+44 20 5210 4193', '+44 7865 165904', 'UX Designer', '95 MG Road', 'Bengaluru', 'Karnataka', '560001', 'India', 'Initech', 'Mrs.', 'EMP-1050', 'aditya.verma@initech.com', 'VIP', 'Pending', 'Rejected', 'Not Booked', 'Not Ticketed', '2025-09-10 00:00:00'::timestamp, '2025-09-10 00:00:00'::timestamp, 'Speaker coordination required')
;

