const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const { getFormatoQa, getFormatosQaList } = require('../config/formatos-qa');
const { generarPdfActaQa } = require('../services/qaTemplateService');

// ─────────────────────────────────────────────
//  CONSTANTES GLOBALES
// ─────────────────────────────────────────────
const A4_W = 595.28;
const A4_H = 841.89;
const ML = 42;
const MR = 42;
const MT = 12;
const CW = A4_W - ML - MR;

const RED = '#C8001E';
const BLACK = '#000000';
const WHITE = '#FFFFFF';
const LGRAY = '#F2F2F2';
const MGRAY = '#CCCCCC';
const DGRAY = '#555555';
const HEADER_H = 78;


const FORMATOS_QA = {
  qa_adicion_telefonos_capacitacion: 'FOR Acta QA adición de teléfonos y capacitación.docx',
  qa_hotspots: 'FOR Acta QA HOTSPOTS.docx',
  qa_instalacion_wlan: 'FOR Acta QA Instalación WLAN.docx',
  qa_internet_dedicado_empresarial: 'FOR Acta QA Internet dedicado empresarial.docx',
  qa_internet_dedicado_front_end: 'FOR Acta QA Internet dedicado Front end.docx',
  qa_internet_seguro_corporativo: 'FOR Acta QA Internet Seguro Corporativo.docx',
  qa_ip_data: 'FOR Acta QA IP Data.docx',
  qa_mpls: 'FOR Acta QA MPLS.docx',
  qa_pls_ipl: 'FOR Acta QA PLS-IPL.docx',
  qa_protocolo_pruebas_backup: 'FOR Acta QA Protocolo pruebas backup.docx',
  qa_servicios_internet_telefonia_ultrawifi_mpls: 'FOR Acta QA Servicios internet telefonia ultrawifi y MPLS.docx',
  qa_site_survey_lan_administrada: 'FOR Acta QA site survey Lan administrada.docx',
  qa_site_survey_wlan: 'FOR Acta QA site survey WLAN.docx',
  qa_sw_lan_administrada: 'FOR Acta QA SW Lan administrada.docx',
  qa_telefonia_analoga_basica: 'FOR Acta QA Telefonía Análoga Básica.docx',
  qa_telefonia_digital_e1: 'FOR Acta QA Telefonía digital E1.docx',
  qa_telefonia_pbx_administrada: 'FOR Acta QA Telefonía PBX Administrada.docx',
  qa_telefonia_troncal_sip_gateway_centralizada: 'FOR Acta QA Telefonía Troncal SIP Gateway y Centralizada.docx',
  qa_videoconferencia: 'FOR Acta QA Videoconferencia.docx',
};

function normalizarFormatoQa(tipoFormato) {
  return Object.prototype.hasOwnProperty.call(FORMATOS_QA, tipoFormato)
    ? tipoFormato
    : 'qa_mpls';
}

// ─────────────────────────────────────────────
//  HELPERS PRIMITIVOS
// ─────────────────────────────────────────────
function rect(doc, x, y, w, h, fill, stroke, lw = 0.5) {
    doc.save();
    if (fill) doc.rect(x, y, w, h).fill(fill);
    if (stroke) doc.lineWidth(lw).rect(x, y, w, h).stroke(stroke);
    doc.restore();
}

function line(doc, x1, y1, x2, y2, color = MGRAY, lw = 0.5) {
    doc.save().lineWidth(lw).moveTo(x1, y1).lineTo(x2, y2).stroke(color).restore();
}

function txt(doc, text, x, y, w, opts = {}) {
    const { font = 'Helvetica', size = 8, color = BLACK, align = 'left', lineBreak = false } = opts;
    doc.save()
        .font(font).fontSize(size).fillColor(color)
        .text(String(text ?? ''), x, y, { width: w, align, lineBreak })
        .restore();
}

function txtB(doc, text, x, y, w, opts = {}) {
    txt(doc, text, x, y, w, { ...opts, font: 'Helvetica-Bold' });
}

function drawClaroLogo(doc, cx, cy, r = 20) {
    doc.save().circle(cx, cy, r).fill(RED);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(WHITE)
        .text('Claro', cx - r + 2, cy - 6, { width: r * 2 - 4, align: 'center' });
    doc.font('Helvetica').fontSize(6).fillColor(WHITE)
        .text('Colombia', cx - r + 2, cy + 4, { width: r * 2 - 4, align: 'center' });
    doc.restore();
}

