const { AuditLog } = require('../models');
const AuditService = require('../services/auditService');
const sequelize = require('../config/db');

describe('audit retention', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.AUTH_SESSION_SECRET = 'test-secret-auth';
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('removes logs older than the configured retention window', async () => {
    const recentLog = await AuditLog.create({
      actor_type: 'user',
      actor_id: 'user-1',
      action: 'auth.login',
      entity_type: 'portal_user',
      entity_id: 'user-1',
      metadata: { role: 'platform_admin' },
    });

    const oldLog = await AuditLog.create({
      actor_type: 'user',
      actor_id: 'user-2',
      action: 'business.update',
      entity_type: 'business',
      entity_id: 'business-1',
      metadata: { role: 'client_owner' },
    });

    await AuditLog.update(
      { createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) },
      { where: { id: oldLog.id } }
    );

    const deletedCount = await AuditService.pruneAuditLogs({ retentionDays: 30 });

    const remainingIds = await AuditLog.findAll({ attributes: ['id'] }).then((rows) => rows.map((row) => row.id));

    expect(deletedCount).toBe(1);
    expect(remainingIds).toContain(recentLog.id);
    expect(remainingIds).not.toContain(oldLog.id);
  });
});
