const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const bcrypt  = require('bcryptjs');
const { verifyToken } = require('../middleware/auth');
 
// GET /api/usuarios?bodega_id=X&tipo_usuario=Y
router.get('/', async (req, res) => {
  const { bodega_id, tipo_usuario } = req.query;
  const filtros = [];
  const valores = [];
 
  if (bodega_id)    { valores.push(bodega_id);    filtros.push(`u.bodega_id = $${valores.length}`); }
  if (tipo_usuario) { valores.push(tipo_usuario); filtros.push(`u.tipo_usuario = $${valores.length}`); }
 
  const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';
 
  try {
    const { rows } = await pool.query(
      `SELECT u.*, b.nombre AS bodega_nombre
       FROM usuarios u
       LEFT JOIN bodegas b ON u.bodega_id = b.id
       ${where}
       ORDER BY u.nombre`,
      valores
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
// GET /api/usuarios/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.*, b.nombre AS bodega_nombre
       FROM usuarios u
       LEFT JOIN bodegas b ON u.bodega_id = b.id
       WHERE u.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
// POST /api/usuarios — crear
router.post('/', async (req, res) => {
  const { cedula, nombre, tipo_usuario, bodega_id, password } = req.body;
  if (!cedula || !nombre) {
    return res.status(400).json({ error: 'cedula y nombre son requeridos' });
  }
  try {
    // Si viene password la hasheamos, si no usamos la cédula como contraseña inicial
    const passwordFinal = password || cedula;
    const hash = await bcrypt.hash(passwordFinal, 10);
 
    const { rows } = await pool.query(
      `INSERT INTO usuarios (cedula, nombre, password, tipo_usuario, bodega_id, activo, debe_cambiar_password)
       VALUES ($1, $2, $3, $4, $5, true, true)
       RETURNING *`,
      [cedula, nombre, hash, tipo_usuario || 'TECNICO', bodega_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'La cédula ya está registrada' });
    }
    res.status(500).json({ error: err.message });
  }
});
 
// PUT /api/usuarios/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, tipo_usuario, bodega_id, activo } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE usuarios
       SET nombre       = COALESCE($1, nombre),
           tipo_usuario = COALESCE($2, tipo_usuario),
           bodega_id    = COALESCE($3, bodega_id),
           activo       = COALESCE($4, activo)
       WHERE id = $5
       RETURNING *`,
      [nombre, tipo_usuario, bodega_id, activo, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
// ─────────────────────────────────────────────────────────────────
// POST /api/usuarios/:id/reset-password
// Solo ADMIN puede usarla. Genera contraseña temporal y la devuelve.
// ─────────────────────────────────────────────────────────────────
router.post('/:id/reset-password', verifyToken, async (req, res) => {
  // Solo admin puede resetear contraseñas
  if (req.user.tipo !== 'ADMIN') {
    return res.status(403).json({ error: 'Solo un administrador puede resetear contraseñas' });
  }
 
  try {
    // Verificar que el usuario existe
    const { rows } = await pool.query(
      `SELECT id, nombre FROM usuarios WHERE id = $1`,
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
 
    // Generar contraseña temporal legible (6 caracteres alfanuméricos en mayúsculas)
    const temporal = Math.random().toString(36).slice(2, 8).toUpperCase();
    const hash = await bcrypt.hash(temporal, 10);
 
    // Guardar hash y marcar que debe cambiarla al próximo login
    await pool.query(
      `UPDATE usuarios
       SET password = $1, debe_cambiar_password = true
       WHERE id = $2`,
      [hash, req.params.id]
    );
 
    // Devolver la contraseña temporal en texto plano para que el admin se la diga al usuario
    res.json({
      success: true,
      password_temporal: temporal,
      mensaje: `Contraseña reseteada. Dísela al usuario: ${rows[0].nombre}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
 
// ─────────────────────────────────────────────────────────────────
// PUT /api/usuarios/:id/cambiar-password
// El propio usuario cambia su contraseña (requiere la actual).
// ─────────────────────────────────────────────────────────────────
router.put('/:id/cambiar-password', verifyToken, async (req, res) => {
  const { password_actual, password_nuevo } = req.body;
 
  // Solo el mismo usuario puede cambiar su propia contraseña
  if (req.user.id !== parseInt(req.params.id)) {
    return res.status(403).json({ error: 'No puedes cambiar la contraseña de otro usuario' });
  }
 
  if (!password_actual || !password_nuevo) {
    return res.status(400).json({ error: 'Debes enviar la contraseña actual y la nueva' });
  }
 
  if (password_nuevo.length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
  }
 
  try {
    // Obtener contraseña actual del usuario
    const { rows } = await pool.query(
      `SELECT id, password FROM usuarios WHERE id = $1`,
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
 
    // Verificar que la contraseña actual es correcta
    const valida = await bcrypt.compare(password_actual, rows[0].password);
    if (!valida) {
      return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
    }
 
    // Hashear la nueva y guardar — también quitar el flag de debe_cambiar_password
    const nuevoHash = await bcrypt.hash(password_nuevo, 10);
    await pool.query(
      `UPDATE usuarios
       SET password = $1, debe_cambiar_password = false
       WHERE id = $2`,
      [nuevoHash, req.params.id]
    );
 
    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
 
module.exports = router;
 