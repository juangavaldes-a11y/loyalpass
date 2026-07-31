const fs = require('fs');
const path = require('path');
const { Business, Customer, Points, Pass, ApiKey, AuditLog, PortalUser } = require('../models');
const logger = require('../utils/logger');

class BackupService {
  static async createBackup({ outputPath } = {}) {
    const backupDir = outputPath || path.join(process.cwd(), 'backups');
    fs.mkdirSync(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(backupDir, `loyalpass-backup-${timestamp}.json`);

    const payload = {
      createdAt: new Date().toISOString(),
      schemaVersion: 1,
      data: {
        businesses: await Business.findAll({ raw: true }),
        customers: await Customer.findAll({ raw: true }),
        points: await Points.findAll({ raw: true }),
        passes: await Pass.findAll({ raw: true }),
        apiKeys: await ApiKey.findAll({ raw: true }),
        auditLogs: await AuditLog.findAll({ raw: true }),
        portalUsers: await PortalUser.findAll({ raw: true }),
      },
    };

    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
    logger.info('Backup created', { filePath });

    return { filePath, recordCount: Object.values(payload.data).reduce((sum, rows) => sum + rows.length, 0) };
  }

  static async restoreBackup({ inputPath }) {
    if (!inputPath || !fs.existsSync(inputPath)) {
      throw new Error('Backup file not found');
    }

    const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    if (!payload?.data) {
      throw new Error('Invalid backup payload');
    }

    const { data } = payload;
    const restoreOrder = [
      ['Business', data.businesses],
      ['Customer', data.customers],
      ['Points', data.points],
      ['Pass', data.passes],
      ['ApiKey', data.apiKeys],
      ['AuditLog', data.auditLogs],
      ['PortalUser', data.portalUsers],
    ];

    for (const [modelName, rows] of restoreOrder) {
      if (!Array.isArray(rows)) {
        continue;
      }

      const model = require('../models')[modelName];
      if (!model) {
        continue;
      }

      await model.bulkCreate(rows, { ignoreDuplicates: true, updateOnDuplicate: ['id'] });
    }

    logger.info('Backup restored', { inputPath });
    return { restored: true, inputPath };
  }
}

module.exports = BackupService;
