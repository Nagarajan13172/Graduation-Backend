-- Add payment details columns
ALTER TABLE students ADD COLUMN payment_bank_ref TEXT;
ALTER TABLE students ADD COLUMN payment_error_code TEXT;
ALTER TABLE students ADD COLUMN payment_error_desc TEXT;

-- Create indexes for payment queries
CREATE INDEX IF NOT EXISTS idx_students_payment_status ON students(payment_status);
CREATE INDEX IF NOT EXISTS idx_students_payment_date ON students(payment_date);