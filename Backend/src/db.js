const { Pool } = require('pg');
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'rake2',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'ñññññññ',
});

// ← agrega esto temporalmente
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error conectando a PostgreSQL:', err.message);
  } else {
    console.log('✅ Conectado a PostgreSQL correctamente');
    release();
  }
});

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err);
});
module.exports = pool;