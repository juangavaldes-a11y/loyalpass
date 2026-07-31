const { AuditLog } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

class AuditService {
  static async log({ businessId = null, actorType, actorId, action, entityType, entityId = null, metadata = null }) {
    try {
      await AuditLog.create({
        business_id: businessId,
        actor_type: actorType,
        actor_id: actorId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        metadata,
      });
    } catch (error) {
      logger.warn('Audit log write failed:', error);
    }
  }

  static async listAuditLogs({ page = 1, pageSize = 25, filters = {}, user = {} }) {
    const where = {};

    if (filters.actorType) where.actor_type = filters.actorType;
    if (filters.actorId) where.actor_id = filters.actorId;
    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entity_type = filters.entityType;
    if (filters.entityId) where.entity_id = filters.entityId;

    if (user.isPlatformAdmin) {
      if (filters.businessId) {
        where.business_id = filters.businessId;
      }
    } else if (user.businessId) {
      where.business_id = user.businessId;
    }

    if (filters.from || filters.to) {
      const fromDate = filters.from ? new Date(filters.from) : null;
      const toDate = filters.to ? new Date(filters.to) : null;

      if ((fromDate && Number.isNaN(fromDate.getTime())) || (toDate && Number.isNaN(toDate.getTime()))) {
        throw new Error('Invalid date range');
      }

      where.createdAt = {};
      if (fromDate) {
        where.createdAt[Op.gte] = fromDate;
      }
      if (toDate) {
        where.createdAt[Op.lte] = toDate;
      }
    }

    const limit = Math.max(1, Math.min(pageSize, 100));
    const offset = (Math.max(page, 1) - 1) * limit;

    const { rows, count } = await AuditLog.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return {
      data: rows,
      pagination: {
        page: Math.max(page, 1),
        pageSize: limit,
        total: count,
        totalPages: Math.ceil(count / limit) || 1,
      },
    };
  }
}

module.exports = AuditService;
