
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth'); // <-- Importar verifyToken

// Middleware de logging para debug
router.use((req, res, next) => {
  console.log(`📌 [INVENTARIO] ${req.method} ${req.originalUrl}`);
  next();
});

// GET /api/inventario/stock;
router.get('/stock', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        m.codigo_sap,
        m.descripcion,
        b.nombre AS bodega,
        COUNT(i.id) AS cantidad_items,
        SUM(i.cantidad) AS stock_total,
        i.estado
      FROM inventario i
      JOIN materiales m ON i.material_id = m.codigo_sap
      JOIN bodegas b ON i.bodega_id = b.id
      GROUP BY m.codigo_sap, m.descripcion, b.nombre, i.estado
      ORDER BY m.descripcion, b.nombre
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventario/tecnicos
router.get('/tecnicos', async (req, res) => {
  console.log('✅ GET /tecnicos - Consultando técnicos...');
  try {
    const { rows } = await pool.query(`
      SELECT id, cedula, nombre
      FROM usuarios
      WHERE tipo_usuario = 'TECNICO'
        AND activo = true
      ORDER BY nombre ASC
    `);
    console.log(`📋 Se encontraron ${rows.length} técnicos`);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error en /tecnicos:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventario/asignar - Asignación directa a TERRENO
router.post('/asignar', async (req, res) => {
  console.log('🚀 POST /asignar - Asignando equipo a técnico (TERRENO)');

  const {
    inventario_ids,
    materiales_no_serializados,
    ot_id,
    usuario_asignado,
    observacion
  } = req.body;

  if (!usuario_asignado || isNaN(parseInt(usuario_asignado))) {
    return res.status(400).json({
      error: 'El técnico es obligatorio.'
    });
  }

  const tecnico = parseInt(usuario_asignado);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Procesar equipos serializados (sin cambios)
    if (Array.isArray(inventario_ids) && inventario_ids.length > 0) {
      for (const id of inventario_ids) {
        const { rows } = await client.query(
          `SELECT id, estado, ot_id, bodega_id, usuario_asignado 
           FROM inventario 
           WHERE id = $1 
           FOR UPDATE`,
          [id]
        );

        if (rows.length === 0) {
          throw new Error(`El equipo ID ${id} no existe.`);
        }

        const item = rows[0];

        const estadosPermitidos = ['STOCK', 'INGRESADO', 'DEVUELTO'];
        if (!estadosPermitidos.includes(item.estado)) {
          throw new Error(
            `El equipo ${id} está en estado ${item.estado} y no puede ser asignado a terreno. ` +
            `Estados permitidos: ${estadosPermitidos.join(', ')}`
          );
        }

        await client.query(
          `UPDATE inventario
           SET estado = 'TERRENO',
               ot_id = $2,
               usuario_asignado = $3,
               updated_at = NOW()
           WHERE id = $1`,
          [id, ot_id || null, tecnico]
        );

        await client.query(
          `INSERT INTO movimientos (
            tipo_movimiento,
            inventario_id,
            ot_anterior,
            ot_nueva,
            estado_anterior,
            estado_nuevo,
            bodega_origen_id,
            usuario_id,
            tecnico_id,
            observacion,
            created_at
          ) VALUES (
            'ASIGNACION_TERRENO',
            $1,
            $2,
            $3,
            $4,
            'TERRENO',
            $5,
            $6,
            $7,
            $8,
            NOW()
          )`,
          [
            id,
            item.ot_id,
            ot_id || null,
            item.estado,
            item.bodega_id,
            tecnico,
            tecnico,
            observacion || `Asignación a técnico ID: ${tecnico} - Equipo enviado a terreno`
          ]
        );

        console.log(`✅ Equipo ${id} asignado a técnico - estado: TERRENO`);
      }
    }

    // Procesar materiales no serializados (MODIFICADO: ahora pasan a TERRENO)
    // Procesar materiales no serializados (AHORA PASAN A TERRENO)
    if (Array.isArray(materiales_no_serializados) && materiales_no_serializados.length > 0) {
      for (const mat of materiales_no_serializados) {
        const inventario_id = Number(mat.inventario_id);
        let cant = Number(mat.cantidad_descontar);

        // ✅ VALIDACIÓN ESTRICTA
        if (!inventario_id || isNaN(cant) || !Number.isInteger(cant) || cant < 1) {
          console.log(`⚠️ Cantidad inválida (${cant}) para material ID ${inventario_id}. Se omite.`);
          continue;
        }

        const { rows } = await client.query(
          `SELECT cantidad, bodega_id, material_id
       FROM inventario 
       WHERE id = $1 AND serial IS NULL
       FOR UPDATE`,
          [inventario_id]
        );
        if (rows.length === 0) {
          throw new Error(`El material ID ${inventario_id} no es un consumible válido.`);
        }
        const currentStock = rows[0];
        if (Number(currentStock.cantidad) < cant) {
          throw new Error(`Stock insuficiente. Disponibles: ${currentStock.cantidad}.`);
        }

        // Descontar stock
        await client.query(
          `UPDATE inventario 
       SET cantidad = cantidad - $2 
       WHERE id = $1`,
          [inventario_id, cant]
        );

        // Crear NUEVO registro con estado TERRENO (cantidad debe ser >=1)
        const insertResult = await client.query(
          `INSERT INTO inventario (
        material_id, cantidad, ot_id, usuario_asignado,
        estado, bodega_id, created_at
      )
      SELECT
        material_id, $2, $3, $4,
        'TERRENO',
        bodega_id, NOW()
      FROM inventario
      WHERE id = $1
      RETURNING id`,
          [inventario_id, cant, ot_id || null, tecnico]
        );
        const nuevoId = insertResult.rows[0].id;

        // Registrar movimiento
        await client.query(
          `INSERT INTO movimientos (
        tipo_movimiento, inventario_id, ot_nueva, estado_anterior,
        estado_nuevo, bodega_origen_id, usuario_id, tecnico_id,
        observacion, created_at
      ) VALUES (
        'ASIGNACION_TERRENO', $1, $2, 'STOCK', 'TERRENO', $3, $4, $5, $6, NOW()
      )`,
          [nuevoId, ot_id || null, currentStock.bodega_id, tecnico, tecnico,
            observacion || `Asignación de material a técnico ID: ${tecnico} - Cantidad: ${cant}`]
        );

        console.log(`✅ Material ${inventario_id}: se entregaron ${cant} unidades en estado TERRENO (nuevo ID: ${nuevoId})`);
      }
    }

    await client.query('COMMIT');
    console.log('🎉 Asignación a terreno completada exitosamente');

    return res.status(200).json({
      success: true,
      message: 'Equipos asignados a terreno correctamente.'
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error en transacción:', err);
    return res.status(500).json({
      error: err.message
    });
  } finally {
    client.release();
  }
});

router.get('/', async (req, res) => {
  const { bodega_id, estado, material_id } = req.query;
  const filtros = [];
  const valores = [];

  if (bodega_id) { valores.push(bodega_id); filtros.push(`i.bodega_id = $${valores.length}`); }
  if (estado) { valores.push(estado); filtros.push(`i.estado = $${valores.length}`); }
  if (material_id) { valores.push(material_id); filtros.push(`i.material_id = $${valores.length}`); }

  const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';

  try {
    const { rows } = await pool.query(
      `SELECT i.*,
              m.descripcion AS material_descripcion,
              b.nombre AS bodega_nombre,
              u.nombre AS usuario_asignado_nombre,
              ot.numero_ot
       FROM inventario i
       LEFT JOIN materiales m ON i.material_id = m.codigo_sap
       LEFT JOIN bodegas b ON i.bodega_id = b.id
       LEFT JOIN usuarios u ON i.usuario_asignado = u.id
       LEFT JOIN ot ON i.ot_id = ot.id
       ${where}
       ORDER BY i.id DESC`,
      valores
    );
    res.json(rows);
  } catch (err) {
    console.error('Error en GET /inventario:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventario - Ingreso simplificado (sin preguntar estado)
// POST /api/inventario - Ingreso simplificado
router.post('/', async (req, res) => {
  let {
    material_id,
    serial,
    cantidad,
    ubicacion,
    bodega_id,
    ot_id,
    usuario_asignado,
    documento_material,   // nuevo
    oth,                  // nuevo
    lote                  // nuevo
  } = req.body;

  if (!material_id || !bodega_id) {
    return res.status(400).json({
      error: 'material_id y bodega_id son requeridos'
    });
  }

  // 🔍 VALIDACIÓN DE SERIALIZABLE (sin cambios)
  const materialQuery = await pool.query(
    'SELECT serializable FROM materiales WHERE codigo_sap = $1',
    [material_id]
  );
  if (materialQuery.rows.length === 0) {
    return res.status(400).json({ error: 'El material no existe' });
  }
  const esSerializable = materialQuery.rows[0].serializable;

  let serialEnviado = serial?.trim() || null;
  if (!esSerializable && serialEnviado) {
    return res.status(400).json({
      error: `El material ${material_id} NO es serializable. No se permite ingresar un número de serie.`
    });
  }
  const serialFinal = esSerializable ? serialEnviado : null;

  ubicacion = ubicacion?.trim() || null;
  cantidad = Number(cantidad) > 0 ? Number(cantidad) : 1;
  const estadoFinal = ot_id ? 'INGRESADO' : 'STOCK';

  // Valores por defecto para los nuevos campos
  const docMaterial = documento_material?.trim() || null;
  const othVal = oth?.trim() || null;
  const loteVal = (lote && (lote === 'VALORADO' || lote === 'NO VALORADO')) ? lote : 'NO VALORADO';

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (serialFinal) {
      const checkSerial = await client.query(
        `SELECT id, serial, estado 
         FROM inventario 
         WHERE LOWER(serial) = LOWER($1) 
           AND estado NOT IN ('CONSUMO')
         LIMIT 1`,
        [serialFinal]
      );
      if (checkSerial.rows.length > 0) {
        return res.status(400).json({
          error: `El número de serie '${serialFinal}' ya existe en el inventario activo.`
        });
      }
    }

    // INSERT con los nuevos campos
    const { rows } = await client.query(
      `INSERT INTO inventario (
        material_id, serial, cantidad, ot_id, usuario_asignado,
        estado, ubicacion, bodega_id, created_at,
        documento_material, oth, lote
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),$9,$10,$11)
      RETURNING *`,
      [material_id, serialFinal, cantidad, ot_id || null, null, estadoFinal, ubicacion, bodega_id,
        docMaterial, othVal, loteVal]
    );

    const nuevoItem = rows[0];

    let observacionMov = `INGRESO A BODEGA - ${material_id} ${serialFinal ? `Serie: ${serialFinal}` : ''} - Cantidad: ${cantidad}`;
    if (ot_id) observacionMov += ` - Asociado a OT #${ot_id}`;
    else observacionMov += ` - Stock libre`;
    if (docMaterial) observacionMov += ` - Doc: ${docMaterial}`;
    if (othVal) observacionMov += ` - OTH: ${othVal}`;

    await client.query(
      `INSERT INTO movimientos (
        tipo_movimiento,
        inventario_id,
        ot_nueva,
        estado_anterior,
        estado_nuevo,
        bodega_destino_id,
        usuario_id,
        observacion,
        created_at
      ) VALUES (
        'INGRESO_BODEGA',
        $1,
        $2,
        'NO_EXISTE',
        $3,
        $4,
        $5,
        $6,
        NOW()
      )`,
      [nuevoItem.id, ot_id || null, estadoFinal, bodega_id, usuario_asignado || 1, observacionMov]
    );

    await client.query('COMMIT');
    console.log(`✅ Equipo ingresado: ${estadoFinal}, OT=${ot_id || 'sin OT'}`);
    res.status(201).json(nuevoItem);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error en POST /inventario:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/inventario/:id - Actualizar con registro de movimiento
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  let {
    serial, cantidad, estado, ubicacion, usuario_asignado,
    documento_material, oth, lote   // nuevos
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows: oldRows } = await client.query(
      `SELECT i.*, m.serializable
       FROM inventario i
       JOIN materiales m ON i.material_id = m.codigo_sap
       WHERE i.id = $1`,
      [id]
    );

    if (oldRows.length === 0) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }
    const oldItem = oldRows[0];

    // Validación de serializable (sin cambios)
    const nuevoSerial = serial?.trim() || null;
    if (!oldItem.serializable && nuevoSerial) {
      return res.status(400).json({
        error: `Este material NO es serializable. No se puede asignar un número de serie.`
      });
    }
    const serialFinal = oldItem.serializable ? nuevoSerial : null;

    // Nuevos campos con valores por defecto
    const docMaterial = documento_material?.trim() || null;
    const othVal = oth?.trim() || null;
    const loteVal = (lote && (lote === 'VALORADO' || lote === 'NO VALORADO')) ? lote : oldItem.lote || 'NO VALORADO';

    const { rows } = await client.query(
      `UPDATE inventario
       SET serial = COALESCE($1, serial),
           cantidad = COALESCE($2, cantidad),
           estado = COALESCE($3, estado),
           ubicacion = COALESCE($4, ubicacion),
           usuario_asignado = COALESCE($5, usuario_asignado),
           documento_material = COALESCE($6, documento_material),
           oth = COALESCE($7, oth),
           lote = COALESCE($8, lote),
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [serialFinal, cantidad, estado, ubicacion, usuario_asignado, docMaterial, othVal, loteVal, id]
    );

    const newItem = rows[0];

    // Registrar movimiento si hubo cambios importantes
    if (oldItem.estado !== newItem.estado || oldItem.cantidad !== newItem.cantidad) {
      await client.query(
        `INSERT INTO movimientos (
          tipo_movimiento,
          inventario_id,
          cantidad,
          estado_anterior,
          estado_nuevo,
          bodega_origen_id,
          usuario_id,
          observacion,
          created_at
        ) VALUES (
          'ACTUALIZACION',
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          NOW()
        )`,
        [
          id,
          newItem.cantidad,
          oldItem.estado,
          newItem.estado,
          newItem.bodega_id,
          1,  // usuario que actualiza (puedes pasarlo en el body)
          `Actualización: ${oldItem.estado} → ${newItem.estado}, Cantidad: ${oldItem.cantidad} → ${newItem.cantidad}`
        ]
      );
    }

    await client.query('COMMIT');
    res.json(newItem);

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.post('/devolver-bodega', async (req, res) => {
  const { inventario_id, conservar_ot, observacion, cantidad_devolver } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Obtener el elemento (equipo o material)
    const { rows } = await client.query(
      `SELECT id, estado, ot_id, bodega_id, material_id, serial, cantidad
             FROM inventario 
             WHERE id = $1 
             FOR UPDATE`,
      [inventario_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Elemento no encontrado' });
    }
    const item = rows[0];
    if (item.estado !== 'TERRENO') {
      return res.status(400).json({ error: 'Solo elementos en TERRENO pueden devolverse' });
    }

    let cantidadADevolver = (cantidad_devolver !== undefined) ? cantidad_devolver : item.cantidad;
    if (cantidadADevolver <= 0 || cantidadADevolver > item.cantidad) {
      return res.status(400).json({ error: 'Cantidad a devolver inválida' });
    }

    const esSerializable = item.serial !== null;

    if (esSerializable) {
      // Equipo serializado: debe devolverse entero (cantidad=1)
      if (cantidadADevolver !== 1) {
        return res.status(400).json({ error: 'Para equipos serializados la cantidad a devolver debe ser 1' });
      }
      const estadoFinal = conservar_ot ? 'INGRESADO' : 'STOCK';
      await client.query(
        `UPDATE inventario 
                 SET estado = $1,
                     usuario_asignado = NULL,
                     ot_id = $2
                 WHERE id = $3`,
        [estadoFinal, conservar_ot ? item.ot_id : null, inventario_id]
      );
      await client.query(
        `INSERT INTO movimientos (
                    tipo_movimiento, inventario_id, ot_anterior, estado_anterior,
                    estado_nuevo, bodega_destino_id, observacion, created_at
                ) VALUES (
                    'DEVOLUCION_BODEGA', $1, $2, 'TERRENO', $3, $4, $5, NOW()
                )`,
        [inventario_id, item.ot_id, estadoFinal, item.bodega_id, observacion || 'Devolución a bodega']
      );
    } else {
      // Material no serializado: reintegrar al stock original
      // Buscar registro de stock existente (mismo material, bodega, sin serial, misma OT si conservar_ot)
      let stockQuery = `
                SELECT id, cantidad
                FROM inventario 
                WHERE material_id = $1 
                  AND bodega_id = $2 
                  AND serial IS NULL
            `;
      const params = [item.material_id, item.bodega_id];
      if (conservar_ot) {
        stockQuery += ` AND ot_id = $3`;
        params.push(item.ot_id);
      } else {
        stockQuery += ` AND (ot_id IS NULL OR ot_id = 0)`;
      }
      const { rows: stockRows } = await client.query(stockQuery, params);
      let stockId;
      if (stockRows.length > 0) {
        stockId = stockRows[0].id;
        await client.query(
          `UPDATE inventario SET cantidad = cantidad + $1 WHERE id = $2`,
          [cantidadADevolver, stockId]
        );
      } else {
        const estadoStock = conservar_ot ? 'INGRESADO' : 'STOCK';
        const insertRes = await client.query(
          `INSERT INTO inventario (material_id, cantidad, ot_id, estado, bodega_id, created_at)
                     VALUES ($1, $2, $3, $4, $5, NOW())
                     RETURNING id`,
          [item.material_id, cantidadADevolver, conservar_ot ? item.ot_id : null, estadoStock, item.bodega_id]
        );
        stockId = insertRes.rows[0].id;
      }

      // Reducir o eliminar el registro en TERRENO
      if (cantidadADevolver === item.cantidad) {
        await client.query(`DELETE FROM inventario WHERE id = $1`, [inventario_id]);
      } else {
        await client.query(
          `UPDATE inventario SET cantidad = cantidad - $1 WHERE id = $2`,
          [cantidadADevolver, inventario_id]
        );
      }

      await client.query(
        `INSERT INTO movimientos (
                    tipo_movimiento, inventario_id, ot_anterior, estado_anterior,
                    estado_nuevo, bodega_destino_id, observacion, created_at
                ) VALUES (
                    'DEVOLUCION_MATERIAL', $1, $2, 'TERRENO', 'STOCK', $3, $4, NOW()
                )`,
        [inventario_id, item.ot_id, item.bodega_id, observacion || 'Devolución de material a bodega']
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Devolución procesada correctamente' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en devolución:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.post('/reasignar-ot', async (req, res) => {
  const { inventario_id, ot_destino, oth, usuario_id, observacion, cantidad } = req.body;

  if (!inventario_id || !ot_destino) {
    return res.status(400).json({ error: 'Faltan datos: inventario_id y ot_destino son requeridos' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT id, cantidad, serial, estado, ot_id, oth as oth_actual, material_id, bodega_id
       FROM inventario 
       WHERE id = $1 
       FOR UPDATE`,
      [inventario_id]
    );

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Equipo o material no encontrado' });
    }
    const original = rows[0];

    if (!original.ot_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El registro no tiene una OT asignada para reasignar' });
    }

    const { rows: otRows } = await client.query(`SELECT id FROM ot WHERE id = $1`, [ot_destino]);
    if (otRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'OT destino no encontrada' });
    }

    let cantidadReasignar = cantidad ? parseFloat(cantidad) : original.cantidad;
    if (isNaN(cantidadReasignar) || cantidadReasignar <= 0) {
      cantidadReasignar = original.cantidad;
    }

    const esSerializado = original.serial && original.serial.trim() !== '';
    const esFraccionamiento = !esSerializado && original.cantidad > 1 && cantidadReasignar < original.cantidad;

    const nuevoOth = (oth && oth.trim() !== '') ? oth.trim() : null;
    const othAnterior = original.oth_actual;

    if (esFraccionamiento) {
      // Reducir el original
      await client.query(
        `UPDATE inventario SET cantidad = cantidad - $1 WHERE id = $2`,
        [cantidadReasignar, inventario_id]
      );

      // Insertar nuevo registro (solo columnas que existen)
      await client.query(
        `INSERT INTO inventario (
          material_id, cantidad, serial, estado, bodega_id, ot_id, oth, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          original.material_id,
          cantidadReasignar,
          original.serial,
          original.estado,
          original.bodega_id,
          ot_destino,
          nuevoOth
        ]
      );

      const observacionCompleta = `Reasignación parcial de ${cantidadReasignar} unidades del material ${original.material_id} de OT ${original.ot_id} a OT ${ot_destino}. ${observacion || ''}`;
      await client.query(
        `INSERT INTO movimientos (
          tipo_movimiento, inventario_id, ot_anterior, ot_nueva,
          estado_anterior, estado_nuevo, usuario_id, observacion,
          oth_anterior, oth_nueva, created_at
        ) VALUES (
          'REASIGNACION_OT', $1, $2, $3, $4, $4, $5, $6, $7, $8, NOW()
        )`,
        [
          inventario_id,
          original.ot_id,
          ot_destino,
          original.estado,
          usuario_id || 1,
          observacionCompleta,
          othAnterior,
          nuevoOth
        ]
      );

      await client.query('COMMIT');
      res.json({
        success: true,
        message: `Se reasignaron ${cantidadReasignar} unidades del material a OT ${ot_destino}. Quedan ${original.cantidad - cantidadReasignar} en OT ${original.ot_id}.`,
        nueva_ot: ot_destino,
        cantidad_reasignada: cantidadReasignar,
        oth_anterior: othAnterior,
        oth_nuevo: nuevoOth
      });

    } else {
      // Reasignación total
      await client.query(
        `UPDATE inventario SET ot_id = $2, oth = $3 WHERE id = $1`,
        [inventario_id, ot_destino, nuevoOth]
      );

      const observacionCompleta = `Reasignación total de ${original.cantidad} unidades (o equipo ${original.serial || ''}) de OT ${original.ot_id} a OT ${ot_destino}. ${observacion || ''}`;
      await client.query(
        `INSERT INTO movimientos (
          tipo_movimiento, inventario_id, ot_anterior, ot_nueva,
          estado_anterior, estado_nuevo, usuario_id, observacion,
          oth_anterior, oth_nueva, created_at
        ) VALUES (
          'REASIGNACION_OT', $1, $2, $3, $4, $4, $5, $6, $7, $8, NOW()
        )`,
        [
          inventario_id,
          original.ot_id,
          ot_destino,
          original.estado,
          usuario_id || 1,
          observacionCompleta,
          othAnterior,
          nuevoOth
        ]
      );

      await client.query('COMMIT');
      res.json({
        success: true,
        message: `Registro reasignado completamente de OT ${original.ot_id} a OT ${ot_destino}`,
        nueva_ot: ot_destino,
        oth_anterior: othAnterior,
        oth_nuevo: nuevoOth
      });
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en reasignación:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});
// DELETE /api/inventario/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`DELETE FROM inventario WHERE id = $1 RETURNING id`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Item no encontrado' });
    res.json({ mensaje: 'Item eliminado', id: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint de prueba
router.post('/test', (req, res) => {
  console.log('✅ Endpoint /test funcionando');
  res.json({ success: true, message: 'Endpoint funciona' });
});
module.exports = router;

// POST /api/inventario/entregar-tecnico - Entregar equipo a técnico
router.post('/entregar-tecnico', async (req, res) => {
  const { inventario_id, tecnico_id, ot_id, observacion } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT id, estado, ot_id as ot_actual, bodega_id 
       FROM inventario 
       WHERE id = $1 
       FOR UPDATE`,
      [inventario_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    const equipo = rows[0];

    // ✅ Validar: Solo se puede entregar equipos que están en bodega (INGRESADO o STOCK)
    if (equipo.estado !== 'INGRESADO' && equipo.estado !== 'STOCK') {
      return res.status(400).json({
        error: `El equipo está en estado ${equipo.estado}. Solo equipos en bodega (INGRESADO/STOCK) pueden entregarse al técnico.`
      });
    }

    // Actualizar a TERRENO
    await client.query(
      `UPDATE inventario 
       SET estado = 'TERRENO',
           ot_id = COALESCE($2, ot_id),
           usuario_asignado = $3,
           updated_at = NOW()
       WHERE id = $1`,
      [inventario_id, ot_id || equipo.ot_actual, tecnico_id]
    );

    // Registrar movimiento
    await client.query(
      `INSERT INTO movimientos (
        tipo_movimiento,
        inventario_id,
        ot_anterior,
        ot_nueva,
        estado_anterior,
        estado_nuevo,
        bodega_origen_id,
        usuario_id,
        tecnico_id,
        observacion,
        created_at
      ) VALUES (
        'ENTREGA_TECNICO',
        $1,
        $2,
        $3,
        $4,
        'TERRENO',
        $5,
        $6,
        $7,
        $8,
        NOW()
      )`,
      [
        inventario_id,
        equipo.ot_actual,
        ot_id || equipo.ot_actual,
        equipo.estado,
        equipo.bodega_id,
        tecnico_id,
        tecnico_id,
        observacion || `Entrega a técnico ID: ${tecnico_id}`
      ]
    );

    await client.query('COMMIT');
    console.log(`✅ Equipo ${inventario_id} entregado a técnico - estado: TERRENO`);

    res.json({
      success: true,
      message: 'Equipo entregado al técnico',
      estado: 'TERRENO'
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/inventario/instalar - Equipo instalado/consumido
router.post('/instalar', async (req, res) => {
  const { inventario_id, observacion } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT id, estado, ot_id, bodega_id 
       FROM inventario 
       WHERE id = $1 
       FOR UPDATE`,
      [inventario_id]
    );

    const equipo = rows[0];

    if (equipo.estado !== 'TERRENO') {
      return res.status(400).json({
        error: `Solo equipos en TERRENO pueden marcarse como instalados/consumidos. Estado actual: ${equipo.estado}`
      });
    }

    // Actualizar a CONSUMO
    await client.query(
      `UPDATE inventario 
       SET estado = 'CONSUMO',
           fecha_instalacion = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [inventario_id]
    );

    await client.query(
      `INSERT INTO movimientos (
        tipo_movimiento,
        inventario_id,
        ot_anterior,
        estado_anterior,
        estado_nuevo,
        observacion,
        created_at
      ) VALUES (
        'INSTALACION_CONSUMO',
        $1,
        $2,
        'TERRENO',
        'CONSUMO',
        $3,
        NOW()
      )`,
      [inventario_id, equipo.ot_id, observacion || 'Equipo instalado/consumido en terreno']
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Equipo marcado como instalado/consumido',
      estado: 'CONSUMO'
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.post('/carga-masiva', async (req, res) => {
  console.log('📥 POST /carga-masiva recibido');
  console.log('Body:', JSON.stringify(req.body, null, 2));

  const { datos, config, bodega_id } = req.body;
  console.log('datos length:', datos?.length);
  console.log('config:', config);
  console.log('bodega_id:', bodega_id);

  if (!datos || !datos.length) {
    console.log('❌ No hay datos');
    return res.status(400).json({ error: 'No hay datos para procesar' });
  }
  if (!bodega_id) {
    console.log('❌ No hay bodega_id');
    return res.status(400).json({ error: 'Bodega destino no especificada' });
  }

  const client = await pool.connect();
  let procesados = 0;
  let errores = 0;
  const erroresDetalle = [];

  try {
    await client.query('BEGIN');
    console.log('🔁 Iniciando procesamiento de filas...');

    for (let i = 0; i < datos.length; i++) {
      const row = datos[i];
      console.log(`\n🔍 Procesando fila ${i + 2}:`, row);

      try {
        // 1. Obtener código de material
        const materialCodigo = row[config.columna_material];
        console.log(`   materialCodigo: ${materialCodigo}`);
        if (!materialCodigo) {
          errores++;
          erroresDetalle.push(`Fila ${i + 2}: Sin código de material`);
          console.log(`   ❌ Error: Sin código de material`);
          continue;
        }

        // 2. Validar material
        const materialQuery = await client.query(
          'SELECT codigo_sap, serializable FROM materiales WHERE codigo_sap = $1',
          [materialCodigo]
        );
        console.log(`   Material encontrado: ${materialQuery.rows.length > 0}`);
        if (materialQuery.rows.length === 0) {
          errores++;
          erroresDetalle.push(`Fila ${i + 2}: Material no encontrado: ${materialCodigo}`);
          console.log(`   ❌ Error: Material no encontrado`);
          continue;
        }
        const esSerializable = materialQuery.rows[0].serializable;
        console.log(`   serializable: ${esSerializable}`);

        // 3. Serial
        let serial = null;
        if (config.columna_serial && row[config.columna_serial]) {
          serial = row[config.columna_serial].trim();
          console.log(`   serial: ${serial}`);
          if (!esSerializable) {
            errores++;
            erroresDetalle.push(`Fila ${i + 2}: Material ${materialCodigo} no serializable pero se asignó serie: ${serial}`);
            console.log(`   ❌ Error: No serializable con serie`);
            continue;
          }
        }

        // 4. Cantidad
        let cantidad = parseInt(row[config.columna_cantidad]) || 1;
        if (cantidad <= 0) cantidad = 1;
        console.log(`   cantidad original: ${cantidad}`);

        // Forzar cantidad = 1 si hay serial
        if (serial) {
          if (cantidad !== 1) {
            erroresDetalle.push(`Fila ${i + 2}: Serial ${serial} tenía cantidad ${cantidad}. Se forzó a 1.`);
            console.log(`   ⚠️ Cantidad forzada de ${cantidad} a 1 por serial`);
          }
          cantidad = 1;
        }

        // 5. Documento material, OTH, Lote
        const documentoMaterial = config.columna_documento ? (row[config.columna_documento] || null) : null;
        const othVal = config.columna_oth ? (row[config.columna_oth] || null) : null;
        let loteVal = 'NO VALORADO';
        if (config.columna_lote) {
          if (config.columna_lote === 'VALORADO') loteVal = 'VALORADO';
          else if (config.columna_lote === 'NO VALORADO') loteVal = 'NO VALORADO';
          else if (row[config.columna_lote]) loteVal = row[config.columna_lote];
        }
        console.log(`   documentoMaterial: ${documentoMaterial}, oth: ${othVal}, lote: ${loteVal}`);

        // 6. OT
        let ot_id = null;
        if (config.columna_ot && row[config.columna_ot]) {
          let numeroOT = row[config.columna_ot].trim();
          console.log(`   numeroOT: ${numeroOT}`);
          const otExistente = await client.query('SELECT id FROM ot WHERE numero_ot = $1', [numeroOT]);
          if (otExistente.rows.length) {
            ot_id = otExistente.rows[0].id;
            console.log(`   OT existente, id: ${ot_id}`);
          } else {
            const cliente = config.columna_cliente ? (row[config.columna_cliente] || null) : null;
            const destino = config.columna_destino ? (row[config.columna_destino] || null) : null;
            const nuevaOT = await client.query(
              `INSERT INTO ot (numero_ot, cliente, destino, estado, created_at)
               VALUES ($1, $2, $3, 'ABIERTA', NOW()) RETURNING id`,
              [numeroOT, cliente, destino]
            );
            ot_id = nuevaOT.rows[0].id;
            console.log(`   OT creada, id: ${ot_id}`);
          }
        }

        const estadoFinal = ot_id ? 'INGRESADO' : 'STOCK';
        console.log(`   estadoFinal: ${estadoFinal}`);

        // 7. Insertar en inventario
        const insertResult = await client.query(
          `INSERT INTO inventario (
            material_id, serial, cantidad, ot_id, usuario_asignado,
            estado, ubicacion, bodega_id, created_at,
            documento_material, oth, lote
          ) VALUES ($1, $2, $3, $4, NULL, $5, NULL, $6, NOW(), $7, $8, $9)
          RETURNING id`,
          [materialCodigo, serial, cantidad, ot_id, estadoFinal, bodega_id,
            documentoMaterial, othVal, loteVal]
        );
        const nuevoId = insertResult.rows[0].id;
        console.log(`   ✅ Insertado inventario id: ${nuevoId}`);

        // 8. Registrar movimiento
        let observacionMov = `CARGA MASIVA - ${materialCodigo} ${serial ? `Serie: ${serial}` : ''} - Cantidad: ${cantidad} ${ot_id ? `OT: ${ot_id}` : ''}`;
        await client.query(
          `INSERT INTO movimientos (
            tipo_movimiento, inventario_id, ot_nueva, estado_anterior,
            estado_nuevo, bodega_destino_id, usuario_id, observacion, created_at
          ) VALUES (
            'INGRESO_BODEGA', $1, $2, 'NO_EXISTE', $3, $4, 1, $5, NOW()
          )`,
          [nuevoId, ot_id, estadoFinal, bodega_id, observacionMov]
        );
        console.log(`   ✅ Movimiento registrado`);

        procesados++;
        console.log(`   ✅ Fila procesada exitosamente (total procesados: ${procesados})`);

      } catch (err) {
        errores++;
        const errorMsg = `Fila ${i + 2}: ${err.message}`;
        erroresDetalle.push(errorMsg);
        console.error(`   ❌ Error en fila ${i + 2}:`, err.message);
      }
    }

    await client.query('COMMIT');
    console.log(`🎉 Transacción completada. Procesados: ${procesados}, Errores: ${errores}`);

    res.json({
      success: true,
      procesados,
      errores,
      detalles: erroresDetalle.slice(0, 20)
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error general en transacción:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});


// POST /api/inventario/instalar-equipo (para técnicos)
router.post('/instalar-equipo', verifyToken, async (req, res) => {
  const { inventario_id, observacion } = req.body;
  const tecnicoId = req.user.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT id, estado, usuario_asignado FROM inventario WHERE id = $1 FOR UPDATE`,
      [inventario_id]
    );
    if (rows.length === 0) throw new Error('Equipo no encontrado');
    const equipo = rows[0];
    if (equipo.usuario_asignado !== tecnicoId) throw new Error('No tienes permiso para modificar este equipo');
    if (equipo.estado !== 'TERRENO') throw new Error('Solo equipos en TERRENO pueden marcarse como instalados');

    await client.query(
      `UPDATE inventario SET estado = 'CONSUMO', fecha_instalacion = NOW() WHERE id = $1`,
      [inventario_id]
    );
    await client.query(
      `INSERT INTO movimientos (tipo_movimiento, inventario_id, estado_anterior, estado_nuevo, tecnico_id, observacion, created_at)
       VALUES ('INSTALACION_CONSUMO', $1, 'TERRENO', 'CONSUMO', $2, $3, NOW())`,
      [inventario_id, tecnicoId, observacion || 'Equipo instalado/consumido por técnico']
    );
    await client.query('COMMIT');
    res.json({ success: true, message: 'Equipo marcado como instalado/consumido' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

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
/* z */
// GET /api/inventario/mis-equipos - Obtener equipos asignados al técnico actual
router.get('/mis-equipos', verifyToken, async (req, res) => {
  const usuarioId = req.user.id;
  try {
    const { rows } = await pool.query(
      `SELECT i.*, 
                    m.descripcion AS material_descripcion,
                    ot.numero_ot AS numero_ot
             FROM inventario i
             LEFT JOIN materiales m ON i.material_id = m.codigo_sap
             LEFT JOIN ot ON i.ot_id = ot.id
             WHERE i.usuario_asignado = $1 
               AND i.estado = 'TERRENO'
             ORDER BY i.created_at DESC`,
      [usuarioId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error en /mis-equipos:', err);
    res.status(500).json({ error: err.message });
  }
});