// ─────────────────────────────────────────────
//  HEADER DE PÁGINA
// ─────────────────────────────────────────────
function drawPageHeader(doc, pageNum, totalPages, fecha) {
    const x0 = ML, y0 = MT;
    const colT = 310, colF = 120, colL = CW - colT - colF;

    rect(doc, x0, y0, CW, HEADER_H, WHITE, BLACK, 0.7);

    const row1H = 54;
    rect(doc, x0, y0, colT, row1H, WHITE, null);
    line(doc, x0 + colT, y0, x0 + colT, y0 + row1H, BLACK, 0.7);

    txtB(doc, 'FORMATO', x0 + 4, y0 + 6, colT - 8, { size: 9, align: 'center' });
    txtB(doc, 'ACTA QA MPLS', x0 + 4, y0 + 18, colT - 8, { size: 9, align: 'center' });
    line(doc, x0, y0 + 28, x0 + colT, y0 + 28, BLACK, 0.5);

    const descTxt = 'Pertenece al procedimiento: Implementar Servicios Segmento Empresas y Negocios Soluciones Fijas y Realizar Instalación y entrega de Servicio.';
    txt(doc, descTxt, x0 + 3, y0 + 31, colT - 6, { size: 6.5, lineBreak: true });

    rect(doc, x0 + colT, y0, colF, row1H, WHITE, null);
    line(doc, x0 + colT + colF, y0, x0 + colT + colF, y0 + row1H, BLACK, 0.7);
    txtB(doc, 'Fecha:', x0 + colT + 4, y0 + 16, colF - 8, { size: 8, align: 'center' });
    txt(doc, fecha, x0 + colT + 4, y0 + 28, colF - 8, { size: 8, align: 'center' });

    drawClaroLogo(doc, x0 + colT + colF + colL / 2, y0 + row1H / 2, 22);

    const row3Y = y0 + row1H;
    const row3H = HEADER_H - row1H;
    line(doc, x0, row3Y, x0 + CW, row3Y, BLACK, 0.7);

    const c1 = 220, c2 = 100;
    txt(doc, 'Clasificación: Uso Interno.', x0 + 4, row3Y + 5, c1, { size: 7.5 });
    line(doc, x0 + c1, row3Y, x0 + c1, row3Y + row3H, BLACK, 0.7);
    txt(doc, `Pág. ${pageNum} de ${totalPages}`, x0 + c1 + 4, row3Y + 5, c2, { size: 7.5 });
    line(doc, x0 + c1 + c2, row3Y, x0 + c1 + c2, row3Y + row3H, BLACK, 0.7);
    txt(doc, 'Código ', x0 + c1 + c2 + 4, row3Y + 5, 60, { size: 7.5 });
    txtB(doc, 'VAA2-F21', x0 + c1 + c2 + 4 + 30, row3Y + 5, 70, { size: 7.5 });
}

function startY() { return MT + HEADER_H + 14; }

function sectionTitle(doc, y, text) {
    txtB(doc, text, ML, y, CW, { size: 9, align: 'center' });
    return y + 16;
}

function subTitle(doc, y, text) {
    txtB(doc, text, ML, y, CW, { size: 8.5 });
    return y + 14;
}

// ─────────────────────────────────────────────
//  TABLA DE EQUIPOS
// ─────────────────────────────────────────────
function drawEquipTable(doc, y, equipos, cols) {
    const ROW_H = 16, HEAD_H = 20;
    const totalW = cols.reduce((s, c) => s + c.w, 0);

    rect(doc, ML, y, totalW, HEAD_H, RED, BLACK, 0.6);
    let cx = ML;
    cols.forEach((col, i) => {
        txtB(doc, col.label, cx + 3, y + 5, col.w - 6, { size: 7.5, color: WHITE, align: 'center' });
        if (i < cols.length - 1) line(doc, cx + col.w, y, cx + col.w, y + HEAD_H, WHITE, 0.5);
        cx += col.w;
    });
    y += HEAD_H;

    const rows = equipos && equipos.length ? equipos : [{}, {}, {}, {}];
    rows.forEach((eq, ri) => {
        const bg = ri % 2 === 0 ? WHITE : LGRAY;
        rect(doc, ML, y, totalW, ROW_H, bg, BLACK, 0.5);
        cx = ML;
        cols.forEach((col, i) => {
            const val = eq[col.key] ?? '';
            txtB(doc, val, cx + 3, y + 4, col.w - 6, { size: 7.5, color: BLACK });
            if (i < cols.length - 1) line(doc, cx + col.w, y, cx + col.w, y + ROW_H, MGRAY, 0.4);
            cx += col.w;
        });
        y += ROW_H;
    });
    return y + 6;
}

