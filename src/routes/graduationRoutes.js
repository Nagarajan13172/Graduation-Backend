const express = require('express');
const router = express.Router();
const controller = require('../controllers/graduationController');

// Configuration Check
router.get('/billdesk-config', controller.checkBillDeskConfig);

// BillDesk Payment Routes
router.post('/billdesk/orders', controller.createCheckoutSession); // Create order
router.get('/billdesk/launch', controller.launchPayment); // Launch payment page
router.post('/billdesk/webhook', controller.handleWebhook); // S2S webhook (source of truth)
router.post('/billdesk/return', controller.handleReturn); // Browser return URL
router.post('/billdesk/retrieve', controller.retrieveTransaction); // Retrieve transaction status

// Registration and Data Routes
router.post('/register', controller.register);
router.get('/all', controller.list);
router.get('/check-email', controller.checkEmail);

// File Upload Routes
router.post('/upload-file', controller.uploadFile);
router.get('/file/:studentId/:fileType', controller.getFile);
router.get('/files/:studentId', controller.getAllFiles);

module.exports = router;