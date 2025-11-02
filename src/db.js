const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'graduation.db');
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to SQLite database:', DB_PATH);
  }
});

// Simple initialization - create table if not exists
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      date_of_birth TEXT NOT NULL,
      gender TEXT CHECK (gender IN ('Male','Female','Other')) NOT NULL,
      guardian_name TEXT NOT NULL,
      nationality TEXT NOT NULL,
      religion TEXT NOT NULL,
      email TEXT UNIQUE,
      mobile_number TEXT NOT NULL CHECK (length(mobile_number) = 10 AND mobile_number GLOB '[0-9]*'),
      place_of_birth TEXT CHECK (place_of_birth IN ('Dharmapuri','Krishnagiri','Namakkal','Salem')) NOT NULL,
      community TEXT CHECK (community IN ('OC','BC','SC','ST','MBC')) NOT NULL,
      mother_tongue TEXT NOT NULL,
      applicant_photo_path TEXT NOT NULL,
      aadhar_number TEXT NOT NULL CHECK (length(aadhar_number) = 12 AND aadhar_number GLOB '[0-9]*'),
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
      lunch_required TEXT CHECK (lunch_required IN ('VEG','NON-VEG')) NOT NULL,
      companion_option TEXT CHECK (
        companion_option IN (
          '1 Veg',
          '1 Non veg',
          '2 Veg',
          '2 Non Veg',
          '1 Veg and 1 Non veg'
        )
      ) NOT NULL,
      billdesk_order_id TEXT,
      billdesk_transaction_id TEXT,
      payment_status TEXT,
      payment_amount TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `, (err) => {
    if (err) {
      console.error('Error creating students table:', err.message);
    } else {
      console.log('Students table ready');
    }
  });
});

module.exports = db;
