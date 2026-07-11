'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

module.exports = {
  development: {
    dialect: 'sqlite',
    storage: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'shop.sqlite'),
    logging: false,
  },
  production: {
    dialect: 'sqlite',
    storage: process.env.DB_PATH || '/data/shop.sqlite',
    logging: false,
  },
};
