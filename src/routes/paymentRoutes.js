const express = require('express');
const router = express.Router();
const { 
  handlePaymentCallback,
  getStudentByOrderId 
} = require('../controllers/paymentCallbackHandler');

// BillDesk payment callback route
router.post('/callback', handlePaymentCallback);

// Get student details by order ID
router.get('/student/:orderid', getStudentByOrderId);

module.exports = router;