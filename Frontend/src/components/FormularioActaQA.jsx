import React, { useMemo, useState } from 'react';
import { Card, CardHeader, Btn, Alert, Label } from './UI.jsx';
import { getQaSchema } from '../config/formatosQaSchema.js';

const SECTION = ({ title, icon, children }) => (
  <Card style={{ marginBottom: 16 }}>
    <CardHeader title={title} icon={icon} />
    <div style={{ padding: 20 }}>{children}</div>
  </Card>
);

const GRID = ({ cols = 2, children }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      gap: 14,
    }}
  >
    {children}
  </div>
);

const Field = ({ label, required, children }) => (
  <div>
    <Label required={required}>{label}</Label>
    {children}
  </div>
);

const EMPTY_EQ = {
  sap: '',
  descripcion: '',
  serial: '',
  placa: '',
  tipo: '',
  marca: '',
  modelo: '',
  ubicacion: '',
};

function getOptionValue(opt) {
  if (opt && typeof opt === 'object') return opt.value;
  return opt;
}

function getOptionLabel(opt) {
  if (opt && typeof opt === 'object') return opt.label || opt.value;
  return opt;
}

function isTriStateField(campo) {
  const options = campo?.options || [];
  const values = options.map(opt => String(getOptionValue(opt) || '').trim().toUpperCase());

  return (
    values.includes('SI') &&
    values.includes('NO') &&
    (values.includes('N/A') || values.includes('NA'))
  );
}

function normalizeTriStateValue(value) {
  const text = String(value || '').trim().toUpperCase();

  if (text === 'SI' || text === 'SÍ') return 'SI';
  if (text === 'NO') return 'NO';
  if (text === 'NA' || text === 'N/A' || text === 'NO APLICA') return 'N/A';

  return 'N/A';
}

function buildInitialCamposExtra(schema) {
  const initial = {};

  (schema?.camposExtra || []).forEach(campo => {
    if (campo.type === 'select' && isTriStateField(campo)) {
      initial[campo.key] = 'N/A';
    }

    if (campo.type === 'checkbox') {
      initial[campo.key] = false;
    }
  });

  return initial;
}

