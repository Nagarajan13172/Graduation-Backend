const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'graduation.db');
const db = new sqlite3.Database(DB_PATH);

// Create table for Graduation Register
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,                               -- Student Name (stored uppercase)
      university_register_no TEXT NOT NULL UNIQUE,      -- University Register number
      college_roll_no TEXT,                             -- College RollNo
      degree TEXT CHECK (degree IN ('UG','PG')) NOT NULL,
      course TEXT NOT NULL,
      whatsapp_number TEXT NOT NULL CHECK (length(whatsapp_number) = 10 AND whatsapp_number GLOB '[0-9]*'),
      email TEXT UNIQUE,                                -- Email must be unique
      gender TEXT CHECK (gender IN ('Male','Female','Other')) NOT NULL,
      address TEXT,
      pursuing_higher_studies INTEGER NOT NULL CHECK (pursuing_higher_studies IN (0,1)),
      hs_course_name TEXT,                              -- If pursuing = yes
      hs_institution_name TEXT,                         -- If pursuing = yes
      employed INTEGER NOT NULL CHECK (employed IN (0,1)),
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
      stripe_session_id TEXT,  -- Added for Stripe
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
});

module.exports = db;