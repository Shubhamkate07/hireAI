/**
 * config/database.js — MySQL connection pool
 *
 * All config values come from env.config (12-factor: config in environment).
 * env.config validates required vars at startup — if DB_HOST/USER/PASSWORD/NAME
 * are missing the process exits before this module is even imported.
 */

require('dotenv').config();
const mysql  = require('mysql2');
const config = require('./env.config');

const pool = mysql.createPool({
    host:             config.db.host,
    user:             config.db.user,
    password:         config.db.password,
    database:         config.db.name,
    waitForConnections: true,
    connectionLimit:  config.db.connectionLimit,
    queueLimit:       0,
});

module.exports = pool.promise();