-- Migration: Add payment fields to students table
-- Description: Track payment details for each student registration
-- Date: 2025-10-23

-- Add payment-related columns to students table
ALTER TABLE students ADD COLUMN payment_status TEXT DEFAULT 'pending';
ALTER TABLE students ADD COLUMN orderid TEXT;
ALTER TABLE students ADD COLUMN bdorderid TEXT;
ALTER TABLE students ADD COLUMN transaction_id TEXT;
ALTER TABLE students ADD COLUMN payment_amount TEXT;
ALTER TABLE students ADD COLUMN payment_date DATETIME;
ALTER TABLE students ADD COLUMN payment_method_type TEXT;

-- Create indexes for payment-related queries
CREATE INDEX IF NOT EXISTS idx_students_orderid ON students(orderid);
CREATE INDEX IF NOT EXISTS idx_students_payment_status ON students(payment_status);
CREATE INDEX IF NOT EXISTS idx_students_transaction_id ON students(transaction_id);
