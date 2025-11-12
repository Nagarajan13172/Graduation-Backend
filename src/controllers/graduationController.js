const db = require('../db');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const axios = require('axios');
const { billdesk } = require('../../server/billdesk');

const RU_PUBLIC = process.env.RU_PUBLIC;

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
const COMMUNITY_ENUM = ['OC', 'BC', 'SC', 'ST', 'MBC'];
const DISTRICT_ENUM = ['Dharmapuri', 'Krishnagiri', 'Namakkal', 'Salem'];

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
// Check if email exists in database (informational only - duplicates are allowed)
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
        degree_pattern, convocation_year, occupation, address, declaration,
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

      // Amount / currency / ru acceptance with defaults
      const {
        amount = '500.00',
        currency = '356',
        itemcode = 'DIRECT',
        ru = RU_PUBLIC
      } = req.body || {};

      // Validate RU and webhook URLs don't contain parameters
      if (ru && (ru.includes('?') || ru.includes('&'))) {
        return res.status(400).json({
          error: 'RU (Return URL) must not contain query parameters (?&)'
        });
      }

      // Generate a unique order id if none provided
      // CRITICAL: orderid must be alphanumeric only (no special characters)
      let orderId = incomingOrderId;
      if (!orderId) {
        orderId = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;
      }

      // Validate orderid: alphanumeric only, no special characters
      if (!/^[A-Za-z0-9]+$/.test(orderId)) {
        return res.status(400).json({
          error: 'orderid must contain only alphanumeric characters (no special characters allowed)'
        });
      }

      // Check orderid uniqueness in database
      const existingOrder = await new Promise((resolve, reject) => {
        db.get('SELECT orderid FROM students WHERE orderid = ?', [orderId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (existingOrder) {
        return res.status(400).json({
          error: 'orderid already exists. Please use a unique orderid.'
        });
      }

      // Save or update the orderid in the database
      const updateOrderQuery = `
        UPDATE students 
        SET orderid = ?
        WHERE id = (SELECT MAX(id) FROM students)
      `;

      await new Promise((resolve, reject) => {
        db.run(updateOrderQuery, [orderId], function (err) {
          if (err) {
            console.error('Error saving orderid:', err);
            reject(err);
          } else {
            console.log('Saved orderid for latest student:', orderId);
            resolve();
          }
        });
      });

      const order_date = billdesk.istTimestampCompact();
      console.log('Generated order_date:', order_date);
      console.log('order_date length:', order_date.length);
      console.log('order_date characters:', [...order_date].map(c => `${c} (${c.charCodeAt(0)})`).join(', '));

      // Helper function to sanitize additional info (only @ , . – allowed)
      const sanitizeAdditionalInfo = (value) => {
        if (!value || value === '') return 'NA';
        // Remove disallowed special characters, keep only: alphanumeric, @, comma, period, hyphen, spaces
        return String(value).replace(/[^a-zA-Z0-9@,.\-\s]/g, '').trim() || 'NA';
      };

      // BillDesk requires EXACTLY 7 additional_info fields (minimum 3, maximum 7)
      // All fields must be present with 'NA' if value is unavailable
      const orderPayload = {
        mercid: billdesk.mercId,
        orderid: orderId,
        amount,
        currency,
        order_date, // Using the logged timestamp
        ru,
        itemcode,
        additional_info: {
          additional_info1: sanitizeAdditionalInfo(full_name || additional_info?.student_name || 'Graduation Payment'),
          additional_info2: sanitizeAdditionalInfo(additional_info?.purpose || 'Graduation Registration'),
          additional_info3: sanitizeAdditionalInfo(orderId || 'NA'),
          additional_info4: sanitizeAdditionalInfo(mobile_number || additional_info?.mobile || 'NA'),
          additional_info5: sanitizeAdditionalInfo(convocation_year || additional_info?.year || 'NA'),
          additional_info6: sanitizeAdditionalInfo(email || additional_info?.email || 'NA'),
          additional_info7: sanitizeAdditionalInfo(additional_info?.remarks || 'NA')
        },
        device: {
          init_channel: 'internet',
          ip: req.ip || '127.0.0.1',
          user_agent: req.get('user-agent') || 'Mozilla/5.0',
          accept_header: 'text/html'
        }
      };

      console.log('=== BillDesk Order Creation ===');
      console.log('1. Order Payload (before encryption):', JSON.stringify(orderPayload, null, 2));

      // NEW: Encrypt then Sign (correct BillDesk flow)
      const finalToken = await billdesk.createOrderToken(orderPayload);
      console.log('2. Final Token (encrypted + signed):', finalToken.substring(0, 150) + '...');

      // IMPORTANT: Store the original request token for BillDesk support/debugging
      const storeRequestTokenQuery = `
        UPDATE students 
        SET original_request_token = ?
        WHERE orderid = ?
      `;
      await new Promise((resolve, reject) => {
        db.run(storeRequestTokenQuery, [finalToken, orderId], function (err) {
          if (err) {
            console.error('Error storing original request token:', err);
            // Don't fail the request, just log the error
          } else {
            console.log('Stored original request token for orderid:', orderId);
          }
          resolve();
        });
      });

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
        response.data);

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
// This is the ONLY place where payment status should be updated
// RU (browser callback) should ONLY show acknowledgment
exports.handleWebhook = async (req, res) => {
  try {
    console.log('\n=== BILLDESK WEBHOOK RECEIVED (S2S) ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Request Headers:', JSON.stringify(req.headers, null, 2));

    let encryptedResponse = null;
    let decoded = null;

    // Extract encrypted response based on content type
    if (req.is("application/jose") || typeof req.body === 'string') {
      encryptedResponse = req.body;
      // Use processResponse for full verification (signature + decryption)
      decoded = await billdesk.processResponse(req.body);
    } else if (req.is("application/x-www-form-urlencoded")) {
      const trxBlob = req.body?.transaction_response;
      if (trxBlob) {
        encryptedResponse = trxBlob;
        decoded = await billdesk.processResponse(trxBlob);
      } else {
        decoded = req.body;
      }
    } else {
      decoded = req.body;
    }

    // Log the raw/encoded response (if present) and the decoded payload
    if (encryptedResponse) {
      try {
        console.log('\n=== WEBHOOK: Encoded transaction_response (first 1000 chars) ===');
        console.log(String(encryptedResponse).substring(0, 1000) + (String(encryptedResponse).length > 1000 ? '... [truncated]' : ''));
      } catch (e) {
        console.warn('Failed to stringify encoded response for logging:', e.message);
      }
    } else {
      console.log('\n=== WEBHOOK: No encoded transaction_response found in request ===');
    }

    console.log('\n=== WEBHOOK: Decrypted payload ===');
    console.log(JSON.stringify(decoded, null, 2));

    // CRITICAL: Check auth_status ONLY AFTER successful signature validation
    const orderid = decoded.orderid;
    const auth_status = decoded.auth_status;
    const bdorderid = decoded.bdorderid;
    const transactionid = decoded.transactionid;
    const amount = decoded.amount?.toString();

    if (!orderid) {
      console.error('Webhook: Missing orderid in response');
      return res.status(200).json({ ack: true, error: 'Missing orderid' });
    }

    // Map BillDesk status to our status
    // IMPORTANT: Only check auth_status after signature verification
    const payment_status = auth_status === '0300' ? 'paid' : 'failed';

    // Format transaction date
    let transaction_date = null;
    if (decoded.transaction_date) {
      try {
        transaction_date = new Date(decoded.transaction_date).toISOString();
      } catch (e) {
        console.warn('Invalid transaction date format:', decoded.transaction_date);
      }
    }

    const payment_method_type = decoded.payment_method?.type || 'unknown';

    const payment_details = {
      status: payment_status,
      auth_status,
      error_type: decoded.transaction_error_type,
      error_code: decoded.transaction_error_code,
      error_desc: decoded.transaction_error_desc,
      bank_ref_no: decoded.bank_ref_no,
      payment_category: decoded.payment_category,
      txn_process_type: decoded.txn_process_type,
      bankid: decoded.bankid
    };

    console.log('Webhook payment details:', payment_details);

    // Generate receipt number only for successful payments (auth_status === '0300')
    let receipt_number = null;
    let receipt_generated_at = null;
    if (auth_status === '0300') {
      receipt_number = `RCP${Date.now()}${Math.floor(Math.random() * 1000)}`;
      receipt_generated_at = new Date().toISOString();
      console.log('Generated receipt:', receipt_number);
    }

    // Update database with payment status
    const updateQuery = `
      UPDATE students 
      SET 
        payment_status = ?,
        bdorderid = ?,
        transaction_id = ?,
        payment_amount = ?,
        payment_date = ?,
        payment_method_type = ?,
        payment_bank_ref = ?,
        payment_error_code = ?,
        payment_error_desc = ?,
        original_response_token = ?,
        receipt_number = ?,
        receipt_generated_at = ?,
        updated_at = datetime('now')
      WHERE orderid = ?
    `;

    await new Promise((resolve, reject) => {
      db.run(updateQuery, [
        payment_status,
        bdorderid,
        transactionid,
        amount,
        transaction_date,
        payment_method_type,
        payment_details.bank_ref_no,
        payment_details.error_code,
        payment_details.error_desc,
        encryptedResponse, // Store original encrypted response
        receipt_number,
        receipt_generated_at,
        orderid
      ], function (err) {
        if (err) {
          console.error('Webhook DB update error:', err);
          reject(err);
        } else {
          if (this.changes === 0) {
            console.warn('Webhook: No record found for orderid:', orderid);
          } else {
            console.log('Webhook: Payment status updated successfully');
            console.log('Order ID:', orderid);
            console.log('Payment Status:', payment_status);
            console.log('Receipt Number:', receipt_number);
          }
          resolve();
        }
      });
    });

    // Send acknowledgment to BillDesk
    return res.status(200).json({ ack: true });

  } catch (error) {
    console.error('Webhook processing error:', error.message);
    console.error('Stack:', error.stack);
    // Always send ack: true to BillDesk even on error to prevent retries
    return res.status(200).json({ ack: true, error: error.message });
  }
};

// BillDesk - Return URL Handler (browser callback)
// IMPORTANT: This should ONLY display acknowledgment to the user
// All payment processing should happen in the webhook handler
// This is a GET request with transaction_response in query params or POST with form data
exports.handleReturn = async (req, res) => {
  try {
    console.log('\n=== BILLDESK RETURN URL (Browser Callback) ===');
    console.log('This is for DISPLAY ONLY - payment processing happens in webhook');

    // Extract transaction response from query params or form body
    const encryptedResponse = req.query?.transaction_response || req.body?.transaction_response;

    let orderid = null;
    let payment_status = 'processing';

    if (encryptedResponse) {
      try {
        // Verify and decrypt the response to get orderid for display
        const decoded = await billdesk.processResponse(encryptedResponse);
        orderid = decoded.orderid;
        const auth_status = decoded.auth_status;
        payment_status = auth_status === '0300' ? 'success' : 'failed';

        console.log('RU Handler - orderid:', orderid, 'status:', payment_status);
      } catch (error) {
        console.error('RU Handler - Error decoding response:', error.message);
      }
    }

    // Return HTML acknowledgment page
    const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Payment ${payment_status === 'success' ? 'Successful' : 'Processing'}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 500px;
          }
          h1 {
            color: #333;
            margin-bottom: 20px;
          }
          .status {
            font-size: 48px;
            margin: 20px 0;
          }
          .success { color: #28a745; }
          .processing { color: #ffc107; }
          .message {
            color: #666;
            margin: 20px 0;
            line-height: 1.6;
          }
          .orderid {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            font-family: monospace;
            margin: 20px 0;
            word-break: break-all;
          }
          .note {
            font-size: 12px;
            color: #999;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="status ${payment_status}">${payment_status === 'success' ? '✓' : '⏳'}</div>
          <h1>${payment_status === 'success' ? 'Payment Successful!' : 'Payment Processing'}</h1>
          ${orderid ? `<div class="orderid">Order ID: ${orderid}</div>` : ''}
          <div class="message">
            ${payment_status === 'success'
        ? 'Thank you! Your payment has been received successfully. Your registration is being processed.'
        : 'Thank you! Your payment is being processed. Please wait while we confirm your transaction.'}
          </div>
          <div class="note">
            ${payment_status === 'success'
        ? 'You will receive a confirmation email shortly with your receipt.'
        : 'This page will redirect automatically. Please do not refresh or close this window.'}
          </div>
        </div>
        <script>
          // Redirect to home page after 5 seconds
          setTimeout(() => { 
            window.location.href = '/'; 
          }, 5000);
        </script>
      </body>
    </html>`;

    res.type("html").send(html);

  } catch (error) {
    console.error('RU Handler error:', error.message);
    const errorHtml = `
    <!doctype html>
    <html>
      <head><meta charset="utf-8"><title>Payment Status</title></head>
      <body>
        <h3>Thank you! Processing your payment...</h3>
        <p>Please wait while we confirm your payment. You will be redirected shortly.</p>
        <script>
          setTimeout(() => { window.location.href = '/'; }, 3000);
        </script>
      </body>
    </html>`;
    res.type("html").send(errorHtml);
  }
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

    // Build the JWS request
    const jws = billdesk.jwsCompact(payload);
    console.log('\n2. Encrypted Request (JWS) -> length:', String(jws).length);
    console.log('2a. Encrypted Request (JWS) (first 1000 chars):');
    console.log(String(jws).substring(0, 1000) + (String(jws).length > 1000 ? '... [truncated]' : ''));

    const url = `${billdesk.baseUrl}/payments/ve1_2/transactions/get`;
    const headers = billdesk.joseHeaders();
    console.log('\n3. Request URL:', url);
    console.log('4. Request Headers:', JSON.stringify(headers, null, 2));

    // Send request to BillDesk
    let response;
    try {
      response = await axios.post(url, jws, {
        headers,
        timeout: 30000
      });
    } catch (err) {
      console.error('Retrieve Transaction - HTTP request failed:', err.message);
      if (err.response) {
        console.error('HTTP Response Status:', err.response.status);
        try {
          console.error('HTTP Response Headers:', JSON.stringify(err.response.headers, null, 2));
        } catch (e) { }
        try { console.error('HTTP Response Data (encrypted):', String(err.response.data).substring(0, 2000) + (String(err.response.data).length > 2000 ? '... [truncated]' : '')); } catch (e) { }
      }
      if (err.response && err.response.data) {
        // Attempt to verify if possible
        try {
          const attempted = billdesk.verifyJws(err.response.data);
          console.log('Attempted decryption of error response succeeded:', JSON.stringify(attempted, null, 2));
        } catch (verifyErr) {
          console.warn('Attempted verification of error response failed:', verifyErr.message);
        }
      }
      throw err;
    }

    console.log('\n5. Response Status:', response.status);
    try { console.log('5a. Response Headers:', JSON.stringify(response.headers, null, 2)); } catch (e) { }
    console.log('6. Response Data (encrypted) -> length:', String(response.data).length);
    console.log('6a. Response Data (encrypted) (first 2000 chars):');
    console.log(String(response.data).substring(0, 2000) + (String(response.data).length > 2000 ? '... [truncated]' : ''));

    // Verify and decrypt the response
    let decoded;
    try {
      decoded = billdesk.verifyJws(response.data);
    } catch (verifyErr) {
      console.error('Retrieve Transaction - Signature verification failed:', verifyErr.message);
      // rethrow to be handled by outer catch
      throw verifyErr;
    }

    console.log('\n7. Response Data (decrypted):');
    console.log(JSON.stringify(decoded, null, 2));
    console.log('=== Retrieve Transaction Complete ===\n');

    return res.json(decoded);
  } catch (error) {
    console.error('Retrieve transaction error:', error.message);
    if (error.response) console.error('BillDesk API error response:', error.response.data);
    return res.status(400).json({ error: error.message });
  }
};

// BillDesk - Check Pending Transactions (Reconciliation)
// This endpoint triggers a check of all pending transactions
exports.checkPendingTransactions = async (req, res) => {
  try {
    const { olderThanMinutes = 10 } = req.body || {};

    console.log('=== Triggering Pending Transaction Check ===');
    console.log('Checking transactions older than', olderThanMinutes, 'minutes');

    // Import the utility
    const { checkPendingTransactions } = require('../utils/checkPendingTransactions');

    const result = await checkPendingTransactions(olderThanMinutes);

    return res.json({
      success: true,
      message: 'Pending transaction check completed',
      result
    });

  } catch (error) {
    console.error('Error checking pending transactions:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to check pending transactions',
      message: error.message
    });
  }
};

// Get Order Details by OrderID - Returns both form data and transaction info
exports.getOrderByOrderId = async (req, res) => {
  try {
    const { orderid } = req.params;

    if (!orderid) {
      return res.status(400).json({
        success: false,
        error: 'orderid is required'
      });
    }

    console.log('=== Fetching Order Details ===');
    console.log('Order ID:', orderid);

    // Fetch student record with all form and payment data
    const query = `
      SELECT 
        id,
        full_name,
        date_of_birth,
        gender,
        guardian_name,
        nationality,
        religion,
        email,
        mobile_number,
        place_of_birth,
        community,
        mother_tongue,
        aadhar_number,
        degree_name,
        university_name,
        degree_pattern,
        convocation_year,
        is_registered_graduate,
        occupation,
        address,
        orderid,
        payment_status,
        bdorderid,
        transaction_id,
        payment_amount,
        payment_date,
        payment_method_type,
        payment_bank_ref,
        payment_error_code,
        payment_error_desc,
        receipt_number,
        receipt_generated_at,
        created_at,
        updated_at
      FROM students 
      WHERE orderid = ?
    `;

    const row = await new Promise((resolve, reject) => {
      db.get(query, [orderid], (err, row) => {
        if (err) {
          console.error('Database error:', err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });

    if (!row) {
      console.log('Order not found:', orderid);
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        message: `No order found with orderid: ${orderid}`
      });
    }

    console.log('Order found - Student ID:', row.id, 'Payment Status:', row.payment_status);

    // Structure the response with separate sections
    const response = {
      success: true,
      orderid: row.orderid,

      // Personal Information
      personal_info: {
        full_name: row.full_name,
        date_of_birth: row.date_of_birth,
        gender: row.gender,
        guardian_name: row.guardian_name,
        nationality: row.nationality,
        religion: row.religion,
        email: row.email,
        mobile_number: row.mobile_number,
        place_of_birth: row.place_of_birth,
        community: row.community,
        mother_tongue: row.mother_tongue,
        aadhar_number: row.aadhar_number
      },

      // Academic Information
      academic_info: {
        degree_name: row.degree_name,
        university_name: row.university_name,
        degree_pattern: row.degree_pattern,
        convocation_year: row.convocation_year,
        is_registered_graduate: row.is_registered_graduate === 1
      },

      // Additional Information
      additional_info: {
        occupation: row.occupation,
        address: row.address,
        lunch_required: row.lunch_required,
        companion_option: row.companion_option
      },

      // Transaction Information
      transaction_info: {
        payment_status: row.payment_status,
        bdorderid: row.bdorderid,
        transaction_id: row.transaction_id,
        payment_amount: row.payment_amount,
        payment_date: row.payment_date,
        payment_method_type: row.payment_method_type,
        payment_bank_ref: row.payment_bank_ref,
        payment_error_code: row.payment_error_code,
        payment_error_desc: row.payment_error_desc,
        receipt_number: row.receipt_number,
        receipt_generated_at: row.receipt_generated_at
      },

      // Metadata
      metadata: {
        student_id: row.id,
        created_at: row.created_at,
        updated_at: row.updated_at
      }
    };

    console.log('=== Order Details Retrieved Successfully ===\n');
    return res.json(response);

  } catch (error) {
    console.error('Error fetching order details:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch order details',
      message: error.message
    });
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
      degree_pattern, convocation_year, occupation, address, declaration
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

    // Generate initial order ID
    const initialOrderId = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;

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
      initialOrderId,            // Add orderid
      'pending',                 // Initial payment_status
      null,                     // bdorderid (will be set after payment)
      null,                     // transaction_id
      '500.00',                // payment_amount
      null,                     // payment_date
      null                      // payment_method_type
    ];

    db.run(
      `
      INSERT INTO students (
        full_name, date_of_birth, gender, guardian_name, nationality, religion, email, mobile_number,
        place_of_birth, community, mother_tongue, applicant_photo_path, aadhar_number, aadhar_copy_path,
        residence_certificate_path, degree_name, university_name, degree_pattern, convocation_year,
        degree_certificate_path, is_registered_graduate, other_university_certificate_path, occupation,
        address, signature_path, declaration, orderid, payment_status,
        bdorderid, transaction_id, payment_amount, payment_date, payment_method_type, created_at, updated_at
      )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `,
      params,
      function (err) {
        if (err) {
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