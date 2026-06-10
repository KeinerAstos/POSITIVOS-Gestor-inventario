// Frontend/src/config/formatosQaSchema.js
// Schema real construido a partir de los 19 formatos Word QA.
// Este archivo define qué secciones y qué campos específicos se muestran por tipo_formato.

const SI_NO = [
  { value: 'SI', label: 'SI' },
  { value: 'NO', label: 'NO' },
];

const SI_NO_NA = [
  { value: 'SI', label: 'SI' },
  { value: 'NO', label: 'NO' },
  { value: 'N/A', label: 'N/A' },
];

const OK_NOK_NA = [
  { value: 'OK', label: 'OK' },
  { value: 'NO OK', label: 'NO OK' },
  { value: 'N/A', label: 'N/A' },
];

const TIPO_SEGURIDAD_WIFI = [
  'Abierta',
  'WPA',
  'WPA2',
  'WPA3',
  'WPA/WPA2 Enterprise',
  'Portal cautivo',
  'Otro',
];

const RADIOS_WIFI = [
  '2.4 GHz',
  '5 GHz',
  '2.4 GHz y 5 GHz',
  'MIMO',
  'Otro',
];

const BASE_COMMON_SECTIONS = [
  'datos_generales',
  'tiempos',
  'equipos_medicion',
  'mediciones_electricas',
  'equipos_instalados',
  'fotografico',
  'conexiones_entrega',
  'observaciones_cierre',
  'foto_acta_entrega',
];

const WITH_DESINSTALADOS = [
  ...BASE_COMMON_SECTIONS.slice(0, 5),
  'equipos_desinstalados',
  ...BASE_COMMON_SECTIONS.slice(5),
];

const f = ({ key, label, type = 'text', group, required = false, options, rows = 3, placeholder = '' }) => ({
  key,
  label,
  type,
  group,
  required,
  options,
  rows,
  placeholder,
});

const evidencia = (key, label, group = 'evidencias') =>
  f({ key, label, type: 'textarea', group, rows: 4 });

const prueba = (key, label, group = 'pruebas', required = false) =>
  f({ key, label, type: 'select', group, required, options: SI_NO_NA });

const textoPrueba = (key, label, group = 'pruebas') =>
  f({ key, label, type: 'textarea', group, rows: 3 });

const conexionEntregaFields = [
  f({ key: 'cliente_conectado_equipos_claro', label: 'Equipos del cliente conectados a equipos Claro', type: 'select', group: 'conexiones_entrega', options: SI_NO, required: true }),
  f({ key: 'cliente_disponible_configurado', label: 'Equipos del cliente disponibles y configurados adecuadamente', type: 'select', group: 'conexiones_entrega', options: SI_NO, required: true }),
  f({ key: 'observaciones_conexiones_entrega', label: 'Observaciones de conexiones y entrega', type: 'textarea', group: 'conexiones_entrega', rows: 4 }),
];

const cpeFields = [
  evidencia('config_cpe', 'Configuración del CPE', 'configuracion_cpe'),
];

const internetFields = [
  evidencia('version_firmware_equipos', 'Evidencia de versión o firmware de los equipos', 'internet'),
  evidencia('configuracion_router', 'Evidencia de configuración de equipo Router', 'internet'),
  evidencia('conectividad_router_cliente', 'Conectividad entre equipo terminal del cliente y Router', 'internet'),
  evidencia('conectividad_cliente_internet', 'Conectividad entre equipo terminal del cliente hacia Internet', 'internet'),
  evidencia('registro_saturacion', 'Registro de saturación', 'internet'),
];

const telefoniaCalidadFields = [
  f({ key: 'numero_prueba_claro', label: 'Número de prueba Claro', type: 'text', group: 'telefonia_calidad', placeholder: 'Ej: 7480000' }),
  f({ key: 'numero_prueba_otro_operador', label: 'Número de prueba otro operador', type: 'text', group: 'telefonia_calidad' }),
  f({ key: 'llamada_entrante', label: 'Establecimiento llamada entrante', type: 'select', group: 'telefonia_calidad', options: SI_NO_NA }),
  f({ key: 'llamada_saliente', label: 'Establecimiento llamada saliente', type: 'select', group: 'telefonia_calidad', options: SI_NO_NA }),
  f({ key: 'audio_ok', label: 'Audio', type: 'select', group: 'telefonia_calidad', options: SI_NO_NA }),
  f({ key: 'retardo_eco', label: 'Retardo / ECO', type: 'select', group: 'telefonia_calidad', options: SI_NO_NA }),
  f({ key: 'ruido', label: 'Ruido', type: 'select', group: 'telefonia_calidad', options: SI_NO_NA }),
  f({ key: 'tonos_dtmf', label: 'Reconoce tonos DTMF', type: 'select', group: 'telefonia_calidad', options: SI_NO_NA }),
  f({ key: 'observaciones_calidad_voz', label: 'Observaciones calidad de voz', type: 'textarea', group: 'telefonia_calidad', rows: 4 }),
];

const faxFields = [
  f({ key: 'fax_numero_destino', label: 'Número destino Fax', type: 'text', group: 'fax' }),
  f({ key: 'fax_recibido', label: 'Se recibió el Fax de prueba', type: 'select', group: 'fax', options: SI_NO_NA }),
  f({ key: 'fax_entregado', label: 'Se entregó el Fax de prueba', type: 'select', group: 'fax', options: SI_NO_NA }),
  f({ key: 'fax_observaciones', label: 'Observaciones Fax', type: 'textarea', group: 'fax', rows: 3 }),
];

