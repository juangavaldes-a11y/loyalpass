const { Op } = require('sequelize');
const { Business, Customer, Points, Pass } = require('../models');
const logger = require('../utils/logger');

class ExportService {
  static async exportBusinessData(businessId, format = 'json') {
    const business = await Business.findByPk(businessId);
    if (!business) {
      throw new Error('Business not found');
    }

    const [customers, points, passes] = await Promise.all([
      Customer.findAll({ where: { business_id: businessId } }),
      Points.findAll({ include: [{ model: Customer, where: { business_id: businessId }, attributes: ['id'] }] }),
      Pass.findAll({ where: { business_id: businessId } }),
    ]);

    const payload = {
      business: business.toJSON(),
      customers: customers.map((customer) => customer.toJSON()),
      points: points.map((point) => point.toJSON()),
      passes: passes.map((pass) => pass.toJSON()),
    };

    logger.info('Business export payload assembled', {
      businessId,
      customerCount: customers.length,
      pointCount: points.length,
      passCount: passes.length,
      format,
    });

    if (format === 'csv') {
      return this.toCsv(payload);
    }

    return JSON.stringify(payload, null, 2);
  }

  static toCsv(payload) {
    const customerRows = payload.customers.map((customer) => ({
      type: 'customer',
      id: customer.id,
      name: customer.name,
      email: customer.email,
    }));

    const pointRows = payload.points.map((point) => ({
      type: 'points',
      id: point.customer_id,
      balance: point.balance,
    }));

    const rows = [...customerRows, ...pointRows];
    const header = ['type', 'id', 'name', 'email', 'balance'];
    const lines = [header.join(',')];

    rows.forEach((row) => {
      lines.push([
        row.type,
        row.id,
        row.name || '',
        row.email || '',
        row.balance || '',
      ].join(','));
    });

    return lines.join('\n');
  }

  static async deleteBusinessData(businessId) {
    const business = await Business.findByPk(businessId);
    if (!business) {
      throw new Error('Business not found');
    }

    const customerIds = (await Customer.findAll({ where: { business_id: businessId }, attributes: ['id'] })).map((customer) => customer.id);

    await Promise.all([
      Pass.destroy({ where: { business_id: businessId } }),
      Points.destroy({ where: { customer_id: { [Op.in]: customerIds } } }),
      Customer.destroy({ where: { business_id: businessId } }),
    ]);

    logger.warn('Business data deletion completed', {
      businessId,
      deletedCustomerCount: customerIds.length,
    });
    return { deleted: true, businessId };
  }
}

module.exports = ExportService;
