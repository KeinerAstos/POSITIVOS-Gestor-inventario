const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// GET /api/ot?estado=X&cliente=Y
// GET /api/ot?estado=X&cliente=Y
// GET /api/ot?estado=X&cliente=Y
router.get('/', async (req, res) => {
  const { estado, cliente } = req.query;
  const filtros = [];
  const valores = [];

  if (estado) { 
    valores.push(estado.toUpperCase());  // ← Cambiado a mayúsculas para coincidir con 'ABIERTA', 'CERRADA'
    filtros.push(`ot.estado = $${valores.length}`); 
  }
  if (cliente) { 
    valores.push(`%${cliente}%`); 
    filtros.push(`ot.cliente ILIKE $${valores.length}`); 
  }

  const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';

  try {
    const { rows } = await pool.query(
      `SELECT ot.id, ot.numero_ot, ot.cliente, ot.destino, ot.estado, ot.created_at,
              COUNT(i.id) AS total_items_inventario
       FROM ot
       LEFT JOIN inventario i ON i.ot_id = ot.id
       ${where}
       GROUP BY ot.id, ot.numero_ot, ot.cliente, ot.destino, ot.estado, ot.created_at
       ORDER BY ot.created_at DESC`,
      valores
    );
    
    res.json(rows);
  } catch (err) {
    console.error("Error en GET /api/ot:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ot/:id — detalle con inventario asociado
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const ot = await pool.query(`SELECT * FROM ot WHERE id = $1`, [id]);
    if (!ot.rows.length) return res.status(404).json({ error: 'OT no encontrada' });

    const inventario = await pool.query(
      `SELECT i.*, m.descripcion AS material_descripcion, b.nombre AS bodega
       FROM inventario i
       JOIN materiales m ON i.material_id = m.codigo_sap
       LEFT JOIN bodegas b ON i.bodega_id = b.id
       WHERE i.ot_id = $1`,
      [id]
    );

    res.json({ ...ot.rows[0], inventario: inventario.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ot — crear OT (actualizado)
// POST /api/ot — crear OT
router.post('/', async (req, res) => {
    const { numero_ot, cliente, destino, estado } = req.body;
    
    console.log('Datos recibidos:', { numero_ot, cliente, destino, estado });
    
    if (!numero_ot) {
        return res.status(400).json({ error: 'numero_ot es requerido' });
    }

    try {
        // Verificar si ya existe
        const existe = await pool.query(
            'SELECT id FROM ot WHERE numero_ot = $1',
            [numero_ot]
        );

        if (existe.rows.length > 0) {
            return res.status(400).json({ error: 'Ya existe una OT con ese número' });
        }

        // ✅ Asegurar que el estado sea válido (ABIERTA o CERRADA)
        let estadoFinal = 'ABIERTA'; // valor por defecto
        if (estado === 'CERRADA' || estado === 'cerrada') {
            estadoFinal = 'CERRADA';
        } else {
            estadoFinal = 'ABIERTA';
        }

        const { rows } = await pool.query(
            `INSERT INTO ot (numero_ot, cliente, destino, estado, created_at)
             VALUES ($1, $2, $3, $4, NOW())
             RETURNING *`,
            [numero_ot, cliente || null, destino || null, estadoFinal]
        );
        
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error al crear OT:', err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/ot/:id — actualizar estado u otros campos
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { cliente, destino, estado, numero_ot } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE ot
       SET numero_ot = COALESCE($1, numero_ot),
           cliente   = COALESCE($2, cliente),
           destino   = COALESCE($3, destino),
           estado    = COALESCE($4, estado)
       WHERE id = $5
       RETURNING *`,
      [numero_ot, cliente, destino, estado, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'OT no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/ot/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM ot WHERE id = $1 RETURNING id`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'OT no encontrada' });
    res.json({ mensaje: 'OT eliminada', id: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