export const QA_SCHEMAS = {
  qa_adicion_telefonos_capacitacion: {
    id: 'qa_adicion_telefonos_capacitacion',
    nombre: 'Acta QA adición de teléfonos y capacitación',
    secciones: [...WITH_DESINSTALADOS, 'telefonia_funcionalidades', 'capacitacion'],
    grupos: [
      { key: 'telefonia_funcionalidades', title: 'Pruebas de servicios - Adición de teléfonos', icon: 'ti-phone-plus', cols: 3 },
      { key: 'capacitacion', title: 'Capacitación de usuarios', icon: 'ti-school', cols: 2 },
      { key: 'conexiones_entrega', title: 'Conexiones y entrega', icon: 'ti-plug-connected', cols: 2 },
    ],
    camposExtra: [
      prueba('srst_sin_wan_call_manager', 'SRST - sin WAN / sin Call Manager', 'telefonia_funcionalidades', true),
      prueba('movilidad_extensiones_password', 'Movilidad de extensiones / password', 'telefonia_funcionalidades'),
      prueba('rotacion_llamada_grupos', 'Rotación de llamada en grupos', 'telefonia_funcionalidades'),
      prueba('identificador_llamadas', 'Identificador de llamadas', 'telefonia_funcionalidades'),
      prueba('llamada_espera', 'Llamada en espera', 'telefonia_funcionalidades'),
      prueba('musica_espera', 'Música en espera corporativa', 'telefonia_funcionalidades'),
      prueba('transferencia_llamadas', 'Transferencia de llamadas', 'telefonia_funcionalidades'),
      prueba('conferencia', 'Conferencia', 'telefonia_funcionalidades'),
      prueba('conexion_dos_llamadas_conferencia', 'Conexión de dos llamadas para conferencia', 'telefonia_funcionalidades'),
      prueba('rellamada', 'Rellamada', 'telefonia_funcionalidades'),
      prueba('desvio_llamadas', 'Desvío de llamadas', 'telefonia_funcionalidades'),
      prueba('marcado_rapido', 'Marcado rápido gerente/subgerente', 'telefonia_funcionalidades'),
      prueba('restriccion_celular', 'Restricción celular', 'telefonia_funcionalidades'),
      prueba('restriccion_ldn', 'Restricción larga distancia nacional', 'telefonia_funcionalidades'),
      prueba('restriccion_ldi', 'Restricción larga distancia internacional', 'telefonia_funcionalidades'),
      prueba('restriccion_llamada_local', 'Restricción llamada local', 'telefonia_funcionalidades'),
      prueba('restriccion_llamada_interna', 'Restricción llamada interna', 'telefonia_funcionalidades'),
      prueba('directorio_corporativo', 'Directorio corporativo', 'telefonia_funcionalidades'),
      prueba('llamadas_perdidas', 'Llamadas perdidas', 'telefonia_funcionalidades'),
      prueba('captura_llamada_extensiones', 'Captura de llamada entre extensiones', 'telefonia_funcionalidades'),
      prueba('llamada_entre_extensiones', 'Llamada entre extensiones', 'telefonia_funcionalidades'),
      prueba('password_telefono_extension_movil', 'Password en teléfono / extensión móvil', 'telefonia_funcionalidades'),
      prueba('directorio_personalizado', 'Directorio personalizado', 'telefonia_funcionalidades'),
      prueba('extensiones_analogas_fax', 'Pruebas extensiones análogas / Fax', 'telefonia_funcionalidades'),
      prueba('buzon_voz_saludo', 'Buzón de voz - saludo', 'telefonia_funcionalidades'),
      prueba('buzon_mensajes_cero', 'Buzón de mensajes - funcionalidad cero', 'telefonia_funcionalidades'),
      f({ key: 'capacitacion_realizada', label: 'Capacitación realizada', type: 'select', group: 'capacitacion', options: SI_NO_NA, required: true }),
      f({ key: 'observaciones_capacitacion', label: 'Observaciones sobre capacitación de usuarios', type: 'textarea', group: 'capacitacion', rows: 4 }),
      f({ key: 'formatos_capacitacion_anexos', label: 'Formatos de capacitación firmados anexos', type: 'select', group: 'capacitacion', options: SI_NO_NA }),
      f({ key: 'observaciones_actividad', label: 'Observaciones de la actividad', type: 'textarea', group: 'capacitacion', rows: 4 }),
      ...conexionEntregaFields,
    ],
  },

  qa_hotspots: {
    id: 'qa_hotspots',
    nombre: 'Acta QA HOTSPOTS',
    secciones: [...WITH_DESINSTALADOS, 'pruebas_basicas', 'router_cpe', 'hotspots'],
    grupos: [
      { key: 'pruebas_basicas', title: 'Pruebas de servicios', icon: 'ti-network', cols: 1 },
      { key: 'router_cpe', title: 'Router / CPE', icon: 'ti-router', cols: 1 },
      { key: 'hotspots', title: 'Pruebas / documentación específica solicitada por cliente', icon: 'ti-wifi', cols: 2 },
      { key: 'conexiones_entrega', title: 'Conexiones y entrega', icon: 'ti-plug-connected', cols: 2 },
    ],
    camposExtra: [
      textoPrueba('ping_oficina_principal', 'Resultado ping a oficina principal', 'pruebas_basicas'),
      textoPrueba('traceroute_oficina_principal', 'Resultado traceroute a oficina principal', 'pruebas_basicas'),
      evidencia('version_firmware_equipos', 'Evidencia de versión o firmware de los equipos', 'router_cpe'),
      evidencia('configuracion_router', 'Evidencia de configuración de equipo Router', 'router_cpe'),
      evidencia('config_cpe', 'Configuración del CPE', 'router_cpe'),
      f({ key: 'verificacion_internet_router', label: 'Conectividad a Internet directo desde router', type: 'select', group: 'hotspots', options: OK_NOK_NA, required: true }),
      evidencia('evidencia_conectividad_router', 'Pantallazo evidencia conectividad a Internet desde router', 'hotspots'),
      f({ key: 'documentacion_especifica_cliente', label: 'Pruebas / documentación específica solicitada por cliente', type: 'textarea', group: 'hotspots', rows: 5 }),
      ...conexionEntregaFields,
    ],
  },

  qa_instalacion_wlan: {
    id: 'qa_instalacion_wlan',
    nombre: 'Acta QA Instalación WLAN',
    secciones: [...WITH_DESINSTALADOS, 'wlan_topologia', 'wlan_atributos', 'wlan_entrega', 'diagrama_aps'],
    grupos: [
      { key: 'wlan_topologia', title: 'Pruebas de servicio WLAN', icon: 'ti-wifi', cols: 2 },
      { key: 'wlan_atributos', title: 'Atributos conexión del cliente', icon: 'ti-shield-check', cols: 2 },
      { key: 'diagrama_aps', title: 'Diagrama ubicación de APs', icon: 'ti-map-pin', cols: 1 },
      { key: 'conexiones_entrega', title: 'Conexiones y entrega', icon: 'ti-plug-connected', cols: 2 },
    ],
    camposExtra: [
      f({ key: 'topologia_wlan', label: 'Topología WLAN', type: 'select', group: 'wlan_topologia', required: true, options: ['Centralizada', 'Stand Alone / APs Autónomos', 'Mixta'] }),
      prueba('verificacion_configuracion_wlc', 'Verificación configuración controladora WLC', 'wlan_topologia'),
      prueba('verificacion_ip', 'Verificación IP', 'wlan_topologia'),
      prueba('verificacion_seguridad_wireless', 'Verificación seguridad Wireless', 'wlan_topologia'),
      prueba('verificacion_roaming', 'Verificación de roaming', 'wlan_topologia'),
      prueba('verificacion_cubrimiento_roaming', 'Verificación cubrimiento cliente roaming', 'wlan_topologia'),
      prueba('site_survey_post_instalacion', 'Site survey post instalación', 'wlan_topologia', true),
      evidencia('diagrama_potencia_rf', 'Diagrama de potencia RF por cada AP', 'wlan_topologia'),
      prueba('cliente_autentica', 'El cliente se autentica', 'wlan_atributos', true),
      f({ key: 'tipo_seguridad_wifi', label: 'Tipo de seguridad', type: 'select', group: 'wlan_atributos', options: TIPO_SEGURIDAD_WIFI, required: true }),
      prueba('passwords_definidos_validos', 'Se autentica usando passwords definidos', 'wlan_atributos'),
      prueba('roaming_configurado', 'Se configuró roaming', 'wlan_atributos'),
      f({ key: 'rssi_transicion_celdas', label: 'RSSI transición entre celdas', type: 'text', group: 'wlan_atributos' }),
      evidencia('analizador_espectro_wifi', 'Pantallazo analizador de espectro WiFi', 'wlan_atributos'),
      prueba('transicion_clientes_aps', 'Transición de clientes entre APs', 'wlan_atributos'),
      textoPrueba('ping_extendido_paquetes_perdidos', 'Ping extendido / paquetes perdidos', 'wlan_atributos'),
      prueba('incluye_vowifi', 'Incluye VoWiFi', 'wlan_atributos'),
      prueba('telefonos_inalambricos_conectados', 'Teléfonos inalámbricos permanecen conectados', 'wlan_atributos'),
      f({ key: 'calidad_conexion_voz', label: 'Calidad conexión de voz', type: 'textarea', group: 'wlan_atributos', rows: 3, placeholder: 'Eco, interferencia, ruido, etc.' }),
      f({ key: 'radios_habilitados', label: 'Radios habilitados en la red', type: 'select', group: 'wlan_atributos', options: RADIOS_WIFI }),
      textoPrueba('prueba_redundancia_controladora', 'Prueba redundancia controladora / etherchannel', 'wlan_atributos'),
      evidencia('identificacion_ubicaciones_aps', 'Identificación ubicaciones APs', 'diagrama_aps'),
      ...conexionEntregaFields,
    ],
  },

  qa_internet_dedicado_empresarial: {
    id: 'qa_internet_dedicado_empresarial',
    nombre: 'Acta QA Internet dedicado empresarial',
    secciones: [...WITH_DESINSTALADOS, 'internet'],
    grupos: [
      { key: 'internet', title: 'Pruebas de servicio Internet Dedicado', icon: 'ti-world', cols: 1 },
      { key: 'conexiones_entrega', title: 'Conexiones y entrega', icon: 'ti-plug-connected', cols: 2 },
    ],
    camposExtra: [...internetFields, ...conexionEntregaFields],
  },

  qa_internet_dedicado_front_end: {
    id: 'qa_internet_dedicado_front_end',
    nombre: 'Acta QA Internet dedicado Front end',
    secciones: [...WITH_DESINSTALADOS, 'internet_frontend'],
    grupos: [
      { key: 'internet_frontend', title: 'Pruebas de servicio Internet Dedicado Front End', icon: 'ti-world', cols: 1 },
      { key: 'conexiones_entrega', title: 'Conexiones y entrega', icon: 'ti-plug-connected', cols: 2 },
    ],
    camposExtra: [
      evidencia('version_firmware_equipos', 'Evidencia de versión o firmware de los equipos', 'internet_frontend'),
      evidencia('configuracion_router', 'Evidencia de configuración de equipo Router', 'internet_frontend'),
      evidencia('conectividad_router_internet', 'Conectividad desde router hacia Internet', 'internet_frontend'),
      evidencia('gestion_cliente_router', 'Gestión del cliente al Router', 'internet_frontend'),
      ...conexionEntregaFields,
    ],
  },

  qa_internet_seguro_corporativo: {
    id: 'qa_internet_seguro_corporativo',
    nombre: 'Acta QA Internet Seguro Corporativo',
    secciones: [...WITH_DESINSTALADOS, 'meraki'],
    grupos: [
      { key: 'meraki', title: 'Pruebas Claro Internet Seguro Corporativo', icon: 'ti-shield-check', cols: 1 },
      { key: 'conexiones_entrega', title: 'Conexiones y entrega', icon: 'ti-plug-connected', cols: 2 },
    ],
    camposExtra: [
      evidencia('meraki_registrado_dashboard', 'Equipo Meraki MX registrado en Dashboard', 'meraki'),
      evidencia('meraki_configuracion_dashboard', 'Configuración Meraki MX congruente con anexo/perfil', 'meraki'),
      evidencia('meraki_conectividad_cliente_router', 'Conectividad cliente hacia Router Meraki MX', 'meraki'),
      evidencia('meraki_conectividad_cliente_internet', 'Conectividad cliente hacia Internet', 'meraki'),
      ...conexionEntregaFields,
    ],
  },

  qa_ip_data: {
    id: 'qa_ip_data',
    nombre: 'Acta QA IP Data',
    secciones: [...WITH_DESINSTALADOS, 'ip_data', 'configuracion_cpe'],
    grupos: [
      { key: 'ip_data', title: 'Pruebas de servicios IP Data', icon: 'ti-network', cols: 1 },
      { key: 'configuracion_cpe', title: 'Configuración del CPE', icon: 'ti-router', cols: 1 },
      { key: 'conexiones_entrega', title: 'Conexiones y entrega', icon: 'ti-plug-connected', cols: 2 },
    ],
    camposExtra: [
      evidencia('version_firmware_equipos', 'Evidencia de versión o firmware de los equipos', 'ip_data'),
      textoPrueba('ping_oficina_principal', 'Ping / traceroute oficina principal', 'ip_data'),
      textoPrueba('ping_punto_remoto_extranet', 'Ping / traceroute punto remoto Extranet', 'ip_data'),
      evidencia('funcionamiento_encripcion', 'Funcionamiento de encripción si aplica', 'ip_data'),
      f({ key: 'observaciones_ip_data', label: 'Observaciones IP Data', type: 'textarea', group: 'ip_data', rows: 4 }),
      ...cpeFields,
      ...conexionEntregaFields,
    ],
  },

  qa_mpls: {
    id: 'qa_mpls',
    nombre: 'Acta QA MPLS',
    secciones: [...WITH_DESINSTALADOS, 'pruebas_basicas', 'mpls', 'configuracion_cpe'],
    grupos: [
      { key: 'pruebas_basicas', title: 'Pruebas de servicios', icon: 'ti-network', cols: 1 },
      { key: 'mpls', title: 'Pruebas MPLS avanzado / transaccional', icon: 'ti-cloud-network', cols: 1 },
      { key: 'configuracion_cpe', title: 'Configuración del CPE', icon: 'ti-router', cols: 1 },
      { key: 'conexiones_entrega', title: 'Conexiones y entrega', icon: 'ti-plug-connected', cols: 2 },
    ],
    camposExtra: [
      textoPrueba('ping_oficina_principal', 'Ping / traceroute oficina principal', 'pruebas_basicas'),
      textoPrueba('ping_punto_remoto_extranet', 'Ping / traceroute punto remoto Extranet', 'pruebas_basicas'),
      evidencia('funcionamiento_encripcion', 'Funcionamiento de encripción si aplica', 'pruebas_basicas'),
      evidencia('version_firmware_equipos', 'Evidencia de versión o firmware de los equipos', 'mpls'),
      evidencia('configuracion_router', 'Evidencia de configuración de equipo Router', 'mpls'),
      evidencia('arp_lan_ping', 'Registro ARP desde LAN + prueba de ping', 'mpls'),
      evidencia('conectividad_punto_central_interconexiones', 'Conectividad hacia punto central e interconexiones', 'mpls'),
      evidencia('registro_saturacion', 'Registro de saturación', 'mpls'),
      evidencia('servicios_transaccionales_3g', 'Servicios transaccionales 3G / Potencia / IP asignada', 'mpls'),
      ...cpeFields,
      ...conexionEntregaFields,
    ],
  },

  qa_pls_ipl: {
    id: 'qa_pls_ipl',
    nombre: 'Acta QA PLS-IPL',
    secciones: [...WITH_DESINSTALADOS, 'pls_ipl'],
    grupos: [
      { key: 'pls_ipl', title: 'Pruebas de servicio PLS / IPL / PL Ethernet', icon: 'ti-route', cols: 1 },
      { key: 'conexiones_entrega', title: 'Conexiones y entrega', icon: 'ti-plug-connected', cols: 2 },
    ],
    camposExtra: [
      evidencia('pruebas_pls_ipl', 'Pruebas de servicio PLS / IPL / PL Ethernet', 'pls_ipl'),
      evidencia('conectividad_extremo_a', 'Conectividad extremo A', 'pls_ipl'),
      evidencia('conectividad_extremo_b', 'Conectividad extremo B', 'pls_ipl'),
      evidencia('prueba_transparencia_vlan', 'Prueba de transparencia VLAN / Ethernet', 'pls_ipl'),
      ...conexionEntregaFields,
    ],
  },

  qa_protocolo_pruebas_backup: {
    id: 'qa_protocolo_pruebas_backup',
    nombre: 'Acta QA Protocolo pruebas backup',
    secciones: [...WITH_DESINSTALADOS, 'backup', 'configuracion_cpe'],
    grupos: [
      { key: 'backup', title: 'Pruebas de servicio Backup', icon: 'ti-database-export', cols: 1 },
      { key: 'configuracion_cpe', title: 'Configuración del CPE', icon: 'ti-router', cols: 1 },
      { key: 'conexiones_entrega', title: 'Conexiones y entrega', icon: 'ti-plug-connected', cols: 2 },
    ],
    camposExtra: [
      textoPrueba('traceroute_enlace_principal', 'Traceroute enlaces soportados por Backup - Principal', 'backup'),
      textoPrueba('traceroute_enlace_backup', 'Traceroute enlaces soportados por Backup - Backup', 'backup'),
      textoPrueba('traceroute_enlaces_activos_cliente', 'Traceroute enlaces activos del cliente', 'backup'),
      f({ key: 'conmutacion_backup_exitosa', label: 'Conmutación a backup exitosa', type: 'select', group: 'backup', options: SI_NO_NA, required: true }),
      f({ key: 'retorno_principal_exitoso', label: 'Retorno a enlace principal exitoso', type: 'select', group: 'backup', options: SI_NO_NA }),
      f({ key: 'tiempo_convergencia_backup', label: 'Tiempo de convergencia backup', type: 'text', group: 'backup' }),
      f({ key: 'observaciones_backup', label: 'Observaciones Backup', type: 'textarea', group: 'backup', rows: 4 }),
      ...cpeFields,
      ...conexionEntregaFields,
    ],
  },

  qa_servicios_internet_telefonia_ultrawifi_mpls: {
    id: 'qa_servicios_internet_telefonia_ultrawifi_mpls',
    nombre: 'Acta QA Servicios internet telefonía ultrawifi y MPLS',
    secciones: [...WITH_DESINSTALADOS, 'servicios_integrados', 'internet', 'telefonia_publica', 'telefonia_calidad', 'mpls', 'wifi_mesh', 'meraki', 'configuracion_cpe'],
    grupos: [
      { key: 'servicios_integrados', title: 'Servicios instalados / aplicables', icon: 'ti-devices', cols: 2 },
      { key: 'internet', title: 'Pruebas Internet', icon: 'ti-world', cols: 1 },
      { key: 'telefonia_publica', title: 'Pruebas telefonía pública', icon: 'ti-phone', cols: 1 },
      { key: 'telefonia_calidad', title: 'Pruebas calidad de voz', icon: 'ti-phone-check', cols: 2 },
      { key: 'mpls', title: 'Pruebas MPLS', icon: 'ti-cloud-network', cols: 1 },
      { key: 'wifi_mesh', title: 'Pruebas WiFi Mesh', icon: 'ti-wifi', cols: 1 },
      { key: 'meraki', title: 'Claro Internet Seguro', icon: 'ti-shield-check', cols: 1 },
      { key: 'configuracion_cpe', title: 'Configuración del CPE', icon: 'ti-router', cols: 1 },
      { key: 'conexiones_entrega', title: 'Conexiones y entrega', icon: 'ti-plug-connected', cols: 2 },
    ],
    camposExtra: [
      f({ key: 'aplica_internet', label: 'Aplica Internet', type: 'checkbox', group: 'servicios_integrados' }),
      f({ key: 'aplica_telefonia_analoga', label: 'Aplica Telefonía Análoga Básica', type: 'checkbox', group: 'servicios_integrados' }),
      f({ key: 'aplica_troncal_sip', label: 'Aplica Troncal SIP / Gateway / Centralizada', type: 'checkbox', group: 'servicios_integrados' }),
      f({ key: 'aplica_telefonia_e1', label: 'Aplica Telefonía Digital E1', type: 'checkbox', group: 'servicios_integrados' }),
      f({ key: 'aplica_pbx_virtual', label: 'Aplica PBX Virtual', type: 'checkbox', group: 'servicios_integrados' }),
      f({ key: 'aplica_mpls', label: 'Aplica MPLS', type: 'checkbox', group: 'servicios_integrados' }),
      f({ key: 'aplica_wifi_mesh', label: 'Aplica WiFi Mesh', type: 'checkbox', group: 'servicios_integrados' }),
      f({ key: 'aplica_internet_seguro', label: 'Aplica Internet Seguro', type: 'checkbox', group: 'servicios_integrados' }),
      ...internetFields,
      evidencia('telefonia_version_firmware', 'Telefonía - Evidencia de versión o firmware', 'telefonia_publica'),
      evidencia('telefonia_config_router_terminales', 'Telefonía - Configuración router y terminales de voz', 'telefonia_publica'),
      evidencia('telefonia_conectividad_terminal_router', 'Telefonía - Conectividad terminal de voz hacia router', 'telefonia_publica'),
      evidencia('telefonia_conectividad_plataforma', 'Telefonía - Conectividad terminal hacia plataforma de voz', 'telefonia_publica'),
      evidencia('telefonia_registro_plataforma', 'Telefonía - Registro correcto hacia plataforma', 'telefonia_publica'),
      ...telefoniaCalidadFields,
      evidencia('mpls_pruebas', 'Pruebas de servicio MPLS', 'mpls'),
      evidencia('wifi_mesh_router_mesh', 'Conectividad desde Router hasta equipo MESH', 'wifi_mesh'),
      evidencia('wifi_mesh_plataforma_registro', 'Conexión a plataforma de registro WiFi Mesh', 'wifi_mesh'),
      evidencia('meraki_registrado_dashboard', 'Equipo Meraki MX registrado en Dashboard', 'meraki'),
      evidencia('meraki_configuracion_dashboard', 'Configuración Meraki MX', 'meraki'),
      evidencia('meraki_conectividad_cliente_router', 'Conectividad cliente hacia Router Meraki MX', 'meraki'),
      evidencia('meraki_conectividad_cliente_internet', 'Conectividad cliente hacia Internet', 'meraki'),
      ...cpeFields,
      ...conexionEntregaFields,
    ],
  },

  qa_site_survey_lan_administrada: {
    id: 'qa_site_survey_lan_administrada',
    nombre: 'Acta QA site survey LAN administrada',
    secciones: [...WITH_DESINSTALADOS, 'site_survey_lan', 'diagramas'],
    grupos: [
      { key: 'site_survey_lan', title: 'Pruebas de servicio Site Survey LAN Administrada', icon: 'ti-clipboard-search', cols: 2 },
      { key: 'diagramas', title: 'Diagramas', icon: 'ti-map', cols: 1 },
      { key: 'conexiones_entrega', title: 'Conexiones y entrega', icon: 'ti-plug-connected', cols: 2 },
    ],
    camposExtra: [
      f({ key: 'cantidad_racks', label: 'Cantidad de racks', type: 'number', group: 'site_survey_lan' }),
      f({ key: 'cantidad_switches_requeridos', label: 'Cantidad switches requeridos', type: 'number', group: 'site_survey_lan' }),
      f({ key: 'cantidad_puntos_red', label: 'Cantidad puntos de red', type: 'number', group: 'site_survey_lan' }),
      f({ key: 'estado_cableado', label: 'Estado del cableado', type: 'textarea', group: 'site_survey_lan', rows: 3 }),
      f({ key: 'energia_rack', label: 'Energía disponible en rack', type: 'select', group: 'site_survey_lan', options: SI_NO_NA }),
      f({ key: 'espacio_rack', label: 'Espacio disponible en rack', type: 'select', group: 'site_survey_lan', options: SI_NO_NA }),
      evidencia('diagrama_cuarto_equipos', 'Diagrama de cuarto de equipos', 'diagramas'),
      evidencia('diagrama_detalle_racks', 'Diagrama de detalle en los racks', 'diagramas'),
      ...conexionEntregaFields,
    ],
  },

  qa_site_survey_wlan: {
    id: 'qa_site_survey_wlan',
    nombre: 'Acta QA site survey WLAN',
    secciones: [...WITH_DESINSTALADOS, 'site_survey_wlan', 'diagramas', 'equipos_propuestos'],
    grupos: [
      { key: 'site_survey_wlan', title: 'Pruebas de servicio Site Survey WLAN', icon: 'ti-wifi', cols: 2 },
      { key: 'diagramas', title: 'Diagramas', icon: 'ti-map', cols: 1 },
      { key: 'equipos_propuestos', title: 'Equipos propuestos / ubicación', icon: 'ti-router', cols: 2 },
      { key: 'conexiones_entrega', title: 'Conexiones y entrega', icon: 'ti-plug-connected', cols: 2 },
    ],
    camposExtra: [
      f({ key: 'cantidad_pisos', label: 'Cantidad de pisos', type: 'number', group: 'site_survey_wlan', required: true }),
      f({ key: 'cantidad_usuarios', label: 'Cantidad estimada de usuarios', type: 'number', group: 'site_survey_wlan' }),
      f({ key: 'areas_cobertura', label: 'Áreas de cobertura requeridas', type: 'textarea', group: 'site_survey_wlan', rows: 4, required: true }),
      f({ key: 'tipo_seguridad_wifi', label: 'Tipo de seguridad WiFi requerida', type: 'select', group: 'site_survey_wlan', options: TIPO_SEGURIDAD_WIFI }),
      f({ key: 'observaciones_rf', label: 'Observaciones RF', type: 'textarea', group: 'site_survey_wlan', rows: 4 }),
      evidencia('diagrama_cuarto_equipos', 'Diagrama de cuarto de equipos', 'diagramas'),
      evidencia('diagrama_detalle_racks', 'Diagrama de detalle en los racks', 'diagramas'),
      f({ key: 'tipo_equipo_propuesto', label: 'Tipo de equipo propuesto', type: 'text', group: 'equipos_propuestos' }),
      f({ key: 'marca_equipo_propuesto', label: 'Marca equipo propuesto', type: 'text', group: 'equipos_propuestos' }),
      f({ key: 'cantidad_equipo_propuesto', label: 'Cantidad', type: 'number', group: 'equipos_propuestos' }),
      f({ key: 'ubicacion_equipo_propuesto', label: 'Ubicación', type: 'textarea', group: 'equipos_propuestos', rows: 3 }),
      ...conexionEntregaFields,
    ],
  },

  qa_sw_lan_administrada: {
    id: 'qa_sw_lan_administrada',
    nombre: 'Acta QA SW LAN administrada',
    secciones: [...BASE_COMMON_SECTIONS, 'sw_lan'],
    grupos: [
      { key: 'sw_lan', title: 'Switch LAN administrada', icon: 'ti-server', cols: 2 },
      { key: 'conexiones_entrega', title: 'Conexiones y entrega', icon: 'ti-plug-connected', cols: 2 },
    ],
    camposExtra: [
      f({ key: 'actividad_operativa_sin_novedad', label: 'Actividad operativa sin novedad', type: 'select', group: 'sw_lan', options: SI_NO_NA, required: true }),
      f({ key: 'cantidad_switches_instalados', label: 'Cantidad switches instalados', type: 'number', group: 'sw_lan' }),
      f({ key: 'vlans_configuradas', label: 'VLANs configuradas', type: 'textarea', group: 'sw_lan', rows: 3 }),
      f({ key: 'puertos_probados', label: 'Puertos probados', type: 'textarea', group: 'sw_lan', rows: 3 }),
      evidencia('evidencia_configuracion_switch', 'Evidencia configuración switch', 'sw_lan'),
      ...conexionEntregaFields,
    ],
  },

  qa_telefonia_analoga_basica: {
    id: 'qa_telefonia_analoga_basica',
    nombre: 'Acta QA Telefonía Análoga Básica',
    secciones: [...WITH_DESINSTALADOS, 'telefonia_publica', 'telefonia_calidad', 'fax'],
    grupos: [
      { key: 'telefonia_publica', title: 'Pruebas de servicio telefonía pública/privada', icon: 'ti-phone', cols: 1 },
      { key: 'telefonia_calidad', title: 'Pruebas calidad de voz', icon: 'ti-phone-check', cols: 2 },
      { key: 'fax', title: 'Pruebas de Fax', icon: 'ti-printer', cols: 2 },
      { key: 'conexiones_entrega', title: 'Conexiones y entrega', icon: 'ti-plug-connected', cols: 2 },
    ],
    camposExtra: [
      evidencia('version_firmware_equipos', 'Evidencia de versión o firmware de los equipos', 'telefonia_publica'),
      evidencia('configuracion_router_terminales_voz', 'Configuración router y terminales de voz', 'telefonia_publica'),
      evidencia('conectividad_terminal_router', 'Conectividad terminal de voz hacia router', 'telefonia_publica'),
      evidencia('conectividad_plataforma_voz', 'Conectividad terminal de voz hacia plataforma de voz', 'telefonia_publica'),
      evidencia('registro_plataforma_telefonia', 'Registro correcto hacia plataforma de telefonía', 'telefonia_publica'),
      ...telefoniaCalidadFields,
      ...faxFields,
      ...conexionEntregaFields,
    ],
  },

  qa_telefonia_digital_e1: {
    id: 'qa_telefonia_digital_e1',
    nombre: 'Acta QA Telefonía digital E1',
    secciones: [...WITH_DESINSTALADOS, 'telefonia_e1', 'telefonia_calidad', 'fax'],
    grupos: [
      { key: 'telefonia_e1', title: 'Pruebas de servicio telefonía pública - E1/T1', icon: 'ti-phone-call', cols: 1 },
      { key: 'telefonia_calidad', title: 'Pruebas calidad de voz', icon: 'ti-phone-check', cols: 2 },
      { key: 'fax', title: 'Pruebas de Fax', icon: 'ti-printer', cols: 2 },
      { key: 'conexiones_entrega', title: 'Conexiones y entrega', icon: 'ti-plug-connected', cols: 2 },
    ],
    camposExtra: [
      f({ key: 'numero_e1', label: 'Número E1/T1', type: 'text', group: 'telefonia_e1', required: true }),
      f({ key: 'piloto', label: 'Número piloto', type: 'text', group: 'telefonia_e1' }),
      f({ key: 'cantidad_canales', label: 'Cantidad de canales', type: 'number', group: 'telefonia_e1' }),
      f({ key: 'rango_dids', label: 'Rango DIDs', type: 'textarea', group: 'telefonia_e1', rows: 3 }),
      evidencia('version_firmware_equipos', 'Evidencia de versión o firmware', 'telefonia_e1'),
      evidencia('configuracion_router_terminales_voz', 'Configuración router y terminales de voz', 'telefonia_e1'),
      evidencia('conectividad_interconexion_plataforma', 'Conectividad equipo interconexión hacia plataforma de voz', 'telefonia_e1'),
      evidencia('conectividad_audiocodec', 'Conectividad equipo interconexión hacia audiocodec', 'telefonia_e1'),
      evidencia('estado_linea_protocolo_e1_t1', 'Verificación estado línea y protocolo interfaz E1/T1', 'telefonia_e1'),
      ...telefoniaCalidadFields,
      ...faxFields,
      ...conexionEntregaFields,
    ],
  },

  qa_telefonia_pbx_administrada: {
    id: 'qa_telefonia_pbx_administrada',
    nombre: 'Acta QA Telefonía PBX Administrada',
    secciones: [...WITH_DESINSTALADOS, 'pbx', 'telefonia_calidad', 'fax'],
    grupos: [
      { key: 'pbx', title: 'Pruebas de servicio telefonía PBX administrada', icon: 'ti-phone-calling', cols: 1 },
      { key: 'telefonia_calidad', title: 'Pruebas calidad de voz', icon: 'ti-phone-check', cols: 2 },
      { key: 'fax', title: 'Pruebas de Fax', icon: 'ti-printer', cols: 2 },
      { key: 'conexiones_entrega', title: 'Conexiones y entrega', icon: 'ti-plug-connected', cols: 2 },
    ],
    camposExtra: [
      f({ key: 'tipo_pbx_administrada', label: 'Tipo PBX administrada', type: 'text', group: 'pbx' }),
      evidencia('version_firmware_equipos', 'Evidencia de versión o firmware de equipos', 'pbx'),
      evidencia('configuracion_router_terminales_voz', 'Configuración router y terminales de voz', 'pbx'),
      evidencia('conectividad_interconexion_plataforma', 'Conectividad equipo interconexión hacia plataforma de voz', 'pbx'),
      evidencia('registro_telefonos_plataforma', 'Registro correcto desde teléfonos hacia plataforma', 'pbx'),
      evidencia('checklist_telefonos', 'Checklist por teléfono', 'pbx'),
      evidencia('pruebas_servicios_suplementarios', 'Pruebas servicios suplementarios', 'pbx'),
      evidencia('pruebas_supervivencia', 'Pruebas de supervivencia', 'pbx'),
      ...telefoniaCalidadFields,
      ...faxFields,
      f({ key: 'equipos_administrados_cliente_lan', label: 'Equipos administrados por cliente LAN', type: 'select', group: 'conexiones_entrega', options: SI_NO_NA }),
      ...conexionEntregaFields,
    ],
  },

  qa_telefonia_troncal_sip_gateway_centralizada: {
    id: 'qa_telefonia_troncal_sip_gateway_centralizada',
    nombre: 'Acta QA Telefonía Troncal SIP Gateway y Centralizada',
    secciones: [...WITH_DESINSTALADOS, 'troncal_sip', 'telefonia_calidad', 'fax'],
    grupos: [
      { key: 'troncal_sip', title: 'Pruebas telefonía Troncal SIP Gateway y Centralizada', icon: 'ti-antenna-bars-5', cols: 1 },
      { key: 'telefonia_calidad', title: 'Pruebas calidad de voz', icon: 'ti-phone-check', cols: 2 },
      { key: 'fax', title: 'Pruebas de Fax', icon: 'ti-printer', cols: 2 },
      { key: 'conexiones_entrega', title: 'Conexiones y entrega', icon: 'ti-plug-connected', cols: 2 },
    ],
    camposExtra: [
      f({ key: 'tipo_troncal_sip', label: 'Tipo de troncal SIP', type: 'select', group: 'troncal_sip', required: true, options: ['Gateway', 'Gateway con Centrex', 'Gateway tipo PBX distribuido', 'Centralizada', 'Centralizada tipo PBX distribuido', 'Otro'] }),
      evidencia('version_firmware_equipos', 'Evidencia de versión o firmware', 'troncal_sip'),
      evidencia('configuracion_router_terminales_voz', 'Configuración router y terminales de voz', 'troncal_sip'),
      evidencia('conectividad_interconexion_plataforma_voz', 'Conectividad interconexión hacia plataforma de voz', 'troncal_sip'),
      evidencia('conectividad_audiocodec', 'Conectividad hacia audiocodec', 'troncal_sip'),
      evidencia('conectividad_audiocodec_no_estandar', 'Conectividad audiocodec solución no estándar', 'troncal_sip'),
      evidencia('registro_planta_pim', 'Registro correcto hacia plataforma desde planta PIM', 'troncal_sip'),
      evidencia('pruebas_servicios_suplementarios', 'Pruebas servicios suplementarios', 'troncal_sip'),
      ...telefoniaCalidadFields,
      ...faxFields,
      ...conexionEntregaFields,
    ],
  },

  qa_videoconferencia: {
    id: 'qa_videoconferencia',
    nombre: 'Acta QA Videoconferencia',
    secciones: [...WITH_DESINSTALADOS, 'videoconferencia', 'configuracion_cpe'],
    grupos: [
      { key: 'videoconferencia', title: 'Pruebas de videoconferencia', icon: 'ti-video', cols: 2 },
      { key: 'configuracion_cpe', title: 'Configuración del CPE', icon: 'ti-router', cols: 1 },
      { key: 'conexiones_entrega', title: 'Conexiones y entrega', icon: 'ti-plug-connected', cols: 2 },
    ],
    camposExtra: [
      textoPrueba('ping_gatekeeper_claro', 'Ping / traceroute Gatekeeper Claro 172.31.237.195', 'videoconferencia'),
      textoPrueba('ping_mcu_claro', 'Ping / traceroute MCU Claro 172.31.237.198', 'videoconferencia'),
      textoPrueba('ping_emp_mcu_claro', 'Ping / traceroute módulo EMP MCU Claro 172.31.237.199', 'videoconferencia'),
      textoPrueba('ping_cpe_terminal_camara', 'Ping CPE hacia terminal/cámara videoconferencia', 'videoconferencia'),
      prueba('sesion_video_punto_punto', 'Sesión de video punto a punto', 'videoconferencia', true),
      prueba('sesion_video_multipunto', 'Sesión de video punto a multipunto', 'videoconferencia'),
      prueba('duo_video_comunicaciones_unificadas', 'Duo video por comunicaciones unificadas', 'videoconferencia'),
      prueba('video_llamadas_internet', 'Video llamadas por Internet si aplica', 'videoconferencia'),
      prueba('llamadas_salida', 'Llamadas de salida', 'videoconferencia'),
      prueba('llamadas_entrantes', 'Llamadas entrantes', 'videoconferencia'),
      evidencia('registro_camara_scu', 'Pantallazo registro cámara en sistema comunicaciones unificadas', 'videoconferencia'),
      prueba('apps_instaladas_cliente', 'Aplicaciones instaladas en equipos del cliente', 'videoconferencia'),
      f({ key: 'sistemas_operativos_apps', label: 'Sistemas operativos donde se instalan aplicaciones', type: 'textarea', group: 'videoconferencia', rows: 3 }),
      prueba('funciona_punto_punto_multipunto', 'Funcionan conexiones punto a punto y multipunto', 'videoconferencia'),
      prueba('videoconferencia_prueba_establecida', 'Se estableció videoconferencia de prueba', 'videoconferencia', true),
      prueba('solicito_password', 'Solicitó password al establecer videoconferencia', 'videoconferencia'),
      prueba('audio_en_prueba', 'Videoconferencia de prueba con audio', 'videoconferencia'),
      prueba('video_en_prueba', 'Videoconferencia de prueba con video', 'videoconferencia'),
      prueba('qos_configurado_cpe', 'QoS configurado en CPE', 'videoconferencia'),
      prueba('establecimiento_automatico', 'Proceso automático de establecimiento', 'videoconferencia'),
      prueba('wan_0_errors_crc', '0 input errors y 0 CRC interfaz WAN CPE', 'videoconferencia'),
      prueba('lan_0_errors_crc', '0 input errors y 0 CRC interfaz LAN videoconferencia', 'videoconferencia'),
      prueba('duo_video_prueba', 'Duo video en conferencia de prueba', 'videoconferencia'),
      prueba('sesion_jabber_punto_punto', 'Sesión video punto a punto desde Jabber', 'videoconferencia'),
      evidencia('show_policy_map_interface', 'Resultado show policy-map interface', 'videoconferencia'),
      prueba('aplicativos_cliente_operativos', 'Aplicativos del cliente operativos', 'videoconferencia'),
      f({ key: 'observaciones_calidad_audio_video', label: 'Observaciones calidad de video y audio', type: 'textarea', group: 'videoconferencia', rows: 4 }),
      ...cpeFields,
      ...conexionEntregaFields,
    ],
  },
};

export function getQaSchema(tipoFormato) {
  return QA_SCHEMAS[tipoFormato] || QA_SCHEMAS.qa_mpls;
}

export function getQaSchemaList() {
  return Object.values(QA_SCHEMAS);
}
