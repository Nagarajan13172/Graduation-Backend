const db = require('../db');

// enums
const DEGREE_ENUM = ['UG', 'PG'];
const GENDER_ENUM = ['Male', 'Female', 'Other'];
const LUNCH_ENUM = ['VEG', 'NON-VEG'];
const COMPANION_ENUM = [
  '1 Veg',
  '1 Non veg',
  '2 Veg',
  '2 Non Veg',
  '1 Veg and 1 Non veg'
];

const isEmail = (s) => !!s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const isPhone = (s) => !!s && /^\d{10}$/.test(s);

const toBool = (v) => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const t = v.trim().toLowerCase();
    if (['yes', 'true', '1'].includes(t)) return true;
    if (['no', 'false', '0'].includes(t)) return false;
  }
  return null;
};

exports.checkEmail = (req, res) => {
  const { email } = req.query;
  if (!email || !isEmail(email)) {
    return res.status(400).json({ error: 'Valid email is required' });
  }
  db.get(`SELECT email FROM students WHERE email = ?`, [email], (err, row) => {
    if (err) {
      console.error('DB fetch error:', err.message);
      return res.status(500).json({ error: 'Failed to check email' });
    }
    return res.status(200).json({ exists: !!row });
  });
};

exports.register = (req, res) => {
  let {
    name, // Capital letters
    university_register_no,
    college_roll_no,
    degree, // UG/PG
    course,
    whatsapp_number,
    email,
    gender,
    address,
    pursuing_higher_studies, // Yes/No | boolean
    hs_course_name,          // A) Course Name
    hs_institution_name,     // B) Institution Name
    employed,                // Yes/No | boolean
    lunch_required,          // VEG | NON-VEG
    companion_option         // one of COMPANION_ENUM
  } = req.body;

  if (typeof name === 'string') name = name.toUpperCase();

  // required + basic validation
  if (!name) return res.status(400).json({ error: 'name is required' });
  if (!university_register_no) return res.status(400).json({ error: 'university_register_no is required' });
  if (!degree || !DEGREE_ENUM.includes(degree)) return res.status(400).json({ error: `degree must be ${DEGREE_ENUM.join(' or ')}` });
  if (!course) return res.status(400).json({ error: 'course is required' });
  if (!whatsapp_number || !isPhone(whatsapp_number)) return res.status(400).json({ error: 'whatsapp_number must be exactly 10 digits' });
  if (email && !isEmail(email)) return res.status(400).json({ error: 'email is invalid' });
  if (!gender || !GENDER_ENUM.includes(gender)) return res.status(400).json({ error: `gender must be one of ${GENDER_ENUM.join(', ')}` });

  const pursuingBool = toBool(pursuing_higher_studies);
  const employedBool = toBool(employed);
  if (pursuingBool === null) return res.status(400).json({ error: 'pursuing_higher_studies must be Yes/No or boolean' });
  if (employedBool === null) return res.status(400).json({ error: 'employed must be Yes/No or boolean' });

  if (!lunch_required || !LUNCH_ENUM.includes(lunch_required)) {
    return res.status(400).json({ error: `lunch_required must be one of ${LUNCH_ENUM.join(', ')}` });
  }
  if (!companion_option || !COMPANION_ENUM.includes(companion_option)) {
    return res.status(400).json({ error: `companion_option must be one of: ${COMPANION_ENUM.join(' | ')}` });
  }

  if (pursuingBool && (!hs_course_name || !hs_institution_name)) {
    return res.status(400).json({ error: 'hs_course_name and hs_institution_name are required when pursuing_higher_studies is Yes' });
  }

  const params = [
    name,
    university_register_no,
    college_roll_no ?? null,
    degree,
    course,
    whatsapp_number,
    email ?? null,
    gender,
    address ?? null,
    pursuingBool ? 1 : 0,
    pursuingBool ? (hs_course_name ?? null) : null,
    pursuingBool ? (hs_institution_name ?? null) : null,
    employedBool ? 1 : 0,
    lunch_required,
    companion_option
  ];

  db.run(
    `
    INSERT INTO students
      (name, university_register_no, college_roll_no, degree, course, whatsapp_number, email, gender, address,
       pursuing_higher_studies, hs_course_name, hs_institution_name, employed, lunch_required, companion_option,
       created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `,
    params,
    function (err) {
      if (err) {
        if (String(err.message).includes('UNIQUE')) {
          if (err.message.includes('university_register_no')) {
            return res.status(409).json({ error: 'Student with this university_register_no already exists' });
          }
          if (err.message.includes('email')) {
            return res.status(409).json({ error: 'Email is already registered' });
          }
        }
        console.error('DB insert error:', err.message);
        return res.status(500).json({ error: 'Failed to register' });
      }
      return res.status(200).json({ message: 'Registered successfully', id: this.lastID });
    }
  );
};

exports.list = (req, res) => {
  // If you want admin auth later, check req.headers.authorization here
  db.all(`SELECT * FROM students ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) {
      console.error('DB fetch error:', err.message);
      return res.status(500).json({ error: 'Failed to fetch' });
    }
    res.json(rows);
  });
};