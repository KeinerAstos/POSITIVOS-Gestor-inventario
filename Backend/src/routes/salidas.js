const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const PDFDocument = require('pdfkit');

// GET /api/salidas/:id/pdf - Generar comprobante PDF
router.get('/:id/pdf', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const cabecera = await pool.query(
      `SELECT s.*, u.nombre AS responsable_nombre, u2.nombre AS creado_por_nombre
       FROM salidas s
       LEFT JOIN usuarios u ON s.responsable_id = u.id
       LEFT JOIN usuarios u2 ON s.created_by = u2.id
       WHERE s.id = $1`,
      [id]
    );

    if (cabecera.rows.length === 0) {
      return res.status(404).json({ error: 'Salida no encontrada' });
    }

    const salida = cabecera.rows[0];

    const detalles = await pool.query(
      `SELECT sd.*, i.material_id, i.serial, m.descripcion AS material_descripcion
       FROM salidas_detalle sd
       JOIN inventario i ON sd.inventario_id = i.id
       LEFT JOIN materiales m ON i.material_id = m.codigo_sap
       WHERE sd.salida_id = $1`,
      [id]
    );

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="comprobante_salida_${salida.consecutivo}.pdf"`
    );

    doc.pipe(res);

    doc.fontSize(18).text('COMPROBANTE DE SALIDA DE BODEGA', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Consecutivo: ${salida.consecutivo}`, { align: 'right' });
    doc.text(`Fecha: ${new Date(salida.fecha).toLocaleDateString('es-CO')}`);
    doc.text(`Destino: ${salida.destino || 'No especificado'}`);
    doc.text(`Motivo: ${salida.motivo || 'No especificado'}`);
    doc.text(`Responsable: ${salida.responsable_nombre || 'No asignado'}`);
    doc.text(`Creado por: ${salida.creado_por_nombre || 'Sistema'}`);

    if (salida.observaciones) {
      doc.text(`Observaciones: ${salida.observaciones}`);
    }

    doc.moveDown();

    const tableTop = doc.y;
    doc.fontSize(10);

    const columnas = ['Cant.', 'Código', 'Descripción', 'Serial'];
    const anchos = [50, 100, 250, 120];

    let x = 50;
    doc.font('Helvetica-Bold');

    columnas.forEach((col, i) => {
      doc.text(col, x, tableTop, { width: anchos[i], align: 'left' });
      x += anchos[i];
    });

    doc.font('Helvetica');

    let y = tableTop + 20;

    detalles.rows.forEach(item => {
      x = 50;

      doc.text(String(item.cantidad || 1), x, y, { width: anchos[0] });
      x += anchos[0];

      doc.text(item.material_id || '—', x, y, { width: anchos[1] });
      x += anchos[1];

      doc.text(item.material_descripcion || '—', x, y, { width: anchos[2] });
      x += anchos[2];

      doc.text(item.serial || '—', x, y, { width: anchos[3] });

      y += 20;

      if (y > 700) {
        doc.addPage();
        y = 50;
      }
    });

    doc.moveDown();
    doc.fontSize(10).text('Firma de quien recibe: ___________________________', {
      align: 'center',
    });

    doc.end();
  } catch (err) {
    console.error('Error generando PDF salida:', err);
    res.status(500).json({ error: err.message });
  }
});

async function generarConsecutivo(client) {
  const result = await client.query(
    `SELECT consecutivo FROM salidas ORDER BY id DESC LIMIT 1`
  );

  let nextNumber = 1;

  if (result.rows.length > 0) {
    const last = result.rows[0].consecutivo || '';
    const lastNum = parseInt(last.split('-')[1], 10);

    if (!Number.isNaN(lastNum)) {
      nextNumber = lastNum + 1;
    }
  }

  return `SA-${nextNumber.toString().padStart(3, '0')}`;
}

