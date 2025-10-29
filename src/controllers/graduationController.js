const db = require('../db');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const axios = require('axios');
const { billdesk } = require('../../server/billdesk');

const RU_PUBLIC = process.env.RU_PUBLIC || 'http://localhost:3000/payment/result';

// ---------- Multer (only for multipart) ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'Uploads');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error('Only JPEG, PNG, and PDF files are allowed'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const uploadFields = upload.fields([
  { name: 'applicant_photo', maxCount: 1 },
  { name: 'aadhar_copy', maxCount: 1 },
  { name: 'residence_certificate', maxCount: 1 },
  { name: 'degree_certificate', maxCount: 1 },
  { name: 'other_university_certificate', maxCount: 1 },
  { name: 'signature', maxCount: 1 }
]);

const singleUpload = upload.single('file');

// Allow JSON or multipart seamlessly
function maybeUpload(req, res, next) {
  if (req.is('multipart/form-data')) return uploadFields(req, res, next);
  next();
}

// ---------- Helpers ----------
const GENDER_ENUM = ['Male', 'Female', 'Other'];
const LUNCH_ENUM = ['VEG', 'NON-VEG'];
const COMMUNITY_ENUM = ['OC', 'BC', 'SC', 'ST', 'MBC'];
const DISTRICT_ENUM = ['Dharmapuri', 'Krishnagiri', 'Namakkal', 'Salem'];
const COMPANION_ENUM = [
  '1 Veg', '1 Non veg', '2 Veg', '2 Non Veg', '1 Veg and 1 Non veg'
];

const isEmail = (s) => !!s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const isPhone = (s) => !!s && /^\d{10}$/.test(s);
const isAadhar = (s) => !!s && /^\d{12}$/.test(s);
const isDate = (s) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

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

// ---------- Public APIs ----------
exports.checkEmail = (req, res) => {
  const { email } = req.query;
  if (!email || !isEmail(email)) {
    return res.status(400).json({ error: 'Valid email is required' });
  }
  db.get(`SELECT email FROM students WHERE email = ?`, [email], (err, row) => {
    if (err) return res.status(500).json({ error: 'Failed to check email' });
    return res.status(200).json({ exists: !!row });
  });
};

// BillDesk - Configuration Check

exports.checkBillDeskConfig = (req, res) => {
  const config = {
    mercId: billdesk.mercId ? 
      (String(billdesk.mercId).includes('your_') ? '✗ Placeholder value' : '✓ Set') : '✗ Not set',
    clientId: billdesk.clientId ? 
      (String(billdesk.clientId).includes('your_') ? '✗ Placeholder value' : '✓ Set') : '✗ Not set',
    secret: process.env.BILLDESK_SECRET ? 
      (String(process.env.BILLDESK_SECRET).includes('your_') ? '✗ Placeholder value' : '✓ Set') : '✗ Not set',
    baseUrl: billdesk.baseUrl || 'Not set',
    returnUrl: RU_PUBLIC || 'Not set'
  };
  const isFullyConfigured = billdesk.isConfigured;
  res.json({
    configured: isFullyConfigured,
    message: isFullyConfigured ?
      'BillDesk is fully configured and ready to use' :
      'BillDesk is not fully configured. Please update .env with actual credentials from BillDesk.',
    config
  });
};

