// api/src/routes/auth.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'mi_secreto_super_seguro';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { cedula, password } = req.body;
  if (!cedula || !password) {
    return res.status(400).json({ error: 'Cédula y contraseña son requeridas' });
  }

  try {
    // Buscar usuario por cédula (la contraseña se guarda en texto plano solo para desarrollo)
    const { rows } = await pool.query(
      'SELECT id, cedula, nombre, tipo_usuario, activo FROM usuarios WHERE cedula = $1 AND password = $2',
      [cedula, password]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const user = rows[0];
    if (!user.activo) {
      return res.status(401).json({ error: 'Usuario inactivo' });
    }

    const token = jwt.sign(
      { id: user.id, cedula: user.cedula, tipo: user.tipo_usuario },
      SECRET_KEY,
      { expiresIn: '8h' }
    );
    res.json({ token, user: { id: user.id, nombre: user.nombre, tipo: user.tipo_usuario } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/verify
router.get('/verify', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ valid: false, error: 'Token no proporcionado' });
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    // Opcional: refrescar información del usuario desde BD
    const { rows } = await pool.query(
      'SELECT id, cedula, nombre, tipo_usuario, activo FROM usuarios WHERE id = $1',
      [decoded.id]
    );
    if (rows.length === 0 || !rows[0].activo) {
      return res.status(401).json({ valid: false, error: 'Usuario no válido' });
    }
    res.json({ valid: true, user: rows[0] });
  } catch (err) {
    res.status(401).json({ valid: false, error: err.message });
  }
});

module.exports = router;