const express = require('express');
const router = express.Router();
const pool = require('../db');
const { Parser } = require('json2csv');

const TIPOS_VALIDOS = [
  'ENTRADA',
  'SALIDA',
  'TRANSFERENCIA_BODEGA',
  'ASIGNACION_OT',
  'DEVOLUCION',
  'AJUSTE',
  'INGRESO_BODEGA',
  'ENTRADA_STOCK',
  'ASIGNACION_TERRENO',
  'ENTREGA_TECNICO',
  'DEVOLUCION_BODEGA',
  'DEVOLUCION_TECNICO',
  'REASIGNACION_OT',
  'INSTALACION_CONSUMO',
  'ACTUALIZACION',
  'SALIDA_BODEGA',
  'ANULACION_SALIDA'
];

const getTipoLabel = (tipo) => {
  const labels = {
    INGRESO_BODEGA: 'Ingreso a Bodega',
    ENTRADA_STOCK: 'Entrada a Stock',
    ENTRADA_INVENTARIO: 'Entrada a Inventario',
    INGRESO_ASIGNADO: 'Ingreso Asignado',
    ASIGNACION_TERRENO: 'Entrega a Técnico',
    ENTREGA_EQUIPOS: 'Entrega de Equipos',
    ASIGNACION_OT: 'Asignación a OT',
    ENTREGA_TECNICO: 'Entrega a Técnico',
    DEVOLUCION_BODEGA: 'Devolución a Bodega',
    DEVOLUCION_TECNICO: 'Devolución Técnico',
    TRANSFERENCIA_BODEGA: 'Transferencia',
    REASIGNACION_TERRENO: 'Reasignación a Terreno',
    REASIGNACION_OT: 'Reasignación entre OT',
    INSTALACION_CONSUMO: 'Instalación/Consumo',
    ACTUALIZACION: 'Actualización',
    SALIDA_BODEGA: 'Salida Bodega',
    ANULACION_SALIDA: 'Anulación Salida'
  };

  return labels[tipo] || String(tipo || '').replace(/_/g, ' ');
};

