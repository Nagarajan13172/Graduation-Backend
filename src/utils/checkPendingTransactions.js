/**
 * Transaction Status Checker
 * 
 * This module provides functionality to check pending transactions
 * and reconcile payment status using BillDesk's Retrieve Transaction API.
 * 
 * Usage:
 * 1. Run manually: node src/utils/checkPendingTransactions.js
 * 2. Set up as cron job (recommended): Run every 15-30 minutes
 * 
 * BillDesk Requirement #3: Mechanism to update transaction status
 * via "Retrieve Transaction API"
 */

const db = require('../db');
const axios = require('axios');
const { billdesk } = require('../../server/billdesk');

/**
 * Check all pending transactions older than specified minutes
 * @param {number} olderThanMinutes - Check transactions older than this (default: 10)
 * @returns {Promise<object>} - Summary of checked transactions
 */
async function checkPendingTransactions(olderThanMinutes = 10) {
  console.log('\n=== CHECKING PENDING TRANSACTIONS ===');
  console.log('Checking transactions older than', olderThanMinutes, 'minutes');
  
  try {
    // Calculate timestamp for older than X minutes
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - olderThanMinutes);
    const cutoffISO = cutoffTime.toISOString();
    
    console.log('Cutoff time:', cutoffISO);
    
    // Query pending transactions
    const query = `
      SELECT id, orderid, full_name, email, mobile_number, created_at, payment_status
      FROM students
      WHERE payment_status = 'pending'
        AND created_at < ?
      ORDER BY created_at ASC
    `;
    
    const pendingOrders = await new Promise((resolve, reject) => {
      db.all(query, [cutoffISO], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    console.log('Found', pendingOrders.length, 'pending transactions');
    
    if (pendingOrders.length === 0) {
      console.log('No pending transactions to check');
      return { checked: 0, updated: 0, failed: 0 };
    }
    
    let updated = 0;
    let failed = 0;
    
    // Check each pending transaction
    for (const order of pendingOrders) {
      try {
        console.log('\nChecking orderid:', order.orderid);
        
        // Call BillDesk Retrieve Transaction API
        const payload = {
          mercid: billdesk.mercId,
          orderid: order.orderid,
          refund_details: true
        };
        
        const jws = billdesk.jwsCompact(payload);
        const url = `${billdesk.baseUrl}/payments/ve1_2/transactions/get`;
        const headers = billdesk.joseHeaders();
        
        const response = await axios.post(url, jws, {
          headers,
          timeout: 30000
        });
        
        const decoded = billdesk.verifyJws(response.data);
        console.log('Transaction status:', decoded.auth_status);
        
        // Update database based on response
        const auth_status = decoded.auth_status;
        const payment_status = auth_status === '0300' ? 'paid' : 
                              (auth_status === '0399' ? 'failed' : 'pending');
        
        if (payment_status !== 'pending') {
          // Generate receipt for successful payments
          let receipt_number = null;
          let receipt_generated_at = null;
          if (auth_status === '0300') {
            receipt_number = `RCP${Date.now()}${Math.floor(Math.random() * 1000)}`;
            receipt_generated_at = new Date().toISOString();
            console.log('Generated receipt:', receipt_number);
          }
          
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
              receipt_number = ?,
              receipt_generated_at = ?,
              updated_at = datetime('now')
            WHERE orderid = ?
          `;
          
          await new Promise((resolve, reject) => {
            db.run(updateQuery, [
              payment_status,
              decoded.bdorderid,
              decoded.transactionid,
              decoded.amount?.toString(),
              decoded.transaction_date ? new Date(decoded.transaction_date).toISOString() : null,
              decoded.payment_method?.type || 'unknown',
              decoded.bank_ref_no,
              decoded.transaction_error_code,
              decoded.transaction_error_desc,
              receipt_number,
              receipt_generated_at,
              order.orderid
            ], function(err) {
              if (err) reject(err);
              else {
                console.log('Updated orderid:', order.orderid, 'to status:', payment_status);
                updated++;
                resolve();
              }
            });
          });
        }
        
      } catch (error) {
        console.error('Error checking orderid:', order.orderid, error.message);
        failed++;
      }
    }
    
    console.log('\n=== CHECK COMPLETE ===');
    console.log('Total checked:', pendingOrders.length);
    console.log('Updated:', updated);
    console.log('Failed:', failed);
    console.log('======================\n');
    
    return {
      checked: pendingOrders.length,
      updated,
      failed
    };
    
  } catch (error) {
    console.error('Error in checkPendingTransactions:', error);
    throw error;
  }
}

/**
 * Check a specific transaction by orderid
 * @param {string} orderid - The order ID to check
 * @returns {Promise<object>} - Transaction status
 */
async function checkTransactionStatus(orderid) {
  console.log('\n=== CHECKING TRANSACTION STATUS ===');
  console.log('Order ID:', orderid);
  
  try {
    const payload = {
      mercid: billdesk.mercId,
      orderid,
      refund_details: true
    };
    
    const jws = billdesk.jwsCompact(payload);
    const url = `${billdesk.baseUrl}/payments/ve1_2/transactions/get`;
    const headers = billdesk.joseHeaders();
    
    const response = await axios.post(url, jws, {
      headers,
      timeout: 30000
    });
    
    const decoded = billdesk.verifyJws(response.data);
    console.log('Transaction status:', JSON.stringify(decoded, null, 2));
    console.log('===================================\n');
    
    return decoded;
    
  } catch (error) {
    console.error('Error checking transaction:', error.message);
    throw error;
  }
}

// If run directly (not imported)
if (require.main === module) {
  console.log('Running transaction status checker...');
  checkPendingTransactions(10)
    .then(result => {
      console.log('Result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = {
  checkPendingTransactions,
  checkTransactionStatus
};
