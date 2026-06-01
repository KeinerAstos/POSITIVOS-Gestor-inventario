const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// GET /api/materiales
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM materiales ORDER BY descripcion`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/materiales/:codigo_sap — con stock por bodega
router.get('/:codigo_sap', async (req, res) => {
  const { codigo_sap } = req.params;
  try {
    const material = await pool.query(
      `SELECT * FROM materiales WHERE codigo_sap = $1`, [codigo_sap]
    );
    if (!material.rows.length) return res.status(404).json({ error: 'Material no encontrado' });

    const stock = await pool.query(
      `SELECT b.nombre AS bodega, COUNT(i.id) AS items, SUM(i.cantidad) AS cantidad, i.estado
       FROM inventario i
       JOIN bodegas b ON i.bodega_id = b.id
       WHERE i.material_id = $1
       GROUP BY b.nombre, i.estado
       ORDER BY b.nombre`,
      [codigo_sap]
    );

    res.json({ ...material.rows[0], stock_por_bodega: stock.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/materiales
router.post('/', async (req, res) => {
  const { codigo_sap, descripcion, serializable } = req.body;
  if (!codigo_sap || !descripcion) {
    return res.status(400).json({ error: 'codigo_sap y descripcion son requeridos' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO materiales (codigo_sap, descripcion, serializable)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [codigo_sap, descripcion, serializable ?? false]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'codigo_sap ya existe' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/materiales/:codigo_sap
router.put('/:codigo_sap', async (req, res) => {
  const { codigo_sap } = req.params;
  const { descripcion, serializable } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE materiales
       SET descripcion  = COALESCE($1, descripcion),
           serializable = COALESCE($2, serializable)
       WHERE codigo_sap = $3
       RETURNING *`,
      [descripcion, serializable, codigo_sap]
    );
    if (!rows.length) return res.status(404).json({ error: 'Material no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
