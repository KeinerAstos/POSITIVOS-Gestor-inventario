import React, { useState, useEffect, useMemo } from 'react';
import { http } from '../api.js';
import { Card, CardHeader, Btn, Alert, Label, PageHeader, DropdownList } from './UI.jsx';
import '../styles/ReasignacionOTView.css';

export default function ReasignacionOTView({ inv = [], ots = [], refresh }) {
  const [equipos, setEquipos] = useState([{ buscar: '', id: null, desc: '', serial: '', ot_actual_numero: '' }]);
  const [materiales, setMateriales] = useState([{ inventario_id: '', cantidad: 1, disponible: 0, ot_actual_numero: '' }]);
  const [otDestino, setOtDestino] = useState('');
  const [otDestinoId, setOtDestinoId] = useState(null);
  const [otDestinoInfo, setOtDestinoInfo] = useState(null);
  const [showOtDrop, setShowOtDrop] = useState(false);
  const [nuevoOth, setNuevoOth] = useState('');
  const [observacion, setObservacion] = useState('');
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [activeDD, setActiveDD] = useState(null);

  const equiposConOT = useMemo(() => inv.filter(i => i.serial && i.ot_id !== null && (i.estado === 'STOCK' || i.estado === 'INGRESADO')), [inv]);
  const materialesConOT = useMemo(() => inv.filter(i => !i.serial && i.cantidad > 0 && (i.estado === 'INGRESADO' || i.estado === 'STOCK')), [inv]);

  const filteredOTs = useMemo(() => {
    if (!otDestino.trim()) return [];
    const t = otDestino.toLowerCase();
    return ots.filter(o => (o.numero_ot||'').toLowerCase().includes(t) || (o.cliente||'').toLowerCase().includes(t)).slice(0, 8);
  }, [otDestino, ots]);

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') { setActiveDD(null); setShowOtDrop(false); } };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  const handleSubmit = async () => {
    const ids = equipos.filter(e => e.id).map(e => e.id);
    const mats = materiales.filter(m => m.inventario_id);
    if (!ids.length && !mats.length) { setAlert({ type: 'error', msg: 'Selecciona al menos un elemento.' }); return; }
    if (!otDestinoId) { setAlert({ type: 'error', msg: 'Selecciona una OT destino.' }); return; }
    setSaving(true); setAlert(null);
    try {
      const uid = window.CURRENT_USER_ID || 1;
      for (const id of ids) await http.post('/inventario/reasignar-ot', { inventario_id: id, ot_destino: otDestinoId, oth: nuevoOth || null, usuario_id: uid, observacion: observacion || 'Reasignación entre OT' });
      for (const mat of mats) await http.post('/inventario/reasignar-ot', { inventario_id: parseInt(mat.inventario_id), ot_destino: otDestinoId, oth: nuevoOth || null, usuario_id: uid, observacion: observacion || 'Reasignación de material', cantidad: mat.cantidad });
      await refresh();
      setEquipos([{ buscar: '', id: null, desc: '', serial: '', ot_actual_numero: '' }]);
      setMateriales([{ inventario_id: '', cantidad: 1, disponible: 0, ot_actual_numero: '' }]);
      setOtDestino(''); setOtDestinoId(null); setOtDestinoInfo(null); setNuevoOth(''); setObservacion('');
      setAlert({ type: 'success', msg: 'Reasignación completada correctamente.' });
    } catch (err) { setAlert({ type: 'error', msg: err.message }); }
    finally { setSaving(false); }
  };

  return (
    <div className="reasignacion-fade-in">
      <PageHeader title="Reasignar entre OT" icon="ti-switch-horizontal" subtitle="Mueve equipos y materiales de una OT a otra" />
      {alert && <Alert type={alert.type} msg={alert.msg} onClose={() => setAlert(null)} />}
      <div className="reasignacion-container">
        {/* OT Destino */}
        <Card>
          <CardHeader title="OT Destino" icon="ti-file-invoice" />
          <div className="reasignacion-card-body">
            <div className="reasignacion-ot-destino">
              <Label required>Buscar OT destino</Label>
              <div className="reasignacion-input-wrapper">
                <input
                  className={`reasignacion-input ${otDestinoId ? 'reasignacion-input-success' : ''}`}
                  value={otDestino}
                  onChange={e => { setOtDestino(e.target.value); setShowOtDrop(true); setOtDestinoId(null); setOtDestinoInfo(null); }}
                  placeholder="Número de OT o cliente..."
                  onFocus={() => setShowOtDrop(true)}
                />
                {otDestino && (
                  <button className="reasignacion-clear-btn" onClick={() => { setOtDestino(''); setOtDestinoId(null); setOtDestinoInfo(null); }}>
                    ×
                  </button>
                )}
              </div>
              <DropdownList
                items={showOtDrop ? filteredOTs : []}
                onSelect={o => { setOtDestino(o.numero_ot || `OT #${o.id}`); setOtDestinoId(o.id); setOtDestinoInfo(o); setShowOtDrop(false); }}
                renderItem={o => (
                  <div className="reasignacion-dropdown-item">
                    <div>
                      <strong className="reasignacion-dropdown-title">{o.numero_ot}</strong>
                      <div className="reasignacion-dropdown-subtitle">{o.cliente}</div>
                    </div>
                    <span className={`reasignacion-estado-badge ${o.estado === 'ABIERTA' ? 'reasignacion-estado-abierta' : 'reasignacion-estado-cerrada'}`}>
                      {o.estado}
                    </span>
                  </div>
                )}
              />
            </div>
            {otDestinoInfo && (
              <div className="reasignacion-ot-info">
                <strong className="reasignacion-ot-info-title">{otDestinoInfo.numero_ot}</strong> · {otDestinoInfo.cliente} · {otDestinoInfo.destino || 'Sin destino'}
              </div>
            )}
            <div className="reasignacion-field">
              <Label>Nuevo OTH (opcional)</Label>
              <input className="reasignacion-input" value={nuevoOth} onChange={e => setNuevoOth(e.target.value)} placeholder="Número OTH si cambia..." />
            </div>
          </div>
        </Card>

        {/* Equipos serializados */}
        <Card>
          <CardHeader title="Equipos serializados" icon="ti-barcode" subtitle={`${equipos.filter(e => e.id).length} seleccionados`} />
          <div className="reasignacion-card-body">
            <div className="reasignacion-equipos-list">
              {equipos.map((eq, idx) => {
                const matches = eq.buscar.trim().length > 1 ? equiposConOT.filter(i => (i.serial||'').toLowerCase().includes(eq.buscar.toLowerCase())).slice(0, 6) : [];
                return (
                  <div key={idx} className="reasignacion-equipo-item">
                    <div className="reasignacion-equipo-search">
                      <input
                        className={`reasignacion-input ${eq.id ? 'reasignacion-input-warning' : ''}`}
                        style={eq.id ? { background: 'rgba(249,115,22,0.05)' } : {}}
                        value={eq.buscar}
                        onChange={e => { const n = [...equipos]; n[idx] = { buscar: e.target.value, id: null, desc: '', serial: '', ot_actual_numero: '' }; setEquipos(n); setActiveDD(`req_${idx}`); }}
                        placeholder="Buscar por serie..."
                        onFocus={() => setActiveDD(`req_${idx}`)}
                      />
                      <DropdownList
                        items={activeDD === `req_${idx}` ? matches : []}
                        onSelect={item => { const n = [...equipos]; n[idx] = { buscar: item.serial, id: item.id, desc: item.descripcion||item.material_id, serial: item.serial, ot_actual_numero: item.numero_ot||`OT #${item.ot_id}` }; setEquipos(n); setActiveDD(null); }}
                        renderItem={item => (
                          <div>
                            <strong className="reasignacion-mono">{item.serial}</strong>
                            <div className="reasignacion-dropdown-subtitle">{item.descripcion} · OT: {item.numero_ot}</div>
                          </div>
                        )}
                      />
                    </div>
                    {eq.id && (
                      <div className="reasignacion-equipo-preview">
                        <div className="reasignacion-equipo-preview-title">{eq.desc}</div>
                        <div className="reasignacion-equipo-preview-ot">OT actual: {eq.ot_actual_numero}</div>
                      </div>
                    )}
                    <button className="reasignacion-remove-btn" onClick={() => { if (equipos.length === 1) setEquipos([{ buscar: '', id: null, desc: '', serial: '', ot_actual_numero: '' }]); else setEquipos(equipos.filter((_, i) => i !== idx)); }}>×</button>
                  </div>
                );
              })}
            </div>
            <button className="reasignacion-add-btn" onClick={() => setEquipos(p => [...p, { buscar: '', id: null, desc: '', serial: '', ot_actual_numero: '' }])}>+ Agregar equipo</button>
          </div>
        </Card>

        {/* Materiales no serializados */}
        <Card>
          <CardHeader title="Materiales no serializados" icon="ti-package" />
          <div className="reasignacion-card-body">
            <div className="reasignacion-materiales-list">
              {materiales.map((mat, idx) => (
                <div key={idx} className="reasignacion-material-item">
                  <select
                    className="reasignacion-select"
                    value={mat.inventario_id}
                    onChange={e => { const n = [...materiales]; n[idx].inventario_id = e.target.value; const f = materialesConOT.find(m => m.id === parseInt(e.target.value)); n[idx].disponible = f?.cantidad || 0; n[idx].ot_actual_numero = f?.numero_ot || ''; setMateriales(n); }}
                  >
                    <option value="">Seleccionar material...</option>
                    {materialesConOT.map(m => <option key={m.id} value={m.id}>{m.descripcion||m.material_id} (OT: {m.numero_ot||m.ot_id}, Stock: {m.cantidad})</option>)}
                  </select>
                  <input
                    type="number"
                    className="reasignacion-number-input"
                    value={mat.cantidad}
                    min={1}
                    max={mat.disponible||1}
                    onChange={e => { const n = [...materiales]; n[idx].cantidad = Math.min(parseInt(e.target.value)||1, n[idx].disponible||1); setMateriales(n); }}
                  />
                  <button className="reasignacion-remove-btn" onClick={() => { if (materiales.length === 1) setMateriales([{ inventario_id: '', cantidad: 1, disponible: 0, ot_actual_numero: '' }]); else setMateriales(materiales.filter((_, i) => i !== idx)); }}>×</button>
                </div>
              ))}
            </div>
            <button className="reasignacion-add-btn" onClick={() => setMateriales(p => [...p, { inventario_id: '', cantidad: 1, disponible: 0, ot_actual_numero: '' }])}>+ Agregar material</button>
          </div>
        </Card>

        {/* Observación + submit */}
        <Card>
          <div className="reasignacion-card-body">
            <Label>Observación</Label>
            <textarea className="reasignacion-textarea" value={observacion} onChange={e => setObservacion(e.target.value)} placeholder="Motivo de la reasignación..." />
            <Btn onClick={handleSubmit} loading={saving} icon="ti-switch-horizontal" className="reasignacion-submit-btn">Confirmar Reasignación</Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}