// --------- Create Checkout Session (JSON or multipart) ----------
exports.createCheckoutSession = (req, res) => {
  maybeUpload(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });

    // If not configured, return MOCK response with rdata
    if (!billdesk.isConfigured) {
      const mockOrderId = `MOCK_${Date.now()}${Math.floor(Math.random() * 1000)}`;
      const mockBdOrderId = `BD${Date.now()}`;
      const mockRdata = 'mock_rdata_value';

      return res.json({
        success: true,
        mock: true,
        message: 'BillDesk not configured - using mock mode. Update .env with actual credentials.',
        bdorderid: mockBdOrderId,
        orderid: mockOrderId,
        merchantid: billdesk.mercId || 'MOCK_MERCHANT',
        rdata: mockRdata,
        links: [{
          rel: 'payment',
          href: `${billdesk.baseUrl || 'https://uat1.billdesk.com/u2'}/web/v1_2/embeddedsdk`,
          method: 'POST',
          parameters: { rdata: mockRdata }
        }]
      });
    }

    try {
      // Basic fields (optional validations – only if present)
      const {
        full_name, date_of_birth, gender, guardian_name, nationality, religion, email, mobile_number,
        place_of_birth, community, mother_tongue, aadhar_number, degree_name, university_name,
        degree_pattern, convocation_year, occupation, address, declaration, lunch_required, companion_option,
        additional_info = {},
        orderid: incomingOrderId
      } = req.body || {};

      const is_registered_graduate = toBool(req.body?.is_registered_graduate);

      // Optional field format checks
      if (date_of_birth && !isDate(date_of_birth)) return res.status(400).json({ error: 'Valid date of birth (YYYY-MM-DD) is required' });
      if (gender && !GENDER_ENUM.includes(gender)) return res.status(400).json({ error: `Gender must be one of ${GENDER_ENUM.join(', ')}` });
      if (email && !isEmail(email)) return res.status(400).json({ error: 'Valid email is required' });
      if (mobile_number && !isPhone(mobile_number)) return res.status(400).json({ error: 'Mobile number must be exactly 10 digits' });
      if (place_of_birth && !DISTRICT_ENUM.includes(place_of_birth)) return res.status(400).json({ error: `Place of birth must be one of ${DISTRICT_ENUM.join(', ')}` });
      if (community && !COMMUNITY_ENUM.includes(community)) return res.status(400).json({ error: `Community must be one of ${COMMUNITY_ENUM.join(', ')}` });
      if (aadhar_number && !isAadhar(aadhar_number)) return res.status(400).json({ error: 'Aadhar number must be exactly 12 digits' });
      if (lunch_required && !LUNCH_ENUM.includes(lunch_required)) return res.status(400).json({ error: `Lunch required must be one of ${LUNCH_ENUM.join(', ')}` });
      if (companion_option && !COMPANION_ENUM.includes(companion_option)) return res.status(400).json({ error: `Companion option must be one of: ${COMPANION_ENUM.join(' | ')}` });

      // Amount / currency / ru acceptance with defaults
      const {
        amount = '500.00',
        currency = '356',
        itemcode = 'DIRECT',
        ru = RU_PUBLIC
      } = req.body || {};

      // Generate a unique order id if none provided
      const orderId = incomingOrderId || `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;

      const order_date = billdesk.istTimestampCompact();
      console.log('Generated order_date:', order_date);
      console.log('order_date length:', order_date.length);
      console.log('order_date characters:', [...order_date].map(c => `${c} (${c.charCodeAt(0)})`).join(', '));

      const orderPayload = {
        objectid: 'order',
        mercid: billdesk.mercId,
        orderid: orderId,
        amount,
        currency,
        order_date, // Using the logged timestamp
        ru,
        itemcode,
        additional_info: {
          additional_info1: additional_info.purpose || 'Graduation Registration'
        },
        device: {
          init_channel: 'internet',
          ip: req.ip || '127.0.0.1',
          user_agent: req.get('user-agent') || 'Mozilla/5.0',
          accept_header: req.get('accept') || '*/*'
        }
      };

      console.log('=== BillDesk Order Creation ===');
      console.log('1. Order Payload (before encryption):', JSON.stringify(orderPayload, null, 2));

      // NEW: Encrypt then Sign (correct BillDesk flow)
      const finalToken = await billdesk.createOrderToken(orderPayload);
      console.log('2. Final Token (encrypted + signed):', finalToken.substring(0, 150) + '...');

      const headers = billdesk.joseHeaders();
      console.log('3. Request Headers:', JSON.stringify(headers, null, 2));

      const url = `${billdesk.baseUrl}/payments/ve1_2/orders/create`;
      console.log('4. Request URL:', url);
      console.log('5. Full Request Details:', {
        url,
        method: 'POST',
        headers,
        bodyLength: finalToken.length
      });

      const response = await axios.post(url, finalToken, {
        headers,
        timeout: 30000
      });

      console.log('6. BillDesk Response Status:', response.status);
      console.log('7. BillDesk Response Data (encrypted + signed):', 
                  typeof response.data === 'string' ? response.data.substring(0, 100) + '...' : response.data);

      // NEW: Use processResponse to verify signature and decrypt
      const decoded = await billdesk.processResponse(response.data);

      console.log('8. BillDesk Response Data (decrypted):', JSON.stringify(decoded, null, 2));

      // Extract rdata from links[]
      const paymentLink = decoded?.links?.find(l => l?.rel === 'payment');
      const rdata = paymentLink?.parameters?.rdata || null;

      console.log('9. Extracted rdata for payment:', rdata);
      console.log('=== BillDesk Order Creation Complete ===\n');

      return res.json({
        success: true,
        bdorderid: decoded.bdorderid,
        orderid: orderId,
        merchantid: billdesk.mercId,
        rdata,
        links: decoded.links
      });
    } catch (error) {
      console.error('BillDesk order creation error:', error.message);
      
      // If there's a response from BillDesk API, try to decrypt it
      if (error.response && error.response.data) {
        console.error('BillDesk API error status:', error.response.status);
        console.error('BillDesk API error data (encrypted):', 
                      typeof error.response.data === 'string' ? error.response.data.substring(0, 100) + '...' : error.response.data);
        
        try {
          // Try to decrypt the error response
          console.log('\n=== Attempting to decrypt BillDesk error response ===');
          const decryptedError = await billdesk.processResponse(error.response.data);
          console.log('Decrypted error response:', JSON.stringify(decryptedError, null, 2));
          console.log('=== End error decryption ===\n');
          
          // Send decrypted error to frontend
          return res.status(error.response.status || 400).json({
            success: false,
            error: 'BillDesk API error',
            message: decryptedError.error_message || decryptedError.message || 'Payment processing failed',
            billdesk_error: decryptedError,
            details: {
              status: error.response.status,
              error_code: decryptedError.error_code,
              error_desc: decryptedError.error_desc
            }
          });
        } catch (decryptError) {
          // If decryption fails, send the raw error
          console.error('Failed to decrypt error response:', decryptError.message);
          return res.status(error.response.status || 500).json({
            success: false,
            error: 'BillDesk API error (unable to decrypt)',
            message: error.message,
            details: {
              status: error.response.status,
              encrypted_data: typeof error.response.data === 'string' ? 
                error.response.data.substring(0, 100) + '...' : error.response.data
            }
          });
        }
      }
      
      // Generic error (no response from BillDesk)
      return res.status(500).json({
        success: false,
        error: `Failed to create checkout session: ${error.message}`,
        details: error.response ? {
          status: error.response.status
        } : null
      });
    }
  });
};

// BillDesk - Launch Payment (HTML form auto-submit)
exports.launchPayment = (req, res) => {
  const { bdorderid, rdata } = req.query || {};
  if (!bdorderid || !rdata) return res.status(400).send('Missing bdorderid or rdata');

  const html = `
  <!doctype html>
  <html>
    <head><meta charset="utf-8"><title>Redirecting to Payment Gateway...</title></head>
    <body onload="document.forms[0].submit()">
      <h3>Redirecting to payment gateway...</h3>
      <form action="${billdesk.baseUrl}/web/v1_2/embeddedsdk" method="POST">
        <input type="hidden" name="bdorderid" value="${bdorderid}" />
        <input type="hidden" name="merchantid" value="${billdesk.mercId}" />
        <input type="hidden" name="rdata" value="${String(rdata).replace(/"/g, "&quot;")}" />
        <noscript><button type="submit">Continue to payment</button></noscript>
      </form>
    </body>
  </html>`;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.send(html);
};

// BillDesk - Webhook Handler (S2S callback - source of truth)
exports.handleWebhook = async (req, res) => {
  try {
    let decoded = null;
    if (req.is("application/jose") || typeof req.body === 'string') {
      decoded = billdesk.verifyJws(req.body);
    } else if (req.is("application/x-www-form-urlencoded")) {
      const trxBlob = req.body?.transaction_response;
      decoded = trxBlob ? billdesk.verifyJws(trxBlob) : req.body;
    } else {
      decoded = req.body;
    }

    console.log('Webhook received payload:', decoded);

    // Example: mark success/pending/failed based on decoded.auth_status
    // TODO: Update your database by decoded.orderid

    return res.json({ ack: true });
  } catch (error) {
    console.error('Webhook processing error:', error.message);
    return res.status(200).json({ ack: true, error: error.message });
  }
};

// BillDesk - Return URL Handler (browser callback)
exports.handleReturn = async (req, res) => {
  const html = `
  <!doctype html>
  <html>
    <head><meta charset="utf-8"><title>Payment Processing</title></head>
    <body>
      <h3>Thank you! Processing your payment...</h3>
      <p>Please wait while we confirm your payment. You will be redirected shortly.</p>
      <script>
        setTimeout(() => { window.location.href = '/'; }, 3000);
      </script>
    </body>
  </html>`;
  res.type("html").send(html);
};

// BillDesk - Retrieve Transaction Status
exports.retrieveTransaction = async (req, res) => {
  try {
    const { orderid } = req.body || {};
    if (!orderid) return res.status(400).json({ error: 'orderid required' });

    if (!billdesk.isConfigured) {
      return res.json({
        mock: true,
        message: 'BillDesk not configured - using mock mode',
        orderid,
        status: 'success',
        auth_status: '0300',
        transactionid: `TXN${Date.now()}`,
        amount: '500.00'
      });
    }

    const payload = { mercid: billdesk.mercId, orderid, refund_details: true };
    
    console.log('=== BillDesk Retrieve Transaction ===');
    console.log('1. Transaction Query Payload:', JSON.stringify(payload, null, 2));
    
    const jws = billdesk.jwsCompact(payload);
    console.log('2. Encrypted Request (JWS):', jws);
    
    const url = `${billdesk.baseUrl}/payments/ve1_2/transactions/get`;
    const headers = billdesk.joseHeaders();
    console.log('3. Request URL:', url);
    console.log('4. Request Headers:', JSON.stringify(headers, null, 2));
    
    const response = await axios.post(url, jws, {
      headers,
      timeout: 30000
    });
    
    console.log('5. Response Status:', response.status);
    console.log('6. Response Data (encrypted):', response.data);
    
    const decoded = billdesk.verifyJws(response.data);
    console.log('7. Response Data (decrypted):', JSON.stringify(decoded, null, 2));
    console.log('=== Retrieve Transaction Complete ===\n');
    
    return res.json(decoded);
  } catch (error) {
    console.error('Retrieve transaction error:', error.message);
    if (error.response) console.error('BillDesk API error response:', error.response.data);
    return res.status(400).json({ error: error.message });
  }
};

exports.register = (req, res) => {
  uploadFields(req, res, async (err) => {
    if (err) {
      console.error('Multer error:', err.message, err.stack);
      return res.status(400).json({ error: err.message });
    }

    const {
      full_name, date_of_birth, gender, guardian_name, nationality, religion, email, mobile_number,
      place_of_birth, community, mother_tongue, aadhar_number, degree_name, university_name,
      degree_pattern, convocation_year, occupation, address, declaration, lunch_required, companion_option
    } = req.body;

    const is_registered_graduate = toBool(req.body.is_registered_graduate);

    console.log('Register request:', { body: req.body, files: Object.keys(req.files || {}) });

    // Validate all fields
    if (!full_name) return res.status(400).json({ error: 'Full name is required' });
    if (!date_of_birth || !isDate(date_of_birth)) return res.status(400).json({ error: 'Valid date of birth (YYYY-MM-DD) is required' });
    if (!gender || !GENDER_ENUM.includes(gender)) return res.status(400).json({ error: `Gender must be one of ${GENDER_ENUM.join(', ')}` });
    if (!guardian_name) return res.status(400).json({ error: 'Guardian name is required' });
    if (!nationality) return res.status(400).json({ error: 'Nationality is required' });
    if (!religion) return res.status(400).json({ error: 'Religion is required' });
    if (email && !isEmail(email)) return res.status(400).json({ error: 'Valid email is required' });
    if (!mobile_number || !isPhone(mobile_number)) return res.status(400).json({ error: 'Mobile number must be exactly 10 digits' });
    if (!place_of_birth || !DISTRICT_ENUM.includes(place_of_birth)) return res.status(400).json({ error: `Place of birth must be one of ${DISTRICT_ENUM.join(', ')}` });
    if (!community || !COMMUNITY_ENUM.includes(community)) return res.status(400).json({ error: `Community must be one of ${COMMUNITY_ENUM.join(', ')}` });
    if (!mother_tongue) return res.status(400).json({ error: 'Mother tongue is required' });
    if (!req.files?.applicant_photo) return res.status(400).json({ error: 'Applicant photo is required' });
    if (req.files.applicant_photo[0].size > 2 * 1024 * 1024) return res.status(400).json({ error: 'Applicant photo must be less than 2MB' });
    if (!aadhar_number || !isAadhar(aadhar_number)) return res.status(400).json({ error: 'Aadhar number must be exactly 12 digits' });
    if (!req.files?.aadhar_copy) return res.status(400).json({ error: 'Aadhar copy is required' });
    if (req.files.aadhar_copy[0].size > 2 * 1024 * 1024) return res.status(400).json({ error: 'Aadhar copy must be less than 2MB' });
    if (!req.files?.residence_certificate) return res.status(400).json({ error: 'Residence certificate is required' });
    if (req.files.residence_certificate[0].size > 5 * 1024 * 1024) return res.status(400).json({ error: 'Residence certificate must be less than 5MB' });
    if (!degree_name) return res.status(400).json({ error: 'Degree name is required' });
    if (!university_name) return res.status(400).json({ error: 'University name is required' });
    if (!degree_pattern) return res.status(400).json({ error: 'Degree pattern is required' });
    if (!convocation_year) return res.status(400).json({ error: 'Convocation year is required' });
    if (!req.files?.degree_certificate) return res.status(400).json({ error: 'Degree certificate is required' });
    if (req.files.degree_certificate[0].size > 5 * 1024 * 1024) return res.status(400).json({ error: 'Degree certificate must be less than 5MB' });
    if (is_registered_graduate === null) return res.status(400).json({ error: 'is_registered_graduate must be Yes/No or boolean' });
    if (is_registered_graduate && !req.files?.other_university_certificate) return res.status(400).json({ error: 'Other university certificate is required when registered with another university' });
    if (req.files?.other_university_certificate && req.files.other_university_certificate[0].size > 5 * 1024 * 1024) return res.status(400).json({ error: 'Other university certificate must be less than 5MB' });
    if (!occupation) return res.status(400).json({ error: 'Occupation is required' });
    if (!address) return res.status(400).json({ error: 'Address is required' });
    if (!req.files?.signature) return res.status(400).json({ error: 'Signature is required' });
    if (req.files.signature[0].size > 5 * 1024 * 1024) return res.status(400).json({ error: 'Signature must be less than 5MB' });
    if (!toBool(declaration)) return res.status(400).json({ error: 'Declaration must be true' });
    if (!lunch_required || !LUNCH_ENUM.includes(lunch_required)) return res.status(400).json({ error: `Lunch required must be one of ${LUNCH_ENUM.join(', ')}` });
    if (!companion_option || !COMPANION_ENUM.includes(companion_option)) return res.status(400).json({ error: `Companion option must be one of: ${COMPANION_ENUM.join(' | ')}` });

    // Check email uniqueness if provided
    if (email) {
      const emailExists = await new Promise((resolve, reject) => {
        db.get(`SELECT email FROM students WHERE email = ?`, [email], (err, row) => {
          if (err) {
            console.error('DB fetch error for email uniqueness:', err.message, err.stack);
            reject(err);
          }
          resolve(!!row);
        });
      });
      if (emailExists) return res.status(409).json({ error: 'Email is already registered' });
    }

    const params = [
      full_name.toUpperCase(),
      date_of_birth,
      gender,
      guardian_name,
      nationality,
      religion,
      email || null,
      mobile_number,
      place_of_birth,
      community,
      mother_tongue,
      req.files.applicant_photo[0].path,
      aadhar_number,
      req.files.aadhar_copy[0].path,
      req.files.residence_certificate[0].path,
      degree_name,
      university_name,
      degree_pattern,
      convocation_year,
      req.files.degree_certificate[0].path,
      is_registered_graduate ? 1 : 0,
      req.files?.other_university_certificate ? req.files.other_university_certificate[0].path : null,
      occupation,
      address,
      req.files.signature[0].path,
      toBool(declaration) ? 1 : 0,
      lunch_required,
      companion_option
    ];

    db.run(
      `
      INSERT INTO students (
        full_name, date_of_birth, gender, guardian_name, nationality, religion, email, mobile_number,
        place_of_birth, community, mother_tongue, applicant_photo_path, aadhar_number, aadhar_copy_path,
        residence_certificate_path, degree_name, university_name, degree_pattern, convocation_year,
        degree_certificate_path, is_registered_graduate, other_university_certificate_path, occupation,
        address, signature_path, declaration, lunch_required, companion_option, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `,
      params,
      function (err) {
        if (err) {
          if (String(err.message).includes('UNIQUE')) {
            if (err.message.includes('email')) {
              return res.status(409).json({ error: 'Email is already registered' });
            }
          }
          console.error('DB insert error:', err.message, err.stack);
          return res.status(500).json({ error: 'Failed to register' });
        }
        console.log('Registration successful:', { id: this.lastID });
        return res.status(200).json({ message: 'Registered successfully', id: this.lastID });
      }
    );
  });
};

exports.list = (req, res) => {
  db.all(`SELECT * FROM students ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) {
      console.error('DB fetch error:', err.message, err.stack);
      return res.status(500).json({ error: 'Failed to fetch' });
    }
    res.json(rows);
  });
};

