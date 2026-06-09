const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// GET /api/salidas/:id/pdf - Generar comprobante PDF
router.get('/:id/pdf', verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        // Obtener datos
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

        // Crear PDF
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="comprobante_salida_${salida.consecutivo}.pdf"`);
        doc.pipe(res);

        // Cabecera del comprobante
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

        // Tabla de equipos
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
            doc.text(item.cantidad || 1, x, y, { width: anchos[0] });
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
        doc.fontSize(10).text('Firma de quien recibe: ___________________________', { align: 'center' });
        doc.end();

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
// Generar consecutivo SA-XXX
async function generarConsecutivo(client) {
    const result = await client.query(
        `SELECT consecutivo FROM salidas ORDER BY id DESC LIMIT 1`
    );
    let nextNumber = 1;
    if (result.rows.length > 0) {
        const last = result.rows[0].consecutivo;
        const lastNum = parseInt(last.split('-')[1]);
        nextNumber = lastNum + 1;
    }
    return `SA-${nextNumber.toString().padStart(3, '0')}`;
}

// POST /api/salidas - Crear nueva salida
router.post('/', verifyToken, async (req, res) => {
    const { fecha, destino, motivo, responsable_id, items, observaciones } = req.body;

    if (!items || !items.length) {
        return res.status(400).json({ error: 'Debe incluir al menos un equipo/material' });
    }
    if (!destino || !motivo) {
        return res.status(400).json({ error: 'Destino y motivo son obligatorios' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Verificar que todos los items existen y están en STOCK o INGRESADO
        for (const item of items) {
            const { rows } = await client.query(
                `SELECT estado, id FROM inventario WHERE id = $1 FOR UPDATE`,
                [item.inventario_id]
            );
            if (rows.length === 0) {
                throw new Error(`Item con ID ${item.inventario_id} no encontrado`);
            }
            const estado = rows[0].estado;
            if (estado !== 'STOCK' && estado !== 'INGRESADO') {
                throw new Error(`El item ID ${item.inventario_id} está en estado ${estado} y no puede salir de bodega`);
            }
        }

        // Generar consecutivo
        const consecutivo = await generarConsecutivo(client);

        // Insertar cabecera
        const cabeceraResult = await client.query(
            `INSERT INTO salidas 
             (consecutivo, fecha, destino, motivo, responsable_id, observaciones, created_by, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
             RETURNING id`,
            [consecutivo, fecha || new Date(), destino, motivo, responsable_id, observaciones, req.user.id]
        );
        const salidaId = cabeceraResult.rows[0].id;

        // Insertar detalles y actualizar inventario
        for (const item of items) {
            // Insertar detalle
            await client.query(
                `INSERT INTO salidas_detalle (salida_id, inventario_id, cantidad, observacion_item)
                 VALUES ($1, $2, $3, $4)`,
                [salidaId, item.inventario_id, item.cantidad || 1, item.observacion || null]
            );

            // Actualizar estado en inventario
            await client.query(
                `UPDATE inventario SET estado = 'SALIDA', updated_at = NOW() WHERE id = $1`,
                [item.inventario_id]
            );

            // Registrar movimiento
            await client.query(
                `INSERT INTO movimientos 
                 (tipo_movimiento, inventario_id, estado_anterior, estado_nuevo, observacion, usuario_id, created_at)
                 VALUES ('SALIDA_BODEGA', $1, $2, 'SALIDA', $3, $4, NOW())`,
                [item.inventario_id, 'STOCK/INGRESADO', `Salida ${consecutivo} - ${destino} - ${motivo}`, req.user.id]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({
            success: true,
            consecutivo,
            salidaId,
            message: `Salida ${consecutivo} registrada correctamente`
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creando salida:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// GET /api/salidas - Listar salidas (con filtros y paginación)
router.get('/', verifyToken, async (req, res) => {
    const { page = 1, limit = 20, destino, desde, hasta } = req.query;
    const offset = (page - 1) * limit;

    let query = `
        SELECT s.*, 
               u.nombre AS responsable_nombre,
               COUNT(sd.id) AS total_items
        FROM salidas s
        LEFT JOIN usuarios u ON s.responsable_id = u.id
        LEFT JOIN salidas_detalle sd ON s.id = sd.salida_id
        WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (destino) {
        query += ` AND s.destino ILIKE $${paramIndex++}`;
        params.push(`%${destino}%`);
    }
    if (desde) {
        query += ` AND s.fecha >= $${paramIndex++}`;
        params.push(desde);
    }
    if (hasta) {
        query += ` AND s.fecha <= $${paramIndex++}`;
        params.push(hasta);
    }

    query += ` GROUP BY s.id, u.nombre ORDER BY s.fecha DESC, s.id DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    try {
        const { rows } = await pool.query(query, params);
        // Obtener total de registros
        const countQuery = `
            SELECT COUNT(DISTINCT s.id) as total
            FROM salidas s
            WHERE 1=1
            ${destino ? ` AND s.destino ILIKE '%${destino}%'` : ''}
            ${desde ? ` AND s.fecha >= '${desde}'` : ''}
            ${hasta ? ` AND s.fecha <= '${hasta}'` : ''}
        `;
        const totalResult = await pool.query(countQuery);
        const total = parseInt(totalResult.rows[0].total);

        res.json({
            data: rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/salidas/:id - Obtener una salida con sus detalles (para comprobante)
router.get('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        // Cabecera
        const cabecera = await pool.query(
            `SELECT s.*, u.nombre AS responsable_nombre, 
                    u2.nombre AS creado_por_nombre
             FROM salidas s
             LEFT JOIN usuarios u ON s.responsable_id = u.id
             LEFT JOIN usuarios u2 ON s.created_by = u2.id
             WHERE s.id = $1`,
            [id]
        );
        if (cabecera.rows.length === 0) {
            return res.status(404).json({ error: 'Salida no encontrada' });
        }

        // Detalles con información del inventario
        const detalles = await pool.query(
            `SELECT sd.*, 
                    i.material_id, i.serial, i.cantidad as inventario_cantidad,
                    m.descripcion AS material_descripcion
             FROM salidas_detalle sd
             JOIN inventario i ON sd.inventario_id = i.id
             LEFT JOIN materiales m ON i.material_id = m.codigo_sap
             WHERE sd.salida_id = $1`,
            [id]
        );

        res.json({
            cabecera: cabecera.rows[0],
            detalles: detalles.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/salidas/:id/anular - Anular salida (devolver equipos a stock)
router.post('/:id/anular', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { observacion } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Verificar que la salida existe
        const { rows: salidaRows } = await client.query(
            `SELECT consecutivo FROM salidas WHERE id = $1`,
            [id]
        );
        if (salidaRows.length === 0) {
            return res.status(404).json({ error: 'Salida no encontrada' });
        }
        const consecutivo = salidaRows[0].consecutivo;

        // Obtener los detalles
        const { rows: detalles } = await client.query(
            `SELECT inventario_id, cantidad FROM salidas_detalle WHERE salida_id = $1`,
            [id]
        );

        // Devolver cada equipo a su estado anterior (STOCK o INGRESADO según tenga OT)
        for (const detalle of detalles) {
            // Obtener el equipo y verificar que sigue en SALIDA
            const { rows: invRows } = await client.query(
                `SELECT id, estado, ot_id FROM inventario WHERE id = $1 FOR UPDATE`,
                [detalle.inventario_id]
            );
            if (invRows.length === 0) continue;
            const item = invRows[0];
            if (item.estado !== 'SALIDA') {
                throw new Error(`El equipo ${item.id} ya no está en estado SALIDA`);
            }

            const estadoRestaurado = item.ot_id ? 'INGRESADO' : 'STOCK';
            await client.query(
                `UPDATE inventario SET estado = $1, updated_at = NOW() WHERE id = $2`,
                [estadoRestaurado, detalle.inventario_id]
            );

            // Registrar movimiento de anulación
            await client.query(
                `INSERT INTO movimientos 
                 (tipo_movimiento, inventario_id, estado_anterior, estado_nuevo, observacion, usuario_id, created_at)
                 VALUES ('ANULACION_SALIDA', $1, 'SALIDA', $2, $3, $4, NOW())`,
                [detalle.inventario_id, estadoRestaurado, `Anulación de salida ${consecutivo}. ${observacion || ''}`, req.user.id]
            );
        }

        // Marcar la salida como anulada (opcional: añadir columna estado en salidas)
        await client.query(
            `UPDATE salidas SET observaciones = CONCAT(COALESCE(observaciones, ''), ' [ANULADA: ', NOW(), ' - ', $1, ']') WHERE id = $2`,
            [observacion || 'Sin motivo', id]
        );

        await client.query('COMMIT');
        res.json({ success: true, message: `Salida ${consecutivo} anulada correctamente` });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;