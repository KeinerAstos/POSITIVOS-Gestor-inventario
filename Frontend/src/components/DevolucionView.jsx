import React, { useState, useEffect, useMemo } from 'react';
import { http } from '../api.js';
import { Card, CardHeader, Btn, Alert, Label, PageHeader, DropdownList, EmptyState } from './UI.jsx';
import '../styles/DevolucionView.css';

export default function DevolucionView({ inv = [], refresh }) {
  const [equipos, setEquipos] = useState([{ buscar: '', id: null, desc: '', serial: '', tecnico: '', ot_numero: null, cantidadOriginal: 1, cantidadDevolver: 1 }]);
  const [conservarOT, setConservarOT] = useState(true);
  const [observacion, setObservacion] = useState('');
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [activeDD, setActiveDD] = useState(null);

  const enTerreno = useMemo(() => inv.filter(i => i.estado === 'TERRENO' && i.cantidad > 0), [inv]);

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') setActiveDD(null); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  const handleSubmit = async () => {
    const validos = equipos.filter(e => e.id);
    if (!validos.length) { setAlert({ type: 'error', msg: 'Selecciona al menos un elemento.' }); return; }
    setSaving(true); setAlert(null);
    try {
      for (const item of validos) {
        await http.post('/inventario/devolver-bodega', { inventario_id: item.id, conservar_ot: conservarOT, observacion, cantidad_devolver: item.cantidadDevolver });
      }
      await refresh();
      setEquipos([{ buscar: '', id: null, desc: '', serial: '', tecnico: '', ot_numero: null, cantidadOriginal: 1, cantidadDevolver: 1 }]);
      setObservacion('');
      setAlert({ type: 'success', msg: 'Devolución procesada correctamente.' });
    } catch (err) { setAlert({ type: 'error', msg: err.message }); }
    finally { setSaving(false); }
  };

  const totalUnidades = equipos.reduce((s, e) => s + (e.id ? e.cantidadDevolver : 0), 0);

  return (
    <div className="devolucion-fade-in">
      <PageHeader title="Devolución a Bodega" icon="ti-rotate-clockwise-2" subtitle="Registra el retorno de equipos desde terreno" />
      {alert && <Alert type={alert.type} msg={alert.msg} onClose={() => setAlert(null)} />}
      
      <div className="devolucion-container">
        {/* Configuración */}
        <Card>
          <CardHeader title="Configuración" icon="ti-settings" />
          <div className="devolucion-card-body">
            <label className="devolucion-checkbox-label">
              <input type="checkbox" checked={conservarOT} onChange={e => setConservarOT(e.target.checked)} className="devolucion-checkbox" />
              <span className="devolucion-checkbox-text">Mantener asociación con la OT actual</span>
            </label>
            <div className={`devolucion-info-badge ${conservarOT ? 'devolucion-info-ingresado' : 'devolucion-info-stock'}`}>
              {conservarOT ? '✅ Quedará como INGRESADO — disponible para reasignar en la misma OT' : '🔄 Se liberará de la OT y quedará como STOCK libre'}
            </div>
            <div className="devolucion-field">
              <Label>Observaciones</Label>
              <input className="devolucion-input" value={observacion} onChange={e => setObservacion(e.target.value)} placeholder="Motivo de devolución, daños, notas..." />
            </div>
          </div>
        </Card>

        {/* Elementos en Terreno */}
        <Card>
          <CardHeader title="Elementos en Terreno" icon="ti-tool" subtitle={`${equipos.filter(e => e.id).length} seleccionados`} />
          <div className="devolucion-card-body">
            <div className="devolucion-equipos-list">
              {equipos.map((eq, idx) => {
                const matches = eq.buscar.trim().length > 1 ? enTerreno.filter(i => { const q = i.serial||i.descripcion||i.material_id||''; return q.toLowerCase().includes(eq.buscar.toLowerCase()); }).slice(0, 6) : [];
                return (
                  <div key={idx} className={`devolucion-equipo-item ${idx < equipos.length - 1 ? 'devolucion-equipo-border' : ''}`}>
                    <div className="devolucion-equipo-search">
                      <input 
                        className={`devolucion-input ${eq.id ? 'devolucion-input-success' : ''}`}
                        style={eq.id ? { background: 'rgba(34,197,94,0.05)' } : {}}
                        value={eq.buscar} 
                        onChange={e => { const n = [...equipos]; n[idx] = { buscar: e.target.value, id: null, desc: '', serial: '', tecnico: '', ot_numero: null, cantidadOriginal: 1, cantidadDevolver: 1 }; setEquipos(n); setActiveDD(`dev_${idx}`); }} 
                        placeholder="Serie o descripción..." 
                        onFocus={() => setActiveDD(`dev_${idx}`)} 
                      />
                      <DropdownList
                        items={activeDD === `dev_${idx}` ? matches : []}
                        onSelect={item => {
                          const n = [...equipos];
                          n[idx] = { buscar: item.serial || item.descripcion || item.material_id, id: item.id, desc: item.descripcion||item.material_id, serial: item.serial, tecnico: item.usuario_asignado_nombre||'—', ot_numero: item.numero_ot, cantidadOriginal: item.cantidad||1, cantidadDevolver: item.cantidad||1 };
                          setEquipos(n); setActiveDD(null);
                        }}
                        renderItem={item => (
                          <div>
                            <div className="devolucion-dropdown-header">
                              <strong className="devolucion-dropdown-title">{item.serial || item.descripcion || item.material_id}</strong>
                              <span className="devolucion-dropdown-badge">TERRENO</span>
                            </div>
                            <div className="devolucion-dropdown-details">
                              {item.usuario_asignado_nombre && <span>👤 {item.usuario_asignado_nombre}</span>}
                              {item.numero_ot && <span>📋 {item.numero_ot}</span>}
                              <span>📦 Cant: {item.cantidad}</span>
                            </div>
                          </div>
                        )}
                      />
                    </div>
                    {eq.id && (
                      <div className="devolucion-equipo-preview">
                        <div className="devolucion-equipo-preview-title">{eq.desc}</div>
                        <div className="devolucion-equipo-preview-detail">👤 {eq.tecnico} {eq.ot_numero ? `· 📋 ${eq.ot_numero}` : ''}</div>
                        {!eq.serial && eq.cantidadOriginal > 1 && (
                          <div className="devolucion-cantidad-wrapper">
                            <span className="devolucion-cantidad-label">Devolver: </span>
                            <input type="number" className="devolucion-cantidad-input" value={eq.cantidadDevolver} min={1} max={eq.cantidadOriginal} onChange={e => { const n = [...equipos]; n[idx].cantidadDevolver = Math.min(parseInt(e.target.value)||1, eq.cantidadOriginal); setEquipos(n); }} />
                            <span className="devolucion-cantidad-max"> / {eq.cantidadOriginal}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <button className="devolucion-remove-btn" onClick={() => { if (equipos.length === 1) setEquipos([{ buscar: '', id: null, desc: '', serial: '', tecnico: '', ot_numero: null, cantidadOriginal: 1, cantidadDevolver: 1 }]); else setEquipos(equipos.filter((_, i) => i !== idx)); }}>×</button>
                  </div>
                );
              })}
            </div>
            <button className="devolucion-add-btn" onClick={() => setEquipos(p => [...p, { buscar: '', id: null, desc: '', serial: '', tecnico: '', ot_numero: null, cantidadOriginal: 1, cantidadDevolver: 1 }])}>+ Agregar elemento</button>
            {enTerreno.length === 0 && <EmptyState icon="ti-package-off" title="Sin equipos en terreno" />}
          </div>
        </Card>

        {/* Resumen */}
        <Card>
          <div className="devolucion-card-body">
            <div className="devolucion-summary">
              <span className="devolucion-summary-label">Items a devolver</span>
              <strong className="devolucion-summary-value">{equipos.filter(e => e.id).length} ítem(s) · {totalUnidades} unidad(es)</strong>
            </div>
            <Btn onClick={handleSubmit} loading={saving} icon="ti-check" className="devolucion-submit-btn">Confirmar Devolución</Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}