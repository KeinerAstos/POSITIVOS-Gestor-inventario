import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { http, fmtFecha, ESTADO_META } from '../api.js';
import { Card, CardHeader, Btn, Alert, Badge, Label, PageHeader, SearchInput, EmptyState, Loading, DropdownList } from './UI.jsx';
import '../styles/InventarioView.css';

export default function InventarioView({ bodegas = [], materiales = [], ots = [], refresh }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  const [filterBodega, setFB] = useState('');
  const [filterEstado, setFE] = useState('');
  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');

  const [items, setItems] = useState([]);
  const [loadingInventario, setLoadingInventario] = useState(false);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false
  });

  // Estados para exportación por estado
  const [reporteEstado, setReporteEstado] = useState('');

  // Modal de movimientos
  const [showMovementsModal, setShowMovementsModal] = useState(false);
  const [selectedItemMovements, setSelectedItemMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);

  // OT search y creación
  const [buscarOT, setBuscarOT] = useState('');
  const [showOtDrop, setShowOtDrop] = useState(false);
  const [otSel, setOtSel] = useState(null);
  const [nuevaOTData, setNuevaOTData] = useState({ cliente: '', destino: '', mostrarFormulario: false });

  // Material search
  const [buscarMat, setBuscarMat] = useState('');
  const [showMatDrop, setShowMatDrop] = useState(false);
  const [matSel, setMatSel] = useState(null);

  const [form, setForm] = useState({
    material_id: '',
    serial: '',
    cantidad: 1,
    bodega_id: '',
    ot_id: '',
    ubicacion: '',
    documento_material: '',
    oth: '',
    lote: 'NO VALORADO'
  });

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const cargarInventario = useCallback(async () => {
    setLoadingInventario(true);

    try {
      const params = new URLSearchParams();

      params.set('page', String(page));
      params.set('limit', String(limit));

      if (filterBodega) params.set('bodega_id', filterBodega);
      if (filterEstado) params.set('estado', filterEstado);
      if (search.trim()) params.set('search', search.trim());

      const response = await http.get(`/inventario?${params.toString()}`);

      console.log('RESPUESTA INVENTARIO COMPLETA:', response);

      /*
        Soporta varias formas posibles de respuesta:
  
        1. Axios normal:
           response.data = { data: [...], pagination: {...} }
  
        2. Wrapper personalizado:
           response = { data: [...], pagination: {...} }
  
        3. Backend viejo:
           response.data = [...]
           o response = [...]
      */

      let payload = response;

      if (response?.data && !Array.isArray(response)) {
        payload = response.data;
      }

      console.log('PAYLOAD INVENTARIO:', payload);

      // Caso backend nuevo: { data: [...], pagination: {...} }
      if (payload && Array.isArray(payload.data)) {
        setItems(payload.data);

        setPagination(payload.pagination || {
          page,
          limit,
          total: payload.data.length,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false
        });

        return;
      }

      // Caso backend viejo: [...]
      if (Array.isArray(payload)) {
        setItems(payload);

        setPagination({
          page: 1,
          limit: payload.length,
          total: payload.length,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false
        });

        return;
      }

      // Caso extraño: response.data.data
      if (response?.data?.data && Array.isArray(response.data.data)) {
        setItems(response.data.data);

        setPagination(response.data.pagination || {
          page,
          limit,
          total: response.data.data.length,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false
        });

        return;
      }

      console.warn('Formato de respuesta no reconocido:', response);

      setItems([]);
      setPagination({
        page,
        limit,
        total: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
      });

    } catch (err) {
      console.error('Error cargando inventario:', err);
      setAlert({ type: 'error', msg: 'No se pudo cargar el inventario.' });
      setItems([]);
    } finally {
      setLoadingInventario(false);
    }
  }, [page, limit, filterBodega, filterEstado, search]);

  useEffect(() => {
    cargarInventario();
  }, [cargarInventario]);

  const handleBuscar = () => {
    setPage(1);
    setSearch(searchDraft);
  };

  const limpiarFiltros = () => {
    setFB('');
    setFE('');
    setSearch('');
    setSearchDraft('');
    setPage(1);
  };

  // Filtros para dropdowns
  const filteredOTs = useMemo(() => {
    if (!buscarOT.trim()) return [];
    const t = buscarOT.toLowerCase();
    return ots
      .filter(o =>
        (o.numero_ot || '').toLowerCase().includes(t) ||
        (o.cliente || '').toLowerCase().includes(t)
      )
      .slice(0, 6);
  }, [buscarOT, ots]);

  const filteredMats = useMemo(() => {
    if (!buscarMat.trim()) return [];
    const t = buscarMat.toLowerCase();
    return materiales
      .filter(m =>
        (m.codigo_sap || '').toLowerCase().includes(t) ||
        (m.descripcion || '').toLowerCase().includes(t)
      )
      .slice(0, 6);
  }, [buscarMat, materiales]);

  const getBodega = id => bodegas.find(b => b.id === id)?.nombre || '—';

  const buildCsv = (datos) => {
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

    return [headers, ...rows]
      .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
  };

  // Exporta solo lo que está visible en la página actual
  const exportarFiltrado = () => {
    if (!items.length) {
      setAlert({ type: 'error', msg: 'No hay equipos para exportar en la página actual.' });
      return;
    }

    const csv = buildCsv(items);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    link.href = URL.createObjectURL(blob);
    link.download = `inventario_pagina_${page}_${new Date().toISOString().slice(0, 19)}.csv`;
    link.click();

    URL.revokeObjectURL(link.href);
  };

  // Exporta por estado usando backend. Recomendado para no cargar toda la BD en React.
  const exportarPorEstado = () => {
    const params = new URLSearchParams();

    if (reporteEstado) params.set('estado', reporteEstado);
    if (filterBodega) params.set('bodega_id', filterBodega);
    if (search.trim()) params.set('search', search.trim());

    window.open(`/api/inventario/export?${params.toString()}`, '_blank');
  };

  const loadMovements = async (inventarioId) => {
    setLoadingMovements(true);

    try {
      const response = await http.get(`/movimientos?inventario_id=${inventarioId}&limit=50`);
      setSelectedItemMovements(response.data || []);
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', msg: 'No se pudieron cargar los movimientos' });
    } finally {
      setLoadingMovements(false);
    }
  };

  const handleShowMovements = (item) => {
    setCurrentItem(item);
    loadMovements(item.id);
    setShowMovementsModal(true);
  };

  const handleCreate = async () => {
    if (!form.material_id) {
      setAlert({ type: 'error', msg: 'Debes seleccionar un material.' });
      return;
    }

    if (!form.bodega_id) {
      setAlert({ type: 'error', msg: 'Debes seleccionar una bodega.' });
      return;
    }

    setSaving(true);
    setAlert(null);

    try {
      let otId = form.ot_id;

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

          if (refresh) await refresh();
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

      resetForm();
      setShowForm(false);
      setPage(1);
      await cargarInventario();

      if (refresh) await refresh();

      setAlert({ type: 'success', msg: 'Equipo registrado correctamente.' });
    } catch (err) {
      setAlert({ type: 'error', msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm({
      material_id: '',
      serial: '',
      cantidad: 1,
      bodega_id: '',
      ot_id: '',
      ubicacion: '',
      documento_material: '',
      oth: '',
      lote: 'NO VALORADO'
    });

    setBuscarOT('');
    setOtSel(null);
    setBuscarMat('');
    setMatSel(null);
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

  const totalConSerialPagina = items.filter(i => i.serial).length;
  const totalSinSerialPagina = items.filter(i => !i.serial).length;

  return (
    <div className="fade-in">
      <PageHeader
        title="Inventario"
        icon="ti-package"
        subtitle={`${items.length} visibles de ${pagination.total} equipos · ${totalConSerialPagina} con serial en página · ${totalSinSerialPagina} sin serial en página`}
        actions={
          <div className="inventario-actions">
            <select className="inventario-export-select" value={reporteEstado} onChange={e => setReporteEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              {Object.keys(ESTADO_META).map(k => (
                <option key={k} value={k}>{ESTADO_META[k].label}</option>
              ))}
            </select>

            <Btn variant="ghost" size="sm" onClick={exportarFiltrado} icon="ti-download">
              Exportar página
            </Btn>

            <Btn variant="ghost" size="sm" onClick={exportarPorEstado} icon="ti-download">
              Exportar por estado
            </Btn>

            <Btn size="sm" onClick={() => { setShowForm(s => !s); if (showForm) resetForm(); }} icon={showForm ? 'ti-x' : 'ti-plus'}>
              {showForm ? 'Cancelar' : 'Nuevo equipo'}
            </Btn>
          </div>
        }
      />

      {alert && <Alert type={alert.type} msg={alert.msg} onClose={() => setAlert(null)} />}

      {showForm && (
        <Card className="inventario-form fade-in">
          <CardHeader title="Registrar nuevo equipo" icon="ti-plus" />

          <div className="inventario-form-body" style={{ padding: 20 }}>
            <div className="inventario-form-grid">
              <div className="inventario-field-relative">
                <Label required>Material (SAP)</Label>

                <div className="inventario-input-wrapper">
                  <input
                    value={buscarMat}
                    onChange={e => {
                      setBuscarMat(e.target.value);
                      setShowMatDrop(true);
                      setMatSel(null);
                      setForm(p => ({ ...p, material_id: '' }));
                    }}
                    placeholder="Código o descripción..."
                    onFocus={() => setShowMatDrop(true)}
                  />

                  {buscarMat && <button className="inventario-clear-btn" onClick={clearMaterial}>×</button>}
                </div>

                {matSel && <div className="inventario-selected-badge">✓ {matSel.codigo_sap} — {matSel.descripcion}</div>}

                <DropdownList
                  items={showMatDrop ? filteredMats : []}
                  onSelect={selectMaterial}
                  renderItem={m => (
                    <>
                      <strong>{m.codigo_sap}</strong>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.descripcion}</div>
                    </>
                  )}
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
                  <option value="">Seleccionar...</option>
                  {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
              </div>

              <div className="inventario-field-relative">
                <Label>OT (Opcional)</Label>

                <div className="inventario-input-wrapper">
                  <input
                    value={buscarOT}
                    onChange={e => {
                      const val = e.target.value;
                      setBuscarOT(val);
                      setShowOtDrop(true);

                      if (otSel) {
                        setOtSel(null);
                        setForm(p => ({ ...p, ot_id: '' }));
                      }

                      const existe = ots.some(o => o.numero_ot === val);
                      setNuevaOTData(prev => ({ ...prev, mostrarFormulario: val.length > 2 && !existe }));
                    }}
                    placeholder="Número de OT..."
                    onFocus={() => setShowOtDrop(true)}
                  />

                  {buscarOT && <button className="inventario-clear-btn" onClick={clearOT}>×</button>}
                </div>

                {otSel && <div className="inventario-selected-badge">✓ {otSel.numero_ot} — {otSel.cliente}</div>}

                <DropdownList
                  items={showOtDrop ? filteredOTs : []}
                  onSelect={selectOT}
                  renderItem={o => (
                    <>
                      <strong>{o.numero_ot}</strong>
                      <div style={{ fontSize: 11 }}>{o.cliente}</div>
                    </>
                  )}
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
              <div className="inventario-nueva-ot">
                <div className="inventario-nueva-ot-title">✨ Nueva OT — completar datos</div>

                <div className="inventario-nueva-ot-grid">
                  <div>
                    <Label required>Cliente</Label>
                    <input
                      value={nuevaOTData.cliente}
                      onChange={e => setNuevaOTData(p => ({ ...p, cliente: e.target.value }))}
                      placeholder="Nombre cliente"
                    />
                  </div>

                  <div>
                    <Label>Destino</Label>
                    <input
                      value={nuevaOTData.destino}
                      onChange={e => setNuevaOTData(p => ({ ...p, destino: e.target.value }))}
                      placeholder="Dirección"
                    />
                  </div>
                </div>

                <div className="inventario-nueva-ot-info">
                  <i className="ti ti-info-circle" /> Esta OT se creará automáticamente al guardar.
                </div>
              </div>
            )}

            <div className="inventario-form-buttons">
              <Btn onClick={handleCreate} loading={saving} icon="ti-check">Registrar equipo</Btn>
              <Btn variant="secondary" onClick={() => { setShowForm(false); resetForm(); }}>Cancelar</Btn>
            </div>
          </div>
        </Card>
      )}

      <Card style={{ marginBottom: 16 }}>
        <div className="inventario-filtros">
          <SearchInput
            className="inventario-search-input"
            value={searchDraft}
            onChange={e => setSearchDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleBuscar();
            }}
            placeholder="Buscar por cualquier campo..."
          />

          <Btn variant="secondary" size="sm" onClick={handleBuscar} icon="ti-search">
            Buscar
          </Btn>

          <select
            className="inventario-bodega-select"
            value={filterBodega}
            onChange={e => {
              setFB(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todas las bodegas</option>
            {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>

          <select
            className="inventario-estado-select"
            value={filterEstado}
            onChange={e => {
              setFE(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          {(filterBodega || filterEstado || search || searchDraft) && (
            <Btn variant="ghost" size="sm" onClick={limpiarFiltros} icon="ti-x">
              Limpiar
            </Btn>
          )}
        </div>
      </Card>

      <Card>
        {loadingInventario ? (
          <Loading text="Cargando inventario..." />
        ) : items.length === 0 ? (
          <EmptyState icon="ti-package-off" title="Sin equipos" subtitle="No hay equipos que coincidan con los filtros" />
        ) : (
          <>
            <div className="inventario-table-container">
              <table className="inventario-table">
                <thead>
                  <tr>
                    <th>Cantidad</th>
                    <th>Código</th>
                    <th>Descripción</th>
                    <th>Serie</th>
                    <th>Doc. Material</th>
                    <th>OT</th>
                    <th>OTH</th>
                    <th>Lote</th>
                    <th>Ubicación</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map(item => (
                    <tr key={item.id}>
                      <td className="cantidad-cell">{item.cantidad ?? 1}</td>

                      <td>
                        <span className="inventario-codigo">{item.material_id}</span>
                      </td>

                      <td>{item.descripcion || item.material_descripcion || '—'}</td>

                      <td>
                        {item.serial
                          ? <code className="inventario-serial">{item.serial}</code>
                          : <span className="inventario-sin-serial">—</span>
                        }
                      </td>

                      <td>{item.documento_material || '—'}</td>

                      <td>
                        {item.numero_ot
                          ? <Badge v="info" style={{ background: 'none' }}>{item.numero_ot}</Badge>
                          : '—'
                        }
                      </td>

                      <td>{item.oth || '—'}</td>
                      <td>{item.lote || '—'}</td>
                      <td>{item.ubicacion || '—'}</td>
                      <td><Badge v={item.estado} /></td>

                      <td>
                        <Btn variant="secondary" size="sm" onClick={() => handleShowMovements(item)} icon="ti-history">
                          Historial
                        </Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="inventario-pagination">
              <div className="inventario-pagination-info">
                Página {pagination.page} de {pagination.totalPages || 1} · Total: {pagination.total}
              </div>

              <div className="inventario-pagination-actions">
                <select
                  value={limit}
                  onChange={e => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={10}>10 por página</option>
                  <option value={20}>20 por página</option>
                  <option value={50}>50 por página</option>
                  <option value={100}>100 por página</option>
                </select>

                <Btn
                  variant="secondary"
                  size="sm"
                  disabled={!pagination.hasPreviousPage}
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  icon="ti-chevron-left"
                >
                  Anterior
                </Btn>

                <Btn
                  variant="secondary"
                  size="sm"
                  disabled={!pagination.hasNextPage}
                  onClick={() => setPage(p => p + 1)}
                  icon="ti-chevron-right"
                >
                  Siguiente
                </Btn>
              </div>
            </div>
          </>
        )}
      </Card>

      {showMovementsModal && currentItem && (
        <div className="inventario-modal-overlay" onClick={() => setShowMovementsModal(false)}>
          <div className="inventario-modal-content" onClick={e => e.stopPropagation()}>
            <div className="inventario-modal-header">
              <h3>
                Movimientos de {currentItem.descripcion || currentItem.material_id}
                {currentItem.serial && ` - Serial: ${currentItem.serial}`}
              </h3>

              <button className="inventario-modal-close" onClick={() => setShowMovementsModal(false)}>×</button>
            </div>

            <div className="inventario-modal-body">
              {loadingMovements ? (
                <Loading text="Cargando movimientos..." />
              ) : selectedItemMovements.length === 0 ? (
                <EmptyState icon="ti-history-off" title="Sin movimientos" subtitle="Este equipo no tiene movimientos registrados" />
              ) : (
                <div className="inventario-modal-table-container">
                  <table className="inventario-modal-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Estado Anterior</th>
                        <th>Estado Nuevo</th>
                        <th>OT</th>
                        <th>Responsable</th>
                        <th>Observación</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedItemMovements.map(m => (
                        <tr key={m.id}>
                          <td>{fmtFecha(m.created_at)}</td>
                          <td>{m.tipo_movimiento}</td>
                          <td>{m.estado_anterior || '—'}</td>
                          <td>{m.estado_nuevo || '—'}</td>
                          <td>{m.ot_anterior_numero || m.ot_nueva_numero || '—'}</td>
                          <td>{m.usuario || m.tecnico_nombre || '—'}</td>
                          <td>{m.observacion || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="inventario-modal-footer">
              <Btn onClick={() => setShowMovementsModal(false)}>Cerrar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}