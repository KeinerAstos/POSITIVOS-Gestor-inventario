const express = require('express');
const router = express.Router();

const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const { getFormatoQa, getFormatosQaList } = require('../config/formatos-qa');
const { generarDocxActaQa } = require('../services/qaTemplateService');

function normalizarTipoUsuario(usuario = {}) {
  return String(usuario.tipo || usuario.tipo_usuario || '').trim().toUpperCase();
}

function esUsuarioCalidadOAdmin(usuario = {}) {
  const tipo = normalizarTipoUsuario(usuario);

  return (
    tipo === 'CONTROL_CALIDAD' ||
    tipo === 'CONTROL_DE_CALIDAD' ||
    tipo === 'ADMIN' ||
    tipo === 'BODEGUERO' ||
    tipo === 'BODEGA'
  );
}

function jsonString(value, fallback) {
  try {
    return JSON.stringify(value ?? fallback);
  } catch {
    return JSON.stringify(fallback);
  }
}

function normalizarFormato(tipoFormato) {
  const formato = getFormatoQa(tipoFormato || 'qa_mpls');
  return formato || getFormatoQa('qa_mpls');
}

/**
 * GET /api/actas-qa/formatos
 * Lista los formatos QA disponibles para el frontend.
 */
router.get('/formatos', verifyToken, async (req, res) => {
  try {
    return res.json(getFormatosQaList());
  } catch (err) {
    console.error('Error al listar formatos QA:', err);
    return res.status(500).json({
      error: 'Error al listar formatos QA',
      detail: err.message,
    });
  }
});

/**
 * GET /api/actas-qa/para-calidad
 * Lista actas para Control de Calidad.
 * IMPORTANTE: esta ruta debe ir antes de /:id/pdf
 */
