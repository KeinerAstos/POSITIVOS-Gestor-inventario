import React, { useState, useEffect, useMemo } from 'react';
import { http, fmtFecha, fmtFechaHora, ESTADO_META } from '../api.js';
import { Card, CardHeader, Btn, Alert, Badge, Label, PageHeader, SearchInput, EmptyState, Loading, DropdownList, Pagination } from './UI.jsx';

// ═══════════════════════════════════════════════════════════════════
// DEVOLUCIÓN
// ═══════════════════════════════════════════════════════════════════
export function DevolucionView({ inv = [], refresh }) {
  const [equipos, setEquipos] = useState([{ buscar: '', id: null, desc: '', serial: '', tecnico: '', ot_numero: null, cantidadOriginal: 1, cantidadDevolver: 1 }]);
  const [conservarOT, setConservarOT] = useState(true);
  const [observacion, setObservacion] = useState('');
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [activeDD, setActiveDD] = useState(null);

  const enTerreno = useMemo(() => inv.filter(i => i.estado === 'TERRENO' && i.cantidad > 0), [inv]);

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') setActiveDD(null); };
    window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn);
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
    <div className="fade-in">
      <PageHeader title="Devolución a Bodega" icon="ti-rotate-clockwise-2" subtitle="Registra el retorno de equipos desde terreno" />
      {alert && <Alert type={alert.type} msg={alert.msg} onClose={() => setAlert(null)} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800 }}>
        {/* Config */}
        <Card>
          <CardHeader title="Configuración" icon="ti-settings" />
          <div style={{ padding: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 8 }}>
              <input type="checkbox" checked={conservarOT} onChange={e => setConservarOT(e.target.checked)} style={{ width: 'auto', accentColor: 'var(--amber-glow)' }} />
              <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>Mantener asociación con la OT actual</span>
            </label>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 26, padding: '8px 12px', borderRadius: 8, background: conservarOT ? 'rgba(34,197,94,0.08)' : 'rgba(20,184,166,0.08)', border: `1px solid ${conservarOT ? 'rgba(34,197,94,0.2)' : 'rgba(20,184,166,0.2)'}` }}>
              {conservarOT ? '✅ Quedará como INGRESADO — disponible para reasignar en la misma OT' : '🔄 Se liberará de la OT y quedará como STOCK libre'}
            </div>
            <div style={{ marginTop: 14 }}>
              <Label>Observaciones</Label>
              <input value={observacion} onChange={e => setObservacion(e.target.value)} placeholder="Motivo de devolución, daños, notas..." />
            </div>
          </div>
        </Card>

        {/* Elementos */}
        <Card>
          <CardHeader title="Elementos en Terreno" icon="ti-tool" subtitle={`${equipos.filter(e => e.id).length} seleccionados`} />
          <div style={{ padding: 20 }}>
            <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {equipos.map((eq, idx) => {
                const matches = eq.buscar.trim().length > 1 ? enTerreno.filter(i => { const q = i.serial||i.descripcion||i.material_id||''; return q.toLowerCase().includes(eq.buscar.toLowerCase()); }).slice(0, 6) : [];
                return (
                  <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', paddingBottom: 10, borderBottom: idx < equipos.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ flex: 2, position: 'relative' }}>
                      <input value={eq.buscar} onChange={e => { const n = [...equipos]; n[idx] = { buscar: e.target.value, id: null, desc: '', serial: '', tecnico: '', ot_numero: null, cantidadOriginal: 1, cantidadDevolver: 1 }; setEquipos(n); setActiveDD(`dev_${idx}`); }} placeholder="Serie o descripción..." onFocus={() => setActiveDD(`dev_${idx}`)} style={{ borderColor: eq.id ? '#22C55E' : undefined, background: eq.id ? 'rgba(34,197,94,0.05)' : undefined }} />
                      <DropdownList
                        items={activeDD === `dev_${idx}` ? matches : []}
                        onSelect={item => {
                          const n = [...equipos];
                          n[idx] = { buscar: item.serial || item.descripcion || item.material_id, id: item.id, desc: item.descripcion||item.material_id, serial: item.serial, tecnico: item.usuario_asignado_nombre||'—', ot_numero: item.numero_ot, cantidadOriginal: item.cantidad||1, cantidadDevolver: item.cantidad||1 };
                          setEquipos(n); setActiveDD(null);
                        }}
                        renderItem={item => (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <strong style={{ fontSize: 13 }}>{item.serial || item.descripcion || item.material_id}</strong>
                              <span style={{ fontSize: 11, color: '#3B82F6' }}>TERRENO</span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 12, marginTop: 3 }}>
                              {item.usuario_asignado_nombre && <span>👤 {item.usuario_asignado_nombre}</span>}
                              {item.numero_ot && <span>📋 {item.numero_ot}</span>}
                              <span>📦 Cant: {item.cantidad}</span>
                            </div>
                          </div>
                        )}
                      />
                    </div>
                    {eq.id && (
                      <div style={{ flex: 2, fontSize: 12, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 500 }}>{eq.desc}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>👤 {eq.tecnico} {eq.ot_numero ? `· 📋 ${eq.ot_numero}` : ''}</div>
                        {!eq.serial && eq.cantidadOriginal > 1 && (
                          <div style={{ marginTop: 6 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Devolver: </span>
                            <input type="number" value={eq.cantidadDevolver} min={1} max={eq.cantidadOriginal} onChange={e => { const n = [...equipos]; n[idx].cantidadDevolver = Math.min(parseInt(e.target.value)||1, eq.cantidadOriginal); setEquipos(n); }} style={{ width: 60, padding: '2px 6px', display: 'inline-block' }} />
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}> / {eq.cantidadOriginal}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <button onClick={() => { if (equipos.length === 1) setEquipos([{ buscar: '', id: null, desc: '', serial: '', tecnico: '', ot_numero: null, cantidadOriginal: 1, cantidadDevolver: 1 }]); else setEquipos(equipos.filter((_, i) => i !== idx)); }} style={{ padding: '8px 10px', background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, cursor: 'pointer' }}>×</button>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setEquipos(p => [...p, { buscar: '', id: null, desc: '', serial: '', tecnico: '', ot_numero: null, cantidadOriginal: 1, cantidadDevolver: 1 }])} style={{ marginTop: 10, background: 'none', border: 'none', color: 'var(--amber-glow)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>+ Agregar elemento</button>
            {enTerreno.length === 0 && <EmptyState icon="ti-package-off" title="Sin equipos en terreno" />}
          </div>
        </Card>

        {/* Resumen */}
        <Card>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Items a devolver</span>
              <strong>{equipos.filter(e => e.id).length} ítem(s) · {totalUnidades} unidad(es)</strong>
            </div>
            <Btn onClick={handleSubmit} loading={saving} icon="ti-check" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>Confirmar Devolución</Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// REASIGNACIÓN OT
// ═══════════════════════════════════════════════════════════════════
export function ReasignacionOTView({ inv = [], ots = [], refresh }) {
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
    window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn);
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
    <div className="fade-in">
      <PageHeader title="Reasignar entre OT" icon="ti-switch-horizontal" subtitle="Mueve equipos y materiales de una OT a otra" />
      {alert && <Alert type={alert.type} msg={alert.msg} onClose={() => setAlert(null)} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900 }}>
        {/* OT Destino */}
        <Card>
          <CardHeader title="OT Destino" icon="ti-file-invoice" />
          <div style={{ padding: 20 }}>
            <div style={{ position: 'relative' }} className="ot-destino-cont">
              <Label required>Buscar OT destino</Label>
              <div style={{ position: 'relative' }}>
                <input value={otDestino} onChange={e => { setOtDestino(e.target.value); setShowOtDrop(true); setOtDestinoId(null); setOtDestinoInfo(null); }} placeholder="Número de OT o cliente..." onFocus={() => setShowOtDrop(true)} style={{ borderColor: otDestinoId ? '#22C55E' : undefined }} />
                {otDestino && <button onClick={() => { setOtDestino(''); setOtDestinoId(null); setOtDestinoInfo(null); }} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18 }}>×</button>}
              </div>
              <DropdownList
                items={showOtDrop ? filteredOTs : []}
                onSelect={o => { setOtDestino(o.numero_ot || `OT #${o.id}`); setOtDestinoId(o.id); setOtDestinoInfo(o); setShowOtDrop(false); }}
                renderItem={o => (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><strong style={{ fontSize: 13 }}>{o.numero_ot}</strong><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.cliente}</div></div>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: o.estado === 'ABIERTA' ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.12)', color: o.estado === 'ABIERTA' ? '#22C55E' : '#94A3B8' }}>{o.estado}</span>
                  </div>
                )}
              />
            </div>
            {otDestinoInfo && (
              <div style={{ marginTop: 12, padding: '12px 14px', background: 'rgba(34,197,94,0.06)', borderRadius: 10, border: '1px solid rgba(34,197,94,0.2)', fontSize: 13 }}>
                <strong style={{ color: '#22C55E' }}>{otDestinoInfo.numero_ot}</strong> · {otDestinoInfo.cliente} · {otDestinoInfo.destino || 'Sin destino'}
              </div>
            )}
            <div style={{ marginTop: 14 }}>
              <Label>Nuevo OTH (opcional)</Label>
              <input value={nuevoOth} onChange={e => setNuevoOth(e.target.value)} placeholder="Número OTH si cambia..." />
            </div>
          </div>
        </Card>

        {/* Equipos */}
        <Card>
          <CardHeader title="Equipos serializados" icon="ti-barcode" subtitle={`${equipos.filter(e => e.id).length} seleccionados`} />
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
              {equipos.map((eq, idx) => {
                const matches = eq.buscar.trim().length > 1 ? equiposConOT.filter(i => (i.serial||'').toLowerCase().includes(eq.buscar.toLowerCase())).slice(0, 6) : [];
                return (
                  <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', position: 'relative' }}>
                    <div style={{ flex: 2, position: 'relative' }}>
                      <input value={eq.buscar} onChange={e => { const n = [...equipos]; n[idx] = { buscar: e.target.value, id: null, desc: '', serial: '', ot_actual_numero: '' }; setEquipos(n); setActiveDD(`req_${idx}`); }} placeholder="Buscar por serie..." onFocus={() => setActiveDD(`req_${idx}`)} style={{ borderColor: eq.id ? '#F97316' : undefined, background: eq.id ? 'rgba(249,115,22,0.05)' : undefined }} />
                      <DropdownList
                        items={activeDD === `req_${idx}` ? matches : []}
                        onSelect={item => { const n = [...equipos]; n[idx] = { buscar: item.serial, id: item.id, desc: item.descripcion||item.material_id, serial: item.serial, ot_actual_numero: item.numero_ot||`OT #${item.ot_id}` }; setEquipos(n); setActiveDD(null); }}
                        renderItem={item => <><strong className="mono" style={{ fontSize: 12 }}>{item.serial}</strong><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.descripcion} · OT: {item.numero_ot}</div></>}
                      />
                    </div>
                    {eq.id && <div style={{ flex: 2, fontSize: 12, padding: '8px 12px', background: 'rgba(249,115,22,0.05)', borderRadius: 8, border: '1px solid rgba(249,115,22,0.2)' }}><div style={{ fontWeight: 500 }}>{eq.desc}</div><div style={{ color: '#F97316', fontSize: 11 }}>OT actual: {eq.ot_actual_numero}</div></div>}
                    <button onClick={() => { if (equipos.length === 1) setEquipos([{ buscar: '', id: null, desc: '', serial: '', ot_actual_numero: '' }]); else setEquipos(equipos.filter((_, i) => i !== idx)); }} style={{ padding: '8px 10px', background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, cursor: 'pointer' }}>×</button>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setEquipos(p => [...p, { buscar: '', id: null, desc: '', serial: '', ot_actual_numero: '' }])} style={{ marginTop: 10, background: 'none', border: 'none', color: 'var(--amber-glow)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>+ Agregar equipo</button>
          </div>
        </Card>

        {/* Materiales */}
        <Card>
          <CardHeader title="Materiales no serializados" icon="ti-package" />
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {materiales.map((mat, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select value={mat.inventario_id} onChange={e => { const n = [...materiales]; n[idx].inventario_id = e.target.value; const f = materialesConOT.find(m => m.id === parseInt(e.target.value)); n[idx].disponible = f?.cantidad || 0; n[idx].ot_actual_numero = f?.numero_ot || ''; setMateriales(n); }} style={{ flex: 3 }}>
                    <option value="">Seleccionar material...</option>
                    {materialesConOT.map(m => <option key={m.id} value={m.id}>{m.descripcion||m.material_id} (OT: {m.numero_ot||m.ot_id}, Stock: {m.cantidad})</option>)}
                  </select>
                  <input type="number" value={mat.cantidad} min={1} max={mat.disponible||1} onChange={e => { const n = [...materiales]; n[idx].cantidad = Math.min(parseInt(e.target.value)||1, n[idx].disponible||1); setMateriales(n); }} style={{ width: 80 }} />
                  <button onClick={() => { if (materiales.length === 1) setMateriales([{ inventario_id: '', cantidad: 1, disponible: 0, ot_actual_numero: '' }]); else setMateriales(materiales.filter((_, i) => i !== idx)); }} style={{ padding: '8px 10px', background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, cursor: 'pointer' }}>×</button>
                </div>
              ))}
            </div>
            <button onClick={() => setMateriales(p => [...p, { inventario_id: '', cantidad: 1, disponible: 0, ot_actual_numero: '' }])} style={{ marginTop: 10, background: 'none', border: 'none', color: 'var(--amber-glow)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>+ Agregar material</button>
          </div>
        </Card>

        {/* Observación + submit */}
        <Card>
          <div style={{ padding: 20 }}>
            <Label>Observación</Label>
            <textarea value={observacion} onChange={e => setObservacion(e.target.value)} placeholder="Motivo de la reasignación..." style={{ minHeight: 70, resize: 'vertical', marginBottom: 16 }} />
            <Btn onClick={handleSubmit} loading={saving} icon="ti-switch-horizontal" style={{ width: '100%', justifyContent: 'center' }}>Confirmar Reasignación</Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MOVIMIENTOS
// ═══════════════════════════════════════════════════════════════════
const TIPO_LABELS = {
  INGRESO_BODEGA: 'Ingreso Bodega', ENTRADA_STOCK: 'Entrada Stock',
  ASIGNACION_TERRENO: 'Entrega Técnico', ENTREGA_TECNICO: 'Entrega Técnico',
  DEVOLUCION_BODEGA: 'Devolución Bodega', REASIGNACION_OT: 'Reasignación OT',
  INSTALACION_CONSUMO: 'Instalación/Consumo', ACTUALIZACION: 'Actualización',
  TRANSFERENCIA_BODEGA: 'Transferencia', DEVOLUCION_TECNICO: 'Dev. Técnico',
};
const TIPO_COLORS = {
  INGRESO_BODEGA: '#22C55E', ENTRADA_STOCK: '#22C55E',
  ASIGNACION_TERRENO: '#3B82F6', ENTREGA_TECNICO: '#3B82F6',
  DEVOLUCION_BODEGA: '#F97316', DEVOLUCION_TECNICO: '#F97316',
  REASIGNACION_OT: '#A78BFA', INSTALACION_CONSUMO: '#94A3B8',
  ACTUALIZACION: '#64748B', TRANSFERENCIA_BODEGA: '#14B8A6',
};

export function MovimientosView() {
  const [data, setData] = useState({ data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } });
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('todos');
  const [ft, setFt] = useState('');
  const [search, setSearch] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [page, setPage] = useState(1);

  const cargar = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (tab === 'reasignaciones') params.set('tipo', 'REASIGNACION_OT');
      else if (ft) params.set('tipo', ft);
      if (search) params.set('search', search);
      if (fechaDesde) params.set('fecha_desde', fechaDesde);
      if (fechaHasta) params.set('fecha_hasta', fechaHasta);
      const res = await fetch(`/api/movimientos?${params}`);
      const json = await res.json();
      setData(json);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, [tab, ft, search, fechaDesde, fechaHasta, page]);

  const exportar = async () => {
    try {
      const res = await fetch('/api/movimientos/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: tab === 'reasignaciones' ? 'REASIGNACION_OT' : (ft || null), fecha_desde: fechaDesde || null, fecha_hasta: fechaHasta || null }) });
      if (!res.ok) throw new Error('Error al exportar');
      const blob = await res.blob();
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `movimientos_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    } catch (err) { alert(err.message); }
  };

  const tipos = Object.keys(TIPO_LABELS).sort();
  const movs = data.data || [];

  return (
    <div className="fade-in">
      <PageHeader title="Historial de Movimientos" icon="ti-history" actions={<Btn variant="success" size="sm" onClick={exportar} icon="ti-download">Exportar CSV</Btn>} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
        {[{ id: 'todos', label: 'Todos' }, { id: 'reasignaciones', label: 'Reasignaciones OT' }].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setPage(1); }} style={{ padding: '8px 18px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? 'var(--amber-glow)' : 'var(--text-secondary)', borderBottom: tab === t.id ? '2px solid var(--amber-glow)' : '2px solid transparent', fontSize: 13, fontFamily: 'inherit' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filtros */}
      {tab === 'todos' && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ padding: '12px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <SearchInput value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Material, serie, responsable..." style={{ flex: 1, minWidth: 200 }} />
            <select value={ft} onChange={e => { setFt(e.target.value); setPage(1); }} style={{ width: 200 }}>
              <option value="">Todos los tipos</option>
              {tipos.map(t => <option key={t} value={t}>{TIPO_LABELS[t]||t}</option>)}
            </select>
            <input type="date" value={fechaDesde} onChange={e => { setFechaDesde(e.target.value); setPage(1); }} style={{ width: 150 }} />
            <input type="date" value={fechaHasta} onChange={e => { setFechaHasta(e.target.value); setPage(1); }} style={{ width: 150 }} />
            {(ft || search || fechaDesde || fechaHasta) && <Btn variant="ghost" size="sm" onClick={() => { setFt(''); setSearch(''); setFechaDesde(''); setFechaHasta(''); setPage(1); }} icon="ti-x">Limpiar</Btn>}
          </div>
        </Card>
      )}

      <Card>
        {loading && movs.length === 0 ? <Loading /> : movs.length === 0 ? <EmptyState icon="ti-history-off" title="Sin movimientos" /> : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    {tab === 'reasignaciones'
                      ? ['Fecha', 'Material / Serie', 'Cant.', 'OT Origen', 'OT Destino', 'Responsable', 'Observación'].map(h => <th key={h}>{h}</th>)
                      : ['Tipo', 'Material / Serie', 'Cant.', 'Estado Ant.', 'Estado Nuevo', 'OT', 'Responsable', 'Fecha'].map(h => <th key={h}>{h}</th>)
                    }
                  </tr>
                </thead>
                <tbody>
                  {movs.map(m => {
                    const color = TIPO_COLORS[m.tipo_movimiento] || '#64748B';
                    return tab === 'reasignaciones' ? (
                      <tr key={m.id}>
                        <td style={{ fontSize: 12 }}>{fmtFechaHora(m.created_at)}</td>
                        <td><div style={{ fontWeight: 500 }}>{m.material||'—'}</div>{m.serial && <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{m.serial}</div>}</td>
                        <td style={{ textAlign: 'center' }}>{m.cantidad||1}</td>
                        <td><div style={{ fontSize: 12 }}>{m.ot_anterior_numero||`OT #${m.ot_anterior||'?'}`}</div>{m.oth_anterior && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>OTH: {m.oth_anterior}</div>}</td>
                        <td><div style={{ fontSize: 12 }}>{m.ot_nueva_numero||`OT #${m.ot_nueva||'?'}`}</div>{m.oth_nueva && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>OTH: {m.oth_nueva}</div>}</td>
                        <td style={{ fontSize: 12 }}>{m.usuario||m.tecnico_nombre||'—'}</td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.observacion||'—'}</td>
                      </tr>
                    ) : (
                      <tr key={m.id}>
                        <td><span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: `${color}18`, color, border: `1px solid ${color}30` }}>{TIPO_LABELS[m.tipo_movimiento]||m.tipo_movimiento||'—'}</span></td>
                        <td><div style={{ fontWeight: 500 }}>{m.material||'—'}</div>{m.serial && <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{m.serial}</div>}</td>
                        <td style={{ textAlign: 'center' }}>{m.cantidad||1}</td>
                        <td style={{ fontSize: 12, color: '#F97316' }}>{m.estado_anterior||'—'}</td>
                        <td style={{ fontSize: 12, color: '#22C55E' }}>{m.estado_nuevo||'—'}</td>
                        <td style={{ fontSize: 12 }}>{m.ot_anterior_numero||(m.ot_anterior ? `OT #${m.ot_anterior}` : '—')}</td>
                        <td style={{ fontSize: 12 }}>{m.usuario||m.tecnico_nombre||'—'}</td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtFecha(m.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={data.pagination?.totalPages||1} total={data.pagination?.total||0} onPage={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// HISTORIAL REASIGNACIONES
// ═══════════════════════════════════════════════════════════════════
export function ReasignacionesView() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const cargar = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tipo: 'REASIGNACION_OT' });
      if (desde) params.append('fecha_desde', desde);
      if (hasta) params.append('fecha_hasta', hasta);
      const res = await fetch(`/api/movimientos?${params}`);
      const json = await res.json();
      setData(json.data || []);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, [desde, hasta]);

  return (
    <div className="fade-in">
      <PageHeader title="Historial de Reasignaciones" icon="ti-arrows-exchange" />
      <Card style={{ marginBottom: 16 }}>
        <div style={{ padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Label>Desde</Label><input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ width: 160 }} /></div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Label>Hasta</Label><input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ width: 160 }} /></div>
          <Btn variant="ghost" size="sm" onClick={cargar} icon="ti-refresh">Filtrar</Btn>
        </div>
      </Card>
      <Card>
        {loading ? <Loading /> : data.length === 0 ? <EmptyState icon="ti-switch-horizontal" title="Sin reasignaciones" /> : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr>{['Fecha','Material','Serie','Cant.','OT Origen','OT Destino','Responsable','Observación'].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {data.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontSize: 12 }}>{fmtFechaHora(m.created_at)}</td>
                    <td style={{ fontWeight: 500 }}>{m.material||'—'}</td>
                    <td className="mono" style={{ fontSize: 11 }}>{m.serial||'—'}</td>
                    <td style={{ textAlign: 'center' }}>{m.cantidad||1}</td>
                    <td><div>{m.ot_anterior_numero||`OT #${m.ot_anterior||'?'}`}</div>{m.oth_anterior && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>OTH: {m.oth_anterior}</div>}</td>
                    <td><div>{m.ot_nueva_numero||`OT #${m.ot_nueva||'?'}`}</div>{m.oth_nueva && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>OTH: {m.oth_nueva}</div>}</td>
                    <td style={{ fontSize: 12 }}>{m.usuario||'—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.observacion||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BODEGAS
// ═══════════════════════════════════════════════════════════════════
export function BodegasView({ bodegas = [], inv = [], refresh }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [form, setForm] = useState({ nombre: '', ubicacion: '' });

  const handleCreate = async () => {
    if (!form.nombre.trim()) { setAlert({ type: 'error', msg: 'El nombre es obligatorio.' }); return; }
    setSaving(true); setAlert(null);
    try {
      await http.post('/bodegas', form);
      await refresh();
      setForm({ nombre: '', ubicacion: '' }); setShowForm(false);
      setAlert({ type: 'success', msg: 'Bodega creada correctamente.' });
    } catch (err) { setAlert({ type: 'error', msg: err.message }); }
    finally { setSaving(false); }
  };

  return (
    <div className="fade-in">
      <PageHeader title="Bodegas" icon="ti-building-warehouse" actions={<Btn size="sm" onClick={() => setShowForm(s => !s)} icon={showForm ? 'ti-x' : 'ti-plus'}>{showForm ? 'Cancelar' : 'Nueva bodega'}</Btn>} />
      {alert && <Alert type={alert.type} msg={alert.msg} onClose={() => setAlert(null)} />}
      {showForm && (
        <Card style={{ marginBottom: 20 }} className="fade-in">
          <CardHeader title="Nueva bodega" icon="ti-plus" />
          <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div><Label required>Nombre</Label><input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre de la bodega" /></div>
              <div><Label>Ubicación</Label><input value={form.ubicacion} onChange={e => setForm(p => ({ ...p, ubicacion: e.target.value }))} placeholder="Dirección" /></div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}><Btn onClick={handleCreate} loading={saving} icon="ti-check">Crear</Btn><Btn variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Btn></div>
          </div>
        </Card>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {bodegas.map(b => {
          const total = inv.filter(i => i.bodega_id === b.id).length;
          const disponible = inv.filter(i => i.bodega_id === b.id && i.estado === 'STOCK').length;
          return (
            <div key={b.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px', opacity: b.activo ? 1 : 0.6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(217,119,6,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(217,119,6,0.25)' }}>
                    <i className="ti ti-building-warehouse" style={{ fontSize: 20, color: 'var(--amber-glow)' }} />
                  </div>
                  <div><div style={{ fontWeight: 600, fontSize: 15 }}>{b.nombre}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.ubicacion || 'Sin ubicación'}</div></div>
                </div>
                <Badge v={b.activo ? 'STOCK' : 'CONSUMO'}>{b.activo ? 'Activa' : 'Inactiva'}</Badge>
              </div>
              <div style={{ display: 'flex', gap: 20, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total items</div><div style={{ fontSize: 24, fontWeight: 700 }}>{total}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Disponibles</div><div style={{ fontSize: 24, fontWeight: 700, color: '#22C55E' }}>{disponible}</div></div>
                {b.responsable && <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Responsable</div><div style={{ fontSize: 13, fontWeight: 500 }}>{b.responsable}</div></div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ÓRDENES DE TRABAJO
// ═══════════════════════════════════════════════════════════════════
const OT_ESTADOS = { pendiente: { color: '#F97316', label: 'Pendiente' }, en_progreso: { color: '#3B82F6', label: 'En Progreso' }, completado: { color: '#22C55E', label: 'Completado' }, ABIERTA: { color: '#22C55E', label: 'Abierta' }, CERRADA: { color: '#94A3B8', label: 'Cerrada' } };

export function OtsView({ ots = [], refresh }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ numero: '', cliente: '', destino: '', estado: 'pendiente' });

  const filtered = useMemo(() => ots.filter(o => !search || (o.numero_ot||'').toLowerCase().includes(search.toLowerCase()) || (o.cliente||'').toLowerCase().includes(search.toLowerCase())), [ots, search]);

  const handleCreate = async () => {
    if (!form.numero || !form.cliente) { setAlert({ type: 'error', msg: 'Número y cliente son obligatorios.' }); return; }
    setSaving(true); setAlert(null);
    try {
      await http.post('/ot', { numero_ot: form.numero, cliente: form.cliente, destino: form.destino, estado: form.estado });
      await refresh();
      setForm({ numero: '', cliente: '', destino: '', estado: 'pendiente' }); setShowForm(false);
      setAlert({ type: 'success', msg: 'OT creada correctamente.' });
    } catch (err) { setAlert({ type: 'error', msg: err.message }); }
    finally { setSaving(false); }
  };

  const handleEstado = async (ot, estado) => {
    try { await http.put('/ot/' + ot.id, { estado }); await refresh(); }
    catch (err) { setAlert({ type: 'error', msg: err.message }); }
  };

  return (
    <div className="fade-in">
      <PageHeader title="Órdenes de Trabajo" icon="ti-clipboard-list" actions={<Btn size="sm" onClick={() => setShowForm(s => !s)} icon={showForm ? 'ti-x' : 'ti-plus'}>{showForm ? 'Cancelar' : 'Nueva OT'}</Btn>} />
      {alert && <Alert type={alert.type} msg={alert.msg} onClose={() => setAlert(null)} />}
      {showForm && (
        <Card style={{ marginBottom: 20 }} className="fade-in">
          <CardHeader title="Nueva orden de trabajo" icon="ti-plus" />
          <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 14 }}>
              <div><Label required>N° OT</Label><input value={form.numero} onChange={e => setForm(p => ({ ...p, numero: e.target.value }))} placeholder="OT-2025-XXXX" /></div>
              <div><Label required>Cliente</Label><input value={form.cliente} onChange={e => setForm(p => ({ ...p, cliente: e.target.value }))} placeholder="Nombre del cliente" /></div>
              <div><Label>Destino</Label><input value={form.destino} onChange={e => setForm(p => ({ ...p, destino: e.target.value }))} placeholder="Dirección" /></div>
              <div><Label>Estado</Label><select value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}><option value="pendiente">Pendiente</option><option value="en_progreso">En Progreso</option><option value="completado">Completado</option></select></div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}><Btn onClick={handleCreate} loading={saving} icon="ti-check">Crear OT</Btn><Btn variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Btn></div>
          </div>
        </Card>
      )}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ padding: '10px 16px' }}>
          <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar OT o cliente..." />
        </div>
      </Card>
      <Card>
        {filtered.length === 0 ? <EmptyState icon="ti-clipboard-off" title="Sin órdenes" /> : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>N° OT</th><th>Cliente</th><th>Destino</th><th>Estado</th><th>Fecha</th><th>Acción</th></tr></thead>
              <tbody>
                {filtered.map(ot => {
                  const est = OT_ESTADOS[ot.estado] || { color: '#94A3B8', label: ot.estado };
                  return (
                    <tr key={ot.id}>
                      <td><span className="mono" style={{ fontWeight: 600, color: 'var(--amber-glow)' }}>{ot.numero_ot || ot.numero}</span></td>
                      <td style={{ fontWeight: 500 }}>{ot.cliente}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{ot.destino || '—'}</td>
                      <td><span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${est.color}18`, color: est.color, border: `1px solid ${est.color}30` }}>{est.label}</span></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{fmtFecha(ot.created_at || ot.fecha)}</td>
                      <td>
                        {ot.estado !== 'completado' && ot.estado !== 'CERRADA' && (
                          <Btn variant="ghost" size="sm" onClick={() => handleEstado(ot, ot.estado === 'pendiente' || ot.estado === 'ABIERTA' ? 'en_progreso' : 'completado')}>
                            {ot.estado === 'pendiente' || ot.estado === 'ABIERTA' ? 'Iniciar' : 'Completar'}
                          </Btn>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// OT DASHBOARD
// ═══════════════════════════════════════════════════════════════════
export function OTDashboardView({ ots = [], inv = [] }) {
  const [search, setSearch] = useState('');
  const [showDrop, setShowDrop] = useState(false);
  const [selectedOT, setSelectedOT] = useState(null);
  const [equiposOT, setEquiposOT] = useState([]);

  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    const t = search.toLowerCase();
    return ots.filter(o => (o.numero_ot||'').toLowerCase().includes(t) || (o.cliente||'').toLowerCase().includes(t) || String(o.id).includes(t)).slice(0, 10);
  }, [search, ots]);

  const selectOT = (ot) => {
    setSelectedOT(ot); setSearch(ot.numero_ot || `OT #${ot.id}`); setShowDrop(false);
    setEquiposOT(inv.filter(i => i.ot_id === ot.id));
  };

  useEffect(() => {
    const fn = e => { if (!e.target.closest('.ot-dash-search')) setShowDrop(false); };
    document.addEventListener('click', fn); return () => document.removeEventListener('click', fn);
  }, []);

  const serialCount = equiposOT.filter(e => e.serial).length;
  const noSerialCount = equiposOT.filter(e => !e.serial).length;

  return (
    <div className="fade-in">
      <PageHeader title="Dashboard OT" icon="ti-file-invoice" subtitle="Consulta equipos por orden de trabajo" />
      <div className="ot-dash-search" style={{ position: 'relative', maxWidth: 520, marginBottom: 24 }}>
        <Label>Buscar Orden de Trabajo</Label>
        <div style={{ position: 'relative' }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 15, pointerEvents: 'none' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setShowDrop(true); if (selectedOT) { setSelectedOT(null); setEquiposOT([]); } }} onFocus={() => setShowDrop(true)} placeholder="Número de OT, cliente o ID..." style={{ paddingLeft: 34 }} />
          {search && <button onClick={() => { setSearch(''); setSelectedOT(null); setEquiposOT([]); }} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18 }}>×</button>}
        </div>
        <DropdownList
          items={showDrop ? filtered : []}
          onSelect={selectOT}
          renderItem={o => (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><strong style={{ fontSize: 13 }}>{o.numero_ot}</strong><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.cliente}</div></div>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: o.estado === 'ABIERTA' || o.estado === 'en_progreso' ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.12)', color: o.estado === 'ABIERTA' || o.estado === 'en_progreso' ? '#22C55E' : '#94A3B8' }}>{o.estado}</span>
            </div>
          )}
        />
      </div>

      {selectedOT ? (
        <div className="fade-in">
          <Card style={{ marginBottom: 16 }}>
            <div style={{ padding: 20, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--amber-glow)', marginBottom: 6 }}>{selectedOT.numero_ot}</h3>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <span><i className="ti ti-building" style={{ marginRight: 5 }} />{selectedOT.cliente || 'Sin cliente'}</span>
                  {selectedOT.destino && <span><i className="ti ti-map-pin" style={{ marginRight: 5 }} />{selectedOT.destino}</span>}
                  <span><i className="ti ti-calendar" style={{ marginRight: 5 }} />{fmtFecha(selectedOT.created_at)}</span>
                </div>
              </div>
              <span style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: selectedOT.estado === 'ABIERTA' || selectedOT.estado === 'en_progreso' ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.12)', color: selectedOT.estado === 'ABIERTA' || selectedOT.estado === 'en_progreso' ? '#22C55E' : '#94A3B8' }}>{selectedOT.estado}</span>
            </div>
          </Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            {[{ label: 'Total Equipos', value: equiposOT.length, color: 'var(--amber-glow)' }, { label: 'Serializados', value: serialCount, color: '#3B82F6' }, { label: 'No Serializados', value: noSerialCount, color: '#F97316' }].map(s => (
              <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <Card>
            <CardHeader title="Equipos Asignados" icon="ti-package" subtitle={`${equiposOT.length} items`} />
            {equiposOT.length === 0 ? <EmptyState icon="ti-package-off" title="Sin equipos" subtitle="Esta OT no tiene equipos asignados" /> : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead><tr><th>Material</th><th>Serie</th><th>Cant.</th><th>Estado</th><th>Técnico</th><th>Ubicación</th></tr></thead>
                  <tbody>
                    {equiposOT.map(e => (
                      <tr key={e.id}>
                        <td><div style={{ fontWeight: 500 }}>{e.descripcion || e.material_id}</div><div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{e.material_id}</div></td>
                        <td className="mono" style={{ fontSize: 12 }}>{e.serial || '—'}</td>
                        <td style={{ textAlign: 'center' }}>{e.cantidad || 1}</td>
                        <td><Badge v={e.estado} /></td>
                        <td style={{ fontSize: 12 }}>{e.usuario_asignado_nombre || '—'}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.ubicacion || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      ) : (
        <EmptyState icon="ti-file-search" title="Selecciona una OT" subtitle="Busca y selecciona una orden de trabajo para ver sus equipos" />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CONTROL DE CALIDAD
// ═══════════════════════════════════════════════════════════════════
export function ControlCalidadView({ token }) {
  const [actas, setActas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/actas-qa/para-calidad', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Error al cargar');
      setActas(await res.json());
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  const toggle = key => setExpanded(p => ({ ...p, [key]: !p[key] }));
  const isOpen = key => expanded[key] !== false;

  const actualizarEstado = async (id, estado, comentario) => {
    try {
      await http.put(`/actas-qa/${id}/estado-qa`, { estado_qa: estado, comentario_qa: comentario });
      cargar();
    } catch { }
  };

  const descargarPDF = async (id) => {
    try {
      const res = await fetch(`/api/actas-qa/${id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `acta_${id}.pdf`; a.click();
    } catch { alert('Error al descargar PDF'); }
  };

  const grouped = useMemo(() => {
    const r = {};
    actas.forEach(a => {
      const fecha = new Date(a.created_at).toISOString().split('T')[0];
      if (!r[fecha]) r[fecha] = {};
      if (!r[fecha][a.tecnico_id]) r[fecha][a.tecnico_id] = { nombre: a.tecnico_nombre, actas: [] };
      r[fecha][a.tecnico_id].actas.push(a);
    });
    return r;
  }, [actas]);

  const QA_COLORS = { PENDIENTE: '#F97316', APROBADO: '#22C55E', RECHAZADO: '#EF4444' };

  if (loading) return <Loading text="Cargando actas QA..." />;

  return (
    <div className="fade-in">
      <PageHeader title="Control de Calidad QA" icon="ti-clipboard-check" subtitle={`${actas.length} actas registradas`} />
      {Object.keys(grouped).sort().reverse().map(fecha => (
        <Card key={fecha} style={{ marginBottom: 12 }}>
          <div onClick={() => toggle(fecha)} style={{ padding: '12px 18px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}><i className="ti ti-calendar" style={{ marginRight: 8, color: 'var(--amber-glow)' }} />{fecha} · {Object.keys(grouped[fecha]).length} técnico(s)</span>
            <i className={`ti ti-chevron-${isOpen(fecha) ? 'up' : 'down'}`} style={{ color: 'var(--text-muted)' }} />
          </div>
          {isOpen(fecha) && (
            <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(grouped[fecha]).map(([tid, tec]) => (
                <div key={tid} style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                  <div onClick={() => toggle(`${fecha}_${tid}`)} style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <span style={{ fontWeight: 500, fontSize: 13 }}><i className="ti ti-user" style={{ marginRight: 8, color: 'var(--text-muted)' }} />{tec.nombre} · {tec.actas.length} acta(s)</span>
                    <i className={`ti ti-chevron-${isOpen(`${fecha}_${tid}`) ? 'up' : 'down'}`} style={{ color: 'var(--text-muted)', fontSize: 14 }} />
                  </div>
                  {isOpen(`${fecha}_${tid}`) && (
                    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {tec.actas.map(acta => {
                        const qac = QA_COLORS[acta.estado_qa || 'PENDIENTE'] || '#F97316';
                        return (
                          <div key={acta.id} style={{ background: 'var(--bg-app)', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <span style={{ fontSize: 13, fontWeight: 500 }}>Acta #{acta.id} · {acta.fecha_ejecucion || 'Sin fecha'} · {acta.lugar_instalacion || 'Sin lugar'}</span>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${qac}18`, color: qac, border: `1px solid ${qac}30` }}>{acta.estado_qa || 'PENDIENTE'}</span>
                                <Btn variant="ghost" size="sm" onClick={() => descargarPDF(acta.id)} icon="ti-file-description">PDF</Btn>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <select value={acta.estado_qa || 'PENDIENTE'} onChange={e => actualizarEstado(acta.id, e.target.value, acta.comentario_qa || '')} style={{ width: 140 }}>
                                <option value="PENDIENTE">Pendiente</option>
                                <option value="APROBADO">Aprobado</option>
                                <option value="RECHAZADO">Rechazado</option>
                              </select>
                              <input value={acta.comentario_qa || ''} onChange={e => actualizarEstado(acta.id, acta.estado_qa || 'PENDIENTE', e.target.value)} placeholder="Comentario QA..." style={{ flex: 1 }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}
      {Object.keys(grouped).length === 0 && <EmptyState icon="ti-clipboard-off" title="Sin actas QA" subtitle="No hay actas pendientes de revisión" />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CARGA MASIVA
// ═══════════════════════════════════════════════════════════════════
export function CargaMasivaView({ bodegas = [], refresh }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [config, setConfig] = useState({
    bodega_id: '', columna_material: 'Material', columna_serial: 'NºSerieFab', columna_ot: 'OTP',
    columna_oth: 'OTH', columna_cliente: 'CLIENTE', columna_destino: 'Destino',
    columna_cantidad: 'Ctd.en UM entrada', columna_documento: 'Doc.mat.', columna_lote: 'LOTE'
  });

  const procesarArchivo = (e) => {
    const f = e.target.files[0]; if (!f) return;
    setFile(f); setAlert(null);
    const reader = new FileReader();
    reader.onload = ev => {
      const lines = ev.target.result.split(/\r\n|\n/);
      const headers = lines[0].split(',').map(h => h.replace(/["']/g,'').trim());
      const data = lines.slice(1).filter(l => l.trim()).map(l => {
        const vals = l.split(',').map(v => v.replace(/["']/g,'').trim());
        const row = {}; headers.forEach((h,i) => { row[h] = vals[i]||''; }); return row;
      });
      setPreview(data.slice(0, 10));
      setAlert({ type: 'success', msg: `Archivo cargado: ${data.length} registros. Primeros 10 en vista previa.` });
    };
    reader.readAsText(f, 'UTF-8');
  };

  const enviar = async () => {
    if (!config.bodega_id) { setAlert({ type: 'error', msg: 'Selecciona una bodega destino.' }); return; }
    if (!preview.length) { setAlert({ type: 'error', msg: 'Carga un archivo primero.' }); return; }
    setLoading(true); setAlert(null);
    const reader = new FileReader();
    reader.onload = async ev => {
      const lines = ev.target.result.split(/\r\n|\n/);
      const headers = lines[0].split(',').map(h => h.replace(/["']/g,'').trim());
      const datos = lines.slice(1).filter(l => l.trim()).map(l => {
        const vals = l.split(',').map(v => v.replace(/["']/g,'').trim());
        const row = {}; headers.forEach((h,i) => { row[h] = vals[i]||''; }); return row;
      });
      try {
        const res = await http.post('/inventario/carga-masiva', { datos, config, bodega_id: parseInt(config.bodega_id) });
        if (res.success) {
          setAlert({ type: res.errores > 0 ? 'warning' : 'success', msg: `Carga completada. ${res.procesados} equipos ingresados, ${res.errores} errores.` });
          if (res.procesados > 0) { await refresh(); setFile(null); setPreview([]); }
        } else setAlert({ type: 'error', msg: res.error || 'Error en la carga' });
      } catch (err) { setAlert({ type: 'error', msg: err.message }); }
      finally { setLoading(false); }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const cols = Object.keys(preview[0] || {});
  const colOpts = cols.map(c => <option key={c} value={c}>{c}</option>);

  const MAPEOS = [
    { key: 'columna_material', label: 'Código de Material' },
    { key: 'columna_serial',   label: 'Número de Serie' },
    { key: 'columna_ot',       label: 'OT' },
    { key: 'columna_oth',      label: 'OTH' },
    { key: 'columna_cliente',  label: 'Cliente' },
    { key: 'columna_destino',  label: 'Destino' },
    { key: 'columna_cantidad', label: 'Cantidad' },
    { key: 'columna_documento',label: 'Documento Material' },
    { key: 'columna_lote',     label: 'Lote' },
  ];

  return (
    <div className="fade-in">
      <PageHeader title="Carga Masiva" icon="ti-upload" subtitle="Importa inventario desde archivo CSV" />
      {alert && <Alert type={alert.type} msg={alert.msg} onClose={() => setAlert(null)} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Step 1 */}
        <Card>
          <CardHeader title="1. Seleccionar archivo CSV" icon="ti-file-upload" />
          <div style={{ padding: 20 }}>
            <div style={{ border: '2px dashed var(--border-strong)', borderRadius: 12, padding: '32px', textAlign: 'center', cursor: 'pointer' }}>
              <i className="ti ti-cloud-upload" style={{ fontSize: 36, color: 'var(--amber-glow)', display: 'block', marginBottom: 10 }} />
              <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>Arrastra un archivo CSV o haz clic para seleccionar</p>
              <input type="file" accept=".csv" onChange={procesarArchivo} style={{ display: 'block', margin: '0 auto', width: 'auto' }} />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>El archivo debe tener encabezados en la primera fila</p>
            </div>
          </div>
        </Card>

        {/* Step 2: mapeo */}
        {preview.length > 0 && (
          <Card className="fade-in">
            <CardHeader title="2. Mapeo de columnas" icon="ti-columns" />
            <div style={{ padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
                {MAPEOS.map(({ key, label }) => (
                  <div key={key}>
                    <Label>{label}</Label>
                    <select value={config[key]} onChange={e => setConfig(p => ({ ...p, [key]: e.target.value }))}>
                      <option value="">Ninguna</option>
                      {key === 'columna_lote' && <><option value="VALORADO">VALORADO (fijo)</option><option value="NO VALORADO">NO VALORADO (fijo)</option></>}
                      {colOpts}
                    </select>
                  </div>
                ))}
                <div>
                  <Label required>Bodega destino</Label>
                  <select value={config.bodega_id} onChange={e => setConfig(p => ({ ...p, bodega_id: e.target.value }))}>
                    <option value="">Seleccionar...</option>
                    {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Step 3: preview */}
        {preview.length > 0 && (
          <Card className="fade-in">
            <CardHeader title="3. Vista previa (primeros 10 registros)" icon="ti-table" />
            <div style={{ overflowX: 'auto', padding: '0 0 4px' }}>
              <table>
                <thead><tr>{cols.slice(0, 8).map(h => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>{preview.map((row, i) => <tr key={i}>{Object.values(row).slice(0, 8).map((v, j) => <td key={j} style={{ fontSize: 12 }}>{v}</td>)}</tr>)}</tbody>
              </table>
            </div>
          </Card>
        )}

        {preview.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Btn onClick={enviar} loading={loading} icon="ti-cloud-upload" size="lg">Procesar Carga Masiva</Btn>
          </div>
        )}
      </div>
    </div>
  );
}