const aplicarFiltrosMovimiento = (query, params, filtros, alias = 'mov') => {
  const {
    bodega_id,
    tipo,
    tipos,
    inventario_id,
    search,
    fecha_desde,
    fecha_hasta,
    estado_anterior,
    estado_nuevo
  } = query;

  if (bodega_id) {
    params.push(bodega_id);
    filtros.push(`(${alias}.bodega_origen_id = $${params.length} OR ${alias}.bodega_destino_id = $${params.length})`);
  }

  if (tipos) {
    const listaTipos = String(tipos)
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    if (listaTipos.length) {
      params.push(listaTipos);
      filtros.push(`${alias}.tipo_movimiento = ANY($${params.length})`);
    }
  } else if (tipo) {
    params.push(tipo);
    filtros.push(`${alias}.tipo_movimiento = $${params.length}`);
  }

  if (inventario_id) {
    params.push(inventario_id);
    filtros.push(`${alias}.inventario_id = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    filtros.push(`(
      mat.descripcion ILIKE $${params.length}
      OR i.serial ILIKE $${params.length}
      OR CAST(i.material_id AS TEXT) ILIKE $${params.length}
      OR u.nombre ILIKE $${params.length}
      OR t.nombre ILIKE $${params.length}
      OR ot_ant.numero_ot ILIKE $${params.length}
      OR ot_nue.numero_ot ILIKE $${params.length}
      OR ${alias}.observacion ILIKE $${params.length}
    )`);
  }

  if (fecha_desde) {
    params.push(fecha_desde);
    filtros.push(`${alias}.created_at >= $${params.length}`);
  }

  if (fecha_hasta) {
    params.push(fecha_hasta);
    filtros.push(`${alias}.created_at <= $${params.length}::date + interval '1 day' - interval '1 second'`);
  }

  if (estado_anterior) {
    params.push(estado_anterior);
    filtros.push(`${alias}.estado_anterior = $${params.length}`);
  }

  if (estado_nuevo) {
    params.push(estado_nuevo);
    filtros.push(`${alias}.estado_nuevo = $${params.length}`);
  }
};

// POST /api/movimientos/transferencia
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

    const item = await client.query(
      `SELECT id, bodega_id, serial FROM inventario WHERE id = $1 FOR UPDATE`,
      [inventario_id]
    );

    if (!item.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Item de inventario no encontrado' });
    }

    const bodega_origen_id = item.rows[0].bodega_id;

    if (Number(bodega_origen_id) === Number(bodega_destino_id)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El item ya está en esa bodega' });
    }

    const mov = await client.query(
      `INSERT INTO movimientos
         (inventario_id, tipo_movimiento, bodega_origen_id, bodega_destino_id,
          usuario_id, observacion, created_at)
       VALUES ($1, 'TRANSFERENCIA_BODEGA', $2, $3, $4, $5, NOW())
       RETURNING *`,
      [inventario_id, bodega_origen_id, bodega_destino_id, usuario_id, observacion]
    );

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

// POST /api/movimientos
router.post('/', async (req, res) => {
  const {
    inventario_id,
    tipo_movimiento,
    ot_anterior,
    ot_nueva,
    estado_anterior,
    estado_nuevo,
    usuario_id,
    tecnico_id,
    observacion,
    bodega_origen_id,
    bodega_destino_id,
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
      [
        inventario_id,
        tipo_movimiento,
        ot_anterior,
        ot_nueva,
        estado_anterior,
        estado_nuevo,
        usuario_id,
        tecnico_id,
        observacion,
        bodega_origen_id,
        bodega_destino_id,
      ]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/movimientos/export
router.post('/export', async (req, res) => {
  const {
    tipo,
    tipos,
    fecha_desde,
    fecha_hasta,
    estado_anterior,
    estado_nuevo,
    search
  } = req.body;

  const params = [];
  const filtros = [];

  aplicarFiltrosMovimiento(
    {
      tipo,
      tipos,
      fecha_desde,
      fecha_hasta,
      estado_anterior,
      estado_nuevo,
      search
    },
    params,
    filtros,
    'm'
  );

  const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';

  const query = `
    SELECT 
      m.id,
      m.tipo_movimiento,
      COALESCE(mat.descripcion, '') AS material,
      COALESCE(CAST(i.material_id AS TEXT), '') AS codigo_sap,
      COALESCE(i.serial, '') AS serial,
      COALESCE(m.estado_anterior, '') AS estado_anterior,
      COALESCE(m.estado_nuevo, '') AS estado_nuevo,
      COALESCE(CAST(m.cantidad AS TEXT), '1') AS cantidad,
      m.oth_anterior,
      m.oth_nueva,
      ot_ant.numero_ot AS ot_anterior_numero,
      ot_nue.numero_ot AS ot_nueva_numero,
      COALESCE(u.nombre, t.nombre, '') AS responsable,
      m.observacion,
      m.created_at AS fecha
    FROM movimientos m
    LEFT JOIN inventario i ON m.inventario_id = i.id
    LEFT JOIN materiales mat ON i.material_id = mat.codigo_sap
    LEFT JOIN usuarios u ON m.usuario_id = u.id
    LEFT JOIN usuarios t ON m.tecnico_id = t.id
    LEFT JOIN ot ot_ant ON m.ot_anterior = ot_ant.id
    LEFT JOIN ot ot_nue ON m.ot_nueva = ot_nue.id
    ${where}
    ORDER BY m.created_at DESC
  `;

  try {
    const { rows } = await pool.query(query, params);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No hay movimientos con los filtros seleccionados' });
    }

    const csvData = rows.map(row => {
      let otDisplay = '';

      if (row.tipo_movimiento === 'REASIGNACION_OT') {
        otDisplay = `${row.ot_anterior_numero || ''} → ${row.ot_nueva_numero || ''}`;
      } else {
        otDisplay = row.ot_nueva_numero || row.ot_anterior_numero || '';
      }

      let othDisplay = '';

      if (row.oth_anterior || row.oth_nueva) {
        othDisplay = `${row.oth_anterior || ''} → ${row.oth_nueva || ''}`
          .replace(/^ → /, '')
          .replace(/ → $/, '');
      }

      return {
        ID: row.id,
        Tipo: getTipoLabel(row.tipo_movimiento),
        'Tipo Código': row.tipo_movimiento,
        Material: row.material,
        SAP: row.codigo_sap,
        Serie: row.serial,
        Cantidad: row.cantidad,
        'Estado Anterior': row.estado_anterior,
        'Estado Nuevo': row.estado_nuevo,
        OT: otDisplay,
        OTH: othDisplay,
        Responsable: row.responsable,
        Observación: row.observacion || '',
        Fecha: new Date(row.fecha).toLocaleString('es-CO', { timeZone: 'UTC' }),
      };
    });

    const fields = [
      'ID',
      'Tipo',
      'Tipo Código',
      'Material',
      'SAP',
      'Serie',
      'Cantidad',
      'Estado Anterior',
      'Estado Nuevo',
      'OT',
      'OTH',
      'Responsable',
      'Observación',
      'Fecha',
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(csvData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=movimientos_${Date.now()}.csv`);
    res.send(csv);
  } catch (err) {
    console.error('Error exportando movimientos:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/movimientos
router.get('/', async (req, res) => {
  const {
    page = 1,
    limit = 20
  } = req.query;

  const filtros = [];
  const valores = [];

  aplicarFiltrosMovimiento(req.query, valores, filtros, 'mov');

  const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';

  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const offset = (pageNumber - 1) * limitNumber;

  valores.push(limitNumber);
  const limitParam = `$${valores.length}`;

  valores.push(offset);
  const offsetParam = `$${valores.length}`;

  try {
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM movimientos mov
      LEFT JOIN inventario i ON mov.inventario_id = i.id
      LEFT JOIN materiales mat ON i.material_id = mat.codigo_sap
      LEFT JOIN bodegas bo ON mov.bodega_origen_id = bo.id
      LEFT JOIN bodegas bd ON mov.bodega_destino_id = bd.id
      LEFT JOIN usuarios u ON mov.usuario_id = u.id
      LEFT JOIN usuarios t ON mov.tecnico_id = t.id
      LEFT JOIN ot ot_ant ON mov.ot_anterior = ot_ant.id
      LEFT JOIN ot ot_nue ON mov.ot_nueva = ot_nue.id
      ${where}
    `;

    const countResult = await pool.query(countQuery, valores.slice(0, -2));
    const total = parseInt(countResult.rows[0].total, 10) || 0;

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
         COALESCE(mov.cantidad, 1) AS cantidad,
         i.material_id,
         i.serial,
         mat.descripcion AS material,
         bo.nombre AS bodega_origen,
         bd.nombre AS bodega_destino,
         u.nombre AS usuario,
         t.nombre AS tecnico_nombre,
         ot_ant.numero_ot AS ot_anterior_numero,
         ot_nue.numero_ot AS ot_nueva_numero
       FROM movimientos mov
       LEFT JOIN inventario i ON mov.inventario_id = i.id
       LEFT JOIN materiales mat ON i.material_id = mat.codigo_sap
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
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.max(Math.ceil(total / limitNumber), 1),
      },
    });
  } catch (err) {
    console.error('Error en GET /movimientos:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;