import React, { useState, useEffect, useMemo } from 'react';
import { http } from '../api.js';
import { Card, CardHeader, Btn, Alert, Label, PageHeader, DropdownList } from './UI.jsx';
import '../styles/AsignacionView.css';

export default function AsignacionView({ inv = [], ots = [], tecnicos = [], refresh }) {
  const [form, setForm] = useState({ ot_buscar: '', ot_id: '', usuario_asignado: '', usuario_id: null, obs: '' });
  const [equipos, setEquipos] = useState([{ buscar: '', id: null, desc: '', serial: '', estado: '' }]);
  const [materiales, setMateriales] = useState([{ inventario_id: '', cantidad: 1, disponible: 0 }]);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [activeDD, setActiveDD] = useState(null);

  const poolSeriales = useMemo(() => inv.filter(i => i.serial && (i.estado === 'STOCK' || i.estado === 'INGRESADO') && i.cantidad > 0), [inv]);
  const poolMateriales = useMemo(() => inv.filter(i => !i.serial && i.cantidad > 0 && (i.estado === 'STOCK' || i.estado === 'INGRESADO')), [inv]);

  const otMatches = useMemo(() => {
    if (!form.ot_buscar.trim()) return [];
    const t = form.ot_buscar.toLowerCase();
    return ots.filter(o => o.estado !== 'completado' && o.estado !== 'CERRADA' && ((o.numero_ot || '').toLowerCase().includes(t) || (o.cliente || '').toLowerCase().includes(t))).slice(0, 8);
  }, [form.ot_buscar, ots]);

  const tecnicoMatches = useMemo(() => {
    if (!form.usuario_asignado.trim()) return [];
    const t = form.usuario_asignado.toLowerCase();
    return tecnicos.filter(t2 => t2.nombre.toLowerCase().includes(t)).slice(0, 6);
  }, [form.usuario_asignado, tecnicos]);

  useEffect(() => {
    if (!form.ot_id) {
      setEquipos([{ buscar: '', id: null, desc: '', serial: '', estado: '' }]);
      setMateriales([{ inventario_id: '', cantidad: 1, disponible: 0 }]);
      return;
    }
    const otId = parseInt(form.ot_id);
    const eqs = inv.filter(i => i.serial && i.ot_id === otId && (i.estado === 'STOCK' || i.estado === 'INGRESADO') && i.cantidad > 0);
    const mats = inv.filter(i => !i.serial && i.ot_id === otId && (i.estado === 'STOCK' || i.estado === 'INGRESADO') && i.cantidad > 0);
    setEquipos(eqs.length ? eqs.map(e => ({ buscar: e.serial, id: e.id, desc: e.descripcion || e.material_id, serial: e.serial, estado: e.estado })) : [{ buscar: '', id: null, desc: '', serial: '', estado: '' }]);
    setMateriales(mats.length ? mats.map(m => ({ inventario_id: m.id, cantidad: 1, disponible: m.cantidad })) : [{ inventario_id: '', cantidad: 1, disponible: 0 }]);
  }, [form.ot_id, inv]);

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') setActiveDD(null); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  const getEstadoColor = e => ({ STOCK: '#22C55E', INGRESADO: '#F97316', TERRENO: '#3B82F6', CONSUMO: '#94A3B8', DEVUELTO: '#14B8A6' }[e] || '#94A3B8');

  const getEstadoClass = (estado) => {
    const classes = {
      STOCK: 'asignacion-badge-stock',
      INGRESADO: 'asignacion-badge-ingresado',
      TERRENO: 'asignacion-badge-terreno',
      CONSUMO: 'asignacion-badge-consumo'
    };
    return classes[estado] || 'asignacion-badge-stock';
  };

  const handleSubmit = async () => {
    if (!form.usuario_id) {
      setAlert({ type: 'error', msg: 'Seleccione un técnico de la lista.' });
      return;
    }
    const ids = equipos.filter(e => e.id).map(e => e.id);
    const mats = materiales.filter(m => m.inventario_id).map(m => ({ inventario_id: parseInt(m.inventario_id), cantidad_descontar: m.cantidad }));
    if (!ids.length && !mats.length) {
      setAlert({ type: 'error', msg: 'Seleccione al menos un equipo o material.' });
      return;
    }
    setSaving(true);
    setAlert(null);
    try {
      await http.post('/inventario/asignar', {
        inventario_ids: ids,
        materiales_no_serializados: mats,
        ot_id: form.ot_id ? parseInt(form.ot_id) : null,
        usuario_asignado: form.usuario_id,
        observacion: form.obs
      });
      await refresh();
      setEquipos([{ buscar: '', id: null, desc: '', serial: '', estado: '' }]);
      setMateriales([{ inventario_id: '', cantidad: 1, disponible: 0 }]);
      setForm({ ot_buscar: '', ot_id: '', usuario_asignado: '', usuario_id: null, obs: '' });
      setAlert({ type: 'success', msg: '¡Equipos entregados correctamente!' });
    } catch (err) {
      setAlert({ type: 'error', msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="asignacion-fade-in">
      <PageHeader title="Entrega a Técnico" icon="ti-truck-delivery" subtitle="Asigna equipos y materiales a un técnico" />
      {alert && <Alert type={alert.type} msg={alert.msg} onClose={() => setAlert(null)} />}

      <div className="asignacion-container">
        {/* Card 1: datos de la entrega */}
        <Card>
          <CardHeader title="Datos de la entrega" icon="ti-clipboard-list" />
          <div className="asignacion-card-body">
            <div className="asignacion-form-grid">
              {/* Técnico */}
              <div className="asignacion-field">
                <Label required className="asignacion-label">Técnico</Label>
                <input
                  className={`asignacion-input ${form.usuario_id ? 'asignacion-input-success' : ''}`}
                  value={form.usuario_asignado}
                  onChange={e => { setForm(p => ({ ...p, usuario_asignado: e.target.value, usuario_id: null })); setActiveDD('tecnico'); }}
                  placeholder="Buscar técnico..."
                  onFocus={() => setActiveDD('tecnico')}
                />
                {form.usuario_id && (
                  <div className="asignacion-field-success">
                    <i className="ti ti-check" style={{ fontSize: 12 }} /> Técnico seleccionado
                  </div>
                )}
                <DropdownList
                  items={activeDD === 'tecnico' ? tecnicoMatches : []}
                  onSelect={t => { setForm(p => ({ ...p, usuario_asignado: t.nombre, usuario_id: t.id })); setActiveDD(null); }}
                  renderItem={t => (
                    <div className="asignacion-dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className="ti ti-user" style={{ color: 'var(--text-muted)', fontSize: 14 }} />
                      <span>{t.nombre}</span>
                    </div>
                  )}
                />
              </div>

              {/* OT */}
              <div className="asignacion-field">
                <Label className="asignacion-label">OT (opcional)</Label>
                <input
                  className={`asignacion-input ${form.ot_id ? 'asignacion-input-success' : ''}`}
                  value={form.ot_buscar}
                  onChange={e => { setForm(p => ({ ...p, ot_buscar: e.target.value, ot_id: '' })); setActiveDD('ot'); }}
                  placeholder="Buscar OT o cliente..."
                  onFocus={() => setActiveDD('ot')}
                />
                {form.ot_id && (
                  <div className="asignacion-field-success">
                    <i className="ti ti-check" style={{ fontSize: 12 }} /> OT vinculada
                  </div>
                )}
                <DropdownList
                  items={activeDD === 'ot' ? otMatches : []}
                  onSelect={o => { setForm(p => ({ ...p, ot_buscar: `${o.numero_ot} — ${o.cliente || ''}`, ot_id: o.id })); setActiveDD(null); }}
                  renderItem={o => (
                    <div className="asignacion-dropdown-item">
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: 13 }}>{o.numero_ot}</strong>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.cliente}</span>
                      </div>
                      {o.destino && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.destino}</div>}
                    </div>
                  )}
                />
              </div>
            </div>

            <div className="asignacion-field">
              <Label className="asignacion-label">Observaciones</Label>
              <input
                className="asignacion-input"
                value={form.obs}
                onChange={e => setForm(p => ({ ...p, obs: e.target.value }))}
                placeholder="Notas sobre la entrega..."
              />
            </div>
          </div>
        </Card>

        {/* Card 2: equipos serializados */}
        <Card>
          <CardHeader
            title="Equipos serializados"
            icon="ti-barcode"
            subtitle={`${equipos.filter(e => e.id).length} seleccionados`}
          />
          <div className="asignacion-card-body">
            <div className="asignacion-list">
              {equipos.map((eq, idx) => {
                const matches = eq.buscar.trim().length > 1
                  ? poolSeriales.filter(i => (i.serial || '').toLowerCase().includes(eq.buscar.toLowerCase())).slice(0, 6)
                  : [];
                return (
                  <div key={idx} className="asignacion-list-item">
                    <div className="asignacion-list-item-content">
                      <input
                        className={`asignacion-input ${eq.id ? 'asignacion-input-success' : ''}`}
                        style={eq.id ? { background: 'rgba(34,197,94,0.05)' } : {}}
                        value={eq.buscar}
                        onChange={e => {
                          const n = [...equipos];
                          n[idx] = { buscar: e.target.value, id: null, desc: '', serial: '', estado: '' };
                          setEquipos(n);
                          setActiveDD(`eq_${idx}`);
                        }}
                        placeholder="Buscar por serie..."
                        onFocus={() => setActiveDD(`eq_${idx}`)}
                      />
                      <DropdownList
                        items={activeDD === `eq_${idx}` ? matches : []}
                        onSelect={item => {
                          const n = [...equipos];
                          n[idx] = {
                            buscar: item.serial,
                            id: item.id,
                            desc: item.descripcion || item.material_id,
                            serial: item.serial,
                            estado: item.estado
                          };
                          setEquipos(n);
                          setActiveDD(null);
                        }}
                        renderItem={item => (
                          <div className="asignacion-dropdown-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <strong className="mono" style={{ fontSize: 12 }}>{item.serial}</strong>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.descripcion || item.material_id}</div>
                            </div>
                            <span className={`asignacion-badge ${getEstadoClass(item.estado)}`}>{item.estado}</span>
                          </div>
                        )}
                      />
                    </div>
                    {eq.id && (
                      <div className="asignacion-list-item-preview">
                        <div className="asignacion-list-item-preview-title">{eq.desc}</div>
                        <span className="asignacion-list-item-preview-badge">{eq.estado}</span>
                      </div>
                    )}
                    <button
                      className="asignacion-remove-btn"
                      onClick={() => {
                        if (equipos.length === 1) {
                          setEquipos([{ buscar: '', id: null, desc: '', serial: '', estado: '' }]);
                        } else {
                          setEquipos(equipos.filter((_, i) => i !== idx));
                        }
                      }}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              className="asignacion-add-btn"
              onClick={() => setEquipos(p => [...p, { buscar: '', id: null, desc: '', serial: '', estado: '' }])}
            >
              + Agregar equipo
            </button>
          </div>
        </Card>

        {/* Card 3: materiales consumibles */}
        <Card>
          <CardHeader title="Materiales consumibles" icon="ti-package" subtitle={`${materiales.filter(m => m.inventario_id).length} seleccionados`} />
          <div className="asignacion-card-body">
            <div className="asignacion-list" style={{ maxHeight: 200 }}>
              {materiales.map((mat, idx) => (
                <div key={idx} className="asignacion-material-row">
                  <select
                    className="asignacion-select"
                    value={mat.inventario_id}
                    onChange={e => {
                      const n = [...materiales];
                      n[idx].inventario_id = e.target.value;
                      const found = poolMateriales.find(m => m.id === parseInt(e.target.value));
                      n[idx].disponible = found?.cantidad || 0;
                      setMateriales(n);
                    }}
                    disabled={!poolMateriales.length}
                  >
                    <option value="">Seleccionar material...</option>
                    {poolMateriales.map(m => (
                      <option key={m.id} value={m.id}>
                        {(m.material_descripcion || m.descripcion)}
                        {m.material_id && ` (${m.material_id})`} - Stock: {m.cantidad}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="asignacion-number-input"
                    value={mat.cantidad}
                    min={1}
                    max={mat.disponible || 1}
                    onChange={e => {
                      const n = [...materiales];
                      n[idx].cantidad = Math.min(parseInt(e.target.value) || 1, n[idx].disponible || 1);
                      setMateriales(n);
                    }}
                    disabled={!mat.inventario_id}
                  />
                  <button className="asignacion-remove-btn" onClick={() => {
                    if (materiales.length === 1) {
                      setMateriales([{ inventario_id: '', cantidad: 1, disponible: 0 }]);
                    } else {
                      setMateriales(materiales.filter((_, i) => i !== idx));
                    }
                  }}>×</button>
                </div>
              ))}
            </div>
            <button className="asignacion-add-btn" onClick={() => setMateriales(p => [...p, { inventario_id: '', cantidad: 1, disponible: 0 }])} disabled={!poolMateriales.length}>
              + Agregar material
            </button>

            {/* Resumen (sin cambios) */}
            <div className="asignacion-summary">
              <span className="asignacion-summary-item">
                🔧 Equipos: <strong className="asignacion-summary-value">{equipos.filter(e => e.id).length}</strong>
              </span>
              <span className="asignacion-summary-item">
                📦 Materiales: <strong className="asignacion-summary-value">{materiales.filter(m => m.inventario_id).length}</strong>
              </span>
              {form.usuario_id && (
                <span className="asignacion-summary-item">
                  👤 Técnico: <strong className="asignacion-summary-value">{form.usuario_asignado}</strong>
                </span>
              )}
              {form.ot_id && (
                <span className="asignacion-summary-item">
                  📋 OT: <strong className="asignacion-summary-value">{form.ot_buscar.split('—')[0].trim()}</strong>
                </span>
              )}
            </div>

            <Btn onClick={handleSubmit} loading={saving} icon="ti-send" className="asignacion-submit-btn">
              Entregar al Técnico
            </Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}