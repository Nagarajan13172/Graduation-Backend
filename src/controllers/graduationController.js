const db = require('../db');
const Razorpay = require('razorpay');

// Initialize Razorpay with your API keys
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Enums
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
  if (typeof v === 'number') {
    if (v === 1) return true;
    if (v === 0) return false;
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

exports.createCheckoutSession = async (req, res) => {
  try {
    const options = {
      amount: 50000, // Amount in paise (500 INR = 50000 paise)
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        // Store form data temporarily in notes
        name: req.body.name,
        university_register_no: req.body.university_register_no,
        college_roll_no: req.body.college_roll_no || '',
        degree: req.body.degree,
        course: req.body.course,
        whatsapp_number: req.body.whatsapp_number,
        email: req.body.email || '',
        gender: req.body.gender,
        address: req.body.address || '',
        pursuing_higher_studies: req.body.pursuing_higher_studies,
        hs_course_name: req.body.hs_course_name || '',
        hs_institution_name: req.body.hs_institution_name || '',
        employed: req.body.employed,
        lunch_required: req.body.lunch_required,
        companion_option: req.body.companion_option,
      },
    };

    const order = await razorpay.orders.create(options);
    res.json({ id: order.id, key_id: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    console.error('Razorpay order creation error:', err.message);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};

exports.verifyPayment = async (req, res) => {
  const { order_id, payment_id, signature } = req.body;

  if (!order_id || !payment_id || !signature) {
    return res.status(400).json({ error: 'Order ID, Payment ID, and Signature are required' });
  }

  try {
    const crypto = require('crypto');
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(order_id + '|' + payment_id)
      .digest('hex');

    if (generated_signature === signature) {
      res.json({ status: 'paid' });
    } else {
      res.status(400).json({ error: 'Invalid signature' });
    }
  } catch (err) {
    console.error('Razorpay payment verification error:', err.message);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
};

exports.register = (req, res) => {
  const { order_id, payment_id, signature } = req.body;

  // Verify Razorpay payment
  const crypto = require('crypto');
  const generated_signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(order_id + '|' + payment_id)
    .digest('hex');

  if (generated_signature !== signature) {
    return res.status(400).json({ error: 'Invalid payment signature' });
  }

  // Fetch order details to get metadata (notes)
  razorpay.orders.fetch(order_id, async (err, order) => {
    if (err || order.status !== 'paid') {
      console.error('Razorpay order fetch error:', err?.message || 'Payment not completed');
      return res.status(400).json({ error: 'Payment not completed' });
    }

    let {
      name,
      university_register_no,
      college_roll_no,
      degree,
      course,
      whatsapp_number,
      email,
      gender,
      address,
      pursuing_higher_studies,
      hs_course_name,
      hs_institution_name,
      employed,
      lunch_required,
      companion_option,
    } = order.notes; // Retrieve form data from notes

    if (typeof name === 'string') name = name.toUpperCase();

    // Required + basic validation
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
      college_roll_no || null,
      degree,
      course,
      whatsapp_number,
      email || null,
      gender,
      address || null,
      pursuingBool ? 1 : 0,
      pursuingBool ? (hs_course_name || null) : null,
      pursuingBool ? (hs_institution_name || null) : null,
      employedBool ? 1 : 0,
      lunch_required,
      companion_option,
      order_id, // Store order_id instead of session_id
      payment_id, // Store payment_id for reference
    ];

    db.run(
      `
      INSERT INTO students
        (name, university_register_no, college_roll_no, degree, course, whatsapp_number, email, gender, address,
         pursuing_higher_studies, hs_course_name, hs_institution_name, employed, lunch_required, companion_option, razorpay_order_id, razorpay_payment_id,
         created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
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
  });
};

exports.list = (req, res) => {
  db.all(`SELECT * FROM students ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) {
      console.error('DB fetch error:', err.message);
      return res.status(500).json({ error: 'Failed to fetch' });
    }
    res.json(rows);
  });
};

exports.checkRegisterNo = (req, res) => {
  const { university_register_no } = req.query;
  
  // Input validation and sanitization
  if (!university_register_no || typeof university_register_no !== 'string' || university_register_no.trim() === '') {
    return res.status(400).json({ error: 'Valid university register number is required' });
  }

  // Sanitize input to prevent SQL injection (basic trim and escape)
  const sanitizedRegisterNo = university_register_no.trim();
  
  // Debug log to confirm endpoint is hit
  console.log('Checking university register number:', sanitizedRegisterNo);

  db.get(
    `SELECT university_register_no FROM students WHERE university_register_no = ?`,
    [sanitizedRegisterNo],
    (err, row) => {
      if (err) {
        console.error('DB fetch error for register number:', err.message, { university_register_no: sanitizedRegisterNo });
        return res.status(500).json({ error: 'Failed to check register number' });
      }
      return res.status(200).json({ exists: !!row });
    }
  );
};