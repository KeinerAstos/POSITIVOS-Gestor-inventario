const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// GET /api/usuarios?bodega_id=X&tipo=Y
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
  const { cedula, nombre, tipo_usuario, bodega_id } = req.body;
  if (!cedula || !nombre) {
    return res.status(400).json({ error: 'cedula y nombre son requeridos' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO usuarios (cedula, nombre, tipo_usuario, bodega_id, activo)
       VALUES ($1, $2, $3, $4, true)
       RETURNING *`,
      [cedula, nombre, tipo_usuario || 'tecnico', bodega_id]
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

module.exports = router;
