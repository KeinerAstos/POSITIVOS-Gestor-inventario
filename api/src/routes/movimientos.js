const express = require('express');
const router = express.Router();
const pool = require('../db');
const { Parser } = require('json2csv');

// Tipos de movimiento válidos (solo para referencia, no se usan en todas las rutas)
const TIPOS_VALIDOS = [
  'ENTRADA', 'SALIDA', 'TRANSFERENCIA_BODEGA',
  'ASIGNACION_OT', 'DEVOLUCION', 'AJUSTE',
];

// POST /api/movimientos/transferencia — transferir item entre bodegas (transacción)
router.post('/transferencia', async (req, res) => {
  const { inventario_id, bodega_destino_id, usuario_id, observacion } = req.body;

  if (!inventario_id || !bodega_destino_id || !usuario_id) {
    return res.status(400).json({
      error: 'inventario_id, bodega_destino_id y usuario_id son requeridos',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Obtener bodega actual del item
    const item = await client.query(
      `SELECT id, bodega_id, serial FROM inventario WHERE id = $1 FOR UPDATE`,
      [inventario_id]
    );
    if (!item.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Item de inventario no encontrado' });
    }

    const bodega_origen_id = item.rows[0].bodega_id;
    if (bodega_origen_id === parseInt(bodega_destino_id)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El item ya está en esa bodega' });
    }

    // Registrar movimiento
    const mov = await client.query(
      `INSERT INTO movimientos
         (inventario_id, tipo_movimiento, bodega_origen_id, bodega_destino_id,
          usuario_id, observacion, created_at)
       VALUES ($1, 'TRANSFERENCIA_BODEGA', $2, $3, $4, $5, NOW())
       RETURNING *`,
      [inventario_id, bodega_origen_id, bodega_destino_id, usuario_id, observacion]
    );

    // Mover el item
    await client.query(
      `UPDATE inventario SET bodega_id = $1 WHERE id = $2`,
      [bodega_destino_id, inventario_id]
    );

    await client.query('COMMIT');
    res.status(201).json({
      mensaje: 'Transferencia realizada con éxito',
      movimiento: mov.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/movimientos — registrar movimiento genérico
router.post('/', async (req, res) => {
  const {
    inventario_id, tipo_movimiento, ot_anterior, ot_nueva,
    estado_anterior, estado_nuevo, usuario_id, tecnico_id,
    observacion, bodega_origen_id, bodega_destino_id,
  } = req.body;

  if (!inventario_id || !tipo_movimiento) {
    return res.status(400).json({ error: 'inventario_id y tipo_movimiento son requeridos' });
  }
  if (!TIPOS_VALIDOS.includes(tipo_movimiento)) {
    return res.status(400).json({
      error: `tipo_movimiento inválido. Válidos: ${TIPOS_VALIDOS.join(', ')}`,
    });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO movimientos
         (inventario_id, tipo_movimiento, ot_anterior, ot_nueva,
          estado_anterior, estado_nuevo, usuario_id, tecnico_id,
          observacion, bodega_origen_id, bodega_destino_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
       RETURNING *`,
      [inventario_id, tipo_movimiento, ot_anterior, ot_nueva,
       estado_anterior, estado_nuevo, usuario_id, tecnico_id,
       observacion, bodega_origen_id, bodega_destino_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/movimientos/export — exportar movimientos a CSV (con números de OT y OTH)
router.post('/export', async (req, res) => {
  const { tipo, fecha_desde, fecha_hasta } = req.body;

  let query = `
    SELECT 
      m.tipo_movimiento,
      COALESCE(mat.descripcion, '') as material,
      COALESCE(i.serial, '') as serial,
      COALESCE(m.estado_anterior, '') as estado_anterior,
      COALESCE(m.estado_nuevo, '') as estado_nuevo,
      m.oth_anterior,
      m.oth_nueva,
      ot_ant.numero_ot as ot_anterior_numero,
      ot_nue.numero_ot as ot_nueva_numero,
      COALESCE(u.nombre, '') as responsable,
      m.created_at as fecha
    FROM movimientos m
    LEFT JOIN inventario i ON m.inventario_id = i.id
    LEFT JOIN materiales mat ON i.material_id = mat.codigo_sap
    LEFT JOIN usuarios u ON m.usuario_id = u.id
    LEFT JOIN ot ot_ant ON m.ot_anterior = ot_ant.id
    LEFT JOIN ot ot_nue ON m.ot_nueva = ot_nue.id
    WHERE 1=1
  `;
  const params = [];

  if (tipo && tipo !== '') {
    params.push(tipo);
    query += ` AND m.tipo_movimiento = $${params.length}`;
  }
  if (fecha_desde) {
    params.push(fecha_desde);
    query += ` AND DATE(m.created_at) >= $${params.length}`;
  }
  if (fecha_hasta) {
    params.push(fecha_hasta);
    query += ` AND DATE(m.created_at) <= $${params.length}`;
  }

  query += ` ORDER BY m.created_at DESC`;

  try {
    const { rows } = await pool.query(query, params);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No hay movimientos con los filtros seleccionados' });
    }

    const getTipoLabel = (tipo) => {
      const labels = {
        'INGRESO_BODEGA': 'Ingreso a Bodega',
        'ENTRADA_STOCK': 'Entrada a Stock',
        'ENTRADA_INVENTARIO': 'Entrada a Inventario',
        'INGRESO_ASIGNADO': 'Ingreso Asignado',
        'ASIGNACION_TERRENO': 'Entrega a Técnico',
        'ENTREGA_EQUIPOS': 'Entrega de Equipos',
        'ASIGNACION_OT': 'Asignación a OT',
        'ENTREGA_TECNICO': 'Entrega a Técnico',
        'DEVOLUCION_BODEGA': 'Devolución a Bodega',
        'TRANSFERENCIA_BODEGA': 'Transferencia',
        'REASIGNACION_TERRENO': 'Reasignación a Terreno',
        'REASIGNACION_OT': 'Reasignación entre OT',
        'INSTALACION_CONSUMO': 'Instalación/Consumo',
        'ACTUALIZACION': 'Actualización'
      };
      return labels[tipo] || tipo.replace(/_/g, ' ');
    };

    // Construir datos para CSV
    const csvData = rows.map(row => {
      let otDisplay = '';
      if (row.tipo_movimiento === 'REASIGNACION_OT') {
        const otAnt = row.ot_anterior_numero || `OT#${row.ot_anterior}`;
        const otNue = row.ot_nueva_numero || `OT#${row.ot_nueva}`;
        otDisplay = `${otAnt} → ${otNue}`;
      } else {
        otDisplay = row.ot_nueva_numero || row.ot_anterior_numero || '';
      }

      let othDisplay = '';
      if (row.oth_anterior || row.oth_nueva) {
        othDisplay = `${row.oth_anterior || ''} → ${row.oth_nueva || ''}`.replace(/^ → /, '').replace(/ → $/, '');
      }

      return {
        Tipo: getTipoLabel(row.tipo_movimiento),
        Material: row.material,
        Serie: row.serial,
        'Estado Anterior': row.estado_anterior,
        'Estado Nuevo': row.estado_nuevo,
        OT: otDisplay,
        OTH: othDisplay,
        Responsable: row.responsable,
        Fecha: new Date(row.fecha).toLocaleString('es-CO', { timeZone: 'UTC' })
      };
    });

    const fields = ['Tipo', 'Material', 'Serie', 'Estado Anterior', 'Estado Nuevo', 'OT', 'OTH', 'Responsable', 'Fecha'];
    const parser = new Parser({ fields });
    const csv = parser.parse(csvData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=movimientos_${Date.now()}.csv`);
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/movimientos — listar movimientos paginados (con números de OT y OTH)
router.get('/', async (req, res) => {
  const { bodega_id, tipo, inventario_id, search, fecha_desde, fecha_hasta, page = 1, limit = 20 } = req.query;
  const filtros = [];
  const valores = [];

  if (bodega_id) {
    valores.push(bodega_id);
    filtros.push(`(mov.bodega_origen_id = $${valores.length} OR mov.bodega_destino_id = $${valores.length})`);
  }
  if (tipo) {
    valores.push(tipo);
    filtros.push(`mov.tipo_movimiento = $${valores.length}`);
  }
  if (inventario_id) {
    valores.push(inventario_id);
    filtros.push(`mov.inventario_id = $${valores.length}`);
  }
  if (search) {
    valores.push(`%${search}%`);
    filtros.push(`(mat.descripcion ILIKE $${valores.length} OR i.serial ILIKE $${valores.length} OR u.nombre ILIKE $${valores.length} OR t.nombre ILIKE $${valores.length})`);
  }
  if (fecha_desde) {
    valores.push(fecha_desde);
    filtros.push(`mov.created_at >= $${valores.length}`);
  }
  if (fecha_hasta) {
    valores.push(fecha_hasta);
    filtros.push(`mov.created_at <= $${valores.length}::date + interval '1 day' - interval '1 second'`);
  }

  const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';

  const offset = (parseInt(page) - 1) * parseInt(limit);
  valores.push(parseInt(limit));
  const limitParam = `$${valores.length}`;
  valores.push(offset);
  const offsetParam = `$${valores.length}`;

  try {
    // Total de registros (sin paginación)
    const countQuery = `
      SELECT COUNT(*) as total
      FROM movimientos mov
      JOIN inventario i ON mov.inventario_id = i.id
      JOIN materiales mat ON i.material_id = mat.codigo_sap
      LEFT JOIN bodegas bo ON mov.bodega_origen_id = bo.id
      LEFT JOIN bodegas bd ON mov.bodega_destino_id = bd.id
      LEFT JOIN usuarios u ON mov.usuario_id = u.id
      LEFT JOIN usuarios t ON mov.tecnico_id = t.id
      ${where}
    `;
    const countResult = await pool.query(countQuery, valores.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    // Datos paginados con números de OT y OTH
    const { rows } = await pool.query(
      `SELECT
         mov.id,
         mov.created_at,
         mov.tipo_movimiento,
         mov.observacion,
         mov.ot_anterior,
         mov.ot_nueva,
         mov.oth_anterior,
         mov.oth_nueva,
         mov.estado_anterior,
         mov.estado_nuevo,
         i.serial,
         mat.descripcion AS material,
         bo.nombre AS bodega_origen,
         bd.nombre AS bodega_destino,
         u.nombre AS usuario,
         t.nombre AS tecnico_nombre,
         ot_ant.numero_ot AS ot_anterior_numero,
         ot_nue.numero_ot AS ot_nueva_numero
       FROM movimientos mov
       JOIN inventario i ON mov.inventario_id = i.id
       JOIN materiales mat ON i.material_id = mat.codigo_sap
       LEFT JOIN bodegas bo ON mov.bodega_origen_id = bo.id
       LEFT JOIN bodegas bd ON mov.bodega_destino_id = bd.id
       LEFT JOIN usuarios u ON mov.usuario_id = u.id
       LEFT JOIN usuarios t ON mov.tecnico_id = t.id
       LEFT JOIN ot ot_ant ON mov.ot_anterior = ot_ant.id
       LEFT JOIN ot ot_nue ON mov.ot_nueva = ot_nue.id
       ${where}
       ORDER BY mov.created_at DESC
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      valores
    );

    res.json({
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Error en GET /movimientos:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;