const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { getFormatoQa } = require('../config/formatos-qa');
const ImageModule = require('docxtemplater-image-module-free');
const sizeOf = require('image-size');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates', 'qas');

const FOTO_PLACEHOLDER = '[Espacio reservado para evidencia fotográfica]';
const SIN_OBSERVACIONES = 'Sin observaciones';
const NA = 'N/A';

function isDataUrlImage(value) {
  return typeof value === 'string' && value.startsWith('data:image/');
}

function dataUrlToBuffer(value) {
  if (!isDataUrlImage(value)) return null;

  const base64 = value.split(',')[1];

  if (!base64) return null;

  return Buffer.from(base64, 'base64');
}

function buildImageModule() {
  return new ImageModule({
    centered: false,

    getImage(tagValue) {
      if (!tagValue) return null;

      const buffer = dataUrlToBuffer(tagValue);

      if (!buffer) return null;

      return buffer;
    },

    getSize(imgBuffer) {
      try {
        const dimensions = sizeOf(imgBuffer);

        const maxWidth = 380;
        const maxHeight = 260;

        const width = dimensions.width || maxWidth;
        const height = dimensions.height || maxHeight;

        const ratio = Math.min(maxWidth / width, maxHeight / height, 1);

        return [
          Math.round(width * ratio),
          Math.round(height * ratio),
        ];
      } catch {
        return [360, 240];
      }
    },
  });
}

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

  const text = String(value);

  if (text.trim() === '') return fallback;

  return text;
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
    sap: safeText(eq.sap || eq.material_id, NA),
    codigo_sap: safeText(eq.sap || eq.material_id, NA),
    descripcion: safeText(eq.descripcion || eq.material_descripcion, NA),
    serial: safeText(eq.serial, NA),
    placa: safeText(eq.placa, NA),
    tipo: safeText(eq.tipo, NA),
    marca: safeText(eq.marca, NA),
    modelo: safeText(eq.modelo, NA),
    ubicacion: safeText(eq.ubicacion, NA),
    cantidad: safeText(eq.cantidad || 1, '1'),
  };
}

function addEquipoAliases(target, prefix, equipos = [], max = 8) {
  for (let i = 0; i < max; i++) {
    const eq = equipos[i] || {};
    const n = i + 1;

    target[`${prefix}_${n}_tipo`] = safeText(eq.tipo, NA);
    target[`${prefix}_${n}_marca`] = safeText(eq.marca, NA);
    target[`${prefix}_${n}_modelo`] = safeText(eq.modelo, NA);
    target[`${prefix}_${n}_serial`] = safeText(eq.serial, NA);
    target[`${prefix}_${n}_placa`] = safeText(eq.placa, NA);
    target[`${prefix}_${n}_sap`] = safeText(eq.sap || eq.material_id, NA);
    target[`${prefix}_${n}_descripcion`] = safeText(eq.descripcion || eq.material_descripcion, NA);
  }
}

function normalizarTriState(value) {
  if (value === true) return 'SI';
  if (value === false) return 'NO';

  const text = safeText(value).trim().toUpperCase();

  if (text === 'SI' || text === 'SÍ' || text === 'YES' || text === 'TRUE' || text === '1') return 'SI';
  if (text === 'NO' || text === 'FALSE' || text === '0') return 'NO';
  if (text === 'N/A' || text === 'NA' || text === 'NO APLICA') return 'N/A';

  return '';
}

/**
 * Convierte campos SI/NO/N/A en tags separados:
 *
 * campo = "SI" genera:
 * campo_si = "X"
 * campo_no = ""
 * campo_na = ""
 *
 * campo vacío genera por defecto:
 * campo_si = ""
 * campo_no = ""
 * campo_na = "X"
 */
function setTriState(target, key, value, defaultValue = 'N/A') {
  const normalized = normalizarTriState(value) || defaultValue;

  target[`${key}_si`] = normalized === 'SI' ? 'X' : '';
  target[`${key}_no`] = normalized === 'NO' ? 'X' : '';
  target[`${key}_na`] = normalized === 'N/A' ? 'X' : '';
}

function addTriStateTags(target, source = {}) {
  Object.entries(source).forEach(([key, value]) => {
    setTriState(target, key, value, 'N/A');
  });
}

