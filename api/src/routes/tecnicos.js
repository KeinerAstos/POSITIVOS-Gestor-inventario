// GET /api/inventario/mis-equipos
router.get('/mis-equipos', verifyToken, async (req, res) => {
  const usuarioId = req.user.id;
  const { estado } = req.query; // opcional: filtrar por estado (TERRENO, CONSUMO, etc.)
  let filtroEstado = '';
  let valores = [usuarioId];
  if (estado) {
    filtroEstado = `AND i.estado = $2`;
    valores.push(estado);
  }
  try {
    const { rows } = await pool.query(
      `SELECT i.*, m.descripcion AS material_descripcion, b.nombre AS bodega_nombre
       FROM inventario i
       JOIN materiales m ON i.material_id = m.codigo_sap
       LEFT JOIN bodegas b ON i.bodega_id = b.id
       WHERE i.usuario_asignado = $1 ${filtroEstado}
       ORDER BY i.created_at DESC`,
      valores
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});