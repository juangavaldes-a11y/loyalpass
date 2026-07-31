const express = require('express');
const AuditController = require('../controllers/auditController');
const adminAuth = require('../middleware/adminAuthMiddleware');

const router = express.Router();

router.get('/', adminAuth, AuditController.listAuditLogs);

router.delete('/retention', adminAuth, async (req, res, next) => {
  try {
    if (!req.isPlatformAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Platform admin access required',
      });
    }

    const retentionDays = Number.parseInt(req.query.retentionDays || '90', 10);
    const deletedCount = await require('../services/auditService').pruneAuditLogs({ retentionDays });

    return res.status(200).json({
      success: true,
      data: { deletedCount, retentionDays },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
