const db = require('../db');
const { billdesk } = require('../../server/billdesk');
const verifyPaymentColumns = require('../utils/verifyColumns');

/**
 * Get student details by orderid
 * @param {string} orderid - The order ID to look up
 * @returns {Promise} - Resolves with student details
 */
async function getStudentByOrderId(req, res) {
  try {
    const { orderid } = req.params;

    if (!orderid) {
      return res.status(400).json({
        success: false,
        error: 'Missing orderid parameter'
      });
    }

    const query = 'SELECT * FROM students WHERE orderid = ?';
    
    db.get(query, [orderid], (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          error: 'Database error',
          message: err.message
        });
      }

      if (!row) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: `No student found with orderid: ${orderid}`
        });
      }

      return res.json({
        success: true,
        data: row
      });
    });
  } catch (error) {
    console.error('Error in getStudentByOrderId:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message
    });
  }
}

// Verify columns on module load
verifyPaymentColumns()
  .then(() => console.log('Payment columns verified'))
  .catch(err => console.error('Error verifying payment columns:', err));

/**
 * Handle BillDesk payment callback
 * NOTE: This handler is DEPRECATED in favor of webhook handler
 * It should only be used as a fallback or for the /callback route
 * The webhook handler in graduationController.js is the source of truth
 */
async function handlePaymentCallback(req, res) {
  try {
    console.log('\n=== BILLDESK PAYMENT CALLBACK RECEIVED ===');
    console.log('WARNING: This is the fallback callback handler');
    console.log('Webhook handler should be the primary source of truth');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Request Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Raw Request Body:', typeof req.body === 'string' ? 
      req.body.substring(0, 100) + '...' : 
      JSON.stringify(req.body, null, 2));
    
    // Get the encrypted response from BillDesk
    const encryptedResponse = req.body.transaction_response || req.body;
    
    console.log('\n=== PROCESSING TRANSACTION RESPONSE ===');
    console.log('Transaction Response (encrypted):', typeof encryptedResponse === 'string' ? 
      encryptedResponse.substring(0, 100) + '...' : encryptedResponse);
    
    if (!encryptedResponse || typeof encryptedResponse !== 'string') {
      throw new Error('Invalid transaction response format. Expected JWT string.');
    }
    
    // CRITICAL: Decrypt and verify the response (signature validation happens here)
    const response = await billdesk.processResponse(encryptedResponse);
    console.log('\n=== DECRYPTED PAYMENT RESPONSE (After Signature Validation) ===');
    console.log(JSON.stringify(response, null, 2));
    console.log('Signature verification: SUCCESSFUL');
    console.log('=====================================\n');

    // Log the full response for debugging
    console.log('\n=== FULL RESPONSE STRUCTURE ===');
    console.log(JSON.stringify(response, null, 2));
    console.log('================================\n');

    // Safely extract payment details with defaults
    const orderid = response.orderid || null;
    const bdorderid = response.bdorderid || null;
    const transactionid = response.transactionid || null;
    const amount = response.amount?.toString() || null;
    
    // CRITICAL: Check auth_status ONLY AFTER successful signature validation
    const auth_status = response.auth_status;
    console.log('\n=== AUTH STATUS CHECK (After Signature Validation) ===');
    console.log('auth_status:', auth_status);
    console.log('Is successful payment (0300)?', auth_status === '0300');
    console.log('=====================================================\n');
    
    // Format transaction date as ISO string or null
    let transaction_date = null;
    if (response.transaction_date) {
      try {
        transaction_date = new Date(response.transaction_date).toISOString();
      } catch (e) {
        console.warn('Invalid transaction date format:', response.transaction_date);
      }
    }
    
    // Safely get payment method type
    const payment_method_type = response.payment_method?.type || 'unknown';

    // Map BillDesk status to our status (ONLY after signature validation)
    const payment_status = auth_status === '0300' ? 'paid' : 'failed';
    
    // Generate receipt ONLY for successful payments
    let receipt_number = null;
    let receipt_generated_at = null;
    if (auth_status === '0300') {
      receipt_number = `RCP${Date.now()}${Math.floor(Math.random() * 1000)}`;
      receipt_generated_at = new Date().toISOString();
      console.log('\n=== RECEIPT GENERATED (auth_status === 0300) ===');
      console.log('Receipt Number:', receipt_number);
      console.log('Generated At:', receipt_generated_at);
      console.log('==============================================\n');
    }
    
    // Get detailed payment info
    const payment_details = {
      status: payment_status,
      auth_status,
      error_type: response.transaction_error_type,
      error_code: response.transaction_error_code,
      error_desc: response.transaction_error_desc,
      bank_ref_no: response.bank_ref_no,
      payment_category: response.payment_category,
      txn_process_type: response.txn_process_type,
      bankid: response.bankid
    };

    console.log('\n=== PREPARED DATABASE VALUES ===');
    console.log('orderid:', orderid);
    console.log('bdorderid:', bdorderid);
    console.log('transactionid:', transactionid);
    console.log('amount:', amount);
    console.log('payment_status:', payment_status);
    console.log('transaction_date:', transaction_date);
    console.log('payment_method_type:', payment_method_type);
    console.log('receipt_number:', receipt_number);
    console.log('================================\n');

    // Validate required fields
    if (!orderid) {
      throw new Error('Order ID is missing in the response');
    }

    // Verify database schema
    db.get("PRAGMA table_info(students)", [], (err, rows) => {
      if (err) {
        console.error('Error checking table schema:', err);
      } else {
        console.log('\n=== TABLE SCHEMA ===');
        console.log(JSON.stringify(rows, null, 2));
        console.log('===================\n');
      }
    });

    // First check if new columns exist
    const checkColumns = `PRAGMA table_info(students)`;
    await new Promise((resolve, reject) => {
      db.all(checkColumns, [], async (err, columns) => {
        if (err) {
          console.error('Error checking columns:', err);
          reject(err);
          return;
        }

        const columnNames = columns.map(col => col.name);
        const missingColumns = [];
        
        // Check for missing columns
        if (!columnNames.includes('payment_bank_ref')) missingColumns.push('payment_bank_ref TEXT');
        if (!columnNames.includes('payment_error_code')) missingColumns.push('payment_error_code TEXT');
        if (!columnNames.includes('payment_error_desc')) missingColumns.push('payment_error_desc TEXT');
        if (!columnNames.includes('original_response_token')) missingColumns.push('original_response_token TEXT');
        if (!columnNames.includes('receipt_number')) missingColumns.push('receipt_number TEXT');
        if (!columnNames.includes('receipt_generated_at')) missingColumns.push('receipt_generated_at TEXT');

        // Add missing columns if any
        if (missingColumns.length > 0) {
          for (const column of missingColumns) {
            await new Promise((resolveAlter) => {
              const alterQuery = `ALTER TABLE students ADD COLUMN ${column}`;
              db.run(alterQuery, [], (err) => {
                if (err && !err.message.includes('duplicate column')) {
                  console.error('Error adding column:', err);
                }
                resolveAlter();
              });
            });
          }
        }
        resolve();
      });
    });

    // Update database with payment status and details
    // IMPORTANT: Store original_response_token without modification
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
        receipt_generated_at = ?
      WHERE orderid = ?
    `;

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
      encryptedResponse, // Store original encrypted response WITHOUT modification
      receipt_number,
      receipt_generated_at,
      orderid
    ], function(err) {
      if (err) {
        console.error('\n=== DATABASE ERROR DETAILS ===');
        console.error('Error:', err.message);
        console.error('SQL Error Code:', err.code);
        console.error('SQL Query:', updateQuery);
        console.error('Parameters:', JSON.stringify({
          payment_status,
          bdorderid,
          transactionid,
          amount,
          transaction_date,
          payment_method_type,
          orderid
        }, null, 2));
        console.error('==============================\n');
        
        return res.status(500).json({
          success: false,
          error: 'Database error',
          message: `Failed to update payment status: ${err.message}`
        });
      }

      if (this.changes === 0) {
        console.warn('No record found for orderid:', orderid);
        const frontendBaseUrl = 'http://localhost:5173';
      return res.redirect(`${frontendBaseUrl}/failed?error=OrderNotFound&orderid=${orderid}`);
      }

      console.log('\n=== PAYMENT STATUS UPDATED ===');
      console.log('Order ID:', orderid);
      console.log('Payment Status:', payment_status);
      console.log('Transaction ID:', transactionid);
      console.log('Amount:', amount);
      console.log('Payment Method:', payment_method_type);
      console.log('Transaction Date:', transaction_date);
      console.log('BD Order ID:', bdorderid);
      console.log('===============================\n');

      // Redirect to frontend based on payment status
      const frontendBaseUrl = 'http://localhost:5173';
      const redirectUrl = payment_status === 'paid' ? 
        `${frontendBaseUrl}/success?orderid=${orderid}&transactionid=${transactionid}` : 
        `${frontendBaseUrl}/failed?orderid=${orderid}&error=${payment_details.error_desc}`;

      console.log('\n=== REDIRECTING TO FRONTEND ===');
      console.log('Redirect URL:', redirectUrl);
      console.log('==============================\n');

      return res.redirect(redirectUrl);
    });

  } catch (error) {
    console.error('\n=== PAYMENT CALLBACK ERROR ===');
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('=============================\n');
    const frontendBaseUrl = 'http://localhost:5173';
    return res.redirect(`${frontendBaseUrl}/failed?error=${encodeURIComponent(error.message)}`);
  }
}

module.exports = {
  handlePaymentCallback,
  getStudentByOrderId
};