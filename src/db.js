const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'graduation.db');
const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  // Create new table without stripe_session_id
  db.run(`
    CREATE TABLE IF NOT EXISTS students_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      university_register_no TEXT NOT NULL UNIQUE,
      college_roll_no TEXT,
      degree TEXT CHECK (degree IN ('UG','PG')) NOT NULL,
      course TEXT NOT NULL,
      whatsapp_number TEXT NOT NULL CHECK (length(whatsapp_number) = 10 AND whatsapp_number GLOB '[0-9]*'),
      email TEXT UNIQUE,
      gender TEXT CHECK (gender IN ('Male','Female','Other')) NOT NULL,
      address TEXT,
      pursuing_higher_studies INTEGER NOT NULL CHECK (pursuing_higher_studies IN (0,1)),
      hs_course_name TEXT,
      hs_institution_name TEXT,
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
      razorpay_order_id TEXT,
      razorpay_payment_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Migrate data from old table to new table
  db.run(`
    INSERT INTO students_new (
      id, name, university_register_no, college_roll_no, degree, course, whatsapp_number, email, gender, address,
      pursuing_higher_studies, hs_course_name, hs_institution_name, employed, lunch_required, companion_option,
      razorpay_order_id, razorpay_payment_id, created_at, updated_at
    )
    SELECT
      id, name, university_register_no, college_roll_no, degree, course, whatsapp_number, email, gender, address,
      pursuing_higher_studies, hs_course_name, hs_institution_name, employed, lunch_required, companion_option,
      NULL, NULL, created_at, updated_at
    FROM students
  `, (err) => {
    if (err) {
      console.error('Error migrating data:', err.message);
      return;
    }

    // Drop old table and rename new table
    db.run(`DROP TABLE students`, (err) => {
      if (err) {
        console.error('Error dropping old table:', err.message);
        return;
      }
      db.run(`ALTER TABLE students_new RENAME TO students`, (err) => {
        if (err) {
          console.error('Error renaming table:', err.message);
          return;
        }
        console.log('Database migration completed successfully');
      });
    });
  });
});

module.exports = db;