// POST /api/inventario/devolver-tecnico
router.post('/devolver-tecnico', verifyToken, async (req, res) => {
  const { inventario_id, conservar_ot, observacion } = req.body;
  const tecnicoId = req.user.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT id, estado, ot_id, usuario_asignado FROM inventario WHERE id = $1 FOR UPDATE`,
      [inventario_id]
    );
    if (rows.length === 0) throw new Error('Equipo no encontrado');
    const equipo = rows[0];
    if (equipo.usuario_asignado !== tecnicoId) throw new Error('No tienes permiso para devolver este equipo');
    if (equipo.estado !== 'TERRENO') throw new Error('Solo equipos en TERRENO pueden devolverse');

    const estadoFinal = conservar_ot ? 'INGRESADO' : 'STOCK';
    await client.query(
      `UPDATE inventario SET estado = $1, usuario_asignado = NULL, ot_id = $2 WHERE id = $3`,
      [estadoFinal, conservar_ot ? equipo.ot_id : null, inventario_id]
    );
    await client.query(
      `INSERT INTO movimientos (tipo_movimiento, inventario_id, estado_anterior, estado_nuevo, tecnico_id, observacion, created_at)
       VALUES ('DEVOLUCION_TECNICO', $1, 'TERRENO', $2, $3, $4, NOW())`,
      [inventario_id, estadoFinal, tecnicoId, observacion || 'Devuelto por técnico']
    );
    await client.query('COMMIT');
    res.json({ success: true, message: `Equipo devuelto como ${estadoFinal === 'INGRESADO' ? 'INGRESADO' : 'STOCK'}` });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});