const express = require('express');
const router = express.Router();
const controller = require('../controllers/graduationController');

router.post('/register', controller.register); // create
router.get('/all', controller.list);
router.get('/check-email', controller.checkEmail);
router.post('/create-checkout-session', controller.createCheckoutSession);
router.post('/verify-payment', controller.verifyPayment); // New endpoint
router.get('/check-register-no', controller.checkRegisterNo); // Added endpoint for checking university register number

module.exports = router;