const fs = require('fs');
const path = require('path');
const sequelize = require('../config/db');
const { Business, BusinessModule, Customer, Points, Pass, Promotion, PromotionRedemption, AuditLog } = require('../models');
const logger = require('../utils/logger');

function getBackupDirectory(outputPath) {
  return path.resolve(outputPath || process.env.BACKUP_DIRECTORY || path.join(process.cwd(), 'backups'));
}

function getBackupPath(backupDirectory, backupId) {
  if (!backupId || path.basename(backupId) !== backupId || !/^loyalpass-backup-[a-zA-Z0-9-]+\.json$/.test(backupId)) {
    throw new Error('Invalid backup ID');
  }
  return path.join(backupDirectory, backupId);
}

class BackupService {
  static async createBackup({ businessId, outputPath } = {}) {
    if (!businessId) throw new Error('Business ID is required');

    const backupDirectory = getBackupDirectory(outputPath);
    fs.mkdirSync(backupDirectory, { recursive: true, mode: 0o700 });
    const business = await Business.findByPk(businessId, { raw: true });
    if (!business) throw new Error('Business not found');

    const customers = await Customer.findAll({ where: { business_id: businessId }, raw: true });
    const customerIds = customers.map((customer) => customer.id);
    const promotions = await Promotion.findAll({ where: { business_id: businessId }, raw: true });
    const promotionIds = promotions.map((promotion) => promotion.id);
    const backupId = `loyalpass-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const payload = {
      createdAt: new Date().toISOString(),
      schemaVersion: 2,
      businessId,
      data: {
        business,
        businessModules: await BusinessModule.findAll({ where: { business_id: businessId }, raw: true }),
        customers,
        points: customerIds.length ? await Points.findAll({ where: { customer_id: customerIds }, raw: true }) : [],
        passes: await Pass.findAll({ where: { business_id: businessId }, raw: true }),
        promotions,
        promotionRedemptions: promotionIds.length ? await PromotionRedemption.findAll({ where: { promotion_id: promotionIds }, raw: true }) : [],
        auditLogs: await AuditLog.findAll({ where: { business_id: businessId }, raw: true }),
      },
    };

    fs.writeFileSync(getBackupPath(backupDirectory, backupId), JSON.stringify(payload), { mode: 0o600 });
    logger.info('Business backup created', { businessId, backupId });
    return { backupId, recordCount: Object.values(payload.data).reduce((sum, rows) => sum + (Array.isArray(rows) ? rows.length : 1), 0) };
  }

  static async restoreBackup({ businessId, backupId, outputPath } = {}) {
    if (!businessId) throw new Error('Business ID is required');
    const filePath = getBackupPath(getBackupDirectory(outputPath), backupId);
    if (!fs.existsSync(filePath)) throw new Error('Backup file not found');

    const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (payload?.schemaVersion !== 2 || payload?.businessId !== businessId || !payload?.data?.business) {
      throw new Error('Backup does not match this business or schema version');
    }

    await sequelize.transaction(async (transaction) => {
      await Business.upsert(payload.data.business, { transaction });
      const restoreOrder = [
        ['Customer', payload.data.customers],
        ['Points', payload.data.points],
        ['Pass', payload.data.passes],
        ['Promotion', payload.data.promotions],
        ['PromotionRedemption', payload.data.promotionRedemptions],
        ['BusinessModule', payload.data.businessModules],
        ['AuditLog', payload.data.auditLogs],
      ];
      for (const [modelName, rows] of restoreOrder) {
        if (Array.isArray(rows) && rows.length) {
          await require('../models')[modelName].bulkCreate(rows, { ignoreDuplicates: true, transaction });
        }
      }
    });

    await AuditLog.create({
      business_id: businessId,
      actor_type: 'system',
      actor_id: 'backup-service',
      action: 'business.backup.restore',
      entity_type: 'business',
      entity_id: businessId,
      metadata: { backupId },
    });
    logger.info('Business backup restored', { businessId, backupId });
    return { restored: true, backupId };
  }
}

module.exports = BackupService;