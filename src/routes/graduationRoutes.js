const express = require('express');
const router = express.Router();
const controller = require('../controllers/graduationController');

// Configuration Check
router.get('/billdesk-config', controller.checkBillDeskConfig);

// BillDesk Payment Routes
router.post('/create-checkout-session', controller.createCheckoutSession);
router.post('/verify-payment', controller.verifyPayment);

// Registration and Data Routes
router.post('/register', controller.register);
router.get('/all', controller.list);
router.get('/check-email', controller.checkEmail);

// File Upload Routes
router.post('/upload-file', controller.uploadFile);
router.get('/file/:studentId/:fileType', controller.getFile);
router.get('/files/:studentId', controller.getAllFiles);

module.exports = router;