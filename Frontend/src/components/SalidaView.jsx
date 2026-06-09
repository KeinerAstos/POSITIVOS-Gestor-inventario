// src/components/SalidaView.jsx
import React, { useState, useEffect } from 'react';
import { http } from '../api';
import { Btn, Alert } from './UI';
import '../styles/SalidaView.css';

export default function SalidaView({ user, refresh }) {
  const [salidas, setSalidas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [filtroDestino, setFiltroDestino] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');

  const [showForm, setShowForm] = useState(false);
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

  // Obtener lista de salidas
  const cargarSalidas = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pagina, limit: 20 });
      if (filtroDestino) params.append('destino', filtroDestino);
      if (filtroFecha) params.append('desde', filtroFecha);
      const data = await http.get(`/salidas?${params}`);
      setSalidas(data.data);
      setTotalPaginas(data.pagination.totalPages);
    } catch (err) {
      setAlert({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Cargar equipos disponibles (STOCK o INGRESADO)
  const cargarEquiposDisponibles = async () => {
    setLoadingEquipos(true);
    try {
      const inventario = await http.get('/inventario');
      const disponibles = inventario.filter(item => 
        item.estado === 'STOCK' || item.estado === 'INGRESADO'
      );
      setEquiposDisponibles(disponibles);
    } catch (err) {
      console.error('Error cargando inventario:', err);
      setAlert({ type: 'error', msg: 'No se pudo cargar el inventario disponible' });
    } finally {
      setLoadingEquipos(false);
    }
  };

  useEffect(() => {
    cargarSalidas();
  }, [pagina, filtroDestino, filtroFecha]);

  useEffect(() => {
    if (showForm) cargarEquiposDisponibles();
  }, [showForm]);

  const agregarItem = () => {
    if (!equipoSeleccionado) {
      setAlert({ type: 'error', msg: 'Seleccione un equipo primero' });
      return;
    }
    let cantidad = cantidadSeleccionada;
    if (equipoSeleccionado.serial && cantidad !== 1) {
      setAlert({ type: 'error', msg: 'Los equipos serializados solo pueden salir de a 1 unidad' });
      return;
    }
    if (cantidad > (equipoSeleccionado.cantidad || 1)) {
      setAlert({ type: 'error', msg: `No hay suficiente stock. Disponible: ${equipoSeleccionado.cantidad || 1}` });
      return;
    }
    const yaAgregado = form.items.some(i => i.inventario_id === equipoSeleccionado.id);
    if (yaAgregado) {
      setAlert({ type: 'error', msg: 'Este equipo ya está en la lista de salida' });
      return;
    }
    setForm(p => ({
      ...p,
      items: [...p.items, {
        inventario_id: equipoSeleccionado.id,
        cantidad: cantidad,
        observacion_item: ''
      }]
    }));
    setEquipoSeleccionado(null);
    setBuscarEquipo('');
    setCantidadSeleccionada(1);
    setShowEquipoDropdown(false);
  };

  const eliminarItem = (index) => {
    setForm(p => ({
      ...p,
      items: p.items.filter((_, i) => i !== index)
    }));
  };

  const handleCrearSalida = async () => {
    if (!user || !user.id) {
      setAlert({ type: 'error', msg: 'No se ha identificado al usuario responsable. Cierra sesión y vuelve a ingresar.' });
      return;
    }
    if (!form.destino.trim()) {
      setAlert({ type: 'error', msg: 'El destino es obligatorio' });
      return;
    }
    if (form.items.length === 0) {
      setAlert({ type: 'error', msg: 'Agregue al menos un equipo a la salida' });
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
        items: form.items
      };
      await http.post('/salidas', payload);
      await cargarSalidas();
      setShowForm(false);
      setForm({
        fecha: new Date().toISOString().split('T')[0],
        destino: '',
        motivo: '',
        observaciones: '',
        items: []
      });
      setAlert({ type: 'success', msg: 'Salida registrada correctamente' });
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
    let datosCompletos;
    if (salida.detalles) {
      datosCompletos = salida;
    } else {
      try {
        datosCompletos = await http.get(`/salidas/${salida.id}`);
      } catch (err) {
        setAlert({ type: 'error', msg: 'No se pudo obtener los detalles para imprimir' });
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
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { color: #ed6c02; }
          .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .info { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f5f5f5; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>COMPROBANTE DE SALIDA</h1>
          <p><strong>N°:</strong> ${cabecera.consecutivo}</p>
        </div>
        <div class="info">
          <p><strong>Fecha:</strong> ${new Date(cabecera.fecha).toLocaleDateString('es-CO')}</p>
          <p><strong>Destino:</strong> ${cabecera.destino}</p>
          <p><strong>Motivo:</strong> ${cabecera.motivo || '—'}</p>
          <p><strong>Responsable:</strong> ${cabecera.responsable_nombre || user?.nombre || 'Usuario actual'}</p>
          <p><strong>Observaciones:</strong> ${cabecera.observaciones || '—'}</p>
        </div>
        <h3>Equipos / Materiales</h3>
        <table>
          <thead>
            <tr><th>Cantidad</th><th>Material / Serial</th><th>Observación</th></tr>
          </thead>
          <tbody>
            ${detalles.map(d => `
              <tr>
                <td>${d.cantidad}</td>
                <td>${d.serial || d.material_descripcion || d.material_id || '—'}</td>
                <td>${d.observacion_item || '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>Este comprobante es una constancia de la salida de inventario.</p>
          <p>Generado por: ${cabecera.created_by_nombre || user?.nombre || 'Sistema'} - ${new Date().toLocaleString()}</p>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `);
    ventana.document.close();
  };

  return (
    <div>
      {alert && <Alert type={alert.type} msg={alert.msg} onClose={() => setAlert(null)} />}

      {/* Header */}
      <div className="salida-header">
        <h2 className="salida-title">🚚 Salidas de Inventario</h2>
        <Btn onClick={() => setShowForm(!showForm)}>
          <i className={`ti ti-${showForm ? 'x' : 'plus'}`} /> {showForm ? ' Cancelar' : ' Nueva Salida'}
        </Btn>
      </div>

      {/* Formulario nueva salida */}
      {showForm && (
        <div className="salida-form-container">
          <p className="salida-form-title">📝 Registrar nueva salida</p>
          <div className="salida-form-grid">
            <div>
              <label className="salida-label">Fecha *</label>
              <input className="salida-input" type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} />
            </div>
            <div>
              <label className="salida-label">Destino *</label>
              <input className="salida-input" value={form.destino} onChange={e => setForm(p => ({ ...p, destino: e.target.value }))} placeholder="Ej: A011 TABASCO POPAYÁN" />
            </div>
            <div>
              <label className="salida-label">Motivo</label>
              <input className="salida-input" value={form.motivo} onChange={e => setForm(p => ({ ...p, motivo: e.target.value }))} placeholder="Ej: Traslado Telecom" />
            </div>
            <div>
              <label className="salida-label">Observaciones generales</label>
              <textarea className="salida-textarea" rows={2} value={form.observaciones} onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))} placeholder="Notas adicionales..." />
            </div>
          </div>
          <div className="salida-info">
            <i className="ti ti-info-circle" /> El responsable será <strong>{user?.nombre || 'usuario actual'}</strong> automáticamente.
          </div>

          {/* Selección de equipos */}
          <div className="salida-equipos-section">
            <p className="salida-equipos-title">Agregar equipos/materiales</p>
            <div className="salida-add-equipo">
              <div className="salida-equipo-input-wrapper">
                <label className="salida-label">Equipo o material</label>
                <input
                  className="salida-input"
                  value={buscarEquipo}
                  onChange={e => { setBuscarEquipo(e.target.value); setShowEquipoDropdown(true); if (e.target.value === '') setEquipoSeleccionado(null); }}
                  onFocus={() => setShowEquipoDropdown(true)}
                  placeholder="Buscar por serial o descripción..."
                />
                {showEquipoDropdown && (
                  <div className="salida-dropdown">
                    {equiposDisponibles.filter(eq => 
                      (eq.serial && eq.serial.toLowerCase().includes(buscarEquipo.toLowerCase())) ||
                      (eq.material_descripcion && eq.material_descripcion.toLowerCase().includes(buscarEquipo.toLowerCase()))
                    ).slice(0, 5).map(eq => (
                      <div
                        key={eq.id}
                        className="salida-dropdown-item"
                        onClick={() => { setEquipoSeleccionado(eq); setBuscarEquipo(eq.serial || eq.material_descripcion); setShowEquipoDropdown(false); }}
                      >
                        <div className="salida-dropdown-title"><strong>{eq.serial || eq.material_descripcion}</strong></div>
                        <div className="salida-dropdown-subtitle">{eq.material_id || eq.codigo_sap} - Stock: {eq.cantidad || 1}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="salida-cantidad-wrapper">
                <label className="salida-label">Cantidad</label>
                <input className="salida-input" type="number" min={1} value={cantidadSeleccionada} onChange={e => setCantidadSeleccionada(parseInt(e.target.value) || 1)} disabled={equipoSeleccionado?.serial} />
              </div>
              <Btn onClick={agregarItem} secondary>➕ Agregar</Btn>
            </div>

            {form.items.length > 0 && (
              <table className="salida-items-table">
                <thead>
                  <tr>
                    <th>Cantidad</th>
                    <th>Material / Serie</th>
                    <th>Observación</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item, idx) => {
                    const eq = equiposDisponibles.find(e => e.id === item.inventario_id);
                    return (
                      <tr key={idx}>
                        <td>{item.cantidad}</td>
                        <td>{eq ? (eq.serial || eq.material_descripcion) : item.inventario_id}</td>
                        <td>
                          <input className="salida-item-observacion" type="text" placeholder="Nota (opcional)" value={item.observacion_item} onChange={e => setForm(p => ({ ...p, items: p.items.map((i, i2) => i2 === idx ? { ...i, observacion_item: e.target.value } : i) }))} />
                        </td>
                        <td><button className="salida-remove-btn" onClick={() => eliminarItem(idx)}>🗑️</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="salida-form-actions">
            <Btn onClick={handleCrearSalida} loading={saving}>Registrar Salida</Btn>
            <Btn secondary onClick={() => setShowForm(false)}>Cancelar</Btn>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="salida-filtros">
        <input className="salida-filtro-destino" type="text" placeholder="Destino..." value={filtroDestino} onChange={e => { setFiltroDestino(e.target.value); setPagina(1); }} />
        <input className="salida-filtro-fecha" type="date" value={filtroFecha} onChange={e => { setFiltroFecha(e.target.value); setPagina(1); }} />
        <Btn onClick={() => { setFiltroDestino(''); setFiltroFecha(''); setPagina(1); }} secondary>Limpiar filtros</Btn>
      </div>

      {/* Tabla de salidas */}
      <div className="salida-table-container">
        {loading ? (
          <div className="salida-loading">Cargando...</div>
        ) : salidas.length === 0 ? (
          <div className="salida-empty">No hay salidas registradas</div>
        ) : (
          <>
            <div className="salida-table-wrapper" style={{ overflowX: 'auto' }}>
              <table className="salida-table">
                <thead>
                  <tr>
                    {['Consecutivo', 'Fecha', 'Destino', 'Motivo', 'Responsable', 'Cant. Items', 'Acciones'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {salidas.map(s => (
                    <tr key={s.id}>
                      <td className="salida-consecutivo">{s.consecutivo}</td>
                      <td>{new Date(s.fecha).toLocaleDateString('es-CO')}</td>
                      <td>{s.destino}</td>
                      <td>{s.motivo || '—'}</td>
                      <td>{s.responsable_nombre || '—'}</td>
                      <td>{s.total_items}</td>
                      <td>
                        <div className="salida-actions">
                          <button className="salida-action-btn salida-action-ver" onClick={() => verDetalle(s.id)} title="Ver detalle">👁️</button>
                          <button className="salida-action-btn salida-action-imprimir" onClick={() => imprimirComprobante(s)} title="Imprimir comprobante">🖨️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPaginas > 1 && (
              <div className="salida-pagination">
                <button className="salida-pagination-btn" onClick={() => setPagina(p => Math.max(1, p-1))} disabled={pagina === 1}>Anterior</button>
                <span className="salida-pagination-info">Página {pagina} de {totalPaginas}</span>
                <button className="salida-pagination-btn" onClick={() => setPagina(p => Math.min(totalPaginas, p+1))} disabled={pagina === totalPaginas}>Siguiente</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal detalle */}
      {showDetalle && detalleSalida && (
        <div className="salida-modal-overlay">
          <div className="salida-modal-content">
            <div className="salida-modal-header">
              <h3 className="salida-modal-title">Detalle de {detalleSalida.cabecera?.consecutivo || detalleSalida.consecutivo}</h3>
              <button className="salida-modal-close" onClick={() => setShowDetalle(false)}>×</button>
            </div>
            <div className="salida-modal-info">
              <p><strong>Destino:</strong> {detalleSalida.cabecera?.destino || detalleSalida.destino}</p>
              <p><strong>Motivo:</strong> {detalleSalida.cabecera?.motivo || detalleSalida.motivo || '—'}</p>
              <p><strong>Responsable:</strong> {detalleSalida.cabecera?.responsable_nombre || detalleSalida.responsable_nombre || '—'}</p>
              <p><strong>Observaciones:</strong> {detalleSalida.cabecera?.observaciones || detalleSalida.observaciones || '—'}</p>
            </div>
            <h4 className="salida-modal-subtitle">Equipos incluidos</h4>
            <table className="salida-items-table">
              <thead>
                <tr><th>Cantidad</th><th>Material / Serie</th><th>Observación</th></tr>
              </thead>
              <tbody>
                {(detalleSalida.detalles || []).map((d, idx) => (
                  <tr key={idx}>
                    <td>{d.cantidad}</td>
                    <td>{d.serial || d.material_descripcion || d.material_id || '—'}</td>
                    <td>{d.observacion_item || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="salida-modal-footer">
              <Btn onClick={() => imprimirComprobante(detalleSalida.cabecera || detalleSalida)}>🖨️ Imprimir comprobante</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}