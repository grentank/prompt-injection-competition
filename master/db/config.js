const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'master.sqlite');

module.exports = {
  development: {
    dialect: 'sqlite',
    storage: dbPath,
    logging: false,
  },
  production: {
    dialect: 'sqlite',
    storage: dbPath,
    logging: false,
  },
};
