const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const PDFDocument = require('pdfkit');

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
router.post('/', verifyToken, async (req, res) => {
    const tecnicoId = req.user.id;
    const {
        fecha_ejecucion, hora_inicio, hora_salida,
        tiempo_transporte, tiempo_antesala, tiempo_ejecucion, tiempo_espera_claro,
        ingeniero_outsourcing, multimetro, analizador_ber, soporte_claro,
        firma_acta, caso_seguimiento, problemas_instalacion,
        mediciones_electricas, lugar_instalacion,
        equipos_instalados, equipos_desinstalados,
        observaciones, pruebas_servicio, fotos,
    } = req.body;

    if (!fecha_ejecucion || !hora_inicio)
        return res.status(400).json({ error: 'Fecha y hora de inicio son requeridas' });

    try {
        const result = await pool.query(
            `INSERT INTO actas_qa (
        tecnico_id, fecha_ejecucion, hora_inicio, hora_salida,
        tiempo_transporte, tiempo_antesala, tiempo_ejecucion, tiempo_espera_claro,
        ingeniero_outsourcing, multimetro, analizador_ber, soporte_claro,
        firma_acta, caso_seguimiento, problemas_instalacion,
        mediciones_electricas, lugar_instalacion,
        equipos_instalados, equipos_desinstalados,
        observaciones, pruebas_servicio, fotos,
        created_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
        $13,$14,$15,$16,$17,$18,$19,$20,$21,$22,
        NOW()
      ) RETURNING id`,
            [
                tecnicoId, fecha_ejecucion, hora_inicio, hora_salida || null,
                tiempo_transporte || null, tiempo_antesala || null,
                tiempo_ejecucion || null, tiempo_espera_claro || null,
                ingeniero_outsourcing || null, multimetro || null,
                analizador_ber || null, soporte_claro || null,
                firma_acta || false, caso_seguimiento || false,
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
            SELECT a.*, u.nombre as tecnico_nombre 
            FROM actas_qa a 
            JOIN usuarios u ON u.id = a.tecnico_id 
            WHERE a.id = $1
        `;
        const params = [id];

        const esControlCalidad = tipoNormalizado === 'CONTROL_CALIDAD' || tipoNormalizado === 'CONTROL_DE_CALIDAD';
        const esAdmin = tipoNormalizado === 'ADMIN' || tipoNormalizado === 'BODEGUERO' || tipoNormalizado === 'BODEGA';

        // Si NO es Control de Calidad ni Administrador, restringir a sus propias actas
        if (!esControlCalidad && !esAdmin) {
            query += ` AND a.tecnico_id = $2`;
            params.push(usuario.id);
        }

        const { rows } = await pool.query(query, params);
        if (!rows.length) return res.status(404).json({ error: 'Acta no encontrada' });

        const acta = rows[0];
        const med = acta.mediciones_electricas || {};
        const eqInst = acta.equipos_instalados || [];
        const eqDesinst = acta.equipos_desinstalados || [];
        const pruebas = acta.pruebas_servicio || {};
        const conex_si = true;

        const fechaStr = acta.fecha_ejecucion
            ? new Date(acta.fecha_ejecucion).toLocaleDateString('es-CO',
                { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')
            : '—';

        const TOTAL_PAGES = 13;

        const doc = new PDFDocument({ margin: 0, size: 'A4', autoFirstPage: false });
        const chunks = [];
        doc.on('data', c => chunks.push(c));

        const eqCols = [
            { label: 'TIPO DE\nEQUIPO', key: 'tipo', w: 95 },
            { label: 'MARCA', key: 'marca', w: 85 },
            { label: 'MODELO', key: 'modelo', w: 75 },
            { label: 'SERIAL', key: 'serial', w: 110 },
            { label: 'NUMERO DE\nPLACA', key: 'placa', w: CW - 95 - 85 - 75 - 110 },
        ];

        // ══════════════════════════════════════════
        //  PÁGINA 1 – DOCUMENTACION ACTIVIDAD
        // ══════════════════════════════════════════
        doc.addPage();
        drawPageHeader(doc, 1, TOTAL_PAGES, fechaStr);
        let y = startY();

        y = sectionTitle(doc, y, 'DOCUMENTACION ACTIVIDAD');

        const rows1 = [
            ['Fecha Ejecución:', acta.fecha_ejecucion
                ? new Date(acta.fecha_ejecucion).toLocaleDateString('es-CO') : '—'],
            ['Hora Inicio:', acta.hora_inicio || '—'],
            ['Tiempo Transporte:', acta.tiempo_transporte ? `${acta.tiempo_transporte} MIN` : '—'],
            ['Tiempo Antesala:', acta.tiempo_antesala ? `${acta.tiempo_antesala} MIN` : '—'],
            ['Tiempo Ejecución:', acta.tiempo_ejecucion ? `${acta.tiempo_ejecucion} MIN` : '—'],
            ['Espera Claro:', acta.tiempo_espera_claro ? `${acta.tiempo_espera_claro} MIN` : '—'],
            ['Hora Salida:', acta.hora_salida || '—'],
        ];
        rows1.forEach(([lbl, val]) => {
            txtB(doc, lbl, ML, y, 145, { size: 8.5 });
            txtB(doc, val, ML + 148, y, CW - 148, { size: 8.5 });
            y += 14;
        });
        y += 6;

        const rows2 = [
            ['Ing. Outsourcing:', acta.ingeniero_outsourcing || '—'],
            ['Multímetro:', acta.multimetro || '—'],
            ['Analizador de BER:', acta.analizador_ber || '—'],
            ['Soporte Claro:', acta.soporte_claro || '—'],
            ['Firma el Acta:', acta.firma_acta ? 'SI' : 'NO'],
        ];
        rows2.forEach(([lbl, val]) => {
            txtB(doc, lbl, ML, y, 145, { size: 8.5 });
            txtB(doc, val, ML + 148, y, CW - 148, { size: 8.5 });
            y += 14;
        });
        y += 6;

        txtB(doc, 'Caso Seguimiento:', ML, y, 145, { size: 8.5 });
        txtB(doc, acta.caso_seguimiento ? 'SI' : 'NO', ML + 148, y, 100, { size: 8.5 });
        y += 14;
        txtB(doc, 'Problemas en Instalación:', ML, y, 145, { size: 8.5 });
        txtB(doc, acta.problemas_instalacion ? 'SI' : 'NO', ML + 148, y, 100, { size: 8.5 });
        y += 18;

        // Mediciones eléctricas
        txtB(doc, 'Mediciones Eléctricas', ML, y, 150, { size: 8.5 });
        txtB(doc, med.aplica === false ? 'NO' : 'SI', ML + 155, y, 40, { size: 8.5 });
        y += 14;
        txtB(doc, '   Fase-Neutro:', ML, y, 145, { size: 8.5 });
        txtB(doc, med.fase_neutro ?? '—', ML + 148, y, 60, { size: 8.5 });
        y += 13;
        txtB(doc, '   Fase-Tierra:', ML, y, 145, { size: 8.5 });
        txtB(doc, med.fase_tierra ?? '—', ML + 148, y, 60, { size: 8.5 });
        y += 13;
        txtB(doc, '   Neutro-Tierra:', ML, y, 145, { size: 8.5 });
        txtB(doc, med.neutro_tierra ?? '—', ML + 148, y, 60, { size: 8.5 });
        y += 18;

        txtB(doc, `Lugar de Instalación de Equipos: ${acta.lugar_instalacion || '—'}`,
            ML, y, CW, { size: 8.5 });
        y += 20;

        const obsText = acta.observaciones || '—';
        txtB(doc, 'Observaciones: ', ML, y, 90, { size: 8.5 });
        txt(doc, obsText, ML + 92, y, CW - 92, { size: 8.5, lineBreak: true });
        const obsLines = Math.ceil(obsText.length / 85);
        y += Math.max(14, obsLines * 11) + 10;

        txtB(doc, 'EQUIPOS INSTALADOS', ML, y, CW, { size: 8.5 });
        y += 10;
        y = drawEquipTable(doc, y, eqInst, eqCols);

        txtB(doc, 'EQUIPOS DESINSTALADOS O TRASLADADOS', ML, y, CW, { size: 8.5 });
        y += 10;
        y = drawEquipTable(doc, y, eqDesinst, eqCols);

        // ══════════════════════════════════════════
        //  PÁGINAS 2-5 – REGISTRO FOTOGRAFICO
        // ══════════════════════════════════════════
        const fotoSections = [
            { num: '1.1', label: 'Foto antes de la instalación (400x300 pixeles).' },
            { num: '1.2', label: 'Foto después de la Instalación, debe incluir UM (Claro o Tercero) (400x300 pixeles).' },
            { num: '1.3', label: 'Foto marquillas completas (Cables y Equipos) (400x300 pixeles).' },
            { num: '1.4', label: 'Foto tomas eléctricas (400x300 pixeles).' },
            { num: '1.5', label: 'Foto Voltaje [Relación Neutro-Tierra] (400x300 pixeles).' },
        ];

        doc.addPage();
        drawPageHeader(doc, 2, TOTAL_PAGES, fechaStr);
        y = startY();
        y = sectionTitle(doc, y, '1.   REGISTRO FOTOGRAFICO');
        y = subTitle(doc, y, `${fotoSections[0].num}.  ${fotoSections[0].label}`);
        y = drawPhotoPlaceholder(doc, y, fotoSections[0].label,
            pruebas.foto_antes ? Buffer.from(pruebas.foto_antes, 'base64') : null);
        y = subTitle(doc, y, `${fotoSections[1].num}.  ${fotoSections[1].label}`);
        y = drawPhotoPlaceholder(doc, y, fotoSections[1].label,
            pruebas.foto_despues ? Buffer.from(pruebas.foto_despues, 'base64') : null);

        doc.addPage();
        drawPageHeader(doc, 3, TOTAL_PAGES, fechaStr);
        y = startY();
        y = drawPhotoPlaceholder(doc, y, '(continuación foto 1.2)',
            pruebas.foto_despues2 ? Buffer.from(pruebas.foto_despues2, 'base64') : null);
        y = subTitle(doc, y, `${fotoSections[2].num}.  ${fotoSections[2].label}`);
        y = drawPhotoPlaceholder(doc, y, fotoSections[2].label,
            pruebas.foto_marquillas ? Buffer.from(pruebas.foto_marquillas, 'base64') : null);
        y = subTitle(doc, y, `${fotoSections[3].num}.  ${fotoSections[3].label}`);

        doc.addPage();
        drawPageHeader(doc, 4, TOTAL_PAGES, fechaStr);
        y = startY();
        y = drawPhotoPlaceholder(doc, y, fotoSections[3].label,
            pruebas.foto_tomas ? Buffer.from(pruebas.foto_tomas, 'base64') : null);

        doc.addPage();
        drawPageHeader(doc, 5, TOTAL_PAGES, fechaStr);
        y = startY();
        y = subTitle(doc, y, `${fotoSections[4].num}.  ${fotoSections[4].label}`);
        y = drawPhotoPlaceholder(doc, y, fotoSections[4].label,
            pruebas.foto_voltaje ? Buffer.from(pruebas.foto_voltaje, 'base64') : null);

        // ══════════════════════════════════════════
        //  PÁGINA 6 – PRUEBAS DE SERVICIOS
        // ══════════════════════════════════════════
        doc.addPage();
        drawPageHeader(doc, 6, TOTAL_PAGES, fechaStr);
        y = startY();
        y = sectionTitle(doc, y, '2.   PRUEBAS DE SERVICIOS');

        y = subTitle(doc, y, '2.1.  Prueba de ping y trace route a la oficina principal.');
        const pingH = 120;
        rect(doc, ML, y, CW, pingH, '#1E1E1E', MGRAY, 0.5);
        doc.save().font('Courier').fontSize(7).fillColor('#00FF00')
            .text(pruebas.ping_central || '<Resultado de la prueba de ping>', ML + 6, y + 6,
                { width: CW - 12, height: pingH - 12, lineBreak: true });
        doc.restore();
        y += pingH + 10;

        y = subTitle(doc, y, '2.2.  Prueba de ping y trace route al punto remoto (Extranet).');
        txt(doc, pruebas.ping_extranet || '<Resultado de la prueba de ping>',
            ML, y, CW, { size: 7.5, color: DGRAY, lineBreak: true });
        y += 18;
        txt(doc, pruebas.traceroute || '<Resultado del trace route>',
            ML, y, CW, { size: 7.5, color: DGRAY, lineBreak: true });
        y += 22;

        y = subTitle(doc, y, '2.3.  Funcionamiento de Encripción (si aplica).');
        txt(doc, pruebas.encripcion || '<Resultado>',
            ML, y, CW, { size: 7.5, color: DGRAY });
        y += 18;

        // ══════════════════════════════════════════
        //  PÁGINA 7 – PRUEBAS MPLS AVANZADO / FIRMWARE
        // ══════════════════════════════════════════
        doc.addPage();
        drawPageHeader(doc, 7, TOTAL_PAGES, fechaStr);
        y = startY();
        y = sectionTitle(doc, y, '3.   PRUEBAS DE SERVICIO MPLS AVANZADO / TRANSACCIONAL');

        y = subTitle(doc, y, '3.1.  Evidencia de versión o firmware de los equipos');
        txtB(doc, pruebas.firmware_info || 'Product Version: —\nSoftware Version: —\nFirmware: —',
            ML, y, CW, { size: 8.5, lineBreak: true });
        y += 60;

        y = subTitle(doc, y, '3.2.  Evidencia de configuración de equipo Router');
        const cliH = 200;
        rect(doc, ML, y, CW, cliH, '#1E1E1E', MGRAY, 0.5);
        doc.save().font('Courier').fontSize(6.5).fillColor('#CCCCCC')
            .text(pruebas.config_router || 'DEM-IPR#show run\n<Sin configuración registrada>',
                ML + 6, y + 6, { width: CW - 12, height: cliH - 12, lineBreak: true });
        doc.restore();
        y += cliH + 10;

        // ══════════════════════════════════════════
        //  PÁGINA 8 – CONTINUACIÓN PRUEBAS AVANZADAS
        // ══════════════════════════════════════════
        doc.addPage();
        drawPageHeader(doc, 8, TOTAL_PAGES, fechaStr);
        y = startY();

        y = subTitle(doc, y, '3.3.  Evidencia de registro ARP desde la interface LAN + prueba de ping');
        txt(doc, 'Para cualquier equipo:', ML, y, CW, { size: 8 }); y += 13;
        txtB(doc, 'ARP', ML, y, CW, { size: 8 }); y += 13;
        txt(doc, pruebas.arp || '<ARP>', ML, y, CW, { size: 7.5, color: DGRAY }); y += 20;
        txtB(doc, 'PING', ML, y, CW, { size: 8 }); y += 13;
        txt(doc, pruebas.ping_lan || '<PING>', ML, y, CW, { size: 7.5, color: DGRAY }); y += 22;
        txt(doc, 'Los ping siempre deben ser con origen IP LAN (source)',
            ML, y, CW, { size: 7.5, color: DGRAY }); y += 18;

        y = subTitle(doc, y, '3.4.  Evidencia de conectividad entre equipo terminal del cliente hacia punto central e interconexiones');
        txt(doc, 'Hacia PC e Interconexiones', ML, y, CW, { size: 7.5, color: DGRAY }); y += 18;
        txt(doc, 'Pantallazo de navegación para página internacional y nacional con fecha y hora de la prueba. Desde equipo del cliente. Foto, pantallazo.',
            ML, y, CW, { size: 7.5, color: DGRAY, lineBreak: true }); y += 22;

        y = subTitle(doc, y, '3.5.  Registro de saturación');
        txt(doc, 'Para ejecutar esta prueba se debe tomar desde una herramienta de saturación como el netpersec, jperf o analizadores cuando se solicita esto con el fin de dejar las evidencias hacia el cliente de la capacidad del canal. Para enlaces superiores o iguales a 100 MB.',
            ML, y, CW, { size: 7.5, color: DGRAY, lineBreak: true }); y += 36;

        y = subTitle(doc, y, '3.6.  Servicios Transaccionales 3G');
        txtB(doc, 'Potencia 3G', ML, y, CW, { size: 8 }); y += 13;
        txt(doc, pruebas.potencia_3g || 'Pantallazo',
            ML, y, CW, { size: 7.5, color: DGRAY }); y += 18;
        txtB(doc, 'IP asignada', ML, y, CW, { size: 8 }); y += 13;
        txt(doc, pruebas.ip_asignada || 'Pantallazo IP asignada por el operador',
            ML, y, CW, { size: 7.5, color: DGRAY }); y += 18;

        // ══════════════════════════════════════════
        //  PÁGINA 9 – CONTINUACIÓN CONFIGURACIÓN
        // ══════════════════════════════════════════
        doc.addPage();
        drawPageHeader(doc, 9, TOTAL_PAGES, fechaStr);
        y = startY();
        const cliH2 = 300;
        rect(doc, ML, y, CW, cliH2, '#1E1E1E', MGRAY, 0.5);
        doc.save().font('Courier').fontSize(6.5).fillColor('#CCCCCC')
            .text(pruebas.config_router_cont || '!command in service_mode\n<Continuación configuración>',
                ML + 6, y + 6, { width: CW - 12, height: cliH2 - 12, lineBreak: true });
        doc.restore();
        y += cliH2 + 10;

        // ══════════════════════════════════════════
        //  PÁGINA 10 – OBSERVACIONES + CONEXIONES + CPE
        // ══════════════════════════════════════════
        doc.addPage();
        drawPageHeader(doc, 10, TOTAL_PAGES, fechaStr);
        y = startY();

        txtB(doc, 'OBSERVACIONES: ', ML, y, CW, { size: 8.5 });
        y += 13;
        txt(doc, acta.observaciones || '—', ML, y, CW, { size: 8.5, lineBreak: true });
        y += Math.max(28, Math.ceil((acta.observaciones || '').length / 80) * 11 + 6);

        txt(doc, '<Documentar observaciones>', ML, y, CW, { size: 7.5, color: DGRAY });
        y += 28;

        y = sectionTitle(doc, y, '4.   CONEXIONES Y ENTREGA');
        y = subTitle(doc, y,
            '4.1.  Los equipos del cliente quedan conectados a los equipos de Claro, en caso de NO por favor documentar en observaciones la razón.');
        y = drawSINO(doc, y, conex_si);
        y = subTitle(doc, y,
            '4.2.  Los equipos del cliente se encuentran disponibles y configurados adecuadamente, en caso de NO por favor documentar en observaciones la razón.');
        y = drawSINO(doc, y, conex_si);

        y = sectionTitle(doc, y, '5.   CONFIGURACION DEL CPE');
        txt(doc, pruebas.config_cpe || '<Adjuntar la configuración del CPE>',
            ML, y, CW, { size: 7.5, color: DGRAY });
        y += 18;

        // ══════════════════════════════════════════
        //  PÁGINA 11 – FOTO ACTA DE ENTREGA
        // ══════════════════════════════════════════
        doc.addPage();
        drawPageHeader(doc, 11, TOTAL_PAGES, fechaStr);
        y = startY();
        y = sectionTitle(doc, y, '6.   FOTO ACTA DE ENTREGA DE SERVICIO');
        txt(doc, '(400x300 pixeles)', ML, y, CW, { size: 8.5, align: 'center' }); y += 18;
        y = drawPhotoPlaceholder(doc, y, 'Foto Acta de Entrega de Servicio',
            pruebas.foto_acta_entrega ? Buffer.from(pruebas.foto_acta_entrega, 'base64') : null);

        // ══════════════════════════════════════════
        //  PÁGINA 12 – ACTA DE ENTREGA
        // ══════════════════════════════════════════
        doc.addPage();
        drawPageHeader(doc, 12, TOTAL_PAGES, fechaStr);

        const subHY = MT + HEADER_H + 8;
        const subHH = 52;
        const sColT = 280, sColF = 95;
        rect(doc, ML, subHY, CW, subHH, WHITE, BLACK, 0.7);

        txtB(doc, 'FORMATO', ML + 4, subHY + 4, sColT - 8, { size: 8, align: 'center' });
        txtB(doc, 'ACTA DE ENTREGA PARA SERVICIOS DE MPLS (AVANZADO  /  TRANSACCIONAL)',
            ML + 4, subHY + 14, sColT - 8, { size: 7.5, align: 'center', lineBreak: true });
        line(doc, ML + sColT, subHY, ML + sColT, subHY + subHH, BLACK, 0.7);
        drawClaroLogo(doc, ML + sColT + sColF + (CW - sColT - sColF) / 2, subHY + subHH / 2, 18);
        line(doc, ML + sColT + sColF, subHY, ML + sColT + sColF, subHY + subHH, BLACK, 0.7);
        txt(doc, 'Pertenece al procedimiento: Implementar Servicios Segmento Empresas y Negocios Soluciones Fijas y Realizar Instalación y entrega de Servicio.',
            ML + 4, subHY + 32, sColT - 8, { size: 6, lineBreak: true });

        const sRow2Y = subHY + subHH;
        const sRow2H = 14;
        rect(doc, ML, sRow2Y, CW, sRow2H, WHITE, BLACK, 0.7);
        txt(doc, 'Clasificación: Uso Interno.', ML + 4, sRow2Y + 3, 180, { size: 7 });
        line(doc, ML + 180, sRow2Y, ML + 180, sRow2Y + sRow2H, BLACK, 0.7);
        txt(doc, 'Pág. 1 de 1', ML + 184, sRow2Y + 3, 90, { size: 7 });
        line(doc, ML + 274, sRow2Y, ML + 274, sRow2Y + sRow2H, BLACK, 0.7);
        txt(doc, 'Código: ', ML + 278, sRow2Y + 3, 40, { size: 7 });
        txtB(doc, 'VAA3-F2', ML + 304, sRow2Y + 3, 60, { size: 7 });
        txt(doc, 'versión: 09-sep-2020', ML + 370, sRow2Y + 3, 100, { size: 6.5 });

        y = sRow2Y + sRow2H + 10;

        // Campos usando solo datos reales de la BD
        const FH = 15;

        txtB(doc, 'Técnico:', ML, y, 60, { size: 7.5 });
        txt(doc, acta.tecnico_nombre || '', ML + 62, y, 200, { size: 7.5 });
        line(doc, ML + 62, y + 11, ML + 260, y + 11, MGRAY, 0.4);
        txtB(doc, 'Fecha:', ML + 270, y, 40, { size: 7.5 });
        txt(doc, acta.fecha_ejecucion
            ? new Date(acta.fecha_ejecucion).toLocaleDateString('es-CO') : '',
            ML + 313, y, 100, { size: 7.5 });
        line(doc, ML + 313, y + 11, ML + CW, y + 11, MGRAY, 0.4);
        y += FH;

        txtB(doc, 'Ing. Outsourcing:', ML, y, 85, { size: 7.5 });
        txt(doc, acta.ingeniero_outsourcing || '', ML + 88, y, 200, { size: 7.5 });
        line(doc, ML + 88, y + 11, ML + 260, y + 11, MGRAY, 0.4);
        txtB(doc, 'Soporte Claro:', ML + 270, y, 70, { size: 7.5 });
        txt(doc, acta.soporte_claro || '', ML + 343, y, CW - 343 + ML, { size: 7.5 });
        line(doc, ML + 343, y + 11, ML + CW, y + 11, MGRAY, 0.4);
        y += FH;

        txtB(doc, 'Lugar de instalación:', ML, y, 95, { size: 7.5 });
        txt(doc, acta.lugar_instalacion || '', ML + 98, y, CW - 98, { size: 7.5 });
        line(doc, ML + 98, y + 11, ML + CW, y + 11, MGRAY, 0.4);
        y += FH + 6;

        // Tabla equipos del acta de entrega
        txtB(doc, 'RELACIÓN DE EQUIPOS UTILIZADOS EN EL ENLACE', ML, y, CW, { size: 8 });
        y += 10;
        const eqCols2 = [
            { label: 'Tipo de equipo', key: 'tipo', w: 75 },
            { label: 'Marca', key: 'marca', w: 70 },
            { label: 'Modelo', key: 'modelo', w: 60 },
            { label: 'Serial', key: 'serial', w: 95 },
            { label: 'Número de placa', key: 'placa', w: 75 },
            { label: 'Ubicación', key: 'ubicacion', w: CW - 75 - 70 - 60 - 95 - 75 },
        ];
        y = drawEquipTable(doc, y, eqInst, eqCols2);

        // Mediciones eléctricas
        txt(doc, 'Condiciones eléctricas:', ML, y, 100, { size: 7.5 });
        txt(doc, 'Vf - n: ', ML + 105, y, 40, { size: 7.5 });
        txtB(doc, med.fase_neutro ?? '—', ML + 142, y, 50, { size: 7.5 });
        txt(doc, 'Vf - t: ', ML + 200, y, 40, { size: 7.5 });
        txtB(doc, med.fase_tierra ?? '—', ML + 237, y, 50, { size: 7.5 });
        txt(doc, 'Vn - t: ', ML + 300, y, 40, { size: 7.5 });
        txtB(doc, med.neutro_tierra ?? '—', ML + 338, y, 50, { size: 7.5 });
        y += 14;

        txt(doc, 'Adecuaciones físicas y ambientales:', ML, y, 170, { size: 7.5 });
        line(doc, ML + 173, y + 10, ML + CW, y + 10, MGRAY, 0.4);
        y += 14;

        txt(doc, 'Serial multimetro', ML, y, 90, { size: 7.5 });
        txtB(doc, acta.multimetro || '—', ML + 93, y, 100, { size: 7.5 });
        txt(doc, 'Serial analizador BER', ML + 205, y, 100, { size: 7.5 });
        txtB(doc, acta.analizador_ber || '—', ML + 308, y, 100, { size: 7.5 });
        y += 14;

        txtB(doc, 'OBSERVACIONES', ML, y, CW, { size: 8 });
        y += 12;
        rect(doc, ML, y, CW, 35, LGRAY, MGRAY, 0.4);
        txt(doc, acta.observaciones || '', ML + 4, y + 4, CW - 8, { size: 7.5, lineBreak: true });
        y += 40;

        // Firmas
        const fw = CW / 2 - 10;
        txtB(doc, 'REPRESENTANTE COMCEL', ML, y, fw, { size: 8 });
        txtB(doc, 'CLIENTE', ML + fw + 20, y, fw, { size: 8 });
        y += 22;
        line(doc, ML, y, ML + fw - 20, y, BLACK, 0.8);
        line(doc, ML + fw + 20, y, ML + CW, y, BLACK, 0.8);
        y += 4;
        txt(doc, 'FIRMA:', ML, y, 35, { size: 7.5 });
        line(doc, ML + 36, y + 8, ML + fw - 20, y + 8, MGRAY, 0.4);
        txt(doc, 'FIRMA:', ML + fw + 20, y, 35, { size: 7.5 });
        line(doc, ML + fw + 56, y + 8, ML + CW, y + 8, MGRAY, 0.4);
        y += 14;
        txt(doc, 'NOMBRE:', ML, y, 40, { size: 7.5 });
        txtB(doc, acta.ingeniero_outsourcing || '—', ML + 42, y, fw - 60, { size: 7.5 });
        y += 14;

        txt(doc, `Hora de inicio: ${acta.hora_inicio || '—'}`, ML + fw + 20, y, 150, { size: 7.5 });
        txt(doc, `Hora de salida: ${acta.hora_salida || '—'}`, ML + fw + 140, y, 120, { size: 7.5 });
        y += 14;

        const notaLegal =
            'Nota: La facturación del servicio será iniciada por COMCEL a partir del día siguiente a la fecha ' +
            'de la presente acta. EL SUSCRIPTOR se compromete a colocar en producción el canal durante los ' +
            'próximos tres días hábiles siguientes a la firma de la presente acta.';
        txt(doc, notaLegal, ML, y, CW, { size: 6.5, lineBreak: true });
        y += 40;

        txtB(doc, 'ESTE DOCUMENTO HACE PARTE INTEGRAL DEL CONTRATO PARA LA PRESTACION DE SERVICIOS DE\nTELECOMUNICACIONES SUSCRITO ENTRE LAS PARTES',
            ML, y, CW, { size: 7.5, align: 'center', lineBreak: true });
        y += 24;

        txt(doc, 'Bogotá: 1-7480456', ML, y, 150, { size: 7 });
        txt(doc, 'Correo electrónico: cliente.claro@claro.com.co', ML + 150, y, 180, { size: 7 });
        txt(doc, 'Web Portal E-care – Chat http://e-services.telmexla.com.co', ML + 340, y, 180, { size: 7 });

        // ══════════════════════════════════════════
        //  PÁGINA 13 – ENCUESTA DE SATISFACCIÓN
        // ══════════════════════════════════════════
        doc.addPage();
        drawPageHeader(doc, 13, TOTAL_PAGES, fechaStr);
        y = startY();

        txtB(doc, 'ENCUESTA DE SATISFACCIÓN DEL CLIENTE', ML, y, CW,
            { size: 10, align: 'center' });
        y += 18;

        const encLogo = ML + CW - 55;
        drawClaroLogo(doc, encLogo + 27, y + 12, 18);
        y += 40;

        txt(doc, 'Espacio para ser diligenciado por el Ingeniero Instalador:',
            ML, y, CW, { size: 7.5, color: DGRAY });
        y += 12;

        rect(doc, ML, y, CW, 13, LGRAY, MGRAY, 0.4);
        txt(doc, 'Fecha realización actividad', ML + 3, y + 2, 120, { size: 7 });
        line(doc, ML + 126, y, ML + 126, y + 13, MGRAY, 0.4);
        txtB(doc, acta.fecha_ejecucion
            ? new Date(acta.fecha_ejecucion).toLocaleDateString('es-CO') : '',
            ML + 130, y + 2, 70, { size: 7 });
        y += 13;

        rect(doc, ML, y, CW, 13, WHITE, MGRAY, 0.4);
        txt(doc, 'Hora de la cita con el cliente', ML + 3, y + 2, 120, { size: 7 });
        line(doc, ML + 126, y, ML + 126, y + 13, MGRAY, 0.4);
        txtB(doc, acta.hora_inicio || '', ML + 130, y + 2, 70, { size: 7 });
        y += 13;

        y += 6;
        txt(doc, 'Nombre Ing. Instalador (PIM)', ML, y, 140, { size: 7.5 });
        txtB(doc, acta.tecnico_nombre || '', ML + 145, y, CW - 145, { size: 7.5 });
        y += 16;

        txt(doc, 'Espacio para ser diligenciado por el Cliente:',
            ML, y, CW, { size: 7.5, color: DGRAY });
        y += 12;

        txt(doc, 'Estimado Cliente, le agradecemos nos permita mejorar la calidad del servicio suministrado por Telmex, diligenciando la siguiente encuesta de satisfacción. Por favor marque con "X" su opinión sobre los siguientes aspectos:',
            ML, y, CW, { size: 7, lineBreak: true, align: 'center' });
        y += 22;

        const preguntas = [
            {
                seccion: 'RESPECTO A NUESTRO PERSONAL DE INSTALACION EN CAMPO:', items: [
                    '¿El funcionario que lo visita en este momento se presentó puntualmente y de acuerdo al horario pactado previamente con usted?',
                    '¿El funcionario que lo visita en esta oportunidad se dirige a usted de manera respetuosa y profesional?',
                    '¿La presentación personal del funcionario que lo visita en esta oportunidad refleja profesionalismo y seriedad?',
                    '¿El funcionario que lo visita le explicó claramente cuáles eran las actividades que él iba a ejecutar antes de iniciar con los trabajos?',
                    '¿El funcionario que lo visita dedicó el tiempo de permanencia en sus oficinas, exclusivamente a las actividades propias del servicio ofrecido por Telmex?',
                    '¿El funcionario que lo asistió en esta visita fue cuidadoso al manipular los elementos que corresponden al sitio de instalación que usted le indicó?',
                    '¿Considera usted que el funcionario que lo asistió en esta visita demuestra conocimientos suficientes para las actividades que lleva a cabo?',
                ]
            },
            { seccion: 'RESPECTO A NUESTRO SOPORTE REMOTO Y ACTIVACION DE SERVICIO EN RED:', items: [':'] },
            {
                seccion: 'RESPECTO AL SERVICIO PRESTADO POR TELMEX EN GENERAL:', items: [
                    '¿En su opinión, el servicio brindado hasta el momento por nuestra compañía cumple con sus expectativas?',
                ]
            },
        ];

        const colPreg = CW - 40, colSI = 20, colNO = 20;

        preguntas.forEach(sec => {
            rect(doc, ML, y, CW, 14, LGRAY, MGRAY, 0.4);
            txtB(doc, sec.seccion, ML + 3, y + 3, colPreg, { size: 7 });
            txtB(doc, 'SI', ML + colPreg + 4, y + 3, colSI, { size: 7, align: 'center' });
            txtB(doc, 'NO', ML + colPreg + colSI + 4, y + 3, colNO, { size: 7, align: 'center' });
            line(doc, ML + colPreg, y, ML + colPreg, y + 14, MGRAY, 0.4);
            line(doc, ML + colPreg + colSI, y, ML + colPreg + colSI, y + 14, MGRAY, 0.4);
            y += 14;

            sec.items.forEach((pregunta, pi) => {
                const pH = 20;
                const bg = pi % 2 === 0 ? WHITE : LGRAY;
                rect(doc, ML, y, CW, pH, bg, MGRAY, 0.3);
                txt(doc, pregunta, ML + 3, y + 5, colPreg - 6, { size: 6.5 });
                txtB(doc, 'X', ML + colPreg + 4, y + 5, colSI, { size: 7, align: 'center' });
                line(doc, ML + colPreg, y, ML + colPreg, y + pH, MGRAY, 0.4);
                line(doc, ML + colPreg + colSI, y, ML + colPreg + colSI, y + pH, MGRAY, 0.4);
                y += pH;
            });
            y += 4;
        });

        y += 10;
        line(doc, ML + CW - 150, y, ML + CW, y, BLACK, 0.7);
        y += 4;
        txt(doc, 'Firma del cliente', ML + CW - 150, y, 100, { size: 7, align: 'center' });

        // ── Finalizar el PDF ──
        doc.end();

        await new Promise((resolve, reject) => {
            doc.on('end', resolve);
            doc.on('error', reject);
        });

        const pdfBuffer = Buffer.concat(chunks);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=acta_qa_mpls_${id}.pdf`);
        res.send(pdfBuffer);

    } catch (err) {
        console.error('Error generando PDF acta:', err);
        res.status(500).json({ error: err.message });
    }
});


// GET /api/actas-qa - Listar actas del técnico autenticado
router.get('/', verifyToken, async (req, res) => {
    const tecnicoId = req.user.id;
    try {
        const { rows } = await pool.query(
            `SELECT id, fecha_ejecucion, created_at, lugar_instalacion 
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