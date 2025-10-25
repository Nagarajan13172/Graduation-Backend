-- Migration: Run all migrations
-- Description: Master script to execute all migrations in order
-- Usage: sqlite3 graduation.db < migrations/run_all.sql

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Show current database info
.print "Running database migrations..."
.print "Database: graduation.db"
.print ""

-- Run migration 001
.print "Running migration 001: Create pending_orders table..."
.read migrations/001_create_pending_orders.sql
.print "✓ Migration 001 completed"
.print ""

-- Run migration 002
.print "Running migration 002: Add payment fields to students..."
.read migrations/002_add_payment_fields_to_students.sql
.print "✓ Migration 002 completed"
.print ""

-- Verify tables exist
.print "Verifying migrations..."
.print "Tables in database:"
.tables
.print ""

-- Show pending_orders schema
.print "pending_orders schema:"
.schema pending_orders
.print ""

-- Show students table columns (limit to show new columns)
.print "students table payment columns:"
SELECT sql FROM sqlite_master WHERE type='table' AND name='students';
.print ""

.print "All migrations completed successfully!"