function collectTemplateTagsFromZip(zip) {
  const tags = new Set();

  Object.keys(zip.files || {}).forEach((fileName) => {
    if (!fileName.startsWith('word/')) return;
    if (!fileName.endsWith('.xml')) return;

    try {
      const xml = zip.files[fileName].asText();

      const regex = /\{([a-zA-Z0-9_]+)\}/g;
      let match;

      while ((match = regex.exec(xml)) !== null) {
        if (match[1]) tags.add(match[1]);
      }
    } catch {
      // Ignorar XML que no se pueda leer.
    }
  });

  return [...tags];
}

/**
 * Detecta en la plantilla todos los tags terminados en:
 * _si, _no, _na
 *
 * Si existe el grupo y el usuario no lo envió, marca N/A.
 */
function applyTriStateDefaultsFromTemplateTags(data, tags) {
  const bases = new Set();

  tags.forEach((tag) => {
    const match = tag.match(/^(.+)_(si|no|na)$/i);
    if (!match) return;

    bases.add(match[1]);
  });

  bases.forEach((base) => {
    const hasAny =
      safeText(data[`${base}_si`]).trim() ||
      safeText(data[`${base}_no`]).trim() ||
      safeText(data[`${base}_na`]).trim();

    if (!hasAny) {
      setTriState(data, base, data[base], 'N/A');
    }
  });
}

function applyPhotoDefaultsFromTemplateTags(data, tags) {
  tags.forEach((tag) => {
    const isFoto =
      tag.startsWith('foto_') ||
      tag.includes('_foto_') ||
      tag.includes('fotografico') ||
      tag.includes('fotografica');

    if (!isFoto) return;

    data[tag] = safeText(data[tag], FOTO_PLACEHOLDER);
  });
}

function applyEquipoDefaultsFromTemplateTags(data, tags) {
  tags.forEach((tag) => {
    const isEquipo =
      tag.startsWith('equipo_instalado_') ||
      tag.startsWith('equipo_desinstalado_');

    if (!isEquipo) return;

    data[tag] = safeText(data[tag], NA);
  });
}

function applyObservacionesDefaultsFromTemplateTags(data, tags) {
  tags.forEach((tag) => {
    const isObservacion =
      tag === 'observaciones' ||
      tag.startsWith('observaciones_') ||
      tag.includes('_observaciones');

    if (!isObservacion) return;

    data[tag] = safeText(data[tag], SIN_OBSERVACIONES);
  });
}

function applyGeneralDefaultsFromTemplateTags(data, tags) {
  tags.forEach((tag) => {
    if (data[tag] === undefined || data[tag] === null) {
      data[tag] = '';
    }
  });
}

