import React, { useState, useEffect, useMemo } from 'react';
import { http } from '../api';
import { Btn, Alert, PageHeader, EmptyState } from './UI';
import '../styles/SalidaView.css';

const itemVacio = () => ({
  inventario_id: null,
  cantidad: 1,
  observacion: '',
});

export default function SalidaView({ user, refresh }) {
  const [salidas, setSalidas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [filtroDestino, setFiltroDestino] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');

  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [equiposDisponibles, setEquiposDisponibles] = useState([]);
  const [loadingEquipos, setLoadingEquipos] = useState(false);

  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    destino: '',
    motivo: '',
    observaciones: '',
    items: [],
  });

  const [buscarEquipo, setBuscarEquipo] = useState('');
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);
  const [cantidadSeleccionada, setCantidadSeleccionada] = useState(1);
  const [showEquipoDropdown, setShowEquipoDropdown] = useState(false);

  const [detalleSalida, setDetalleSalida] = useState(null);
  const [showDetalle, setShowDetalle] = useState(false);

  const cargarSalidas = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pagina, limit: 20 });
      if (filtroDestino) params.append('destino', filtroDestino);
      if (filtroFecha) params.append('desde', filtroFecha);

      const data = await http.get(`/salidas?${params}`);
      setSalidas(data.data || []);
      setTotalPaginas(data.pagination?.totalPages || 1);
    } catch (err) {
      setAlert({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const cargarEquiposDisponibles = async () => {
    setLoadingEquipos(true);
    try {
      const res = await http.get('/inventario?limit=100');
      const inventario = Array.isArray(res) ? res : res.data || [];

      const disponibles = inventario.filter(item =>
        ['STOCK', 'INGRESADO'].includes(String(item.estado || '').toUpperCase()) &&
        Number(item.cantidad || 0) > 0
      );

      setEquiposDisponibles(disponibles);
    } catch (err) {
      setAlert({ type: 'error', msg: 'No se pudo cargar el inventario disponible' });
    } finally {
      setLoadingEquipos(false);
    }
  };

  useEffect(() => {
    cargarSalidas();
  }, [pagina, filtroDestino, filtroFecha]);

  useEffect(() => {
    cargarEquiposDisponibles();
  }, []);

  const resultadosBusqueda = useMemo(() => {
    const q = buscarEquipo.trim().toLowerCase();
    if (q.length < 2) return [];

    return equiposDisponibles
      .filter(eq =>
        String(eq.serial || '').toLowerCase().includes(q) ||
        String(eq.material_id || '').toLowerCase().includes(q) ||
        String(eq.codigo_sap || '').toLowerCase().includes(q) ||
        String(eq.descripcion || '').toLowerCase().includes(q) ||
        String(eq.material_descripcion || '').toLowerCase().includes(q) ||
        String(eq.numero_ot || '').toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [buscarEquipo, equiposDisponibles]);

  const itemsDetalle = useMemo(() => {
    return form.items.map(item => ({
      ...item,
      equipo: equiposDisponibles.find(e => e.id === item.inventario_id),
    }));
  }, [form.items, equiposDisponibles]);

  const totalItems = form.items.length;

  const totalUnidades = useMemo(() => {
    return form.items.reduce((acc, item) => acc + Number(item.cantidad || 0), 0);
  }, [form.items]);

  const seleccionarEquipo = (eq) => {
    setEquipoSeleccionado(eq);
    setBuscarEquipo(eq.serial || eq.material_id || eq.descripcion || eq.material_descripcion || '');
    setCantidadSeleccionada(eq.serial ? 1 : 1);
    setShowEquipoDropdown(false);
  };

  const agregarItem = () => {
    if (!equipoSeleccionado) {
      setAlert({ type: 'error', msg: 'Selecciona un equipo o material primero.' });
      return;
    }

    let cantidad = Number(cantidadSeleccionada || 1);

    if (equipoSeleccionado.serial) cantidad = 1;

    if (cantidad < 1) {
      setAlert({ type: 'error', msg: 'La cantidad debe ser mayor a 0.' });
      return;
    }

    if (cantidad > Number(equipoSeleccionado.cantidad || 1)) {
      setAlert({
        type: 'error',
        msg: `No hay suficiente stock. Disponible: ${equipoSeleccionado.cantidad || 1}`,
      });
      return;
    }

    const yaAgregado = form.items.some(i => i.inventario_id === equipoSeleccionado.id);
    if (yaAgregado) {
      setAlert({ type: 'error', msg: 'Este elemento ya está agregado a la salida.' });
      return;
    }

    setForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          inventario_id: equipoSeleccionado.id,
          cantidad,
          observacion: '',
        },
      ],
    }));

    setEquipoSeleccionado(null);
    setBuscarEquipo('');
    setCantidadSeleccionada(1);
    setShowEquipoDropdown(false);
  };

  const eliminarItem = (index) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const cambiarObservacionItem = (index, value) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, observacion: value } : item
      ),
    }));
  };

  const handleCrearSalida = async () => {
    if (!user || !user.id) {
      setAlert({ type: 'error', msg: 'No se ha identificado al usuario responsable. Inicia sesión nuevamente.' });
      return;
    }

    if (!form.destino.trim()) {
      setAlert({ type: 'error', msg: 'El destino es obligatorio.' });
      return;
    }

    if (!form.motivo.trim()) {
      setAlert({ type: 'error', msg: 'El motivo es obligatorio.' });
      return;
    }

    if (form.items.length === 0) {
      setAlert({ type: 'error', msg: 'Agrega al menos un equipo o material.' });
      return;
    }

    setSaving(true);
    setAlert(null);

    try {
      const payload = {
        fecha: form.fecha,
        destino: form.destino,
        motivo: form.motivo,
        responsable_id: user.id,
        observaciones: form.observaciones,
        items: form.items.map(i => ({
          inventario_id: i.inventario_id,
          cantidad: Number(i.cantidad || 1),
          observacion: i.observacion || null,
        })),
      };

      await http.post('/salidas', payload);

      await cargarSalidas();
      await cargarEquiposDisponibles();

      setForm({
        fecha: new Date().toISOString().split('T')[0],
        destino: '',
        motivo: '',
        observaciones: '',
        items: [],
      });

      setAlert({ type: 'success', msg: 'Salida registrada correctamente.' });

      if (refresh) refresh();
    } catch (err) {
      setAlert({ type: 'error', msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const verDetalle = async (id) => {
    try {
      const data = await http.get(`/salidas/${id}`);
      setDetalleSalida(data);
      setShowDetalle(true);
    } catch (err) {
      setAlert({ type: 'error', msg: err.message });
    }
  };

  const imprimirComprobante = async (salida) => {
    let datosCompletos = salida;

    if (!salida.detalles) {
      try {
        datosCompletos = await http.get(`/salidas/${salida.id}`);
      } catch {
        setAlert({ type: 'error', msg: 'No se pudo obtener el detalle para imprimir.' });
        return;
      }
    }

    const cabecera = datosCompletos.cabecera || datosCompletos;
    const detalles = datosCompletos.detalles || [];

    const ventana = window.open('', '_blank');

    ventana.document.write(`
      <html>
      <head>
        <title>Comprobante de Salida ${cabecera.consecutivo}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #111827; }
          h1 { color: #0f8b3a; }
          .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f3f4f6; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>COMPROBANTE DE SALIDA</h1>
          <p><strong>N°:</strong> ${cabecera.consecutivo}</p>
        </div>

        <p><strong>Fecha:</strong> ${new Date(cabecera.fecha).toLocaleDateString('es-CO')}</p>
        <p><strong>Destino:</strong> ${cabecera.destino}</p>
        <p><strong>Motivo:</strong> ${cabecera.motivo || '—'}</p>
        <p><strong>Responsable:</strong> ${cabecera.responsable_nombre || user?.nombre || 'Usuario actual'}</p>
        <p><strong>Observaciones:</strong> ${cabecera.observaciones || '—'}</p>

        <h3>Equipos / Materiales</h3>

        <table>
          <thead>
            <tr>
              <th>Cantidad</th>
              <th>Código SAP</th>
              <th>Descripción</th>
              <th>Serial</th>
              <th>Observación</th>
            </tr>
          </thead>
          <tbody>
            ${detalles.map(d => `
              <tr>
                <td>${d.cantidad}</td>
                <td>${d.material_id || '—'}</td>
                <td>${d.material_descripcion || '—'}</td>
                <td>${d.serial || '—'}</td>
                <td>${d.observacion_item || '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Este comprobante es una constancia de salida de inventario.</p>
          <p>Generado por: ${cabecera.created_by_nombre || user?.nombre || 'Sistema'} - ${new Date().toLocaleString()}</p>
        </div>

        <script>window.print();</script>
      </body>
      </html>
    `);

    ventana.document.close();
  };

  return (
    <div className="salida-page">
      {alert && <Alert type={alert.type} msg={alert.msg} onClose={() => setAlert(null)} />}

      <PageHeader
        title="Salidas de Inventario"
        icon="ti-truck-delivery"
        subtitle="Registra salidas de equipos y materiales desde bodega"
      />

      <section className="salida-panel salida-main-panel">
        <div className="salida-panel-title">
          <i className="ti ti-file-plus" />
          <div>
            <h3>Registrar nueva salida</h3>
            <p>Completa los datos de destino y selecciona los elementos que saldrán de inventario.</p>
          </div>
        </div>

        <div className="salida-form-grid">
          <div className="salida-field">
            <label>Fecha *</label>
            <input
              type="date"
              value={form.fecha}
              onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
            />
          </div>

          <div className="salida-field">
            <label>Destino *</label>
            <input
              value={form.destino}
              onChange={e => setForm(p => ({ ...p, destino: e.target.value }))}
              placeholder="Ej: A011 TABASCO POPAYÁN"
            />
          </div>

          <div className="salida-field">
            <label>Motivo *</label>
            <input
              value={form.motivo}
              onChange={e => setForm(p => ({ ...p, motivo: e.target.value }))}
              placeholder="Ej: Traslado Telecom"
            />
          </div>

          <div className="salida-field">
            <label>Observaciones generales</label>
            <textarea
              value={form.observaciones}
              onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))}
              placeholder="Notas adicionales..."
            />
          </div>
        </div>

        <div className="salida-responsable">
          <i className="ti ti-user-check" />
          Responsable automático:
          <strong>{user?.nombre || 'Usuario actual'}</strong>
        </div>
      </section>

      <section className="salida-panel">
        <div className="salida-table-header">
          <div className="salida-panel-title no-margin">
            <i className="ti ti-package" />
            <div>
              <h3>Agregar equipos/materiales</h3>
              <p>Busca por serial, código SAP, descripción u OT.</p>
            </div>
          </div>

          <div className="salida-kpis">
            <span>{totalItems} ítems</span>
            <span>{totalUnidades} unidades</span>
          </div>
        </div>

        <div className="salida-add-grid">
          <div className="salida-search-cell">
            <label>Equipo o material</label>

            <div className="salida-search-box">
              <i className="ti ti-search" />
              <input
                value={buscarEquipo}
                onChange={e => {
                  setBuscarEquipo(e.target.value);
                  setShowEquipoDropdown(true);
                  if (!e.target.value) setEquipoSeleccionado(null);
                }}
                onFocus={() => setShowEquipoDropdown(true)}
                placeholder="Buscar por serial, SAP o descripción..."
              />

              {buscarEquipo && (
                <button
                  type="button"
                  onClick={() => {
                    setBuscarEquipo('');
                    setEquipoSeleccionado(null);
                    setShowEquipoDropdown(false);
                  }}
                >
                  ×
                </button>
              )}
            </div>

            {showEquipoDropdown && resultadosBusqueda.length > 0 && (
              <div className="salida-dropdown">
                {resultadosBusqueda.map(eq => {
                  const serial = eq.serial || '';
                  const sap = eq.material_id || eq.codigo_sap || '-';
                  const desc = eq.descripcion || eq.material_descripcion || '-';

                  return (
                    <button
                      key={eq.id}
                      type="button"
                      className="salida-option"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => seleccionarEquipo(eq)}
                    >
                      <div className="salida-option-icon">
                        <i className={serial ? 'ti ti-barcode' : 'ti ti-box'} />
                      </div>

                      <div className="salida-option-main">
                        <div className="salida-option-top">
                          <div>
                            <strong>{serial || sap}</strong>
                            <span>{desc}</span>
                          </div>

                          <div className="salida-option-tags">
                            <span>{serial ? 'Serializado' : 'Material'}</span>
                            <span>Stock: {eq.cantidad || 1}</span>
                          </div>
                        </div>

                        <div className="salida-option-meta">
                          <span><i className="ti ti-file-invoice" /> OT: {eq.numero_ot || 'Sin OT'}</span>
                          <span><i className="ti ti-package" /> Estado: {eq.estado || '-'}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="salida-field">
            <label>Cantidad</label>
            <input
              type="number"
              min={1}
              max={equipoSeleccionado?.cantidad || 1}
              value={cantidadSeleccionada}
              onChange={e => setCantidadSeleccionada(Number(e.target.value || 1))}
              disabled={!!equipoSeleccionado?.serial}
            />
          </div>

          <button type="button" className="salida-add-btn" onClick={agregarItem}>
            <i className="ti ti-plus" />
            Agregar
          </button>
        </div>

        <div className="salida-items-table">
          <div className="salida-row salida-head-row">
            <div>Código SAP</div>
            <div>Descripción</div>
            <div>Serial</div>
            <div>Cantidad</div>
            <div>Observación</div>
            <div>Acción</div>
          </div>

          {itemsDetalle.map((item, idx) => {
            const eq = item.equipo;
            return (
              <div key={idx} className="salida-row salida-body-row">
                <div className="salida-strong">{eq?.material_id || '-'}</div>
                <div title={eq?.descripcion || eq?.material_descripcion || ''}>
                  {eq?.descripcion || eq?.material_descripcion || '-'}
                </div>
                <div className="salida-mono">{eq?.serial || 'Sin serial'}</div>
                <div><span className="salida-qty">{item.cantidad}</span></div>
                <div>
                  <input
                    className="salida-item-note"
                    value={item.observacion || ''}
                    onChange={e => cambiarObservacionItem(idx, e.target.value)}
                    placeholder="Nota opcional..."
                  />
                </div>
                <div>
                  <button className="salida-remove-btn" onClick={() => eliminarItem(idx)}>
                    <i className="ti ti-trash" />
                  </button>
                </div>
              </div>
            );
          })}

          {form.items.length === 0 && (
            <div className="salida-empty-state">
              <i className="ti ti-package" />
              <h3>Aún no has agregado elementos</h3>
              <p>Busca y selecciona equipos o materiales disponibles para registrar la salida.</p>
            </div>
          )}
        </div>
      </section>

      <section className="salida-panel salida-summary-panel">
        <div className="salida-summary-title">Resumen de salida</div>

        <div className="salida-summary-grid">
          <div className="salida-summary-card">
            <i className="ti ti-clipboard-list" />
            <div>
              <span>Ítems</span>
              <strong>{totalItems}</strong>
            </div>
          </div>

          <div className="salida-summary-card">
            <i className="ti ti-box-multiple" />
            <div>
              <span>Unidades</span>
              <strong>{totalUnidades}</strong>
            </div>
          </div>

          <div className="salida-summary-card">
            <i className="ti ti-map-pin" />
            <div>
              <span>Destino</span>
              <strong>{form.destino || 'Sin destino'}</strong>
            </div>
          </div>

          <Btn
            onClick={handleCrearSalida}
            loading={saving}
            icon="ti-check"
            className="salida-submit-btn"
          >
            Registrar Salida
          </Btn>
        </div>
      </section>

      <section className="salida-panel">
        <div className="salida-table-header">
          <div className="salida-panel-title no-margin">
            <i className="ti ti-history" />
            <div>
              <h3>Historial de salidas</h3>
              <p>Consulta y filtra las salidas registradas.</p>
            </div>
          </div>
        </div>

        <div className="salida-filtros">
          <input
            type="text"
            placeholder="Filtrar por destino..."
            value={filtroDestino}
            onChange={e => {
              setFiltroDestino(e.target.value);
              setPagina(1);
            }}
          />

          <input
            type="date"
            value={filtroFecha}
            onChange={e => {
              setFiltroFecha(e.target.value);
              setPagina(1);
            }}
          />

          <button
            type="button"
            onClick={() => {
              setFiltroDestino('');
              setFiltroFecha('');
              setPagina(1);
            }}
          >
            Limpiar filtros
          </button>
        </div>

        <div className="salida-history-table">
          <div className="salida-history-row salida-history-head">
            <div>Consecutivo</div>
            <div>Fecha</div>
            <div>Destino</div>
            <div>Motivo</div>
            <div>Responsable</div>
            <div>Ítems</div>
            <div>Acciones</div>
          </div>

          {loading ? (
            <div className="salida-history-empty">Cargando salidas...</div>
          ) : salidas.length === 0 ? (
            <div className="salida-history-empty">No hay salidas registradas.</div>
          ) : (
            salidas.map(s => (
              <div key={s.id} className="salida-history-row salida-history-body">
                <div className="salida-consecutivo">{s.consecutivo}</div>
                <div>{new Date(s.fecha).toLocaleDateString('es-CO')}</div>
                <div>{s.destino}</div>
                <div>{s.motivo || '—'}</div>
                <div>{s.responsable_nombre || '—'}</div>
                <div><span className="salida-qty">{s.total_items}</span></div>
                <div className="salida-actions">
                  <button onClick={() => verDetalle(s.id)} title="Ver detalle">
                    <i className="ti ti-eye" />
                  </button>
                  <button onClick={() => imprimirComprobante(s)} title="Imprimir">
                    <i className="ti ti-printer" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {totalPaginas > 1 && (
          <div className="salida-pagination">
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}>
              Anterior
            </button>

            <span>Página {pagina} de {totalPaginas}</span>

            <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}>
              Siguiente
            </button>
          </div>
        )}
      </section>

      {showDetalle && detalleSalida && (
        <div className="salida-modal-overlay">
          <div className="salida-modal-content">
            <div className="salida-modal-header">
              <h3>Detalle de {detalleSalida.cabecera?.consecutivo || detalleSalida.consecutivo}</h3>
              <button onClick={() => setShowDetalle(false)}>×</button>
            </div>

            <div className="salida-modal-info">
              <p><strong>Destino:</strong> {detalleSalida.cabecera?.destino || detalleSalida.destino}</p>
              <p><strong>Motivo:</strong> {detalleSalida.cabecera?.motivo || detalleSalida.motivo || '—'}</p>
              <p><strong>Responsable:</strong> {detalleSalida.cabecera?.responsable_nombre || detalleSalida.responsable_nombre || '—'}</p>
              <p><strong>Observaciones:</strong> {detalleSalida.cabecera?.observaciones || detalleSalida.observaciones || '—'}</p>
            </div>

            <div className="salida-modal-table">
              <div className="salida-row salida-head-row">
                <div>Cantidad</div>
                <div>Código SAP</div>
                <div>Descripción</div>
                <div>Serial</div>
                <div>Observación</div>
              </div>

              {(detalleSalida.detalles || []).map((d, idx) => (
                <div key={idx} className="salida-row salida-body-row">
                  <div>{d.cantidad}</div>
                  <div>{d.material_id || '—'}</div>
                  <div>{d.material_descripcion || '—'}</div>
                  <div>{d.serial || '—'}</div>
                  <div>{d.observacion_item || '—'}</div>
                </div>
              ))}
            </div>

            <div className="salida-modal-footer">
              <Btn onClick={() => imprimirComprobante(detalleSalida.cabecera || detalleSalida)} icon="ti-printer">
                Imprimir comprobante
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}