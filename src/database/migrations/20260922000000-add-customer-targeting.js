'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('customers', 'tags', { type: Sequelize.JSON, allowNull: false, defaultValue: [] });
    await queryInterface.addColumn('customers', 'marketing_consent', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await queryInterface.addColumn('promotions', 'audience_rules', { type: Sequelize.JSON, allowNull: false, defaultValue: {} });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('promotions', 'audience_rules');
    await queryInterface.removeColumn('customers', 'marketing_consent');
    await queryInterface.removeColumn('customers', 'tags');
  },
};