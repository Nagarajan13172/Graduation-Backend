const express = require('express');
const router = express.Router();
const controller = require('../controllers/graduationController');

// Health / Config
router.get('/billdesk/config', controller.checkBillDeskConfig);

// BillDesk Payment Routes
router.post('/billdesk/orders', controller.createCheckoutSession);   // Create order
router.get('/billdesk/launch', controller.launchPayment);            // Auto-post to SDK
router.post('/billdesk/webhook', controller.handleWebhook);          // S2S webhook (source of truth)

// IMPORTANT: Browser return is a GET
// Use this only if your order 'ru' points to a backend URL like `${API_BASE}/billdesk/return`
router.get('/billdesk/return', controller.handleReturn);

// Retrieve transaction status (name/path consistency)
router.post('/billdesk/transactions/get', controller.retrieveTransaction);

// Registration and Data Routes
router.post('/register', controller.register);
router.get('/all', controller.list);
router.get('/check-email', controller.checkEmail);

// File Upload Routes
router.post('/upload-file', controller.uploadFile);
router.get('/file/:studentId/:fileType', controller.getFile);
router.get('/files/:studentId', controller.getAllFiles);

module.exports = router;
