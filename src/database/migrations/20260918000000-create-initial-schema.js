'use strict';

function timestamps(Sequelize) {
  return {
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false },
  };
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('businesses', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      name: { type: Sequelize.STRING(255), allowNull: false },
      logo_url: { type: Sequelize.TEXT, allowNull: true },
      brand_color: { type: Sequelize.STRING(7), allowNull: true },
      text_color: { type: Sequelize.STRING(7), allowNull: true },
      plan: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'starter' },
      onboarding_status: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'not_started' },
      trial_ends_at: { type: Sequelize.DATE, allowNull: true },
      subscription_status: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'trial' },
      subscription_renews_at: { type: Sequelize.DATE, allowNull: true },
      billing_email: { type: Sequelize.STRING(255), allowNull: true },
      quota_overrides: { type: Sequelize.JSON, allowNull: true, defaultValue: {} },
      pricing_tier: { type: Sequelize.STRING(50), allowNull: true, defaultValue: 'starter' },
      ...timestamps(Sequelize),
    });

    await queryInterface.createTable('portal_users', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      email: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      role: { type: Sequelize.STRING(50), allowNull: false },
      business_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'businesses', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps(Sequelize),
    });

    await queryInterface.createTable('customers', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      business_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'businesses', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: { type: Sequelize.STRING(255), allowNull: false },
      email: { type: Sequelize.STRING(255), allowNull: false },
      ...timestamps(Sequelize),
    });
    await queryInterface.addConstraint('customers', {
      fields: ['business_id', 'email'],
      type: 'unique',
      name: 'customers_business_id_email_unique',
    });

    await queryInterface.createTable('api_keys', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      business_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'businesses', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      key_prefix: { type: Sequelize.STRING(16), allowNull: false },
      key_hash: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps(Sequelize),
    });

    await queryInterface.createTable('points', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      customer_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'customers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      balance: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('passes', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      business_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'businesses', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      customer_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'customers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      apple_pass_serial: { type: Sequelize.STRING(255), allowNull: true },
      google_pass_object_id: { type: Sequelize.STRING(255), allowNull: true },
      apple_push_token: { type: Sequelize.STRING(255), allowNull: true },
      ...timestamps(Sequelize),
    });

    await queryInterface.createTable('subscriptions', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      business_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'businesses', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      provider: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'bac' },
      external_id: { type: Sequelize.STRING(255), allowNull: true, unique: true },
      plan: { type: Sequelize.STRING(50), allowNull: false },
      status: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'incomplete' },
      current_period_start: { type: Sequelize.DATE, allowNull: true },
      current_period_end: { type: Sequelize.DATE, allowNull: true },
      cancel_at_period_end: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      metadata: { type: Sequelize.JSON, allowNull: true, defaultValue: {} },
      ...timestamps(Sequelize),
    });

    await queryInterface.createTable('payments', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      business_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'businesses', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      subscription_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'subscriptions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      provider: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'bac' },
      idempotency_key: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      external_id: { type: Sequelize.STRING(255), allowNull: true, unique: true },
      amount_minor: { type: Sequelize.INTEGER, allowNull: false },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'USD' },
      status: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'pending' },
      paid_at: { type: Sequelize.DATE, allowNull: true },
      metadata: { type: Sequelize.JSON, allowNull: true, defaultValue: {} },
      ...timestamps(Sequelize),
    });

    await queryInterface.createTable('audit_logs', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      business_id: { type: Sequelize.UUID, allowNull: true },
      actor_type: { type: Sequelize.STRING(50), allowNull: false },
      actor_id: { type: Sequelize.STRING(255), allowNull: false },
      action: { type: Sequelize.STRING(100), allowNull: false },
      entity_type: { type: Sequelize.STRING(100), allowNull: false },
      entity_id: { type: Sequelize.STRING(255), allowNull: true },
      metadata: { type: Sequelize.JSON, allowNull: true },
      ...timestamps(Sequelize),
    });

    await queryInterface.createTable('promotions', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      business_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'businesses', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      reward_type: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'bonus_points' },
      reward_value: { type: Sequelize.INTEGER, allowNull: false },
      status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'draft' },
      starts_at: { type: Sequelize.DATE, allowNull: true },
      ends_at: { type: Sequelize.DATE, allowNull: true },
      usage_limit: { type: Sequelize.INTEGER, allowNull: true },
      ...timestamps(Sequelize),
    });
    await queryInterface.addIndex('promotions', ['business_id', 'status']);

    await queryInterface.createTable('promotion_redemptions', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      promotion_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'promotions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      business_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'businesses', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      customer_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'customers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      idempotency_key: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      reward_value: { type: Sequelize.INTEGER, allowNull: false },
      redeemed_at: { type: Sequelize.DATE, allowNull: false },
      ...timestamps(Sequelize),
    });
    await queryInterface.addConstraint('promotion_redemptions', {
      fields: ['promotion_id', 'customer_id'],
      type: 'unique',
      name: 'promotion_redemptions_promotion_id_customer_id_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('promotion_redemptions');
    await queryInterface.dropTable('promotions');
    await queryInterface.dropTable('audit_logs');
    await queryInterface.dropTable('payments');
    await queryInterface.dropTable('subscriptions');
    await queryInterface.dropTable('passes');
    await queryInterface.dropTable('points');
    await queryInterface.dropTable('api_keys');
    await queryInterface.dropTable('customers');
    await queryInterface.dropTable('portal_users');
    await queryInterface.dropTable('businesses');
  },
};