// POST /api/salidas - Crear nueva salida
router.post('/', verifyToken, async (req, res) => {
  const { fecha, destino, motivo, responsable_id, items, observaciones } = req.body;

  if (!items || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'Debe incluir al menos un equipo/material' });
  }

  if (!destino || !motivo) {
    return res.status(400).json({ error: 'Destino y motivo son obligatorios' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const item of items) {
      const { rows } = await client.query(
        `SELECT id, estado, cantidad, serial
         FROM inventario
         WHERE id = $1
         FOR UPDATE`,
        [item.inventario_id]
      );

      if (rows.length === 0) {
        throw new Error(`Item con ID ${item.inventario_id} no encontrado`);
      }

      const invItem = rows[0];
      const estado = String(invItem.estado || '').toUpperCase();
      const cantidadSolicitada = Number(item.cantidad || 1);
      const cantidadDisponible = Number(invItem.cantidad || 1);

      if (!['STOCK', 'INGRESADO'].includes(estado)) {
        throw new Error(`El item ID ${item.inventario_id} está en estado ${estado} y no puede salir de bodega`);
      }

      if (cantidadSolicitada < 1) {
        throw new Error(`La cantidad del item ID ${item.inventario_id} debe ser mayor a 0`);
      }

      if (invItem.serial && cantidadSolicitada !== 1) {
        throw new Error(`El item serializado ID ${item.inventario_id} solo puede salir con cantidad 1`);
      }

      if (cantidadSolicitada > cantidadDisponible) {
        throw new Error(`Stock insuficiente para item ID ${item.inventario_id}. Disponible: ${cantidadDisponible}`);
      }
    }

    const consecutivo = await generarConsecutivo(client);

    const cabeceraResult = await client.query(
      `INSERT INTO salidas 
       (consecutivo, fecha, destino, motivo, responsable_id, observaciones, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id`,
      [
        consecutivo,
        fecha || new Date(),
        destino,
        motivo,
        responsable_id || req.user.id,
        observaciones || null,
        req.user.id,
      ]
    );

    const salidaId = cabeceraResult.rows[0].id;

    for (const item of items) {
      const cantidadSolicitada = Number(item.cantidad || 1);

      const { rows } = await client.query(
        `SELECT id, cantidad, serial, estado
         FROM inventario
         WHERE id = $1
         FOR UPDATE`,
        [item.inventario_id]
      );

      const invItem = rows[0];
      const cantidadActual = Number(invItem.cantidad || 1);
      const esSerializado = Boolean(invItem.serial);

      await client.query(
        `INSERT INTO salidas_detalle
         (salida_id, inventario_id, cantidad, observacion_item)
         VALUES ($1, $2, $3, $4)`,
        [
          salidaId,
          item.inventario_id,
          cantidadSolicitada,
          item.observacion || item.observacion_item || null,
        ]
      );

      if (esSerializado || cantidadSolicitada === cantidadActual) {
        await client.query(
          `UPDATE inventario
           SET estado = 'SALIDA',
               updated_at = NOW()
           WHERE id = $1`,
          [item.inventario_id]
        );
      } else {
        await client.query(
          `UPDATE inventario
           SET cantidad = cantidad - $1,
               updated_at = NOW()
           WHERE id = $2`,
          [cantidadSolicitada, item.inventario_id]
        );

        const nuevoRegistro = await client.query(
          `INSERT INTO inventario (
             material_id, serial, cantidad, ot_id, usuario_asignado,
             estado, ubicacion, bodega_id, created_at,
             ot_consumo_id, fecha_instalacion,
             documento_material, oth, lote
           )
           SELECT
             material_id, NULL, $1, ot_id, usuario_asignado,
             'SALIDA', ubicacion, bodega_id, NOW(),
             ot_consumo_id, fecha_instalacion,
             documento_material, oth, lote
           FROM inventario
           WHERE id = $2
           RETURNING id`,
          [cantidadSolicitada, item.inventario_id]
        );

        await client.query(
          `UPDATE salidas_detalle
           SET inventario_id = $1
           WHERE salida_id = $2
             AND inventario_id = $3`,
          [nuevoRegistro.rows[0].id, salidaId, item.inventario_id]
        );
      }

      await client.query(
        `INSERT INTO movimientos 
         (tipo_movimiento, inventario_id, estado_anterior, estado_nuevo, observacion, usuario_id, created_at)
         VALUES ('SALIDA_BODEGA', $1, $2, 'SALIDA', $3, $4, NOW())`,
        [
          item.inventario_id,
          invItem.estado,
          `Salida ${consecutivo} - ${destino} - ${motivo} - Cantidad: ${cantidadSolicitada}`,
          req.user.id,
        ]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      consecutivo,
      salidaId,
      message: `Salida ${consecutivo} registrada correctamente`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creando salida:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /api/salidas - Listar salidas sin token
router.get('/', async (req, res) => {
  const { page = 1, limit = 20, destino, desde, hasta } = req.query;

  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const offset = (pageNumber - 1) * limitNumber;

  const filtros = [];
  const params = [];

  if (destino) {
    params.push(`%${destino}%`);
    filtros.push(`s.destino ILIKE $${params.length}`);
  }

  if (desde) {
    params.push(desde);
    filtros.push(`s.fecha >= $${params.length}`);
  }

  if (hasta) {
    params.push(hasta);
    filtros.push(`s.fecha <= $${params.length}`);
  }

  const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';

  try {
    const query = `
      SELECT
        s.*,
        u.nombre AS responsable_nombre,
        COUNT(sd.id)::int AS total_items
      FROM salidas s
      LEFT JOIN usuarios u ON s.responsable_id = u.id
      LEFT JOIN salidas_detalle sd ON s.id = sd.salida_id
      ${where}
      GROUP BY s.id, u.nombre
      ORDER BY s.fecha DESC, s.id DESC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `;

    const { rows } = await pool.query(query, [
      ...params,
      limitNumber,
      offset,
    ]);

    const countQuery = `
      SELECT COUNT(DISTINCT s.id)::int AS total
      FROM salidas s
      ${where}
    `;

    const totalResult = await pool.query(countQuery, params);
    const total = Number(totalResult.rows[0]?.total || 0);

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
    console.error('Error listando salidas:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/salidas/:id - Obtener salida con detalles sin token
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const cabecera = await pool.query(
      `SELECT s.*, u.nombre AS responsable_nombre, u2.nombre AS creado_por_nombre
       FROM salidas s
       LEFT JOIN usuarios u ON s.responsable_id = u.id
       LEFT JOIN usuarios u2 ON s.created_by = u2.id
       WHERE s.id = $1`,
      [id]
    );

    if (cabecera.rows.length === 0) {
      return res.status(404).json({ error: 'Salida no encontrada' });
    }

    const detalles = await pool.query(
      `SELECT sd.*,
              i.material_id,
              i.serial,
              i.cantidad AS inventario_cantidad,
              m.descripcion AS material_descripcion
       FROM salidas_detalle sd
       JOIN inventario i ON sd.inventario_id = i.id
       LEFT JOIN materiales m ON i.material_id = m.codigo_sap
       WHERE sd.salida_id = $1`,
      [id]
    );

    res.json({
      cabecera: cabecera.rows[0],
      detalles: detalles.rows,
    });
  } catch (err) {
    console.error('Error consultando detalle salida:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/salidas/:id/anular - Anular salida
router.post('/:id/anular', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { observacion } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows: salidaRows } = await client.query(
      `SELECT consecutivo FROM salidas WHERE id = $1`,
      [id]
    );

    if (salidaRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Salida no encontrada' });
    }

    const consecutivo = salidaRows[0].consecutivo;

    const { rows: detalles } = await client.query(
      `SELECT inventario_id, cantidad
       FROM salidas_detalle
       WHERE salida_id = $1`,
      [id]
    );

    for (const detalle of detalles) {
      const { rows: invRows } = await client.query(
        `SELECT id, estado, ot_id
         FROM inventario
         WHERE id = $1
         FOR UPDATE`,
        [detalle.inventario_id]
      );

      if (invRows.length === 0) continue;

      const item = invRows[0];

      if (item.estado !== 'SALIDA') {
        throw new Error(`El equipo ${item.id} ya no está en estado SALIDA`);
      }

      const estadoRestaurado = item.ot_id ? 'INGRESADO' : 'STOCK';

      await client.query(
        `UPDATE inventario
         SET estado = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [estadoRestaurado, detalle.inventario_id]
      );

      await client.query(
        `INSERT INTO movimientos 
         (tipo_movimiento, inventario_id, estado_anterior, estado_nuevo, observacion, usuario_id, created_at)
         VALUES ('ANULACION_SALIDA', $1, 'SALIDA', $2, $3, $4, NOW())`,
        [
          detalle.inventario_id,
          estadoRestaurado,
          `Anulación de salida ${consecutivo}. ${observacion || ''}`,
          req.user.id,
        ]
      );
    }

    await client.query(
      `UPDATE salidas
       SET observaciones = CONCAT(COALESCE(observaciones, ''), ' [ANULADA: ', NOW(), ' - ', $1, ']')
       WHERE id = $2`,
      [observacion || 'Sin motivo', id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Salida ${consecutivo} anulada correctamente`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error anulando salida:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;