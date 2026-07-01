import React, { useEffect, useMemo, useState } from 'react';
import { http } from '../api.js';
import { Btn, Alert, Label, PageHeader, EmptyState, Pagination } from './UI.jsx';
import '../styles/ConsumoView.css';

const itemVacio = () => ({
  buscar: '',
  id: null,
  material_id: '',
  desc: '',
  serial: '',
  cantidadOriginal: 1,
  cantidadConsumir: 1,
  tecnico: '',
  ot_numero: '',
});

const hoy = () => new Date().toISOString().slice(0, 10);

export default function ConsumoView({ inv = [], refresh }) {
  const [modo, setModo] = useState('individual');
  const [items, setItems] = useState([itemVacio()]);
  const [activeDD, setActiveDD] = useState(null);

  const [otp, setOtp] = useState('');
  const [oth, setOth] = useState('');
  const [cliente, setCliente] = useState('');
  const [rr, setRr] = useState('');
  const [fechaConsumo, setFechaConsumo] = useState(hoy());
  const [observacion, setObservacion] = useState('');

  const [archivo, setArchivo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  const [consumos, setConsumos] = useState([]);
  const [consumoEditando, setConsumoEditando] = useState(null);
  const [searchHist, setSearchHist] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const enTerreno = useMemo(() => {
    return inv.filter(i =>
      String(i.estado || '').toUpperCase() === 'TERRENO' &&
      Number(i.cantidad || 0) > 0
    );
  }, [inv]);

  const seleccionados = useMemo(() => items.filter(i => i.id), [items]);

  const totalUnidades = useMemo(() => {
    return seleccionados.reduce((acc, i) => acc + Number(i.cantidadConsumir || 0), 0);
  }, [seleccionados]);

  const cargarConsumos = async () => {
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (searchHist) params.set('search', searchHist);
      if (desde) params.set('desde', desde);
      if (hasta) params.set('hasta', hasta);

      const res = await http.get(`/consumos?${params}`);
      setConsumos(res.data || []);
      setPagination(res.pagination || { total: 0, totalPages: 1 });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    cargarConsumos();
  }, [page, searchHist, desde, hasta]);

  const buscarMatches = (texto) => {
    const q = texto.trim().toLowerCase();
    if (q.length < 2) return [];

    return enTerreno
      .filter(i =>
        String(i.serial || '').toLowerCase().includes(q) ||
        String(i.material_id || '').toLowerCase().includes(q) ||
        String(i.codigo_sap || '').toLowerCase().includes(q) ||
        String(i.descripcion || '').toLowerCase().includes(q) ||
        String(i.material_descripcion || '').toLowerCase().includes(q) ||
        String(i.numero_ot || '').toLowerCase().includes(q) ||
        String(i.usuario_asignado_nombre || '').toLowerCase().includes(q)
      )
      .slice(0, 10);
  };

  const seleccionarItem = (idx, item) => {
    const serial = item.serial || '';
    const cantidad = Number(item.cantidad || 1);

    setItems(prev => {
      const n = [...prev];

      n[idx] = {
        buscar: serial || item.material_id || item.descripcion || item.material_descripcion || '',
        id: item.id,
        material_id: item.material_id || item.codigo_sap || '',
        desc: item.descripcion || item.material_descripcion || item.material_id || 'Sin descripción',
        serial,
        cantidadOriginal: cantidad,
        cantidadConsumir: serial ? 1 : cantidad,
        tecnico: item.usuario_asignado_nombre || '—',
        ot_numero: item.numero_ot || '',
      };

      return n;
    });

    setActiveDD(null);
  };

  const cambiarBusqueda = (idx, value) => {
    setItems(prev => {
      const n = [...prev];
      n[idx] = { ...itemVacio(), buscar: value };
      return n;
    });

    setActiveDD(`cons_${idx}`);
  };

  const limpiarItem = (idx) => {
    setItems(prev => {
      const n = [...prev];
      n[idx] = itemVacio();
      return n;
    });
  };

  const eliminarItem = (idx) => {
    setItems(prev => {
      if (prev.length === 1) return [itemVacio()];
      return prev.filter((_, i) => i !== idx);
    });
  };

  const agregarItem = () => {
    setItems(prev => [...prev, itemVacio()]);
  };

  const cambiarCantidad = (idx, value) => {
    setItems(prev => {
      const n = [...prev];
      const max = Number(n[idx].cantidadOriginal || 1);
      let val = Number(value || 1);

      if (val < 1) val = 1;
      if (val > max) val = max;

      n[idx] = { ...n[idx], cantidadConsumir: val };
      return n;
    });
  };

  const limpiarFormulario = () => {
    setItems([itemVacio()]);
    setOtp('');
    setOth('');
    setCliente('');
    setRr('');
    setFechaConsumo(hoy());
    setObservacion('');
    setArchivo(null);
  };

  const consumirIndividual = async () => {
    if (!otp.trim()) return setAlert({ type: 'error', msg: 'La OTP es obligatoria.' });
    if (!oth.trim()) return setAlert({ type: 'error', msg: 'La OTH es obligatoria.' });
    if (!cliente.trim()) return setAlert({ type: 'error', msg: 'El cliente es obligatorio.' });
    if (!fechaConsumo) return setAlert({ type: 'error', msg: 'La fecha de consumo es obligatoria.' });
    if (!seleccionados.length) return setAlert({ type: 'error', msg: 'Agrega al menos un equipo o material.' });

    setSaving(true);
    setAlert(null);

    try {
      for (const item of seleccionados) {
        await http.post('/consumos', {
          inventario_id: item.id,
          cantidad: Number(item.cantidadConsumir || 1),
          otp,
          oth,
          cliente,
          rr: rr || null,
          fecha_consumo: fechaConsumo,
          observacion,
        });
      }

      await refresh();
      await cargarConsumos();
      limpiarFormulario();

      setAlert({ type: 'success', msg: 'Consumo registrado correctamente.' });
    } catch (err) {
      setAlert({ type: 'error', msg: err.message || 'Error registrando consumo.' });
    } finally {
      setSaving(false);
    }
  };

  const consumirMasivo = async () => {
    if (!archivo) return setAlert({ type: 'error', msg: 'Selecciona un archivo Excel o CSV.' });

    setSaving(true);
    setAlert(null);

    try {
      const fd = new FormData();
      fd.append('archivo', archivo);

      const token = localStorage.getItem('token');
      const res = await fetch('/api/consumos/masivo', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });

      const data = await res.json();

      if (!res.ok) {
        const errores = data.errores?.map(e => `Fila ${e.fila}: ${e.error}`).join('\n');
        throw new Error(errores || data.error || 'Error en consumo masivo');
      }

      await refresh();
      await cargarConsumos();

      setArchivo(null);
      setAlert({ type: 'success', msg: `Consumo masivo procesado. Registros: ${data.procesados}` });
    } catch (err) {
      setAlert({ type: 'error', msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const guardarEdicion = async () => {
    if (!consumoEditando) return;

    try {
      await http.put(`/consumos/${consumoEditando.id}`, {
        otp: consumoEditando.otp,
        oth: consumoEditando.oth,
        cliente: consumoEditando.cliente,
        rr: consumoEditando.rr || null,
        fecha_consumo: consumoEditando.fecha_consumo,
        observacion: consumoEditando.observacion || null,
      });

      setConsumoEditando(null);
      await cargarConsumos();
      setAlert({ type: 'success', msg: 'Consumo actualizado correctamente.' });
    } catch (err) {
      setAlert({ type: 'error', msg: err.message });
    }
  };

  return (
    <div className="cons-page">
      <PageHeader
        title="Consumo"
        icon="ti-checkup-list"
        subtitle="Consume equipos y materiales en terreno de forma individual o masiva"
      />

      {alert && <Alert type={alert.type} msg={alert.msg} onClose={() => setAlert(null)} />}

      <section className="cons-panel cons-hero">
        <div className="cons-panel-title">
          <i className="ti ti-file-check" />
          <div>
            <h3>Registro de consumo</h3>
            <p>Solo se pueden consumir equipos o materiales que estén en estado TERRENO.</p>
          </div>
        </div>

        <div className="cons-mode-tabs">
          <button className={modo === 'individual' ? 'active' : ''} onClick={() => setModo('individual')}>
            <i className="ti ti-user-check" />
            Consumo individual
          </button>

          <button className={modo === 'masivo' ? 'active' : ''} onClick={() => setModo('masivo')}>
            <i className="ti ti-file-spreadsheet" />
            Consumo masivo
          </button>
        </div>

        {modo === 'individual' ? (
          <>
            <div className="cons-form-grid">
              <div className="cons-field">
                <Label required>OTP</Label>
                <input value={otp} onChange={e => setOtp(e.target.value)} placeholder="Número OTP..." />
              </div>

              <div className="cons-field">
                <Label required>OTH</Label>
                <input value={oth} onChange={e => setOth(e.target.value)} placeholder="Número OTH..." />
              </div>

              <div className="cons-field">
                <Label required>Cliente</Label>
                <input value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nombre del cliente..." />
              </div>

              <div className="cons-field">
                <Label>RR opcional</Label>
                <input value={rr} onChange={e => setRr(e.target.value)} placeholder="RR..." />
              </div>

              <div className="cons-field">
                <Label required>Fecha consumo</Label>
                <input type="date" value={fechaConsumo} onChange={e => setFechaConsumo(e.target.value)} />
              </div>

              <div className="cons-field cons-field-wide">
                <Label>Observación</Label>
                <textarea value={observacion} onChange={e => setObservacion(e.target.value)} placeholder="Notas adicionales..." />
              </div>
            </div>

            <div className="cons-table-header">
              <div className="cons-panel-title no-margin">
                <i className="ti ti-tool" />
                <div>
                  <h3>Elementos en terreno</h3>
                  <p>Busca por serial, SAP, descripción, OT o técnico.</p>
                </div>
              </div>

              <button className="cons-add-btn" onClick={agregarItem}>
                <i className="ti ti-plus" />
                Agregar elemento
              </button>
            </div>

            <div className="cons-table">
              <div className="cons-row cons-head">
                <div>Búsqueda</div>
                <div>Código SAP</div>
                <div>Descripción</div>
                <div>Serial</div>
                <div>OT</div>
                <div>Cantidad</div>
                <div>Acción</div>
              </div>

              {items.map((item, idx) => {
                const matches = buscarMatches(item.buscar);
                const esMaterial = item.id && !item.serial;

                return (
                  <div key={idx} className={`cons-row cons-body ${item.id ? 'selected' : ''}`}>
                    <div className="cons-search-cell">
                      <div className="cons-search-box">
                        <i className="ti ti-search" />
                        <input
                          value={item.buscar}
                          onChange={e => cambiarBusqueda(idx, e.target.value)}
                          onFocus={() => setActiveDD(`cons_${idx}`)}
                          placeholder="Serial, SAP o descripción..."
                        />

                        {item.buscar && (
                          <button type="button" onClick={() => limpiarItem(idx)}>×</button>
                        )}
                      </div>

                      {activeDD === `cons_${idx}` && matches.length > 0 && (
                        <div className="cons-dropdown">
                          {matches.map(m => {
                            const serial = m.serial || '';
                            const sap = m.material_id || m.codigo_sap || '-';
                            const desc = m.descripcion || m.material_descripcion || '-';

                            return (
                              <button
                                key={m.id}
                                type="button"
                                className="cons-option"
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => seleccionarItem(idx, m)}
                              >
                                <div>
                                  <strong>{serial || sap}</strong>
                                  <span>{desc}</span>
                                </div>

                                <div className="cons-option-tags">
                                  <span>{serial ? 'Serializado' : 'Material'}</span>
                                  <span>Cant: {m.cantidad || 1}</span>
                                  <span>OT: {m.numero_ot || 'Sin OT'}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="cons-strong">{item.material_id || '-'}</div>
                    <div>{item.desc || '-'}</div>
                    <div className="cons-mono">{item.serial || 'Sin serial'}</div>
                    <div>{item.ot_numero || '-'}</div>

                    <div>
                      {esMaterial ? (
                        <div className="cons-qty-input">
                          <input
                            type="number"
                            min="1"
                            max={item.cantidadOriginal}
                            value={item.cantidadConsumir}
                            onChange={e => cambiarCantidad(idx, e.target.value)}
                          />
                          <span>/ {item.cantidadOriginal}</span>
                        </div>
                      ) : (
                        <span className="cons-qty">{item.id ? 1 : '-'}</span>
                      )}
                    </div>

                    <div>
                      <button className="cons-remove-btn" onClick={() => eliminarItem(idx)}>
                        <i className="ti ti-x" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {seleccionados.length === 0 && (
                <div className="cons-empty">
                  <i className="ti ti-package" />
                  <h3>Aún no has agregado elementos</h3>
                  <p>Busca equipos o materiales en terreno para consumir.</p>
                </div>
              )}
            </div>

            <section className="cons-summary">
              <div className="cons-summary-card">
                <span>Ítems</span>
                <strong>{seleccionados.length}</strong>
              </div>

              <div className="cons-summary-card">
                <span>Unidades</span>
                <strong>{totalUnidades}</strong>
              </div>

              <div className="cons-summary-card">
                <span>Resultado</span>
                <strong>CONSUMO</strong>
              </div>

              <Btn onClick={consumirIndividual} loading={saving} icon="ti-check">
                Confirmar Consumo
              </Btn>
            </section>
          </>
        ) : (
          <div className="cons-masivo-box">
            <div className="cons-upload-card">
              <i className="ti ti-file-spreadsheet" />
              <h3>Subir archivo de consumo masivo</h3>
              <p>
                Columnas esperadas: serial, SAP o inventario_id, cantidad, OTP, OTH,
                cliente, RR opcional, fecha_consumo y observación.
              </p>

              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={e => setArchivo(e.target.files?.[0] || null)}
              />

              {archivo && <strong>{archivo.name}</strong>}

              <Btn onClick={consumirMasivo} loading={saving} icon="ti-upload">
                Procesar archivo
              </Btn>
            </div>
          </div>
        )}
      </section>

      <section className="cons-panel">
        <div className="cons-table-header">
          <div className="cons-panel-title no-margin">
            <i className="ti ti-history" />
            <div>
              <h3>Historial de consumos</h3>
              <p>Consulta y corrige consumos registrados.</p>
            </div>
          </div>
        </div>

        <div className="cons-filters">
          <input
            value={searchHist}
            onChange={e => { setSearchHist(e.target.value); setPage(1); }}
            placeholder="Buscar por OTP, OTH, cliente, RR, serial o SAP..."
          />
          <input type="date" value={desde} onChange={e => { setDesde(e.target.value); setPage(1); }} />
          <input type="date" value={hasta} onChange={e => { setHasta(e.target.value); setPage(1); }} />
          <button onClick={() => { setSearchHist(''); setDesde(''); setHasta(''); setPage(1); }}>
            Limpiar
          </button>
        </div>

        <div className="cons-history-table">
          <div className="cons-history-row cons-history-head">
            <div>Fecha consumo</div>
            <div>Material / Serial</div>
            <div>OTP / OTH</div>
            <div>Cliente</div>
            <div>RR</div>
            <div>Cantidad</div>
            <div>Usuario</div>
            <div>Acción</div>
          </div>

          {consumos.length === 0 ? (
            <EmptyState icon="ti-history-off" title="Sin consumos registrados" />
          ) : (
            consumos.map(c => (
              <div key={c.id} className="cons-history-row cons-history-body">
                <div>{c.fecha_consumo?.slice(0, 10)}</div>
                <div>
                  <strong>{c.material_descripcion || '-'}</strong>
                  <span>SAP: {c.material_id || '-'} · Serial: {c.serial || 'Sin serial'}</span>
                </div>
                <div>
                  <strong>{c.otp}</strong>
                  <span>OTH: {c.oth}</span>
                </div>
                <div>{c.cliente}</div>
                <div>{c.rr || '—'}</div>
                <div><span className="cons-qty">{c.cantidad}</span></div>
                <div>{c.usuario_nombre || '—'}</div>
                <div>
                  <button className="cons-edit-btn" onClick={() => setConsumoEditando({ ...c })}>
                    <i className="ti ti-edit" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <Pagination
          page={page}
          totalPages={pagination.totalPages || 1}
          total={pagination.total || 0}
          onPage={setPage}
        />
      </section>

      {consumoEditando && (
        <div className="cons-modal-overlay">
          <div className="cons-modal">
            <div className="cons-modal-head">
              <h3>Editar consumo #{consumoEditando.id}</h3>
              <button onClick={() => setConsumoEditando(null)}>×</button>
            </div>

            <div className="cons-modal-body">
              <div className="cons-field">
                <Label required>OTP</Label>
                <input value={consumoEditando.otp || ''} onChange={e => setConsumoEditando(p => ({ ...p, otp: e.target.value }))} />
              </div>

              <div className="cons-field">
                <Label required>OTH</Label>
                <input value={consumoEditando.oth || ''} onChange={e => setConsumoEditando(p => ({ ...p, oth: e.target.value }))} />
              </div>

              <div className="cons-field">
                <Label required>Cliente</Label>
                <input value={consumoEditando.cliente || ''} onChange={e => setConsumoEditando(p => ({ ...p, cliente: e.target.value }))} />
              </div>

              <div className="cons-field">
                <Label>RR opcional</Label>
                <input value={consumoEditando.rr || ''} onChange={e => setConsumoEditando(p => ({ ...p, rr: e.target.value }))} />
              </div>

              <div className="cons-field">
                <Label required>Fecha consumo</Label>
                <input type="date" value={consumoEditando.fecha_consumo?.slice(0, 10) || ''} onChange={e => setConsumoEditando(p => ({ ...p, fecha_consumo: e.target.value }))} />
              </div>

              <div className="cons-field cons-field-full">
                <Label>Observación</Label>
                <textarea value={consumoEditando.observacion || ''} onChange={e => setConsumoEditando(p => ({ ...p, observacion: e.target.value }))} />
              </div>
            </div>

            <div className="cons-modal-footer">
              <Btn variant="ghost" onClick={() => setConsumoEditando(null)}>Cancelar</Btn>
              <Btn variant="success" icon="ti-check" onClick={guardarEdicion}>Guardar cambios</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}