exports.uploadFile = (req, res) => {
  singleUpload(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err.message, err.stack);
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    console.log('File uploaded:', { file_path: req.file.path, filename: req.file.filename });
    res.status(200).json({
      message: 'File uploaded successfully',
      file_path: req.file.path,
      filename: req.file.filename
    });
  });
};

exports.getFile = (req, res) => {
  const { studentId, fileType } = req.params;
  const validFileTypes = [
    'applicant_photo',
    'aadhar_copy',
    'residence_certificate',
    'degree_certificate',
    'other_university_certificate',
    'signature'
  ];

  if (!validFileTypes.includes(fileType)) {
    console.error(`Invalid file type requested: ${fileType}`);
    return res.status(400).json({ error: 'Invalid file type' });
  }

  if (!studentId || isNaN(studentId)) {
    console.error(`Invalid studentId: ${studentId}`);
    return res.status(400).json({ error: 'Valid student ID is required' });
  }

  db.get(`SELECT ${fileType}_path FROM students WHERE id = ?`, [studentId], (err, row) => {
    if (err) {
      console.error('DB fetch error for file:', err.message, err.stack);
      return res.status(500).json({ error: 'Failed to fetch file' });
    }
    if (!row || !row[`${fileType}_path`]) {
      console.error(`File not found for studentId: ${studentId}, fileType: ${fileType}`);
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = row[`${fileType}_path`];
    if (!fs.existsSync(filePath)) {
      console.error(`File does not exist on server: ${filePath}`);
      return res.status(404).json({ error: 'File not found on server' });
    }

    const mimeType = path.extname(filePath).toLowerCase() === '.pdf' ? 'application/pdf' :
                     (path.extname(filePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename=${fileType}${path.extname(filePath)}`);
    fs.createReadStream(filePath).pipe(res);
  });
};

exports.getAllFiles = (req, res) => {
  const { studentId } = req.params;

  if (!studentId || isNaN(studentId)) {
    console.error(`Invalid studentId: ${studentId}`);
    return res.status(400).json({ error: 'Valid student ID is required' });
  }

  db.get(
    `SELECT full_name, applicant_photo_path, aadhar_copy_path, residence_certificate_path, degree_certificate_path, 
            other_university_certificate_path, signature_path 
     FROM students WHERE id = ?`,
    [studentId],
    (err, row) => {
      if (err) {
        console.error('DB fetch error for files:', err.message, err.stack);
        return res.status(500).json({ error: 'Failed to fetch files' });
      }
      if (!row) {
        console.error(`Student not found for studentId: ${studentId}`);
        return res.status(404).json({ error: 'Student not found' });
      }

      const filePaths = [
        { path: row.applicant_photo_path, name: 'applicant_photo.jpg' },
        { path: row.aadhar_copy_path, name: 'aadhar_copy.pdf' },
        { path: row.residence_certificate_path, name: 'residence_certificate.pdf' },
        { path: row.degree_certificate_path, name: 'degree_certificate.pdf' },
        { path: row.other_university_certificate_path, name: 'other_university_certificate.pdf' },
        { path: row.signature_path, name: 'signature.jpg' }
      ].filter(file => file.path && fs.existsSync(file.path));

      if (filePaths.length === 0) {
        console.error(`No valid files found for studentId: ${studentId}`);
        return res.status(404).json({ error: 'No files found for this student' });
      }

      const studentName = row.full_name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=${studentName}_documents.zip`);

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.on('error', (err) => {
        console.error('Archiver error:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to create zip file' });
      });

      archive.on('warning', (err) => {
        console.warn('Archiver warning:', err.message);
      });

      archive.pipe(res);

      filePaths.forEach(file => {
        console.log(`Adding file to ZIP: ${file.path} as ${file.name}`);
        archive.file(file.path, { name: file.name });
      });

      archive.finalize().catch(err => {
        console.error('Error finalizing ZIP archive:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to finalize zip file' });
      });
    }
  );
};

module.exports = exports;