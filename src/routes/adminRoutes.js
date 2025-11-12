// src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { adminLogin, deleteStudent } = require('../controllers/adminController');

router.post('/login', adminLogin);
router.delete('/students/:id', deleteStudent);

module.exports = router;
