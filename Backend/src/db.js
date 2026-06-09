const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5433,
  database: process.env.DB_NAME     || 'str',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '123456789',
});

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err);
});

module.exports = pool;
