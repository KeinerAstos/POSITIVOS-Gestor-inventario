// api/src/routes/auth.js
const express    = require('express');
const router     = express.Router();
const pool       = require('../db');
const jwt        = require('jsonwebtoken');
const bcrypt     = require('bcryptjs');
 
const SECRET_KEY = process.env.JWT_SECRET || 'mi_secreto_super_seguro';
 
// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { cedula, password } = req.body;
  if (!cedula || !password) {
    return res.status(400).json({ error: 'Cédula y contraseña son requeridas' });
  }
 
  try {
    // ── 1. Buscar usuario por cédula (sin comparar password en SQL) ──
    const { rows } = await pool.query(
      `SELECT id, cedula, nombre, tipo_usuario, activo, password, debe_cambiar_password
       FROM usuarios WHERE cedula = $1`,
      [cedula]
    );
 
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
 
    const user = rows[0];
 
    if (!user.activo) {
      return res.status(401).json({ error: 'Usuario inactivo' });
    }
 
    // ── 2. Verificar contraseña con soporte de migración automática ──
    let passwordValida = false;
 
    if (user.password && user.password.startsWith('$2')) {
      // Ya está hasheada con bcrypt → comparar normalmente
      passwordValida = await bcrypt.compare(password, user.password);
    } else {
      // Aún en texto plano → comparar directo y migrar automáticamente
      passwordValida = user.password === password;
      if (passwordValida) {
        const hash = await bcrypt.hash(password, 10);
        await pool.query(
          `UPDATE usuarios SET password = $1 WHERE id = $2`,
          [hash, user.id]
        );
      }
    }
 
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
 
    // ── 3. Generar token ──
    const token = jwt.sign(
      { id: user.id, cedula: user.cedula, tipo: user.tipo_usuario },
      SECRET_KEY,
      { expiresIn: '8h' }
    );
 
    // ── 4. Responder — incluye debe_cambiar_password para el frontend ──
    res.json({
      token,
      user: {
        id:                    user.id,
        nombre:                user.nombre,
        tipo:                  user.tipo_usuario,
        debe_cambiar_password: user.debe_cambiar_password || false,
      }
    });
 
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
 
    const { rows } = await pool.query(
      `SELECT id, cedula, nombre, tipo_usuario, activo, debe_cambiar_password
       FROM usuarios WHERE id = $1`,
      [decoded.id]
    );
 
    if (rows.length === 0 || !rows[0].activo) {
      return res.status(401).json({ valid: false, error: 'Usuario no válido' });
    }
 
    res.json({
      valid: true,
      user: {
        id:                    rows[0].id,
        cedula:                rows[0].cedula,
        nombre:                rows[0].nombre,
        tipo:                  rows[0].tipo_usuario,
        activo:                rows[0].activo,
        debe_cambiar_password: rows[0].debe_cambiar_password || false,
      }
    });
  } catch (err) {
    res.status(401).json({ valid: false, error: err.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { cedula } = req.body;
  if (!cedula) return res.status(400).json({ error: 'La cédula es requerida' });

  try {
    const { rows } = await pool.query(
      `SELECT id, nombre FROM usuarios WHERE cedula = $1 AND activo = true`,
      [cedula]
    );

    if (rows.length === 0) {
      // Genérico — no revelar si existe o no
      return res.json({ message: 'Solicitud registrada.', nombre: 'usuario' });
    }

    const user = rows[0];

    await pool.query(
      `INSERT INTO solicitudes_reset (usuario_id, cedula) VALUES ($1, $2)`,
      [user.id, cedula]
    );

    // ← Devuelve el nombre para que el modal lo muestre
    res.json({ message: 'Solicitud registrada.', nombre: user.nombre });

  } catch (err) {
    console.error('Error en forgot-password:', err);
    res.status(500).json({ error: err.message });
  }
});
 
module.exports = router;