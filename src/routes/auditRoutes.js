const express = require('express');
const AuditController = require('../controllers/auditController');
const adminAuth = require('../middleware/adminAuthMiddleware');

const router = express.Router();

router.get('/', adminAuth, AuditController.listAuditLogs);

module.exports = router;
