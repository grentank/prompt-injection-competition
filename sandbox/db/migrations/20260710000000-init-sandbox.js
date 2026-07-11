'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('products', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING, allowNull: false },
      price: { type: Sequelize.FLOAT, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      image: { type: Sequelize.STRING, allowNull: false, defaultValue: '/img/placeholder.jpg' },
      stock_quantity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 10 },
      rating_avg: { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.createTable('shop_users', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING, allowNull: false },
      email: { type: Sequelize.STRING, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.createTable('comments', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      shop_user_id: { type: Sequelize.INTEGER, references: { model: 'shop_users', key: 'id' }, onDelete: 'CASCADE' },
      product_id: { type: Sequelize.INTEGER, references: { model: 'products', key: 'id' }, onDelete: 'CASCADE' },
      body: { type: Sequelize.TEXT, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.createTable('product_ratings', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      participant_user_id: { type: Sequelize.STRING, allowNull: false },
      product_id: { type: Sequelize.INTEGER, references: { model: 'products', key: 'id' }, onDelete: 'CASCADE' },
      rating: { type: Sequelize.INTEGER, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addConstraint('product_ratings', {
      fields: ['participant_user_id', 'product_id'],
      type: 'unique',
      name: 'product_ratings_user_product_unique',
    });

    await queryInterface.createTable('cart_items', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      participant_user_id: { type: Sequelize.STRING, allowNull: false },
      product_id: { type: Sequelize.INTEGER, references: { model: 'products', key: 'id' }, onDelete: 'CASCADE' },
      quantity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.createTable('purchases', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      participant_user_id: { type: Sequelize.STRING, allowNull: true },
      total_cost: { type: Sequelize.FLOAT, allowNull: false },
      source: { type: Sequelize.STRING, allowNull: false, defaultValue: 'checkout' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.createTable('purchase_items', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      purchase_id: { type: Sequelize.INTEGER, references: { model: 'purchases', key: 'id' }, onDelete: 'CASCADE' },
      product_id: { type: Sequelize.INTEGER, references: { model: 'products', key: 'id' } },
      quantity: { type: Sequelize.INTEGER, allowNull: false },
      price: { type: Sequelize.FLOAT, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.createTable('user_sessions', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      user_id: { type: Sequelize.INTEGER, allowNull: false },
      session_token: { type: Sequelize.TEXT, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.createTable('faq_entries', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      question: { type: Sequelize.TEXT, allowNull: false },
      answer: { type: Sequelize.TEXT, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('faq_entries');
    await queryInterface.dropTable('user_sessions');
    await queryInterface.dropTable('purchase_items');
    await queryInterface.dropTable('purchases');
    await queryInterface.dropTable('cart_items');
    await queryInterface.dropTable('product_ratings');
    await queryInterface.dropTable('comments');
    await queryInterface.dropTable('shop_users');
    await queryInterface.dropTable('products');
  },
};