router.get('/para-calidad', verifyToken, async (req, res) => {
  const tipo = normalizarTipoUsuario(req.user);

  if (tipo !== 'CONTROL_CALIDAD' && tipo !== 'CONTROL_DE_CALIDAD' && tipo !== 'ADMIN') {
    return res.status(403).json({ error: 'No autorizado' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT 
        a.id,
        a.tipo_formato,
        a.nombre_formato,
        a.archivo_formato,
        a.fecha_ejecucion,
        a.created_at,
        a.lugar_instalacion,
        COALESCE(a.estado_qa, 'PENDIENTE') AS estado_qa,
        a.comentario_qa,
        u.nombre AS tecnico_nombre
      FROM actas_qa a
      JOIN usuarios u ON u.id = a.tecnico_id
      ORDER BY a.created_at DESC`
    );

    return res.json(rows);
  } catch (err) {
    console.error('Error en GET /api/actas-qa/para-calidad:', err);
    return res.status(500).json({
      error: 'Error al listar actas para calidad',
      detail: err.message,
    });
  }
});

/**
 * POST /api/actas-qa
 * Guarda una nueva acta QA.
 */
router.post('/', verifyToken, async (req, res) => {
  const tecnicoId = req.user.id;

  const {
    tipo_formato,
    nombre_formato,
    archivo_formato,

    fecha_ejecucion,
    hora_inicio,
    hora_salida,

    tiempo_transporte,
    tiempo_antesala,
    tiempo_ejecucion,
    tiempo_espera_claro,

    ingeniero_outsourcing,
    multimetro,
    analizador_ber,
    soporte_claro,

    firma_acta,
    caso_seguimiento,
    problemas_instalacion,

    mediciones_electricas,
    lugar_instalacion,

    equipos_instalados,
    equipos_desinstalados,

    observaciones,
    pruebas_servicio,
    fotos,
    campos_extra,
  } = req.body;

  if (!fecha_ejecucion || !hora_inicio) {
    return res.status(400).json({
      error: 'Fecha de ejecución y hora de inicio son requeridas',
    });
  }

  const formato = normalizarFormato(tipo_formato);

  try {
    const result = await pool.query(
      `INSERT INTO actas_qa (
        tecnico_id,
        tipo_formato,
        nombre_formato,
        archivo_formato,

        fecha_ejecucion,
        hora_inicio,
        hora_salida,

        tiempo_transporte,
        tiempo_antesala,
        tiempo_ejecucion,
        tiempo_espera_claro,

        ingeniero_outsourcing,
        multimetro,
        analizador_ber,
        soporte_claro,

        firma_acta,
        caso_seguimiento,
        problemas_instalacion,

        mediciones_electricas,
        lugar_instalacion,

        equipos_instalados,
        equipos_desinstalados,

        observaciones,
        pruebas_servicio,
        fotos,
        campos_extra,

        estado_qa,
        created_at
      ) VALUES (
        $1,$2,$3,$4,
        $5,$6,$7,
        $8,$9,$10,$11,
        $12,$13,$14,$15,
        $16,$17,$18,
        $19,$20,
        $21,$22,
        $23,$24,$25,$26,
        $27,NOW()
      )
      RETURNING id`,
      [
        tecnicoId,
        formato.id,
        nombre_formato || formato.nombre,
        archivo_formato || formato.archivo,

        fecha_ejecucion,
        hora_inicio,
        hora_salida || null,

        tiempo_transporte || null,
        tiempo_antesala || null,
        tiempo_ejecucion || null,
        tiempo_espera_claro || null,

        ingeniero_outsourcing || null,
        multimetro || null,
        analizador_ber || null,
        soporte_claro || null,

        Boolean(firma_acta),
        Boolean(caso_seguimiento),
        Boolean(problemas_instalacion),

        jsonString(mediciones_electricas, {}),
        lugar_instalacion || null,

        jsonString(equipos_instalados, []),
        jsonString(equipos_desinstalados, []),

        observaciones || null,
        jsonString(pruebas_servicio, {}),
        jsonString(fotos, []),
        jsonString(campos_extra, {}),

        'PENDIENTE',
      ]
    );

    return res.json({
      success: true,
      id: result.rows[0].id,
      message: 'Acta guardada correctamente',
    });
  } catch (err) {
    console.error('Error al guardar acta QA:', err);
    return res.status(500).json({
      error: 'Error al guardar acta QA',
      detail: err.message,
    });
  }
});

/**
 * GET /api/actas-qa
 * Lista las actas del técnico autenticado.
 */
router.get('/', verifyToken, async (req, res) => {
  const tecnicoId = req.user.id;

  try {
    const { rows } = await pool.query(
      `SELECT
        id,
        COALESCE(tipo_formato, 'qa_mpls') AS tipo_formato,
        COALESCE(nombre_formato, 'Acta QA MPLS') AS nombre_formato,
        COALESCE(archivo_formato, 'FOR Acta QA MPLS.docx') AS archivo_formato,
        fecha_ejecucion,
        created_at,
        lugar_instalacion,
        COALESCE(estado_qa, 'PENDIENTE') AS estado_qa,
        comentario_qa
      FROM actas_qa
      WHERE tecnico_id = $1
      ORDER BY created_at DESC`,
      [tecnicoId]
    );

    return res.json(rows);
  } catch (err) {
    console.error('Error al listar actas QA:', err);
    return res.status(500).json({
      error: 'Error al listar actas QA',
      detail: err.message,
    });
  }
});

/**
 * GET /api/actas-qa/:id/pdf
 * Genera y descarga el PDF.
 */
router.get('/:id/docx', verifyToken, async (req, res) => {
  const { id } = req.params;
  const usuario = req.user;

  try {
    let query = `
      SELECT 
        a.*,
        u.nombre AS tecnico_nombre
      FROM actas_qa a
      JOIN usuarios u ON u.id = a.tecnico_id
      WHERE a.id = $1
    `;

    const params = [id];

    if (!esUsuarioCalidadOAdmin(usuario)) {
      query += ` AND a.tecnico_id = $2`;
      params.push(usuario.id);
    }

    const { rows } = await pool.query(query, params);

    if (!rows.length) {
      return res.status(404).json({
        error: 'Acta no encontrada',
      });
    }

    const { docxBuffer, filename } = await generarDocxActaQa(rows[0]);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', docxBuffer.length);

    return res.send(docxBuffer);
  } catch (err) {
    console.error('Error generando DOCX acta QA:', err);

    return res.status(500).json({
      error: 'No se pudo generar el DOCX del acta QA',
      detail: err.message,
    });
  }
});

/**
 * PUT /api/actas-qa/:id/estado-qa
 * Aprueba o rechaza un acta desde Control de Calidad.
 */
router.put('/:id/estado-qa', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { estado_qa, comentario_qa } = req.body;

  const tipo = normalizarTipoUsuario(req.user);

  if (tipo !== 'CONTROL_CALIDAD' && tipo !== 'CONTROL_DE_CALIDAD' && tipo !== 'ADMIN') {
    return res.status(403).json({
      error: 'No autorizado',
    });
  }

  const estadoFinal = String(estado_qa || '').trim().toUpperCase();

  if (!['PENDIENTE', 'APROBADO', 'RECHAZADO'].includes(estadoFinal)) {
    return res.status(400).json({
      error: 'Estado QA inválido',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT *
       FROM actas_qa
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: 'Acta no encontrada',
      });
    }

    const acta = rows[0];

    await client.query(
      `UPDATE actas_qa
       SET estado_qa = $1,
           comentario_qa = $2,
           revisado_por = $3,
           revisado_at = NOW()
       WHERE id = $4`,
      [
        estadoFinal,
        comentario_qa || null,
        req.user.id,
        id,
      ]
    );

    if (estadoFinal === 'APROBADO') {
      let equiposInstalados = [];

      try {
        if (typeof acta.equipos_instalados === 'string') {
          equiposInstalados = JSON.parse(acta.equipos_instalados || '[]');
        } else if (Array.isArray(acta.equipos_instalados)) {
          equiposInstalados = acta.equipos_instalados;
        }
      } catch {
        equiposInstalados = [];
      }

      const seriales = equiposInstalados
        .map(eq => eq.serial)
        .filter(Boolean);

      if (seriales.length > 0) {
        await client.query(
          `UPDATE inventario
           SET estado = 'CONSUMO'
           WHERE serial = ANY($1::text[])`,
          [seriales]
        );
      }
    }

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: `Acta QA ${estadoFinal.toLowerCase()} correctamente`,
    });
  } catch (err) {
    await client.query('ROLLBACK');

    console.error('Error actualizando estado QA:', err);

    return res.status(500).json({
      error: 'Error actualizando estado QA',
      detail: err.message,
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/actas-qa/:id/aprobar
 * Alias rápido para aprobar un acta.
 */
router.post('/:id/aprobar', verifyToken, async (req, res) => {
  req.body.estado_qa = 'APROBADO';

  const { id } = req.params;
  const { comentario_qa } = req.body;

  const tipo = normalizarTipoUsuario(req.user);

  if (tipo !== 'CONTROL_CALIDAD' && tipo !== 'CONTROL_DE_CALIDAD' && tipo !== 'ADMIN') {
    return res.status(403).json({
      error: 'No autorizado',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT *
       FROM actas_qa
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: 'Acta no encontrada',
      });
    }

    const acta = rows[0];

    await client.query(
      `UPDATE actas_qa
       SET estado_qa = 'APROBADO',
           comentario_qa = $1,
           revisado_por = $2,
           revisado_at = NOW()
       WHERE id = $3`,
      [
        comentario_qa || null,
        req.user.id,
        id,
      ]
    );

    let equiposInstalados = [];

    try {
      if (typeof acta.equipos_instalados === 'string') {
        equiposInstalados = JSON.parse(acta.equipos_instalados || '[]');
      } else if (Array.isArray(acta.equipos_instalados)) {
        equiposInstalados = acta.equipos_instalados;
      }
    } catch {
      equiposInstalados = [];
    }

    const seriales = equiposInstalados
      .map(eq => eq.serial)
      .filter(Boolean);

    if (seriales.length > 0) {
      await client.query(
        `UPDATE inventario
         SET estado = 'CONSUMO'
         WHERE serial = ANY($1::text[])`,
        [seriales]
      );
    }

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: 'Acta QA aprobada correctamente',
    });
  } catch (err) {
    await client.query('ROLLBACK');

    console.error('Error aprobando acta QA:', err);

    return res.status(500).json({
      error: 'Error aprobando acta QA',
      detail: err.message,
    });
  } finally {
    client.release();
  }
});

module.exports = router;