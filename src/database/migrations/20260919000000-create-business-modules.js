'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('business_modules', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      business_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'businesses', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      module_key: { type: Sequelize.STRING(100), allowNull: false },
      enabled: { type: Sequelize.BOOLEAN, allowNull: false },
      reason: { type: Sequelize.STRING(500), allowNull: true },
      changed_by: { type: Sequelize.STRING(255), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addConstraint('business_modules', {
      fields: ['business_id', 'module_key'],
      type: 'unique',
      name: 'business_modules_business_id_module_key_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('business_modules');
  },
};