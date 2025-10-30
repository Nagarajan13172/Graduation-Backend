-- Migration: Add columns for storing original BillDesk request and response tokens
-- This is required by BillDesk for debugging and support
-- Store the JWT tokens without modification

-- Add column for original request token (JWS - encrypted and signed)
ALTER TABLE students ADD COLUMN original_request_token TEXT;

-- Add column for original response token (JWS - encrypted and signed)
ALTER TABLE students ADD COLUMN original_response_token TEXT;

-- Add column for receipt number (generated only on successful payment)
ALTER TABLE students ADD COLUMN receipt_number TEXT;

-- Add column for receipt generated timestamp
ALTER TABLE students ADD COLUMN receipt_generated_at TEXT;

-- Add index on orderid for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_orderid ON students(orderid);

-- Add index on payment_status for status checks
CREATE INDEX IF NOT EXISTS idx_students_payment_status ON students(payment_status);
