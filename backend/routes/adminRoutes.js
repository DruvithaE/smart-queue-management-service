const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/dashboard', adminController.getAdminDashboard);         // REST standard
router.get('/adminDashboard', adminController.getAdminDashboard);    // assignment spec alias

module.exports = router;