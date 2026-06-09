const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// GET /api/bodegas — listar todas
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT b.*, u.nombre AS responsable_nombre
      FROM bodegas b
      LEFT JOIN usuarios u ON b.responsable_id = u.id
      ORDER BY b.nombre
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bodegas/:id — detalle con stock resumido
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const bodega = await pool.query(
      `SELECT b.*, u.nombre AS responsable_nombre
       FROM bodegas b
       LEFT JOIN usuarios u ON b.responsable_id = u.id
       WHERE b.id = $1`,
      [id]
    );
    if (!bodega.rows.length) return res.status(404).json({ error: 'Bodega no encontrada' });

    const stock = await pool.query(
      `SELECT m.codigo_sap, m.descripcion,
              COUNT(i.id) AS items, SUM(i.cantidad) AS cantidad_total
       FROM inventario i
       JOIN materiales m ON i.material_id = m.codigo_sap
       WHERE i.bodega_id = $1
       GROUP BY m.codigo_sap, m.descripcion
       ORDER BY m.descripcion`,
      [id]
    );

    res.json({ ...bodega.rows[0], stock: stock.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bodegas — crear
router.post('/', async (req, res) => {
  const { nombre, ubicacion, responsable_id } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El campo nombre es requerido' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO bodegas (nombre, ubicacion, responsable_id, activo, created_at)
       VALUES ($1, $2, $3, true, NOW())
       RETURNING *`,
      [nombre, ubicacion, responsable_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/bodegas/:id — actualizar
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, ubicacion, responsable_id, activo } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE bodegas
       SET nombre         = COALESCE($1, nombre),
           ubicacion      = COALESCE($2, ubicacion),
           responsable_id = COALESCE($3, responsable_id),
           activo         = COALESCE($4, activo)
       WHERE id = $5
       RETURNING *`,
      [nombre, ubicacion, responsable_id, activo, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Bodega no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/bodegas/:id — desactivar (soft delete)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `UPDATE bodegas SET activo = false WHERE id = $1 RETURNING *`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Bodega no encontrada' });
    res.json({ mensaje: 'Bodega desactivada', bodega: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
