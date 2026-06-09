import React, { useState, useMemo } from 'react';
import { http, fmtFecha, ESTADO_META } from '../api.js';
import { Card, CardHeader, Btn, Alert, Badge, Label, PageHeader, SearchInput, EmptyState, Loading, DropdownList } from './UI.jsx';

export default function InventarioView({ bodegas = [], inv = [], materiales = [], ots = [], refresh }) {
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [alert, setAlert]         = useState(null);
  const [filterBodega, setFB]     = useState('');
  const [filterEstado, setFE]     = useState('');
  const [search, setSearch]       = useState('');

  // OT search
  const [buscarOT, setBuscarOT]   = useState('');
  const [showOtDrop, setShowOtDrop] = useState(false);
  const [otSel, setOtSel]         = useState(null);
  // Material search
  const [buscarMat, setBuscarMat] = useState('');
  const [showMatDrop, setShowMatDrop] = useState(false);
  const [matSel, setMatSel]       = useState(null);

  const [form, setForm] = useState({
    material_id: '', serial: '', cantidad: 1, bodega_id: '',
    ot_id: '', ubicacion: '', documento_material: '', oth: '', lote: 'NO VALORADO'
  });
  const [nuevaOTData, setNuevaOTData] = useState({ cliente: '', destino: '', mostrarFormulario: false });

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const filteredOTs = useMemo(() => {
    if (!buscarOT.trim()) return [];
    const t = buscarOT.toLowerCase();
    return ots.filter(o => (o.numero_ot||'').toLowerCase().includes(t) || (o.cliente||'').toLowerCase().includes(t)).slice(0, 6);
  }, [buscarOT, ots]);

  const filteredMats = useMemo(() => {
    if (!buscarMat.trim()) return [];
    const t = buscarMat.toLowerCase();
    return materiales.filter(m => (m.codigo_sap||'').toLowerCase().includes(t) || (m.descripcion||'').toLowerCase().includes(t)).slice(0, 6);
  }, [buscarMat, materiales]);

  const filtered = useMemo(() => inv.filter(i => {
    if (filterBodega && i.bodega_id !== parseInt(filterBodega)) return false;
    if (filterEstado && i.estado !== filterEstado) return false;
    if (search) {
      const t = search.toLowerCase();
      if (!(i.descripcion||i.material_id||'').toLowerCase().includes(t) && !(i.serial||'').toLowerCase().includes(t)) return false;
    }
    return true;
  }), [inv, filterBodega, filterEstado, search]);

  const getBodega = id => bodegas.find(b => b.id === id)?.nombre || '—';

  const handleCreate = async () => {
    if (!form.material_id || !form.bodega_id) { setAlert({ type: 'error', msg: 'Material y bodega son obligatorios.' }); return; }
    setSaving(true); setAlert(null);
    try {
      const body = { ...form, bodega_id: parseInt(form.bodega_id), cantidad: parseInt(form.cantidad) || 1 };
      if (nuevaOTData.mostrarFormulario && buscarOT) {
        body.nueva_ot = { numero_ot: buscarOT, cliente: nuevaOTData.cliente, destino: nuevaOTData.destino };
      }
      await http.post('/inventario', body);
      await refresh();
      setShowForm(false);
      resetForm();
      setAlert({ type: 'success', msg: 'Equipo ingresado correctamente.' });
    } catch (err) { setAlert({ type: 'error', msg: err.message }); }
    finally { setSaving(false); }
  };

  const resetForm = () => {
    setForm({ material_id: '', serial: '', cantidad: 1, bodega_id: '', ot_id: '', ubicacion: '', documento_material: '', oth: '', lote: 'NO VALORADO' });
    setBuscarOT(''); setOtSel(null); setBuscarMat(''); setMatSel(null);
    setNuevaOTData({ cliente: '', destino: '', mostrarFormulario: false });
  };

  const exportCSV = () => {
    if (!filtered.length) return;
    const headers = ['Material','Código','Serie','Doc. Material','OTH','Lote','Cantidad','Ubicación','Bodega','Estado','OT'];
    const rows = filtered.map(i => [
      i.descripcion||'', i.material_id||'', i.serial||'', i.documento_material||'',
      i.oth||'', i.lote||'', i.cantidad, i.ubicacion||'', getBodega(i.bodega_id), i.estado, i.numero_ot||''
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\uFEFF'+csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `inventario_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  return (
    <div className="fade-in">
      <PageHeader
        title="Inventario"
        icon="ti-package"
        subtitle={`${filtered.length} de ${inv.length} equipos`}
        actions={
          <>
            <Btn variant="ghost" size="sm" onClick={exportCSV} icon="ti-download">Exportar CSV</Btn>
            <Btn size="sm" onClick={() => { setShowForm(s => !s); if (showForm) resetForm(); }} icon={showForm ? 'ti-x' : 'ti-plus'}>
              {showForm ? 'Cancelar' : 'Nuevo Equipo'}
            </Btn>
          </>
        }
      />

      {alert && <Alert type={alert.type} msg={alert.msg} onClose={() => setAlert(null)} />}

      {/* Form */}
      {showForm && (
        <Card style={{ marginBottom: 20 }} className="fade-in">
          <CardHeader title="Registrar nuevo equipo" icon="ti-plus" />
          <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 14 }}>
              {/* Material */}
              <div style={{ position: 'relative' }}>
                <Label required>Material (SAP)</Label>
                <input value={buscarMat} onChange={e => { setBuscarMat(e.target.value); setShowMatDrop(true); setMatSel(null); setForm(p => ({ ...p, material_id: '' })); }} placeholder="Código o descripción..." onFocus={() => setShowMatDrop(true)} />
                {matSel && <div style={{ fontSize: 11, color: 'var(--amber-glow)', marginTop: 3 }}>✓ {matSel.codigo_sap} — {matSel.descripcion}</div>}
                <DropdownList
                  items={showMatDrop ? filteredMats : []}
                  onSelect={m => { setMatSel(m); setBuscarMat(m.codigo_sap); setForm(p => ({ ...p, material_id: m.codigo_sap })); setShowMatDrop(false); }}
                  renderItem={m => <><strong style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{m.codigo_sap}</strong><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.descripcion}</div></>}
                />
              </div>
              <div>
                <Label>N° Serie</Label>
                <input value={form.serial} onChange={f('serial')} placeholder="Número de serie (opcional)" />
              </div>
              <div>
                <Label required>Cantidad</Label>
                <input type="number" min="1" value={form.cantidad} onChange={f('cantidad')} />
              </div>
              <div>
                <Label required>Bodega destino</Label>
                <select value={form.bodega_id} onChange={f('bodega_id')}>
                  <option value="">Seleccionar bodega...</option>
                  {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
              </div>
              {/* OT */}
              <div style={{ position: 'relative' }}>
                <Label>OT (Opcional)</Label>
                <input value={buscarOT} onChange={e => { setBuscarOT(e.target.value); setShowOtDrop(true); setOtSel(null); setForm(p => ({ ...p, ot_id: '' })); const ex = ots.find(o => o.numero_ot === e.target.value); setNuevaOTData(p => ({ ...p, mostrarFormulario: e.target.value.length > 2 && !ex })); }} placeholder="Número de OT..." onFocus={() => setShowOtDrop(true)} />
                {otSel && <div style={{ fontSize: 11, color: '#22C55E', marginTop: 3 }}>✓ {otSel.numero_ot} — {otSel.cliente}</div>}
                <DropdownList
                  items={showOtDrop ? filteredOTs : []}
                  onSelect={o => { setOtSel(o); setBuscarOT(o.numero_ot); setForm(p => ({ ...p, ot_id: o.id })); setShowOtDrop(false); setNuevaOTData({ cliente: '', destino: '', mostrarFormulario: false }); }}
                  renderItem={o => <><strong style={{ fontSize: 12 }}>{o.numero_ot}</strong><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.cliente}</div></>}
                />
              </div>
              <div>
                <Label>OTH</Label>
                <input value={form.oth} onChange={f('oth')} placeholder="Número OTH" />
              </div>
              <div>
                <Label>Doc. Material</Label>
                <input value={form.documento_material} onChange={f('documento_material')} placeholder="Nro. documento SAP" />
              </div>
              <div>
                <Label>Lote</Label>
                <select value={form.lote} onChange={f('lote')}>
                  <option value="NO VALORADO">NO VALORADO</option>
                  <option value="VALORADO">VALORADO</option>
                </select>
              </div>
              <div>
                <Label>Ubicación</Label>
                <input value={form.ubicacion} onChange={f('ubicacion')} placeholder="Rack, posición..." />
              </div>
            </div>
            {nuevaOTData.mostrarFormulario && (
              <div style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--amber-glow)', marginBottom: 10 }}>✨ Nueva OT — completar datos</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><Label>Cliente</Label><input value={nuevaOTData.cliente} onChange={e => setNuevaOTData(p => ({ ...p, cliente: e.target.value }))} placeholder="Nombre cliente" /></div>
                  <div><Label>Destino</Label><input value={nuevaOTData.destino} onChange={e => setNuevaOTData(p => ({ ...p, destino: e.target.value }))} placeholder="Dirección" /></div>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={handleCreate} loading={saving} icon="ti-check">Registrar equipo</Btn>
              <Btn variant="secondary" onClick={() => { setShowForm(false); resetForm(); }}>Cancelar</Btn>
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ padding: '12px 16px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por material o serie..." style={{ flex: 1, minWidth: 200 }} />
          <select value={filterBodega} onChange={e => setFB(e.target.value)} style={{ width: 180 }}>
            <option value="">Todas las bodegas</option>
            {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>
          <select value={filterEstado} onChange={e => setFE(e.target.value)} style={{ width: 160 }}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {(filterBodega || filterEstado || search) && (
            <Btn variant="ghost" size="sm" onClick={() => { setFB(''); setFE(''); setSearch(''); }} icon="ti-x">Limpiar</Btn>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card>
        {filtered.length === 0
          ? <EmptyState icon="ti-package-off" title="Sin equipos" subtitle="No hay equipos que coincidan con los filtros" />
          : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Serie / Lote</th>
                    <th>Cant.</th>
                    <th>Bodega</th>
                    <th>Estado</th>
                    <th>OT / OTH</th>
                    <th>Doc. Mat.</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(i => (
                    <tr key={i.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{i.descripcion || i.material_descripcion || '—'}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{i.material_id}</div>
                      </td>
                      <td>
                        {i.serial
                          ? <span className="mono" style={{ color: 'var(--text-primary)' }}>{i.serial}</span>
                          : <span style={{ fontSize: 11, background: 'rgba(59,130,246,0.1)', color: '#3B82F6', padding: '2px 6px', borderRadius: 12 }}>Consumible</span>
                        }
                        {i.lote && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{i.lote}</div>}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{i.cantidad ?? 1}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{getBodega(i.bodega_id)}</td>
                      <td><Badge v={i.estado} /></td>
                      <td>
                        {i.numero_ot && <div style={{ fontSize: 12, fontWeight: 500 }}>{i.numero_ot}</div>}
                        {i.oth && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>OTH: {i.oth}</div>}
                        {!i.numero_ot && !i.oth && <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{i.documento_material || '—'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{fmtFecha(i.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </Card>
    </div>
  );
}
