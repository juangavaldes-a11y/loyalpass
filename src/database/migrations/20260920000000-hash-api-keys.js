'use strict';

const crypto = require('crypto');

function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const apiKeyColumns = await queryInterface.describeTable('api_keys');
    const hasLegacyKey = Boolean(apiKeyColumns.key);
    if (!apiKeyColumns.key_prefix) {
      await queryInterface.addColumn('api_keys', 'key_prefix', { type: Sequelize.STRING(16), allowNull: true });
    }
    if (!apiKeyColumns.key_hash) {
      await queryInterface.addColumn('api_keys', 'key_hash', { type: Sequelize.STRING(64), allowNull: true });
    }

    if (hasLegacyKey) {
      const [keys] = await queryInterface.sequelize.query('SELECT id, key FROM api_keys');
      for (const apiKey of keys) {
        await queryInterface.bulkUpdate('api_keys', {
          key_prefix: apiKey.key.slice(0, 12),
          key_hash: hashApiKey(apiKey.key),
        }, { id: apiKey.id });
      }
      await queryInterface.removeColumn('api_keys', 'key');
    }

    if (hasLegacyKey) {
      await queryInterface.changeColumn('api_keys', 'key_prefix', { type: Sequelize.STRING(16), allowNull: false });
      await queryInterface.changeColumn('api_keys', 'key_hash', { type: Sequelize.STRING(64), allowNull: false });
      await queryInterface.addConstraint('api_keys', {
        fields: ['key_hash'],
        type: 'unique',
        name: 'api_keys_key_hash_unique',
      });
    }

    const portalUserColumns = await queryInterface.describeTable('portal_users');
    if (portalUserColumns.api_key) {
      await queryInterface.removeColumn('portal_users', 'api_key');
    }
  },

  async down(queryInterface, Sequelize) {
    const apiKeyColumns = await queryInterface.describeTable('api_keys');
    if (!apiKeyColumns.key) {
      await queryInterface.addColumn('api_keys', 'key', { type: Sequelize.STRING(255), allowNull: true });
    }
    if (apiKeyColumns.key_prefix) await queryInterface.removeColumn('api_keys', 'key_prefix');
    if (apiKeyColumns.key_hash) await queryInterface.removeColumn('api_keys', 'key_hash');
    const portalUserColumns = await queryInterface.describeTable('portal_users');
    if (!portalUserColumns.api_key) {
      await queryInterface.addColumn('portal_users', 'api_key', { type: Sequelize.STRING(255), allowNull: true });
    }
  },
};