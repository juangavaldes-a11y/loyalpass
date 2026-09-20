'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('point_transactions', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      business_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'businesses', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      customer_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'customers', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      points_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'points', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      action: { type: Sequelize.STRING(50), allowNull: false },
      amount: { type: Sequelize.INTEGER, allowNull: false },
      balance_after: { type: Sequelize.INTEGER, allowNull: false },
      reason: { type: Sequelize.STRING(500), allowNull: true },
      source: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'portal' },
      actor_id: { type: Sequelize.STRING(255), allowNull: true },
      idempotency_key: { type: Sequelize.STRING(255), allowNull: true, unique: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('point_transactions', ['business_id', 'customer_id', 'createdAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('point_transactions');
  },
};