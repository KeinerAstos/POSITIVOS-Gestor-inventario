const FORMATOS_QA = {
  qa_adicion_telefonos_capacitacion: {
    id: 'qa_adicion_telefonos_capacitacion',
    nombre: 'Acta QA adición de teléfonos y capacitación',
    archivo: 'FOR Acta QA adición de teléfonos y capacitación.docx',
    icon: 'ti-phone-plus',
  },
  qa_hotspots: {
    id: 'qa_hotspots',
    nombre: 'Acta QA HOTSPOTS',
    archivo: 'FOR Acta QA HOTSPOTS.docx',
    icon: 'ti-wifi',
  },
  qa_instalacion_wlan: {
    id: 'qa_instalacion_wlan',
    nombre: 'Acta QA Instalación WLAN',
    archivo: 'FOR Acta QA Instalación WLAN.docx',
    icon: 'ti-router',
  },
  qa_internet_dedicado_empresarial: {
    id: 'qa_internet_dedicado_empresarial',
    nombre: 'Acta QA Internet dedicado empresarial',
    archivo: 'FOR Acta QA Internet dedicado empresarial.docx',
    icon: 'ti-building-broadcast-tower',
  },
  qa_internet_dedicado_front_end: {
    id: 'qa_internet_dedicado_front_end',
    nombre: 'Acta QA Internet dedicado Front end',
    archivo: 'FOR Acta QA Internet dedicado Front end.docx',
    icon: 'ti-world',
  },
  qa_internet_seguro_corporativo: {
    id: 'qa_internet_seguro_corporativo',
    nombre: 'Acta QA Internet Seguro Corporativo',
    archivo: 'FOR Acta QA Internet Seguro Corporativo.docx',
    icon: 'ti-shield-check',
  },
  qa_ip_data: {
    id: 'qa_ip_data',
    nombre: 'Acta QA IP Data',
    archivo: 'FOR Acta QA IP Data.docx',
    icon: 'ti-network',
  },
  qa_mpls: {
    id: 'qa_mpls',
    nombre: 'Acta QA MPLS',
    archivo: 'FOR Acta QA MPLS.docx',
    icon: 'ti-cloud-network',
  },
  qa_pls_ipl: {
    id: 'qa_pls_ipl',
    nombre: 'Acta QA PLS-IPL',
    archivo: 'FOR Acta QA PLS-IPL.docx',
    icon: 'ti-route',
  },
  qa_protocolo_pruebas_backup: {
    id: 'qa_protocolo_pruebas_backup',
    nombre: 'Acta QA Protocolo pruebas backup',
    archivo: 'FOR Acta QA Protocolo pruebas backup.docx',
    icon: 'ti-database-export',
  },
  qa_servicios_internet_telefonia_ultrawifi_mpls: {
    id: 'qa_servicios_internet_telefonia_ultrawifi_mpls',
    nombre: 'Acta QA Servicios internet telefonía ultrawifi y MPLS',
    archivo: 'FOR Acta QA Servicios internet telefonia ultrawifi y MPLS.docx',
    icon: 'ti-devices',
  },
  qa_site_survey_lan_administrada: {
    id: 'qa_site_survey_lan_administrada',
    nombre: 'Acta QA site survey LAN administrada',
    archivo: 'FOR Acta QA site survey Lan administrada.docx',
    icon: 'ti-clipboard-search',
  },
  qa_site_survey_wlan: {
    id: 'qa_site_survey_wlan',
    nombre: 'Acta QA site survey WLAN',
    archivo: 'FOR Acta QA site survey WLAN.docx',
    icon: 'ti-wifi-2',
  },
  qa_sw_lan_administrada: {
    id: 'qa_sw_lan_administrada',
    nombre: 'Acta QA SW LAN administrada',
    archivo: 'FOR Acta QA SW Lan administrada.docx',
    icon: 'ti-server',
  },
  qa_telefonia_analoga_basica: {
    id: 'qa_telefonia_analoga_basica',
    nombre: 'Acta QA Telefonía Análoga Básica',
    archivo: 'FOR Acta QA Telefonía Análoga Básica.docx',
    icon: 'ti-phone',
  },
  qa_telefonia_digital_e1: {
    id: 'qa_telefonia_digital_e1',
    nombre: 'Acta QA Telefonía digital E1',
    archivo: 'FOR Acta QA Telefonía digital E1.docx',
    icon: 'ti-phone-call',
  },
  qa_telefonia_pbx_administrada: {
    id: 'qa_telefonia_pbx_administrada',
    nombre: 'Acta QA Telefonía PBX Administrada',
    archivo: 'FOR Acta QA Telefonía PBX Administrada.docx',
    icon: 'ti-phone-calling',
  },
  qa_telefonia_troncal_sip_gateway_centralizada: {
    id: 'qa_telefonia_troncal_sip_gateway_centralizada',
    nombre: 'Acta QA Telefonía Troncal SIP Gateway y Centralizada',
    archivo: 'FOR Acta QA Telefonía Troncal SIP Gateway y Centralizada.docx',
    icon: 'ti-antenna-bars-5',
  },
  qa_videoconferencia: {
    id: 'qa_videoconferencia',
    nombre: 'Acta QA Videoconferencia',
    archivo: 'FOR Acta QA Videoconferencia.docx',
    icon: 'ti-video',
  },
};

function getFormatoQa(tipoFormato) {
  return FORMATOS_QA[tipoFormato] || FORMATOS_QA.qa_mpls;
}

function getFormatosQaList() {
  return Object.values(FORMATOS_QA);
}

module.exports = {
  FORMATOS_QA,
  getFormatoQa,
  getFormatosQaList,
};