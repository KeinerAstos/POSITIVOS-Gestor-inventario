const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const multer = require('multer');
const XLSX = require('xlsx');

const upload = multer({ storage: multer.memoryStorage() });

function normalizarTexto(v) {
  return String(v || '').trim();
}

async function consumirItem(client, payload, usuarioId) {
  const {
    inventario_id,
    cantidad = 1,
    otp,
    oth,
    cliente,
    rr,
    fecha_consumo,
    observacion
  } = payload;

  if (!inventario_id) throw new Error('inventario_id es obligatorio');
  if (!otp) throw new Error('OTP es obligatoria');
  if (!oth) throw new Error('OTH es obligatoria');
  if (!cliente) throw new Error('Cliente es obligatorio');
  if (!fecha_consumo) throw new Error('Fecha de consumo es obligatoria');

  const cantidadSolicitada = Number(cantidad || 1);

  if (cantidadSolicitada < 1) {
    throw new Error('La cantidad debe ser mayor a 0');
  }

  const { rows } = await client.query(
    `SELECT id, estado, cantidad, serial, ot_id
     FROM inventario
     WHERE id = $1
     FOR UPDATE`,
    [inventario_id]
  );

  if (!rows.length) {
    throw new Error(`Inventario ID ${inventario_id} no encontrado`);
  }

  const item = rows[0];

  if (String(item.estado || '').toUpperCase() !== 'TERRENO') {
    throw new Error(`El item ${inventario_id} no está en TERRENO`);
  }

  const cantidadDisponible = Number(item.cantidad || 1);
  const esSerializado = Boolean(item.serial);

  if (esSerializado && cantidadSolicitada !== 1) {
    throw new Error(`El item serializado ${inventario_id} solo puede consumirse con cantidad 1`);
  }

  if (cantidadSolicitada > cantidadDisponible) {
    throw new Error(`Cantidad insuficiente para item ${inventario_id}. Disponible: ${cantidadDisponible}`);
  }

  let inventarioConsumidoId = inventario_id;

  if (esSerializado || cantidadSolicitada === cantidadDisponible) {
    await client.query(
      `UPDATE inventario
       SET estado = 'CONSUMO',
           fecha_instalacion = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [inventario_id, fecha_consumo]
    );
  } else {
    await client.query(
      `UPDATE inventario
       SET cantidad = cantidad - $1,
           updated_at = NOW()
       WHERE id = $2`,
      [cantidadSolicitada, inventario_id]
    );

    const nuevo = await client.query(
      `INSERT INTO inventario (
        material_id,
        serial,
        cantidad,
        ot_id,
        usuario_asignado,
        estado,
        ubicacion,
        bodega_id,
        created_at,
        updated_at,
        ot_consumo_id,
        fecha_instalacion,
        documento_material,
        oth,
        lote
      )
      SELECT
        material_id,
        NULL,
        $1,
        ot_id,
        usuario_asignado,
        'CONSUMO',
        ubicacion,
        bodega_id,
        NOW(),
        NOW(),
        ot_consumo_id,
        $3,
        documento_material,
        oth,
        lote
      FROM inventario
      WHERE id = $2
      RETURNING id`,
      [cantidadSolicitada, inventario_id, fecha_consumo]
    );

    inventarioConsumidoId = nuevo.rows[0].id;
  }

  const consumo = await client.query(
    `INSERT INTO consumos (
      inventario_id,
      cantidad,
      otp,
      oth,
      cliente,
      rr,
      fecha_consumo,
      observacion,
      usuario_id,
      created_at,
      updated_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
    RETURNING *`,
    [
      inventarioConsumidoId,
      cantidadSolicitada,
      otp,
      oth,
      cliente,
      rr || null,
      fecha_consumo,
      observacion || null,
      usuarioId
    ]
  );

  await client.query(
    `INSERT INTO movimientos (
      tipo_movimiento,
      inventario_id,
      estado_anterior,
      estado_nuevo,
      observacion,
      usuario_id,
      created_at
    )
    VALUES (
      'INSTALACION_CONSUMO',
      $1,
      'TERRENO',
      'CONSUMO',
      $2,
      $3,
      NOW()
    )`,
    [
      inventarioConsumidoId,
      `Consumo | OTP: ${otp} | OTH: ${oth} | Cliente: ${cliente}${rr ? ` | RR: ${rr}` : ''} | Fecha consumo: ${fecha_consumo}${observacion ? ` | ${observacion}` : ''}`,
      usuarioId
    ]
  );

  return consumo.rows[0];
}

// POST individual
router.post('/', verifyToken, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const consumo = await consumirItem(client, req.body, req.user.id);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Consumo registrado correctamente',
      consumo
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error registrando consumo:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// POST masivo archivo
router.post('/masivo', verifyToken, upload.single('archivo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Debes adjuntar un archivo Excel o CSV' });
  }

  const client = await pool.connect();

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

    if (!rows.length) {
      return res.status(400).json({ error: 'El archivo está vacío' });
    }

    const resultados = [];
    const errores = [];

    await client.query('BEGIN');

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      try {
        const serial = normalizarTexto(row.serial || row.Serial || row.SERIAL);
        const material_id = normalizarTexto(row.material_id || row.sap || row.SAP || row.codigo_sap);
        const cantidad = Number(row.cantidad || row.Cantidad || 1);

        let inventarioId = row.inventario_id || row.id || row.ID || null;

        if (!inventarioId) {
          const inv = await client.query(
            `SELECT id
             FROM inventario
             WHERE estado = 'TERRENO'
               AND cantidad > 0
               AND (
                 ($1 <> '' AND serial = $1)
                 OR ($2 <> '' AND CAST(material_id AS TEXT) = $2)
               )
             ORDER BY id ASC
             LIMIT 1`,
            [serial, material_id]
          );

          if (!inv.rows.length) {
            throw new Error('No se encontró inventario en TERRENO para serial/SAP enviado');
          }

          inventarioId = inv.rows[0].id;
        }

        const consumo = await consumirItem(client, {
          inventario_id: inventarioId,
          cantidad,
          otp: normalizarTexto(row.otp || row.OTP),
          oth: normalizarTexto(row.oth || row.OTH),
          cliente: normalizarTexto(row.cliente || row.Cliente || row.CLIENTE),
          rr: normalizarTexto(row.rr || row.RR),
          fecha_consumo: normalizarTexto(row.fecha_consumo || row.fecha || row.Fecha),
          observacion: normalizarTexto(row.observacion || row.Observacion || row.observación)
        }, req.user.id);

        resultados.push({
          fila: i + 2,
          ok: true,
          consumo_id: consumo.id
        });
      } catch (err) {
        errores.push({
          fila: i + 2,
          error: err.message
        });
      }
    }

    if (errores.length) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        error: 'El archivo tiene errores. No se realizó ningún consumo.',
        errores
      });
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Consumo masivo registrado correctamente',
      procesados: resultados.length,
      resultados
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error consumo masivo:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET consumos
router.get('/', async (req, res) => {
  const { search, desde, hasta, page = 1, limit = 20 } = req.query;

  const params = [];
  const filtros = [];

  if (search) {
    params.push(`%${search}%`);
    filtros.push(`(
      c.otp ILIKE $${params.length}
      OR c.oth ILIKE $${params.length}
      OR c.cliente ILIKE $${params.length}
      OR c.rr ILIKE $${params.length}
      OR i.serial ILIKE $${params.length}
      OR CAST(i.material_id AS TEXT) ILIKE $${params.length}
      OR m.descripcion ILIKE $${params.length}
    )`);
  }

  if (desde) {
    params.push(desde);
    filtros.push(`c.fecha_consumo >= $${params.length}`);
  }

  if (hasta) {
    params.push(hasta);
    filtros.push(`c.fecha_consumo <= $${params.length}`);
  }

  const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';

  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const offset = (pageNumber - 1) * limitNumber;

  try {
    const count = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM consumos c
       JOIN inventario i ON c.inventario_id = i.id
       LEFT JOIN materiales m ON i.material_id = m.codigo_sap
       ${where}`,
      params
    );

    const data = await pool.query(
      `SELECT
        c.*,
        i.material_id,
        i.serial,
        m.descripcion AS material_descripcion,
        u.nombre AS usuario_nombre
       FROM consumos c
       JOIN inventario i ON c.inventario_id = i.id
       LEFT JOIN materiales m ON i.material_id = m.codigo_sap
       LEFT JOIN usuarios u ON c.usuario_id = u.id
       ${where}
       ORDER BY c.fecha_consumo DESC, c.id DESC
       LIMIT $${params.length + 1}
       OFFSET $${params.length + 2}`,
      [...params, limitNumber, offset]
    );

    const total = Number(count.rows[0].total || 0);

    res.json({
      data: data.rows,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.max(Math.ceil(total / limitNumber), 1)
      }
    });
  } catch (err) {
    console.error('Error listando consumos:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT editar consumo solo metadata
router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { otp, oth, cliente, rr, fecha_consumo, observacion } = req.body;

  if (!otp || !oth || !cliente || !fecha_consumo) {
    return res.status(400).json({
      error: 'OTP, OTH, cliente y fecha_consumo son obligatorios'
    });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE consumos
       SET otp = $1,
           oth = $2,
           cliente = $3,
           rr = $4,
           fecha_consumo = $5,
           observacion = $6,
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        otp,
        oth,
        cliente,
        rr || null,
        fecha_consumo,
        observacion || null,
        id
      ]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Consumo no encontrado' });
    }

    res.json({
      success: true,
      message: 'Consumo actualizado correctamente',
      consumo: rows[0]
    });
  } catch (err) {
    console.error('Error editando consumo:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;