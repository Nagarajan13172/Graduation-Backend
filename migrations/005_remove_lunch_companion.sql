-- Migration: Remove lunch_required and companion_option columns
-- Date: 2025-11-06
-- Description: Removes lunch_required and companion_option fields from students table

-- SQLite doesn't support DROP COLUMN directly in older versions
-- We need to recreate the table without these columns

-- Step 1: Create a new table with the desired schema (without lunch_required and companion_option)
CREATE TABLE students_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('Male','Female','Other')) NOT NULL,
  guardian_name TEXT NOT NULL,
  nationality TEXT NOT NULL,
  religion TEXT NOT NULL,
  email TEXT,
  mobile_number TEXT NOT NULL CHECK (length(mobile_number) = 10),
  place_of_birth TEXT CHECK (place_of_birth IN ('Dharmapuri','Krishnagiri','Namakkal','Salem')) NOT NULL,
  community TEXT CHECK (community IN ('OC','BC','SC','ST','MBC')) NOT NULL,
  mother_tongue TEXT NOT NULL,
  applicant_photo_path TEXT NOT NULL,
  aadhar_number TEXT NOT NULL CHECK (length(aadhar_number) = 12),
  aadhar_copy_path TEXT NOT NULL,
  residence_certificate_path TEXT NOT NULL,
  degree_name TEXT NOT NULL,
  university_name TEXT NOT NULL,
  degree_pattern TEXT NOT NULL,
  convocation_year TEXT NOT NULL,
  degree_certificate_path TEXT NOT NULL,
  is_registered_graduate INTEGER NOT NULL CHECK (is_registered_graduate IN (0,1)),
  other_university_certificate_path TEXT,
  occupation TEXT NOT NULL,
  address TEXT NOT NULL,
  signature_path TEXT NOT NULL,
  declaration INTEGER NOT NULL CHECK (declaration IN (0,1)),
  billdesk_order_id TEXT,
  billdesk_transaction_id TEXT,
  payment_status TEXT,
  payment_amount TEXT,
  payment_date TEXT,
  payment_method_type TEXT,
  payment_bank_ref TEXT,
  payment_error_code TEXT,
  payment_error_desc TEXT,
  receipt_number TEXT,
  receipt_generated_at TEXT,
  orderid TEXT,
  bdorderid TEXT,
  transaction_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Step 2: Copy data from old table to new table (excluding lunch_required and companion_option)
INSERT INTO students_new (
  id, full_name, date_of_birth, gender, guardian_name, nationality, religion, email, mobile_number,
  place_of_birth, community, mother_tongue, applicant_photo_path, aadhar_number, aadhar_copy_path,
  residence_certificate_path, degree_name, university_name, degree_pattern, convocation_year,
  degree_certificate_path, is_registered_graduate, other_university_certificate_path, occupation,
  address, signature_path, declaration, billdesk_order_id, billdesk_transaction_id, payment_status,
  payment_amount, payment_date, payment_method_type, payment_bank_ref, payment_error_code,
  payment_error_desc, receipt_number, receipt_generated_at, orderid, bdorderid, transaction_id,
  created_at, updated_at
)
SELECT 
  id, full_name, date_of_birth, gender, guardian_name, nationality, religion, email, mobile_number,
  place_of_birth, community, mother_tongue, applicant_photo_path, aadhar_number, aadhar_copy_path,
  residence_certificate_path, degree_name, university_name, degree_pattern, convocation_year,
  degree_certificate_path, is_registered_graduate, other_university_certificate_path, occupation,
  address, signature_path, declaration, billdesk_order_id, billdesk_transaction_id, payment_status,
  payment_amount, payment_date, payment_method_type, payment_bank_ref, payment_error_code,
  payment_error_desc, receipt_number, receipt_generated_at, orderid, bdorderid, transaction_id,
  created_at, updated_at
FROM students;

-- Step 3: Drop the old table
DROP TABLE students;

-- Step 4: Rename the new table to the original name
ALTER TABLE students_new RENAME TO students;