// ─────────────────────────────────────────────
//  BOTÓN SI/NO
// ─────────────────────────────────────────────
function drawSINO(doc, y, isYes) {
    const bW = 30, bH = 14, gap = 2;
    const totalW = bW * 4 + gap * 3;
    const cx = ML + CW / 2 - totalW / 2;

    rect(doc, cx, y, bW, bH, RED, BLACK, 0.6);
    txtB(doc, 'SI', cx, y + 3, bW, { size: 7.5, color: WHITE, align: 'center' });

    rect(doc, cx + bW + gap, y, bW, bH, isYes ? LGRAY : WHITE, BLACK, 0.6);
    txtB(doc, isYes ? 'X' : '', cx + bW + gap, y + 3, bW, { size: 7.5, align: 'center' });

    rect(doc, cx + bW * 2 + gap * 2, y, bW, bH, WHITE, BLACK, 0.6);
    txtB(doc, 'NO', cx + bW * 2 + gap * 2, y + 3, bW, { size: 7.5, align: 'center' });

    rect(doc, cx + bW * 3 + gap * 3, y, bW, bH, !isYes ? LGRAY : WHITE, BLACK, 0.6);
    txtB(doc, !isYes ? 'X' : '', cx + bW * 3 + gap * 3, y + 3, bW, { size: 7.5, align: 'center' });

    return y + bH + 8;
}

// ─────────────────────────────────────────────
//  PLACEHOLDER DE FOTO
// ─────────────────────────────────────────────
function drawPhotoPlaceholder(doc, y, label, imgBuffer) {
    const PH = 160, PW = 230;
    const cx = ML + CW / 2 - PW / 2;

    if (imgBuffer) {
        try {
            doc.image(imgBuffer, cx, y, { width: PW, height: PH, cover: [PW, PH] });
        } catch {
            drawPhotoBox(doc, cx, y, PW, PH, label);
        }
    } else {
        drawPhotoBox(doc, cx, y, PW, PH, label);
    }
    return y + PH + 8;
}

function drawPhotoBox(doc, x, y, w, h, label) {
    rect(doc, x, y, w, h, LGRAY, MGRAY, 0.5);
    txt(doc, label || '(400×300 pixeles)', x, y + h / 2 - 8, w,
        { size: 8, color: DGRAY, align: 'center' });
}

