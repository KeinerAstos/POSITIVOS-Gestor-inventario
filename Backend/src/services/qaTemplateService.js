const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const libre = require('libreoffice-convert');
const { promisify } = require('util');
const { getFormatoQa } = require('../config/formatos-qa');

const convertAsync = promisify(libre.convert);

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates', 'qas');

function parseJsonMaybe(value, fallback) {
  if (!value) return fallback;

  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function safeText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function formatDateCo(value) {
  if (!value) return '';

  try {
    return new Date(value).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return String(value);
  }
}

function boolSiNo(value) {
  return value ? 'SI' : 'NO';
}

function normalizarEquipo(eq = {}, index = 0) {
  return {
    item: index + 1,
    sap: safeText(eq.sap || eq.material_id),
    codigo_sap: safeText(eq.sap || eq.material_id),
    descripcion: safeText(eq.descripcion || eq.material_descripcion),
    serial: safeText(eq.serial),
    placa: safeText(eq.placa),
    tipo: safeText(eq.tipo),
    marca: safeText(eq.marca),
    modelo: safeText(eq.modelo),
    ubicacion: safeText(eq.ubicacion),
    cantidad: safeText(eq.cantidad || 1),
  };
}

function buildTemplateData(acta) {
  const med = parseJsonMaybe(acta.mediciones_electricas, {});
  const pruebas = parseJsonMaybe(acta.pruebas_servicio, {});
  const equiposInstalados = parseJsonMaybe(acta.equipos_instalados, []);
  const equiposDesinstalados = parseJsonMaybe(acta.equipos_desinstalados, []);
  const fotos = parseJsonMaybe(acta.fotos, []);

  const fechaEjecucion = formatDateCo(acta.fecha_ejecucion);

  return {
    // Identificación del acta
    id: safeText(acta.id),
    acta_id: safeText(acta.id),
    tipo_formato: safeText(acta.tipo_formato),
    nombre_formato: safeText(acta.nombre_formato || acta.tipo_formato),
    archivo_formato: safeText(acta.archivo_formato),

    // Técnico / usuario
    tecnico_nombre: safeText(acta.tecnico_nombre),
    tecnico_id: safeText(acta.tecnico_id),

    // Datos generales
    fecha_ejecucion: fechaEjecucion,
    fecha: fechaEjecucion,
    hora_inicio: safeText(acta.hora_inicio),
    hora_salida: safeText(acta.hora_salida),
    tiempo_transporte: safeText(acta.tiempo_transporte),
    tiempo_antesala: safeText(acta.tiempo_antesala),
    tiempo_ejecucion: safeText(acta.tiempo_ejecucion),
    tiempo_espera_claro: safeText(acta.tiempo_espera_claro),
    ingeniero_outsourcing: safeText(acta.ingeniero_outsourcing),
    multimetro: safeText(acta.multimetro),
    analizador_ber: safeText(acta.analizador_ber),
    soporte_claro: safeText(acta.soporte_claro),
    lugar_instalacion: safeText(acta.lugar_instalacion),
    observaciones: safeText(acta.observaciones),

    // Checks
    firma_acta: boolSiNo(acta.firma_acta),
    caso_seguimiento: boolSiNo(acta.caso_seguimiento),
    problemas_instalacion: boolSiNo(acta.problemas_instalacion),

    firma_acta_x_si: acta.firma_acta ? 'X' : '',
    firma_acta_x_no: !acta.firma_acta ? 'X' : '',

    caso_seguimiento_x_si: acta.caso_seguimiento ? 'X' : '',
    caso_seguimiento_x_no: !acta.caso_seguimiento ? 'X' : '',

    problemas_instalacion_x_si: acta.problemas_instalacion ? 'X' : '',
    problemas_instalacion_x_no: !acta.problemas_instalacion ? 'X' : '',

    // Mediciones eléctricas
    fase_neutro: safeText(med.fase_neutro),
    fase_tierra: safeText(med.fase_tierra),
    neutro_tierra: safeText(med.neutro_tierra),

    // Pruebas
    ping_central: safeText(pruebas.ping_central),
    traceroute: safeText(pruebas.traceroute),
    firmware: safeText(pruebas.firmware),
    ping_extranet: safeText(pruebas.ping_extranet),
    encripcion: safeText(pruebas.encripcion),
    firmware_info: safeText(pruebas.firmware_info),
    config_router: safeText(pruebas.config_router),
    arp: safeText(pruebas.arp),
    ping_lan: safeText(pruebas.ping_lan),
    potencia_3g: safeText(pruebas.potencia_3g),
    ip_asignada: safeText(pruebas.ip_asignada),
    config_cpe: safeText(pruebas.config_cpe),

    // Tablas
    equipos_instalados: equiposInstalados.map(normalizarEquipo),
    equipos_desinstalados: equiposDesinstalados.map(normalizarEquipo),

    // Alias por si en Word prefieres nombres cortos
    equipos: equiposInstalados.map(normalizarEquipo),
    equipos_retirados: equiposDesinstalados.map(normalizarEquipo),

    // Fotos como metadata textual por ahora
    fotos,
    total_equipos_instalados: equiposInstalados.length,
    total_equipos_desinstalados: equiposDesinstalados.length,

    // Fecha de generación
    fecha_generacion: formatDateCo(new Date()),
  };
}

function renderDocxFromTemplate(templatePath, data) {
  if (!fs.existsSync(templatePath)) {
    throw new Error(`No existe la plantilla Word: ${templatePath}`);
  }

  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',
  });

  doc.render(data);

  return doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });
}

async function convertDocxBufferToPdf(docxBuffer) {
  return await convertAsync(docxBuffer, '.pdf', undefined);
}

async function generarPdfActaQa(acta) {
  const formato = getFormatoQa(acta.tipo_formato);
  const templatePath = path.join(TEMPLATES_DIR, formato.archivo);

  const data = buildTemplateData({
    ...acta,
    tipo_formato: formato.id,
    nombre_formato: acta.nombre_formato || formato.nombre,
    archivo_formato: formato.archivo,
  });

  const docxBuffer = renderDocxFromTemplate(templatePath, data);
  const pdfBuffer = await convertDocxBufferToPdf(docxBuffer);

  return {
    pdfBuffer,
    filename: `acta_qa_${formato.id}_${acta.id}.pdf`,
    formato,
  };
}

module.exports = {
  generarPdfActaQa,
  buildTemplateData,
};