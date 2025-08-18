const db = require('../db');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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

exports.createCheckoutSession = async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd', // Change to 'inr' for INR
            product_data: {
              name: 'Graduation Registration Fee',
            },
            unit_amount: 1000, // $10.00 USD (1000 cents); adjust as needed
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/cancel`,
      metadata: {
        // Store form data temporarily in metadata
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
    });
    res.json({ id: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};

exports.register = (req, res) => {
  const { session_id } = req.body;

  // Verify Stripe session
  stripe.checkout.sessions.retrieve(session_id, async (err, session) => {
    if (err || session.payment_status !== 'paid') {
      console.error('Stripe session error:', err?.message || 'Payment not completed');
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
    } = session.metadata; // Retrieve form data from metadata

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
      session_id, // Store session_id for reference
    ];

    db.run(
      `
      INSERT INTO students
        (name, university_register_no, college_roll_no, degree, course, whatsapp_number, email, gender, address,
         pursuing_higher_studies, hs_course_name, hs_institution_name, employed, lunch_required, companion_option, stripe_session_id,
         created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
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