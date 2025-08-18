// src/routes/graduationRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/graduationController');

router.post('/register', controller.register); // create
router.get('/all', controller.list);
router.get('/check-email', controller.checkEmail);
// router.post('/create-checkout-session', controller.createCheckoutSession);

module.exports = router;