// ─────────────────────────────────────────────
//  POST /api/actas-qa  — solo columnas reales
// ─────────────────────────────────────────────
router.get('/formatos', verifyToken, async (req, res) => {
  res.json(getFormatosQaList());
});

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
    } = req.body;

    if (!fecha_ejecucion || !hora_inicio)
        return res.status(400).json({ error: 'Fecha y hora de inicio son requeridas' });

    const tipoFormatoFinal = normalizarFormatoQa(tipo_formato);
    const archivoFormatoFinal = FORMATOS_QA[tipoFormatoFinal];
    const formato = getFormatoQa(tipo_formato)

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
                created_at
            ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
                $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
                $21,$22,$23,$24,$25,NOW()
            ) RETURNING id`,
            [
                tecnicoId,
                tipoFormatoFinal,
                nombre_formato || tipoFormatoFinal,
                archivoFormatoFinal,

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
                firma_acta || false,
                caso_seguimiento || false,
                problemas_instalacion || false,
                JSON.stringify(mediciones_electricas || {}),
                lugar_instalacion || null,
                JSON.stringify(equipos_instalados || []),
                JSON.stringify(equipos_desinstalados || []),
                observaciones || null,
                JSON.stringify(pruebas_servicio || {}),
                JSON.stringify(fotos || []),
            ]
        );
        res.json({ success: true, id: result.rows[0].id, message: 'Acta guardada correctamente' });
    } catch (err) {
        console.error('Error al guardar acta:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────
//  GET /api/actas-qa/:id/pdf
// ─────────────────────────────────────────────
router.get('/:id/pdf', verifyToken, async (req, res) => {
  const { id } = req.params;
  const usuario = req.user;
  const tipoNormalizado = (usuario.tipo || usuario.tipo_usuario || '').trim().toUpperCase();

  try {
    let query = `
      SELECT 
        a.*,
        u.nombre as tecnico_nombre
      FROM actas_qa a
      JOIN usuarios u ON u.id = a.tecnico_id
      WHERE a.id = $1
    `;

    const params = [id];

    const esControlCalidad =
      tipoNormalizado === 'CONTROL_CALIDAD' ||
      tipoNormalizado === 'CONTROL_DE_CALIDAD';

    const esAdmin =
      tipoNormalizado === 'ADMIN' ||
      tipoNormalizado === 'BODEGUERO' ||
      tipoNormalizado === 'BODEGA';

    if (!esControlCalidad && !esAdmin) {
      query += ` AND a.tecnico_id = $2`;
      params.push(usuario.id);
    }

    const { rows } = await pool.query(query, params);

    if (!rows.length) {
      return res.status(404).json({ error: 'Acta no encontrada' });
    }

    const acta = rows[0];

    const { pdfBuffer, filename } = await generarPdfActaQa(acta);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generando PDF acta QA desde plantilla:', err);

    return res.status(500).json({
      error: 'No se pudo generar el PDF desde la plantilla QA',
      detail: err.message,
    });
  }
});

// GET /api/actas-qa - Listar actas del técnico autenticado
router.get('/', verifyToken, async (req, res) => {
  const tecnicoId = req.user.id;

  try {
    const { rows } = await pool.query(
      `SELECT 
        id,
        tipo_formato,
        nombre_formato,
        archivo_formato,
        fecha_ejecucion,
        created_at,
        lugar_instalacion,
        estado_qa
      FROM actas_qa
      WHERE tecnico_id = $1
      ORDER BY created_at DESC`,
      [tecnicoId]
    );

    res.json(rows);
  } catch (err) {
    console.error('Error al listar actas:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/actas-qa/para-calidad
router.get('/para-calidad', verifyToken, async (req, res) => {
    if (req.user.tipo !== 'CONTROL_CALIDAD') {
        return res.status(403).json({ error: 'No autorizado' });
    }
    try {
        const { rows } = await pool.query(
            `SELECT a.*, u.nombre as tecnico_nombre, u.id as tecnico_id
       FROM actas_qa a
       JOIN usuarios u ON a.tecnico_id = u.id
       ORDER BY a.created_at DESC`
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/actas-qa/:id/estado-qa
router.put('/:id/estado-qa', verifyToken, async (req, res) => {
    if (req.user.tipo !== 'CONTROL_CALIDAD') {
        return res.status(403).json({ error: 'No autorizado' });
    }
    const { id } = req.params;
    const { estado_qa, comentario_qa } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Si se aprueba, cambiar el estado de los equipos instalados
        if (estado_qa === 'APROBADO') {
            const { rows } = await client.query('SELECT equipos_instalados FROM actas_qa WHERE id = $1', [id]);
            if (rows.length) {
                const equiposInstalados = rows[0].equipos_instalados || [];
                for (const eq of equiposInstalados) {
                    if (eq.serial) {
                        await client.query(
                            `UPDATE inventario SET estado = 'CONSUMO', fecha_instalacion = NOW() WHERE serial = $1 AND estado = 'TERRENO'`,
                            [eq.serial]
                        );
                    }
                }
            }
        }
        await client.query(
            `UPDATE actas_qa SET estado_qa = $1, comentario_qa = $2 WHERE id = $3`,
            [estado_qa, comentario_qa, id]
        );
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});


// POST /api/actas-qa/:id/aprobar
router.post('/:id/aprobar', verifyToken, async (req, res) => {
    if (req.user.tipo !== 'CONTROL_CALIDAD') {
        return res.status(403).json({ error: 'No autorizado' });
    }
    const { id } = req.params;
    const { comentario } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Obtener los equipos instalados en el acta
        const { rows } = await client.query('SELECT equipos_instalados FROM actas_qa WHERE id = $1', [id]);
        if (!rows.length) return res.status(404).json({ error: 'Acta no encontrada' });
        const equiposInstalados = rows[0].equipos_instalados || [];
        // Para cada equipo, actualizar el inventario (asumiendo que se identifican por serial)
        for (const eq of equiposInstalados) {
            if (eq.serial) {
                await client.query(
                    `UPDATE inventario SET estado = 'CONSUMO', fecha_instalacion = NOW() WHERE serial = $1 AND estado = 'TERRENO'`,
                    [eq.serial]
                );
            }
        }
        // Actualizar el estado del acta
        await client.query(
            `UPDATE actas_qa SET estado_qa = 'APROBADO', comentario_qa = $1 WHERE id = $2`,
            [comentario || 'Aprobado por control de calidad', id]
        );
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;