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

function addEquipoAliases(target, prefix, equipos = [], max = 6) {
  for (let i = 0; i < max; i++) {
    const eq = equipos[i] || {};
    const n = i + 1;

    target[`${prefix}_${n}_tipo`] = safeText(eq.tipo);
    target[`${prefix}_${n}_marca`] = safeText(eq.marca);
    target[`${prefix}_${n}_modelo`] = safeText(eq.modelo);
    target[`${prefix}_${n}_serial`] = safeText(eq.serial);
    target[`${prefix}_${n}_placa`] = safeText(eq.placa);
    target[`${prefix}_${n}_sap`] = safeText(eq.sap || eq.material_id);
    target[`${prefix}_${n}_descripcion`] = safeText(eq.descripcion || eq.material_descripcion);
  }
}

function buildTemplateData(acta) {
  const med = parseJsonMaybe(acta.mediciones_electricas, {});
  const pruebas = parseJsonMaybe(acta.pruebas_servicio, {});
  const equiposInstalados = parseJsonMaybe(acta.equipos_instalados, []);
  const equiposDesinstalados = parseJsonMaybe(acta.equipos_desinstalados, []);
  const fotos = parseJsonMaybe(acta.fotos, []);
  const camposExtra = parseJsonMaybe(acta.campos_extra, {});

  const data = {
    ...camposExtra,

    id: safeText(acta.id),
    acta_id: safeText(acta.id),

    tipo_formato: safeText(acta.tipo_formato),
    nombre_formato: safeText(acta.nombre_formato),
    archivo_formato: safeText(acta.archivo_formato),

    tecnico_nombre: safeText(acta.tecnico_nombre),
    tecnico_id: safeText(acta.tecnico_id),

    visita_numero: safeText(camposExtra.visita_numero || acta.visita_numero || '1'),

    fecha_ejecucion: formatDateCo(acta.fecha_ejecucion),
    fecha: formatDateCo(acta.fecha_ejecucion),
    fecha_generacion: formatDateCo(new Date()),

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

    firma_acta: acta.firma_acta ? 'SI' : 'NO',
    caso_seguimiento: acta.caso_seguimiento ? 'SI' : 'NO',
    problemas_instalacion: acta.problemas_instalacion ? 'SI' : 'NO',

    firma_acta_x_si: acta.firma_acta ? 'X' : '',
    firma_acta_x_no: !acta.firma_acta ? 'X' : '',

    caso_seguimiento_x_si: acta.caso_seguimiento ? 'X' : '',
    caso_seguimiento_x_no: !acta.caso_seguimiento ? 'X' : '',

    problemas_instalacion_x_si: acta.problemas_instalacion ? 'X' : '',
    problemas_instalacion_x_no: !acta.problemas_instalacion ? 'X' : '',

    fase_neutro: safeText(med.fase_neutro),
    fase_tierra: safeText(med.fase_tierra),
    neutro_tierra: safeText(med.neutro_tierra),

    lugar_instalacion: safeText(acta.lugar_instalacion),
    observaciones: safeText(acta.observaciones),

    ping_central: safeText(pruebas.ping_central),
    traceroute: safeText(pruebas.traceroute),
    firmware: safeText(pruebas.firmware),
    ping_extranet: safeText(pruebas.ping_extranet),
    encripcion: safeText(pruebas.encripcion),
    firmware_info: safeText(pruebas.firmware_info),
    config_router: safeText(pruebas.config_router),
    arp: safeText(pruebas.arp),
    ping_lan: safeText(pruebas.ping_lan),
    config_cpe: safeText(pruebas.config_cpe),

    equipos_instalados: equiposInstalados.map(normalizarEquipo),
    equipos_desinstalados: equiposDesinstalados.map(normalizarEquipo),
    equipos: equiposInstalados.map(normalizarEquipo),
    equipos_retirados: equiposDesinstalados.map(normalizarEquipo),

    fotos,
    campos_extra: camposExtra,
  };

  addEquipoAliases(data, 'equipo_instalado', equiposInstalados, 8);
  addEquipoAliases(data, 'equipo_desinstalado', equiposDesinstalados, 8);

  return data;
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