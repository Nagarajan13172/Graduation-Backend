const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'graduation.db');
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to SQLite database:', DB_PATH);
  }
});

db.serialize(() => {
  // Create new table with all required fields
  db.run(`
    CREATE TABLE IF NOT EXISTS students_new (
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
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Check if old students table exists and migrate data if necessary
  db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='students'`, (err, row) => {
    if (err) {
      console.error('Error checking for old table:', err.message);
      return;
    }
    if (row) {
      // Migrate data from old table to new table, mapping all fields
      db.run(`
        INSERT INTO students_new (
          id, full_name, date_of_birth, gender, guardian_name, nationality, religion, email, mobile_number,
          place_of_birth, community, mother_tongue, applicant_photo_path, aadhar_number, aadhar_copy_path,
          residence_certificate_path, degree_name, university_name, degree_pattern, convocation_year,
          degree_certificate_path, is_registered_graduate, other_university_certificate_path, occupation,
          address, signature_path, declaration, lunch_required, companion_option, created_at, updated_at
        )
        SELECT
          id, 
          COALESCE(name, 'Unknown') AS full_name, -- Adjust if old table has different field
          COALESCE(date_of_birth, '1900-01-01') AS date_of_birth, -- Default if missing
          COALESCE(gender, 'Other') AS gender,
          COALESCE(guardian_name, 'Unknown') AS guardian_name, -- Default if missing
          COALESCE(nationality, 'Unknown') AS nationality, -- Default if missing
          COALESCE(religion, 'Unknown') AS religion, -- Default if missing
          email,
          COALESCE(whatsapp_number, '0000000000') AS mobile_number, -- Adjust if old table has different field
          COALESCE(place_of_birth, 'Salem') AS place_of_birth, -- Default if missing
          COALESCE(community, 'OC') AS community, -- Default if missing
          COALESCE(mother_tongue, 'Unknown') AS mother_tongue, -- Default if missing
          COALESCE(applicant_photo_path, '') AS applicant_photo_path, -- Default if missing
          COALESCE(aadhar_number, '000000000000') AS aadhar_number, -- Default if missing
          COALESCE(aadhar_copy_path, '') AS aadhar_copy_path, -- Default if missing
          COALESCE(residence_certificate_path, '') AS residence_certificate_path, -- Default if missing
          COALESCE(degree_name, 'Unknown') AS degree_name, -- Default if missing
          COALESCE(university_name, 'Unknown') AS university_name, -- Default if missing
          COALESCE(degree_pattern, 'Unknown') AS degree_pattern, -- Default if missing
          COALESCE(convocation_year, '1900') AS convocation_year, -- Default if missing
          COALESCE(degree_certificate_path, '') AS degree_certificate_path, -- Default if missing
          COALESCE(is_registered_graduate, 0) AS is_registered_graduate,
          COALESCE(other_university_certificate_path, '') AS other_university_certificate_path,
          COALESCE(occupation, 'Unknown') AS occupation, -- Default if missing
          COALESCE(address, 'Unknown') AS address,
          COALESCE(signature_path, '') AS signature_path, -- Default if missing
          COALESCE(declaration, 0) AS declaration,
          COALESCE(lunch_required, 'VEG') AS lunch_required,
          COALESCE(companion_option, '1 Veg') AS companion_option,
          created_at,
          updated_at
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
    } else {
      // If no old table exists, just rename the new table
      db.run(`ALTER TABLE students_new RENAME TO students`, (err) => {
        if (err) {
          console.error('Error renaming table:', err.message);
          return;
        }
        console.log('Database initialized successfully');
      });
    }
  });
});

module.exports = db;