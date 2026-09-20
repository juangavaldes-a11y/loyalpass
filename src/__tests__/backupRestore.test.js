const fs = require('fs');
const path = require('path');
const BackupService = require('../services/backupService');
const sequelize = require('../config/db');
const { Business } = require('../models');

describe('backup and restore', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('creates and restores a backup payload', async () => {
    const business = await Business.create({ name: 'Backup Business' });
    const backupDir = path.join(process.cwd(), 'tmp-backups');
    const backup = await BackupService.createBackup({ businessId: business.id, outputPath: backupDir });
    const fileExists = fs.existsSync(path.join(backupDir, backup.backupId));

    expect(fileExists).toBe(true);
    expect(backup.recordCount).toBeGreaterThan(0);

    await Business.destroy({ where: { id: business.id } });
    const restored = await BackupService.restoreBackup({ businessId: business.id, backupId: backup.backupId, outputPath: backupDir });
    const restoredBusiness = await Business.findByPk(business.id);

    expect(restored.restored).toBe(true);
    expect(restoredBusiness).not.toBeNull();
  });
});
