-- Migration: Create pending_orders table
-- Description: Store order details before payment completion
-- Date: 2025-10-23

CREATE TABLE IF NOT EXISTS pending_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orderid TEXT UNIQUE NOT NULL,
  bdorderid TEXT,
  form_data TEXT NOT NULL, -- JSON string of all registration fields
  file_paths TEXT, -- JSON string of uploaded file paths
  payment_status TEXT DEFAULT 'pending', -- pending, success, failed, expired
  transaction_id TEXT,
  auth_status TEXT,
  amount TEXT DEFAULT '500.00',
  payment_method_type TEXT,
  transaction_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick order lookup
CREATE INDEX IF NOT EXISTS idx_pending_orders_orderid ON pending_orders(orderid);
CREATE INDEX IF NOT EXISTS idx_pending_orders_bdorderid ON pending_orders(bdorderid);
CREATE INDEX IF NOT EXISTS idx_pending_orders_status ON pending_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_pending_orders_created ON pending_orders(created_at);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_pending_orders_timestamp 
  AFTER UPDATE ON pending_orders
  FOR EACH ROW
  BEGIN
    UPDATE pending_orders SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;
