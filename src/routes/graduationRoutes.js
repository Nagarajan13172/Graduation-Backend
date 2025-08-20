const express = require('express');
const router = express.Router();
const controller = require('../controllers/graduationController');

router.post('/register', controller.register);
router.get('/all', controller.list);
router.get('/check-email', controller.checkEmail);
router.post('/upload-file', controller.uploadFile);
router.get('/file/:studentId/:fileType', controller.getFile);
router.get('/files/:studentId', controller.getAllFiles); // Added route for getAllFiles

module.exports = router;