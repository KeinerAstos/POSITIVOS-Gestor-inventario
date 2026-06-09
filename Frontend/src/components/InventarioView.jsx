import React, { useState, useMemo } from 'react';
import { http, fmtFecha, ESTADO_META } from '../api.js';
import { Card, CardHeader, Btn, Alert, Badge, Label, PageHeader, SearchInput, EmptyState, Loading, DropdownList } from './UI.jsx';

export default function InventarioView({ bodegas = [], inv = [], materiales = [], ots = [], refresh, setView, setTransferItem }) {
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [alert, setAlert]         = useState(null);
  const [filterBodega, setFB]     = useState('');
  const [filterEstado, setFE]     = useState('');
  const [search, setSearch]       = useState('');

  // Estados para exportación por estado
  const [reporteEstado, setReporteEstado] = useState('');

  // OT search y creación
  const [buscarOT, setBuscarOT]   = useState('');
  const [showOtDrop, setShowOtDrop] = useState(false);
  const [otSel, setOtSel]         = useState(null);
  const [nuevaOTData, setNuevaOTData] = useState({ cliente: '', destino: '', mostrarFormulario: false });

  // Material search
  const [buscarMat, setBuscarMat] = useState('');
  const [showMatDrop, setShowMatDrop] = useState(false);
  const [matSel, setMatSel]       = useState(null);

  const [form, setForm] = useState({
    material_id: '', serial: '', cantidad: 1, bodega_id: '',
    ot_id: '', ubicacion: '', documento_material: '', oth: '', lote: 'NO VALORADO'
  });

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  // Filtros para dropdowns
  const filteredOTs = useMemo(() => {
    if (!buscarOT.trim()) return [];
    const t = buscarOT.toLowerCase();
    return ots.filter(o => (o.numero_ot || '').toLowerCase().includes(t) || (o.cliente || '').toLowerCase().includes(t)).slice(0, 6);
  }, [buscarOT, ots]);

  const filteredMats = useMemo(() => {
    if (!buscarMat.trim()) return [];
    const t = buscarMat.toLowerCase();
    return materiales.filter(m => (m.codigo_sap || '').toLowerCase().includes(t) || (m.descripcion || '').toLowerCase().includes(t)).slice(0, 6);
  }, [buscarMat, materiales]);

  // Filtro principal de inventario (búsqueda en TODOS los campos)
  const filtered = useMemo(() => {
    return inv.filter(i => {
      if (filterBodega && i.bodega_id !== parseInt(filterBodega)) return false;
      if (filterEstado && i.estado !== filterEstado) return false;
      if (search) {
        const term = search.toLowerCase();
        const searchable = [
          i.material_id,
          i.material_descripcion || i.descripcion,
          i.serial,
          i.documento_material,
          i.numero_ot,
          i.oth,
          i.lote,
          i.ubicacion,
          i.estado
        ].filter(Boolean).join(' ').toLowerCase();
        if (!searchable.includes(term)) return false;
      }
      return true;
    });
  }, [inv, filterBodega, filterEstado, search]);

  const getBodega = id => bodegas.find(b => b.id === id)?.nombre || '—';

  // ---- FUNCIONES DE EXPORTACIÓN ----
  const exportarFiltrado = () => {
    if (!filtered.length) {
      setAlert({ type: 'error', msg: 'No hay equipos para exportar con los filtros actuales' });
      return;
    }
    const headers = ['Material', 'Código', 'Serie', 'Doc. Material', 'OTH', 'Lote', 'Cantidad', 'Ubicación', 'Bodega', 'Estado', 'OT Asociada'];
    const rows = filtered.map(i => [
      i.descripcion || i.material_descripcion || '',
      i.material_id || '',
      i.serial || '',
      i.documento_material || '',
      i.oth || '',
      i.lote || '',
      i.cantidad,
      i.ubicacion || '',
      getBodega(i.bodega_id),
      i.estado,
      i.numero_ot || ''
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inventario_filtrado_${new Date().toISOString().slice(0, 19)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportarPorEstado = () => {
    let datos = inv;
    if (reporteEstado) datos = inv.filter(i => i.estado === reporteEstado);
    if (!datos.length) {
      setAlert({ type: 'error', msg: `No hay equipos con estado ${reporteEstado || 'seleccionado'}` });
      return;
    }
    const headers = ['Material', 'Código', 'Serie', 'Doc. Material', 'OTH', 'Lote', 'Cantidad', 'Ubicación', 'Bodega', 'Estado', 'OT Asociada'];
    const rows = datos.map(i => [
      i.descripcion || i.material_descripcion || '',
      i.material_id || '',
      i.serial || '',
      i.documento_material || '',
      i.oth || '',
      i.lote || '',
      i.cantidad,
      i.ubicacion || '',
      getBodega(i.bodega_id),
      i.estado,
      i.numero_ot || ''
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inventario_${reporteEstado || 'todos'}_${new Date().toISOString().slice(0, 19)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  // ---------------------------------

  // Lógica de creación de equipo (con manejo de nueva OT)
  const handleCreate = async () => {
    if (!form.material_id) { setAlert({ type: 'error', msg: 'Debes seleccionar un material.' }); return; }
    if (!form.bodega_id) { setAlert({ type: 'error', msg: 'Debes seleccionar una bodega.' }); return; }
    setSaving(true); setAlert(null);

    try {
      let otId = form.ot_id;
      // Si hay una OT escrita y no es la seleccionada
      if (buscarOT && buscarOT.trim() !== '') {
        const otExistente = ots.find(o => o.numero_ot === buscarOT);
        if (otExistente) {
          otId = otExistente.id;
          setOtSel(otExistente);
          setForm(p => ({ ...p, ot_id: otId }));
        } else {
          if (!nuevaOTData.cliente) {
            setAlert({ type: 'error', msg: 'La OT no existe. Debes ingresar el cliente para crearla.' });
            setSaving(false);
            return;
          }
          const nuevaOT = await http.post('/ot', {
            numero_ot: buscarOT,
            cliente: nuevaOTData.cliente,
            destino: nuevaOTData.destino || 'Pendiente',
            estado: 'ABIERTA'
          });
          otId = nuevaOT.id;
          setOtSel(nuevaOT);
          setForm(p => ({ ...p, ot_id: otId }));
          await refresh();
        }
      }

      const payload = {
        material_id: form.material_id,
        serial: form.serial?.trim() || null,
        cantidad: parseInt(form.cantidad) || 1,
        bodega_id: parseInt(form.bodega_id),
        ubicacion: form.ubicacion || null,
        ot_id: otId || null,
        documento_material: form.documento_material || null,
        oth: form.oth || null,
        lote: form.lote || 'NO VALORADO'
      };
      await http.post('/inventario', payload);
      await refresh();
      resetForm();
      setShowForm(false);
      setAlert({ type: 'success', msg: 'Equipo registrado correctamente.' });
    } catch (err) {
      setAlert({ type: 'error', msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm({
      material_id: '', serial: '', cantidad: 1, bodega_id: '',
      ot_id: '', ubicacion: '', documento_material: '', oth: '', lote: 'NO VALORADO'
    });
    setBuscarOT(''); setOtSel(null);
    setBuscarMat(''); setMatSel(null);
    setNuevaOTData({ cliente: '', destino: '', mostrarFormulario: false });
  };

  const clearOT = () => {
    setOtSel(null);
    setBuscarOT('');
    setForm(p => ({ ...p, ot_id: '' }));
    setNuevaOTData({ cliente: '', destino: '', mostrarFormulario: false });
  };

  const selectOT = (ot) => {
    setOtSel(ot);
    setBuscarOT(ot.numero_ot);
    setForm(p => ({ ...p, ot_id: ot.id }));
    setShowOtDrop(false);
    setNuevaOTData({ cliente: '', destino: '', mostrarFormulario: false });
  };

  const selectMaterial = (m) => {
    setMatSel(m);
    setBuscarMat(m.codigo_sap);
    setForm(p => ({ ...p, material_id: m.codigo_sap }));
    setShowMatDrop(false);
  };

  const clearMaterial = () => {
    setMatSel(null);
    setBuscarMat('');
    setForm(p => ({ ...p, material_id: '' }));
  };

  const totalConSerial = inv.filter(i => i.serial).length;
  const totalSinSerial = inv.filter(i => !i.serial).length;

  return (
    <div className="fade-in">
      <PageHeader
        title="Inventario"
        icon="ti-package"
        subtitle={`${filtered.length} de ${inv.length} equipos · ${totalConSerial} con serial · ${totalSinSerial} sin serial`}
        actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={reporteEstado} onChange={e => setReporteEstado(e.target.value)} style={{ width: 160 }}>
              <option value="">Todos los estados</option>
              {Object.keys(ESTADO_META).map(k => <option key={k} value={k}>{ESTADO_META[k].label}</option>)}
            </select>
            <Btn variant="ghost" size="sm" onClick={exportarFiltrado} icon="ti-download">Exportar filtrado</Btn>
            <Btn variant="ghost" size="sm" onClick={exportarPorEstado} icon="ti-download">Exportar por estado</Btn>
            <Btn size="sm" onClick={() => { setShowForm(s => !s); if (showForm) resetForm(); }} icon={showForm ? 'ti-x' : 'ti-plus'}>
              {showForm ? 'Cancelar' : 'Nuevo equipo'}
            </Btn>
          </div>
        }
      />

      {alert && <Alert type={alert.type} msg={alert.msg} onClose={() => setAlert(null)} />}

      {/* Formulario de creación */}
      {showForm && (
        <Card style={{ marginBottom: 20 }} className="fade-in">
          <CardHeader title="Registrar nuevo equipo" icon="ti-plus" />
          <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 14 }}>
              {/* Material autocompletado */}
              <div style={{ position: 'relative' }}>
                <Label required>Material (SAP)</Label>
                <div style={{ position: 'relative' }}>
                  <input
                    value={buscarMat}
                    onChange={e => { setBuscarMat(e.target.value); setShowMatDrop(true); setMatSel(null); setForm(p => ({ ...p, material_id: '' })); }}
                    placeholder="Código o descripción..."
                    onFocus={() => setShowMatDrop(true)}
                  />
                  {buscarMat && <button onClick={clearMaterial} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>}
                </div>
                {matSel && <div style={{ fontSize: 11, color: 'var(--primary)', marginTop: 3 }}>✓ {matSel.codigo_sap} — {matSel.descripcion}</div>}
                <DropdownList
                  items={showMatDrop ? filteredMats : []}
                  onSelect={selectMaterial}
                  renderItem={m => <><strong>{m.codigo_sap}</strong><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.descripcion}</div></>}
                />
              </div>

              <div><Label>N° Serie</Label><input value={form.serial} onChange={f('serial')} placeholder="Número de serie (opcional)" /></div>
              <div><Label required>Cantidad</Label><input type="number" min="1" value={form.cantidad} onChange={f('cantidad')} /></div>
              <div><Label required>Bodega destino</Label><select value={form.bodega_id} onChange={f('bodega_id')}><option value="">Seleccionar...</option>{bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}</select></div>

              {/* OT con autocompletado y creación */}
              <div style={{ position: 'relative' }}>
                <Label>OT (Opcional)</Label>
                <div style={{ position: 'relative' }}>
                  <input
                    value={buscarOT}
                    onChange={e => {
                      const val = e.target.value;
                      setBuscarOT(val);
                      setShowOtDrop(true);
                      if (otSel) { setOtSel(null); setForm(p => ({ ...p, ot_id: '' })); }
                      const existe = ots.some(o => o.numero_ot === val);
                      setNuevaOTData(prev => ({ ...prev, mostrarFormulario: val.length > 2 && !existe }));
                    }}
                    placeholder="Número de OT..."
                    onFocus={() => setShowOtDrop(true)}
                  />
                  {buscarOT && <button onClick={clearOT} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>}
                </div>
                {otSel && <div style={{ fontSize: 11, color: 'var(--primary)', marginTop: 3 }}>✓ {otSel.numero_ot} — {otSel.cliente}</div>}
                <DropdownList items={showOtDrop ? filteredOTs : []} onSelect={selectOT} renderItem={o => <><strong>{o.numero_ot}</strong><div style={{ fontSize: 11 }}>{o.cliente}</div></>} />
              </div>

              <div><Label>OTH</Label><input value={form.oth} onChange={f('oth')} placeholder="Número OTH" /></div>
              <div><Label>Doc. Material</Label><input value={form.documento_material} onChange={f('documento_material')} placeholder="Nro. documento SAP" /></div>
              <div><Label>Lote</Label><select value={form.lote} onChange={f('lote')}><option value="NO VALORADO">NO VALORADO</option><option value="VALORADO">VALORADO</option></select></div>
              <div><Label>Ubicación</Label><input value={form.ubicacion} onChange={f('ubicacion')} placeholder="Rack, posición..." /></div>
            </div>

            {nuevaOTData.mostrarFormulario && (
              <div style={{ background: 'rgba(16,212,81,0.08)', border: '1px solid rgba(16,212,81,0.2)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', marginBottom: 10 }}>✨ Nueva OT — completar datos</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><Label required>Cliente</Label><input value={nuevaOTData.cliente} onChange={e => setNuevaOTData(p => ({ ...p, cliente: e.target.value }))} placeholder="Nombre cliente" /></div>
                  <div><Label>Destino</Label><input value={nuevaOTData.destino} onChange={e => setNuevaOTData(p => ({ ...p, destino: e.target.value }))} placeholder="Dirección" /></div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}><i className="ti ti-info-circle" /> Esta OT se creará automáticamente al guardar.</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={handleCreate} loading={saving} icon="ti-check">Registrar equipo</Btn>
              <Btn variant="secondary" onClick={() => { setShowForm(false); resetForm(); }}>Cancelar</Btn>
            </div>
          </div>
        </Card>
      )}

      {/* Filtros */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ padding: '12px 16px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por cualquier campo (material, serie, OT, lote, doc, OTH, ubicación, estado)..." style={{ flex: 2, minWidth: 250 }} />
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

      {/* Tabla */}
      <Card>
        {filtered.length === 0
          ? <EmptyState icon="ti-package-off" title="Sin equipos" subtitle="No hay equipos que coincidan con los filtros" />
          : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ minWidth: 1100 }}>
                <thead>
                  <tr>
                    <th>Cantidad</th><th>Código</th><th>Descripción</th><th>Serie</th><th>Doc. Material</th><th>OT</th><th>OTH</th><th>Lote</th><th>Ubicación</th><th>Estado</th><th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => (
                    <tr key={item.id}>
                      <td style={{ textAlign: 'center' }}>{item.cantidad ?? 1}</td>
                      <td><span className="mono">{item.material_id}</span></td>
                      <td>{item.descripcion || item.material_descripcion || '—'}</td>
                      <td>{item.serial ? <code className="mono">{item.serial}</code> : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}</td>
                      <td>{item.documento_material || '—'}</td>
                      <td>{item.numero_ot ? <Badge v="info" style={{ background: 'none' }}>{item.numero_ot}</Badge> : '—'}</td>
                      <td>{item.oth || '—'}</td>
                      <td>{item.lote || '—'}</td>
                      <td>{item.ubicacion || '—'}</td>
                      <td><Badge v={item.estado} /></td>
                      <td>
                        <Btn variant="secondary" size="sm" onClick={() => { setTransferItem?.(item); setView?.('transferir'); }} icon="ti-arrows-transfer">Transferir</Btn>
                      </td>
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