function applyTemplateDefaults(data, tags) {
  applyTriStateDefaultsFromTemplateTags(data, tags);
  applyPhotoDefaultsFromTemplateTags(data, tags);
  applyEquipoDefaultsFromTemplateTags(data, tags);
  applyObservacionesDefaultsFromTemplateTags(data, tags);
  applyGeneralDefaultsFromTemplateTags(data, tags);

  return data;
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

    tiempo_transporte: safeText(acta.tiempo_transporte, '0'),
    tiempo_antesala: safeText(acta.tiempo_antesala, '0'),
    tiempo_ejecucion: safeText(acta.tiempo_ejecucion, '0'),
    tiempo_espera_claro: safeText(acta.tiempo_espera_claro, '0'),

    ingeniero_outsourcing: safeText(acta.ingeniero_outsourcing, NA),
    multimetro: safeText(acta.multimetro, NA),
    analizador_ber: safeText(acta.analizador_ber, NA),
    soporte_claro: safeText(acta.soporte_claro, NA),

    firma_acta: boolSiNo(acta.firma_acta),
    caso_seguimiento: boolSiNo(acta.caso_seguimiento),
    problemas_instalacion: boolSiNo(acta.problemas_instalacion),

    firma_acta_x_si: acta.firma_acta ? 'X' : '',
    firma_acta_x_no: !acta.firma_acta ? 'X' : '',

    caso_seguimiento_x_si: acta.caso_seguimiento ? 'X' : '',
    caso_seguimiento_x_no: !acta.caso_seguimiento ? 'X' : '',

    problemas_instalacion_x_si: acta.problemas_instalacion ? 'X' : '',
    problemas_instalacion_x_no: !acta.problemas_instalacion ? 'X' : '',

    fase_neutro: safeText(med.fase_neutro, NA),
    fase_tierra: safeText(med.fase_tierra, NA),
    neutro_tierra: safeText(med.neutro_tierra, NA),

    lugar_instalacion: safeText(acta.lugar_instalacion, NA),
    observaciones: safeText(acta.observaciones, SIN_OBSERVACIONES),

    ping_central: safeText(pruebas.ping_central, NA),
    traceroute: safeText(pruebas.traceroute, NA),
    firmware: safeText(pruebas.firmware, NA),
    ping_extranet: safeText(pruebas.ping_extranet, NA),
    encripcion: safeText(pruebas.encripcion, NA),
    firmware_info: safeText(pruebas.firmware_info, NA),
    config_router: safeText(pruebas.config_router, NA),
    arp: safeText(pruebas.arp, NA),
    ping_lan: safeText(pruebas.ping_lan, NA),
    config_cpe: safeText(pruebas.config_cpe, NA),

    equipos_instalados: equiposInstalados.map(normalizarEquipo),
    equipos_desinstalados: equiposDesinstalados.map(normalizarEquipo),
    equipos: equiposInstalados.map(normalizarEquipo),
    equipos_retirados: equiposDesinstalados.map(normalizarEquipo),

    fotos,
    campos_extra: camposExtra,

    foto_antes_instalacion: safeText(camposExtra.foto_antes_instalacion, FOTO_PLACEHOLDER),
    foto_despues_instalacion: safeText(camposExtra.foto_despues_instalacion, FOTO_PLACEHOLDER),
    foto_marquillas_completas: safeText(camposExtra.foto_marquillas_completas, FOTO_PLACEHOLDER),
    foto_tomas_electricas: safeText(camposExtra.foto_tomas_electricas, FOTO_PLACEHOLDER),
    foto_voltaje_neutro_tierra: safeText(camposExtra.foto_voltaje_neutro_tierra, FOTO_PLACEHOLDER),
    foto_acta_entrega_servicio: safeText(camposExtra.foto_acta_entrega_servicio, FOTO_PLACEHOLDER),

    foto_marquillas: safeText(camposExtra.foto_marquillas, FOTO_PLACEHOLDER),
    foto_voltaje: safeText(camposExtra.foto_voltaje, FOTO_PLACEHOLDER),

    observaciones_capacitacion_usuarios: safeText(
      camposExtra.observaciones_capacitacion_usuarios,
      SIN_OBSERVACIONES
    ),
    formatos_capacitacion_firmados: safeText(
      camposExtra.formatos_capacitacion_firmados,
      FOTO_PLACEHOLDER
    ),
    observaciones_actividad: safeText(
      camposExtra.observaciones_actividad,
      SIN_OBSERVACIONES
    ),
  };

  addEquipoAliases(data, 'equipo_instalado', equiposInstalados, 8);
  addEquipoAliases(data, 'equipo_desinstalado', equiposDesinstalados, 8);

  addTriStateTags(data, camposExtra);

  return data;
}

function renderDocxFromTemplate(templatePath, data) {
  if (!fs.existsSync(templatePath)) {
    throw new Error(`No existe la plantilla Word: ${templatePath}`);
  }

  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);

  const templateTags = collectTemplateTagsFromZip(zip);
  const finalData = applyTemplateDefaults({ ...data }, templateTags);

  console.log('[QA DOCX] tags detectados:', templateTags.length);

  const doc = new Docxtemplater(zip, {
    modules: [buildImageModule()],
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',
  });

  try {
    doc.render(finalData);
  } catch (error) {
    console.error('[DOCXTEMPLATER ERROR]', JSON.stringify({
      message: error.message,
      name: error.name,
      properties: error.properties,
    }, null, 2));

    throw error;
  }

  return doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });
}

async function generarDocxActaQa(acta) {
  const formato = getFormatoQa(acta.tipo_formato || 'qa_mpls');
  const templatePath = path.join(TEMPLATES_DIR, formato.archivo);

  console.log('[QA DOCX] tipo_formato:', acta.tipo_formato);
  console.log('[QA DOCX] archivo plantilla:', formato.archivo);
  console.log('[QA DOCX] templatePath:', templatePath);
  console.log('[QA DOCX] existe plantilla:', fs.existsSync(templatePath));

  const data = buildTemplateData({
    ...acta,
    tipo_formato: formato.id,
    nombre_formato: acta.nombre_formato || formato.nombre,
    archivo_formato: formato.archivo,
  });

  const docxBuffer = renderDocxFromTemplate(templatePath, data);

  return {
    docxBuffer,
    filename: `acta_qa_${formato.id}_${acta.id}.docx`,
    formato,
  };
}

module.exports = {
  generarDocxActaQa,
  buildTemplateData,
  renderDocxFromTemplate,
  parseJsonMaybe,
  safeText,
};