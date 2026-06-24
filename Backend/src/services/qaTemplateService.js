const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { getFormatoQa } = require('../config/formatos-qa');

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

function addEquipoAliases(target, prefix, equipos = [], max = 8) {
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

/**
 * Convierte campos SI/NO/N/A en tags separados:
 * campo = "SI" genera:
 * campo_si = "X"
 * campo_no = ""
 * campo_na = ""
 */
function addTriStateTags(target, source = {}) {
  Object.entries(source).forEach(([key, value]) => {
    const normalized =
      typeof value === 'string'
        ? value.trim().toUpperCase()
        : value === true
          ? 'SI'
          : value === false
            ? 'NO'
            : '';

    target[`${key}_si`] = normalized === 'SI' ? 'X' : '';
    target[`${key}_no`] = normalized === 'NO' ? 'X' : '';
    target[`${key}_na`] = normalized === 'N/A' || normalized === 'NA' ? 'X' : '';
  });
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

    firma_acta: boolSiNo(acta.firma_acta),
    caso_seguimiento: boolSiNo(acta.caso_seguimiento),
    problemas_instalacion: boolSiNo(acta.problemas_instalacion),

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

    foto_antes_instalacion: safeText(camposExtra.foto_antes_instalacion || ''),
    foto_despues_instalacion: safeText(camposExtra.foto_despues_instalacion || ''),
    foto_marquillas_completas: safeText(camposExtra.foto_marquillas_completas || ''),
    foto_tomas_electricas: safeText(camposExtra.foto_tomas_electricas || ''),
    foto_voltaje_neutro_tierra: safeText(camposExtra.foto_voltaje_neutro_tierra || ''),
    foto_acta_entrega_servicio: safeText(camposExtra.foto_acta_entrega_servicio || ''),

    foto_marquillas: safeText(camposExtra.foto_marquillas || ''),
    foto_voltaje: safeText(camposExtra.foto_voltaje || ''),
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

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',
  });

  try {
    doc.render(data);
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
};