export default function FormularioActaQA({
  equiposAsignados = [],
  formatoQa,
  token,
  onSuccess,
  onCancel,
}) {
  const schema = useMemo(
    () => getQaSchema(formatoQa?.id || 'qa_mpls'),
    [formatoQa?.id]
  );

  const initialCamposExtra = useMemo(
    () => buildInitialCamposExtra(schema),
    [schema]
  );

  const [form, setForm] = useState({
    tipo_formato: formatoQa?.id || 'qa_mpls',
    nombre_formato: formatoQa?.nombre || 'Acta QA MPLS',
    archivo_formato: formatoQa?.archivo || 'FOR Acta QA MPLS.docx',

    fecha_ejecucion: new Date().toISOString().split('T')[0],
    hora_inicio: '',
    hora_salida: '',

    tiempo_transporte: '',
    tiempo_antesala: '',
    tiempo_ejecucion: '',
    tiempo_espera_claro: '',

    ingeniero_outsourcing: '',
    multimetro: '',
    analizador_ber: '',
    soporte_claro: '',

    firma_acta: false,
    caso_seguimiento: false,
    problemas_instalacion: false,

    mediciones_electricas: {
      fase_neutro: '',
      fase_tierra: '',
      neutro_tierra: '',
    },

    lugar_instalacion: 'RACK',
    observaciones: '',

    pruebas_servicio: {
      ping_central: '',
      traceroute: '',
      firmware: '',
    },

    equipos_instalados: [],
    equipos_desinstalados: [],
    fotos: [],
    campos_extra: initialCamposExtra,
  });

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [eqSel, setEqSel] = useState('');

  const [nuevoInst, setNuevoInst] = useState({ ...EMPTY_EQ });
  const [nuevoDesinst, setNuevoDesinst] = useState({ ...EMPTY_EQ });

  const showSection = (sectionKey) => {
    return schema?.secciones?.includes(sectionKey);
  };

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;

    setForm(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const setMed = (key, value) => {
    setForm(prev => ({
      ...prev,
      mediciones_electricas: {
        ...prev.mediciones_electricas,
        [key]: value,
      },
    }));
  };

  const setExtra = (key, value) => {
    setForm(prev => ({
      ...prev,
      campos_extra: {
        ...prev.campos_extra,
        [key]: value,
      },
    }));
  };

  const camposByGroup = (group) => {
    return (schema?.camposExtra || []).filter(campo => campo.group === group);
  };

  const normalizeCamposExtraForSubmit = () => {
    const next = {
      ...(form.campos_extra || {}),
    };

    (schema?.camposExtra || []).forEach(campo => {
      const currentValue = next[campo.key];

      if (campo.type === 'select' && isTriStateField(campo)) {
        next[campo.key] = normalizeTriStateValue(currentValue);
      }

      if (campo.type === 'checkbox' && currentValue === undefined) {
        next[campo.key] = false;
      }
    });

    return next;
  };

  const agregarDesdeLista = () => {
    if (!eqSel) return;

    const eq = equiposAsignados.find(item => item.id === parseInt(eqSel, 10));

    if (!eq) return;

    setForm(prev => ({
      ...prev,
      equipos_instalados: [
        ...prev.equipos_instalados,
        {
          sap: eq.material_id || '',
          descripcion: eq.material_descripcion || eq.descripcion || '',
          serial: eq.serial || '',
          placa: eq.placa || '',
          tipo: eq.tipo || '',
          marca: eq.marca || '',
          modelo: eq.modelo || '',
          ubicacion: eq.ubicacion || '',
        },
      ],
    }));

    setEqSel('');
  };

  const agregarInst = () => {
    if (!nuevoInst.sap || !nuevoInst.descripcion || !nuevoInst.serial) {
      setAlert({
        type: 'error',
        msg: 'Completa SAP, Descripción y Serie.',
      });
      return;
    }

    setForm(prev => ({
      ...prev,
      equipos_instalados: [
        ...prev.equipos_instalados,
        { ...nuevoInst },
      ],
    }));

    setNuevoInst({ ...EMPTY_EQ });
  };

  const agregarDesinst = () => {
    if (!nuevoDesinst.sap || !nuevoDesinst.descripcion || !nuevoDesinst.serial) {
      setAlert({
        type: 'error',
        msg: 'Completa SAP, Descripción y Serie.',
      });
      return;
    }

    setForm(prev => ({
      ...prev,
      equipos_desinstalados: [
        ...prev.equipos_desinstalados,
        { ...nuevoDesinst },
      ],
    }));

    setNuevoDesinst({ ...EMPTY_EQ });
  };

  const quitarInst = (index) => {
    setForm(prev => ({
      ...prev,
      equipos_instalados: prev.equipos_instalados.filter((_, i) => i !== index),
    }));
  };

  const quitarDesinst = (index) => {
    setForm(prev => ({
      ...prev,
      equipos_desinstalados: prev.equipos_desinstalados.filter((_, i) => i !== index),
    }));
  };

  const validarFormulario = () => {
    if (showSection('datos_generales') && (!form.fecha_ejecucion || !form.hora_inicio)) {
      return 'Fecha de ejecución y hora de inicio son obligatorias.';
    }

    const camposExtraNormalizados = normalizeCamposExtraForSubmit();

    const faltantes = (schema?.camposExtra || [])
      .filter(campo => campo.required)
      .filter(campo => {
        const value = camposExtraNormalizados?.[campo.key];

        if (typeof value === 'boolean') return false;

        return value === undefined || value === null || String(value).trim() === '';
      });

    if (faltantes.length > 0) {
      return `Faltan campos obligatorios: ${faltantes.map(campo => campo.label).join(', ')}`;
    }

    return null;
  };

  const handleSubmit = async () => {
    const error = validarFormulario();

    if (error) {
      setAlert({
        type: 'error',
        msg: error,
      });
      return;
    }

    setLoading(true);
    setAlert(null);

    try {
      const camposExtraNormalizados = normalizeCamposExtraForSubmit();

      const payload = {
        ...form,
        tipo_formato: formatoQa?.id || form.tipo_formato || 'qa_mpls',
        nombre_formato: formatoQa?.nombre || form.nombre_formato || 'Acta QA MPLS',
        archivo_formato: formatoQa?.archivo || form.archivo_formato || 'FOR Acta QA MPLS.docx',
        campos_extra: camposExtraNormalizados,
      };

      const res = await fetch('/api/actas-qa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.detail || e.error || 'Error al guardar el acta QA');
      }

      const data = await res.json();

      const docxRes = await fetch(`/api/actas-qa/${data.id}/docx`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!docxRes.ok) {
        const e = await docxRes.json().catch(() => ({}));
        throw new Error(e.detail || e.error || 'El acta se guardó, pero no se pudo generar el DOCX.');
      }

      const blob = await docxRes.blob();
      const a = document.createElement('a');

      a.href = URL.createObjectURL(blob);
      a.download = `acta_${payload.tipo_formato}_${data.id}.docx`;
      a.click();

      URL.revokeObjectURL(a.href);

      setAlert({
        type: 'success',
        msg: `Acta #${data.id} guardada y DOCX descargado.`,
      });

      setTimeout(() => onSuccess?.(), 1200);
    } catch (err) {
      setAlert({
        type: 'error',
        msg: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const renderDynamicField = (campo) => {
    const rawValue = form.campos_extra?.[campo.key];

    const value =
      campo.type === 'select' && isTriStateField(campo)
        ? normalizeTriStateValue(rawValue)
        : rawValue ?? '';

    const isFoto = campo.key?.startsWith('foto_') || campo.key?.includes('_foto_');

    const placeholder = isFoto
      ? 'Pegue aquí la evidencia o deje el campo en blanco para reservar el espacio.'
      : campo.placeholder || '';

    if (campo.type === 'textarea') {
      return (
        <Field label={campo.label} required={campo.required}>
          <textarea
            value={value}
            rows={campo.rows || 3}
            placeholder={placeholder}
            onChange={e => setExtra(campo.key, e.target.value)}
            style={{ resize: 'vertical' }}
          />
        </Field>
      );
    }

    if (campo.type === 'select') {
      const options = campo.options || [];
      const triState = isTriStateField(campo);

      const normalizedOptions = triState
        ? [
            { value: 'N/A', label: 'N/A' },
            ...options.filter(opt => String(getOptionValue(opt)).trim().toUpperCase() !== 'N/A'),
          ]
        : options;

      return (
        <Field label={campo.label} required={campo.required}>
          <select
            value={triState ? normalizeTriStateValue(value) : value}
            onChange={e => setExtra(campo.key, e.target.value)}
          >
            {!triState && <option value="">-- Seleccionar --</option>}

            {normalizedOptions.map(opt => (
              <option
                key={getOptionValue(opt)}
                value={getOptionValue(opt)}
              >
                {getOptionLabel(opt)}
              </option>
            ))}
          </select>
        </Field>
      );
    }

    if (campo.type === 'checkbox') {
      return (
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            padding: '8px 14px',
            borderRadius: 10,
            border: '1px solid var(--border)',
          }}
        >
          <input
            type="checkbox"
            checked={Boolean(form.campos_extra?.[campo.key])}
            onChange={e => setExtra(campo.key, e.target.checked)}
          />
          <span>{campo.label}</span>
        </label>
      );
    }

    return (
      <Field label={campo.label} required={campo.required}>
        <input
          type={campo.type || 'text'}
          value={value}
          placeholder={placeholder}
          onChange={e => setExtra(campo.key, e.target.value)}
        />
      </Field>
    );
  };

  const RenderCamposExtra = ({ group, title, icon, cols = 2 }) => {
    const campos = camposByGroup(group);

    if (!campos.length) return null;

    return (
      <SECTION title={title} icon={icon}>
        <GRID cols={cols}>
          {campos.map(campo => (
            <React.Fragment key={campo.key}>
              {renderDynamicField(campo)}
            </React.Fragment>
          ))}
        </GRID>
      </SECTION>
    );
  };

  const TablaEquipos = ({ items, onRemove }) => (
    items.length === 0 ? (
      <div
        style={{
          padding: '12px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: 12,
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 8,
        }}
      >
        Sin equipos agregados. En el DOCX se diligenciará como N/A.
      </div>
    ) : (
      <div style={{ overflowX: 'auto', marginTop: 10 }}>
        <table>
          <thead>
            <tr>
              {[
                'Código SAP',
                'Descripción',
                'Serie',
                'Placa',
                'Tipo',
                'Marca',
                'Modelo',
                'Ubicación',
                '',
              ].map(header => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {items.map((eq, index) => (
              <tr key={index}>
                <td className="mono" style={{ fontSize: 12 }}>{eq.sap}</td>
                <td style={{ fontWeight: 500 }}>{eq.descripcion}</td>
                <td className="mono" style={{ fontSize: 12 }}>{eq.serial}</td>
                <td style={{ color: 'var(--text-muted)' }}>{eq.placa || '—'}</td>
                <td>{eq.tipo || '—'}</td>
                <td>{eq.marca || '—'}</td>
                <td>{eq.modelo || '—'}</td>
                <td>{eq.ubicacion || '—'}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    style={{
                      background: 'rgba(239,68,68,0.12)',
                      color: '#EF4444',
                      border: '1px solid rgba(239,68,68,0.2)',
                      borderRadius: 6,
                      padding: '3px 10px',
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  );

  const FilaManual = ({ val, setVal, onAdd }) => (
    <div
      style={{
        marginTop: 14,
        padding: '12px 14px',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: 10,
        border: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-muted)',
          marginBottom: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        Agregar manualmente
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 8,
          alignItems: 'end',
        }}
      >
        {[
          ['sap', 'Código SAP'],
          ['descripcion', 'Descripción'],
          ['serial', 'Serie'],
          ['placa', 'Placa'],
          ['tipo', 'Tipo'],
          ['marca', 'Marca'],
          ['modelo', 'Modelo'],
          ['ubicacion', 'Ubicación'],
        ].map(([key, placeholder]) => (
          <input
            key={key}
            value={val[key]}
            onChange={e => setVal(prev => ({ ...prev, [key]: e.target.value }))}
            placeholder={placeholder}
          />
        ))}

        <button
          type="button"
          onClick={onAdd}
          style={{
            padding: '8px 16px',
            background: 'rgba(217,119,6,0.15)',
            color: 'var(--amber-glow)',
            border: '1px solid rgba(217,119,6,0.3)',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          + Agregar
        </button>
      </div>
    </div>
  );

  return (
    <div className="fade-in" style={{ maxWidth: 980, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'rgba(217,119,6,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(217,119,6,0.25)',
            }}
          >
            <i
              className={`ti ${formatoQa?.icon || 'ti-clipboard-check'}`}
              style={{
                fontSize: 22,
                color: 'var(--amber-glow)',
              }}
            />
          </div>

          <div>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}
            >
              {formatoQa?.nombre || 'Nueva Acta QA'}
            </h2>

            <p
              style={{
                fontSize: 13,
                color: 'var(--text-muted)',
                marginTop: 2,
              }}
            >
              {formatoQa?.descripcion || 'Formulario dinámico de calidad'}
            </p>
          </div>
        </div>

        <Btn variant="secondary" onClick={onCancel} icon="ti-x">
          Cancelar
        </Btn>
      </div>

      {alert && (
        <Alert
          type={alert.type}
          msg={alert.msg}
          onClose={() => setAlert(null)}
        />
      )}

      {showSection('datos_generales') && (
        <SECTION title="Datos Generales" icon="ti-file-text">
          <GRID cols={2}>
            <Field label="Fecha de ejecución" required>
              <input
                type="date"
                value={form.fecha_ejecucion}
                onChange={set('fecha_ejecucion')}
              />
            </Field>

            <Field label="Lugar de instalación">
              <select
                value={form.lugar_instalacion}
                onChange={set('lugar_instalacion')}
              >
                <option value="RACK">RACK</option>
                <option value="PISO">PISO</option>
                <option value="PARED">PARED</option>
                <option value="OTRO">OTRO</option>
              </select>
            </Field>

            <Field label="Hora inicio" required>
              <input
                type="time"
                value={form.hora_inicio}
                onChange={set('hora_inicio')}
              />
            </Field>

            <Field label="Hora salida">
              <input
                type="time"
                value={form.hora_salida}
                onChange={set('hora_salida')}
              />
            </Field>

            <Field label="Ingeniero outsourcing">
              <input
                value={form.ingeniero_outsourcing}
                onChange={set('ingeniero_outsourcing')}
                placeholder="Nombre del ingeniero"
              />
            </Field>

            <Field label="Soporte Claro">
              <input
                value={form.soporte_claro}
                onChange={set('soporte_claro')}
                placeholder="Nombre contacto Claro"
              />
            </Field>
          </GRID>
        </SECTION>
      )}

      {showSection('tiempos') && (
        <SECTION title="Tiempos de Actividad" icon="ti-clock">
          <GRID cols={4}>
            {[
              ['tiempo_transporte', 'Transporte'],
              ['tiempo_antesala', 'Antesala'],
              ['tiempo_ejecucion', 'Ejecución'],
              ['tiempo_espera_claro', 'Espera Claro'],
            ].map(([key, label]) => (
              <Field key={key} label={label}>
                <input
                  type="number"
                  min="0"
                  value={form[key]}
                  onChange={set(key)}
                  placeholder="0"
                />
              </Field>
            ))}
          </GRID>
        </SECTION>
      )}

      {showSection('equipos_medicion') && (
        <SECTION title="Equipos de Medición" icon="ti-ruler-measure">
          <GRID cols={2}>
            <Field label="Multímetro">
              <input
                value={form.multimetro}
                onChange={set('multimetro')}
                placeholder="Modelo / ID"
              />
            </Field>

            <Field label="Analizador BER">
              <input
                value={form.analizador_ber}
                onChange={set('analizador_ber')}
                placeholder="Modelo / ID"
              />
            </Field>
          </GRID>
        </SECTION>
      )}

      {showSection('mediciones_electricas') && (
        <SECTION title="Mediciones Eléctricas" icon="ti-bolt">
          <GRID cols={3}>
            {[
              ['fase_neutro', 'Fase — Neutro (V)'],
              ['fase_tierra', 'Fase — Tierra (V)'],
              ['neutro_tierra', 'Neutro — Tierra (V)'],
            ].map(([key, label]) => (
              <Field key={key} label={label}>
                <input
                  type="number"
                  step="0.01"
                  value={form.mediciones_electricas[key]}
                  onChange={e => setMed(key, e.target.value)}
                  placeholder="0.00"
                />
              </Field>
            ))}
          </GRID>
        </SECTION>
      )}

      {showSection('equipos_instalados') && (
        <SECTION title="Equipos Instalados" icon="ti-package-import">
          {equiposAsignados.length > 0 && (
            <div
              style={{
                marginBottom: 16,
                padding: '12px 14px',
                background: 'rgba(34,197,94,0.06)',
                borderRadius: 10,
                border: '1px solid rgba(34,197,94,0.15)',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#22C55E',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Agregar desde mis equipos asignados
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={eqSel}
                  onChange={e => setEqSel(e.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value="">-- Seleccionar equipo --</option>

                  {equiposAsignados.map(eq => (
                    <option key={eq.id} value={eq.id}>
                      {eq.serial ? `${eq.serial} — ` : ''}
                      {eq.material_descripcion || eq.descripcion || eq.material_id}
                      {eq.estado ? ` (${eq.estado})` : ''}
                    </option>
                  ))}
                </select>

                <Btn
                  variant="success"
                  size="sm"
                  onClick={agregarDesdeLista}
                  disabled={!eqSel}
                  icon="ti-plus"
                >
                  Agregar
                </Btn>
              </div>
            </div>
          )}

          <TablaEquipos
            items={form.equipos_instalados}
            onRemove={quitarInst}
          />

          <FilaManual
            val={nuevoInst}
            setVal={setNuevoInst}
            onAdd={agregarInst}
          />
        </SECTION>
      )}

      {showSection('equipos_desinstalados') && (
        <SECTION title="Equipos Desinstalados / Trasladados" icon="ti-package-export">
          <TablaEquipos
            items={form.equipos_desinstalados}
            onRemove={quitarDesinst}
          />

          <FilaManual
            val={nuevoDesinst}
            setVal={setNuevoDesinst}
            onAdd={agregarDesinst}
          />
        </SECTION>
      )}

      {(schema?.grupos || []).map(grupo => (
        <RenderCamposExtra
          key={grupo.key}
          group={grupo.key}
          title={grupo.title}
          icon={grupo.icon}
          cols={grupo.cols || 2}
        />
      ))}

      {showSection('observaciones_cierre') && (
        <SECTION title="Observaciones y Cierre" icon="ti-notes">
          <Field label="Observaciones">
            <textarea
              value={form.observaciones}
              onChange={set('observaciones')}
              rows={4}
              placeholder="Describe novedades, problemas, aclaraciones..."
              style={{ resize: 'vertical' }}
            />
          </Field>

          <div
            style={{
              marginTop: 16,
              display: 'flex',
              gap: 20,
              flexWrap: 'wrap',
            }}
          >
            {[
              ['firma_acta', 'Firma acta', '#22C55E'],
              ['caso_seguimiento', 'Caso seguimiento', '#F97316'],
              ['problemas_instalacion', 'Problemas instalación', '#EF4444'],
            ].map(([key, label, color]) => (
              <label
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: `1px solid ${form[key] ? color + '40' : 'var(--border)'}`,
                  background: form[key] ? `${color}10` : 'transparent',
                  transition: 'all 0.15s',
                }}
              >
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={set(key)}
                  style={{
                    width: 'auto',
                    accentColor: color,
                  }}
                />

                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: form[key] ? color : 'var(--text-secondary)',
                  }}
                >
                  {label}
                </span>
              </label>
            ))}
          </div>
        </SECTION>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12,
          paddingBottom: 32,
        }}
      >
        <Btn
          variant="secondary"
          onClick={onCancel}
          icon="ti-x"
        >
          Cancelar
        </Btn>

        <Btn
          onClick={handleSubmit}
          loading={loading}
          icon="ti-file-type-docx"
          size="lg"
        >
          Guardar y Descargar DOCX
        </Btn>
      </div>
    </div>
  );
}