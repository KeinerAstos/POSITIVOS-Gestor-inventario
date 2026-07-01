import React, { useMemo, useState } from 'react';
import { http } from '../api.js';
import { Btn, Alert, Label, PageHeader, EmptyState } from './UI.jsx';
import '../styles/DevolucionView.css';

const nuevoItem = () => ({
  buscar: '',
  id: null,
  desc: '',
  serial: '',
  tecnico: '',
  ot_numero: null,
  material_id: '',
  cantidadOriginal: 1,
  cantidadDevolver: 1,
});

export default function DevolucionView({ inv = [], refresh }) {
  const [items, setItems] = useState([nuevoItem()]);
  const [conservarOT, setConservarOT] = useState(true);
  const [observacion, setObservacion] = useState('');
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [activeDD, setActiveDD] = useState(null);

  const enTerreno = useMemo(() => {
    return inv.filter(i =>
      String(i.estado || '').toUpperCase() === 'TERRENO' &&
      Number(i.cantidad || 0) > 0
    );
  }, [inv]);

  const seleccionados = useMemo(() => items.filter(i => i.id), [items]);

  const totalUnidades = useMemo(() => {
    return seleccionados.reduce((acc, item) => acc + Number(item.cantidadDevolver || 0), 0);
  }, [seleccionados]);

  const buscarCoincidencias = (texto) => {
    const q = texto.trim().toLowerCase();
    if (q.length < 2) return [];

    return enTerreno
      .filter(i => {
        const campos = [
          i.serial,
          i.material_id,
          i.codigo_sap,
          i.descripcion,
          i.material_descripcion,
          i.numero_ot,
          i.usuario_asignado_nombre,
        ];

        return campos.some(c => String(c || '').toLowerCase().includes(q));
      })
      .slice(0, 8);
  };

  const seleccionarItem = (idx, item) => {
    const serial = item.serial || '';
    const cantidad = Number(item.cantidad || 1);

    setItems(prev => {
      const n = [...prev];
      n[idx] = {
        buscar: serial || item.material_id || item.descripcion || item.material_descripcion || '',
        id: item.id,
        desc: item.descripcion || item.material_descripcion || item.material_id || 'Sin descripción',
        serial,
        tecnico: item.usuario_asignado_nombre || '—',
        ot_numero: item.numero_ot || null,
        material_id: item.material_id || item.codigo_sap || '',
        cantidadOriginal: cantidad,
        cantidadDevolver: serial ? 1 : cantidad,
      };
      return n;
    });

    setActiveDD(null);
  };

  const cambiarBusqueda = (idx, value) => {
    setItems(prev => {
      const n = [...prev];
      n[idx] = { ...nuevoItem(), buscar: value };
      return n;
    });
    setActiveDD(`dev_${idx}`);
  };

  const limpiarItem = (idx) => {
    setItems(prev => {
      const n = [...prev];
      n[idx] = nuevoItem();
      return n;
    });
  };

  const eliminarItem = (idx) => {
    setItems(prev => {
      if (prev.length === 1) return [nuevoItem()];
      return prev.filter((_, i) => i !== idx);
    });
  };

  const agregarItem = () => {
    setItems(prev => [...prev, nuevoItem()]);
  };

  const cambiarCantidad = (idx, value) => {
    setItems(prev => {
      const n = [...prev];
      const max = Number(n[idx].cantidadOriginal || 1);
      let cantidad = Number(value || 1);

      if (cantidad < 1) cantidad = 1;
      if (cantidad > max) cantidad = max;

      n[idx] = { ...n[idx], cantidadDevolver: cantidad };
      return n;
    });
  };

  const handleSubmit = async () => {
    const validos = items.filter(e => e.id);

    if (!validos.length) {
      setAlert({ type: 'error', msg: 'Selecciona al menos un elemento.' });
      return;
    }

    setSaving(true);
    setAlert(null);

    try {
      for (const item of validos) {
        await http.post('/inventario/devolver-bodega', {
          inventario_id: item.id,
          conservar_ot: conservarOT,
          observacion: observacion || 'Devolución a bodega',
          cantidad_devolver: Number(item.cantidadDevolver || 1),
        });
      }

      await refresh();

      setItems([nuevoItem()]);
      setObservacion('');
      setAlert({ type: 'success', msg: 'Devolución procesada correctamente.' });
    } catch (err) {
      setAlert({ type: 'error', msg: err.message || 'Error procesando devolución.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dev-page">
      <PageHeader
        title="Devolución a Bodega"
        icon="ti-rotate-clockwise-2"
        subtitle="Registra el retorno de equipos desde terreno"
      />

      {alert && <Alert type={alert.type} msg={alert.msg} onClose={() => setAlert(null)} />}

      <section className="dev-panel dev-config-panel">
        <div className="dev-panel-title">
          <i className="ti ti-settings" />
          <div>
            <h3>Configuración de devolución</h3>
            <p>Define cómo quedarán los elementos después de volver a bodega.</p>
          </div>
        </div>

        <div className="dev-config-layout">
          <div className="dev-mode-group">
            <label className={`dev-mode-card ${conservarOT ? 'active' : ''}`}>
              <input
                type="radio"
                checked={conservarOT}
                onChange={() => setConservarOT(true)}
              />
              <div className="dev-mode-icon">
                <i className="ti ti-link" />
              </div>
              <div>
                <strong>Mantener OT actual</strong>
                <span>Quedará como INGRESADO y disponible para reasignar en la misma OT.</span>
              </div>
            </label>

            <label className={`dev-mode-card ${!conservarOT ? 'active' : ''}`}>
              <input
                type="radio"
                checked={!conservarOT}
                onChange={() => setConservarOT(false)}
              />
              <div className="dev-mode-icon">
                <i className="ti ti-package" />
              </div>
              <div>
                <strong>Liberar de la OT</strong>
                <span>Se liberará de la OT y quedará como STOCK libre en bodega.</span>
              </div>
            </label>
          </div>

          <div className="dev-observacion">
            <Label>Observación</Label>
            <textarea
              value={observacion}
              onChange={e => setObservacion(e.target.value)}
              maxLength={200}
              placeholder="Motivo de devolución, daños, notas..."
            />
            <div className="dev-counter">{observacion.length} / 200</div>
          </div>

          <div className="dev-side-kpis">
            <div className="dev-side-kpi">
              <i className="ti ti-clipboard-list" />
              <span>Ítems seleccionados</span>
              <strong>{seleccionados.length}</strong>
            </div>
            <div className="dev-side-kpi">
              <i className="ti ti-box-multiple" />
              <span>Unidades a devolver</span>
              <strong>{totalUnidades}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="dev-panel">
        <div className="dev-table-header">
          <div className="dev-panel-title no-margin">
            <i className="ti ti-tool" />
            <div>
              <h3>Elementos en terreno</h3>
              <p>Busca por serial, código SAP, descripción, OT o técnico.</p>
            </div>
          </div>

          <button type="button" className="dev-add-btn" onClick={agregarItem}>
            <i className="ti ti-plus" />
            Agregar elemento
          </button>
        </div>

        <div className="dev-table">
          <div className="dev-row dev-head-row">
            <div>Búsqueda</div>
            <div>Código SAP</div>
            <div>Descripción</div>
            <div>Serial</div>
            <div>OT</div>
            <div>Cantidad</div>
            <div>Acción</div>
          </div>

          {items.map((eq, idx) => {
            const matches = buscarCoincidencias(eq.buscar);
            const esMaterial = eq.id && !eq.serial;

            return (
              <div key={idx} className={`dev-row dev-body-row ${eq.id ? 'selected' : ''}`}>
                <div className="dev-search-cell">
                  <div className="dev-search-box">
                    <i className="ti ti-search" />
                    <input
                      value={eq.buscar}
                      onChange={e => cambiarBusqueda(idx, e.target.value)}
                      onFocus={() => setActiveDD(`dev_${idx}`)}
                      placeholder="Serial, SAP o descripción..."
                    />

                    {eq.buscar && (
                      <button type="button" onClick={() => limpiarItem(idx)}>
                        ×
                      </button>
                    )}
                  </div>

                  {activeDD === `dev_${idx}` && matches.length > 0 && (
                    <div className="dev-dropdown">
                      {matches.map(item => {
                        const serial = item.serial || '';
                        const sap = item.material_id || item.codigo_sap || '-';
                        const desc = item.descripcion || item.material_descripcion || item.material_id || '-';

                        return (
                          <button
                            type="button"
                            key={item.id}
                            className="dev-option dev-option-rich"
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => seleccionarItem(idx, item)}
                          >
                            <div className="dev-option-icon">
                              <i className={serial ? 'ti ti-barcode' : 'ti ti-box'} />
                            </div>

                            <div className="dev-option-main">
                              <div className="dev-option-top">
                                <div>
                                  <strong>{serial || sap}</strong>
                                  <span>{desc}</span>
                                </div>

                                <div className="dev-option-tags">
                                  <span>{serial ? 'Serializado' : 'Material'}</span>
                                  <span>Cant: {item.cantidad || 1}</span>
                                </div>
                              </div>

                              <div className="dev-option-meta-line">
                                <span>
                                  <i className="ti ti-file-invoice" />
                                  OT: {item.numero_ot || 'Sin OT'}
                                </span>

                                <span>
                                  <i className="ti ti-user" />
                                  Técnico: {item.usuario_asignado_nombre || 'Sin técnico'}
                                </span>

                                <span>
                                  <i className="ti ti-package" />
                                  Estado: {item.estado || 'TERRENO'}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="dev-strong">{eq.material_id || '-'}</div>
                <div title={eq.desc}>{eq.desc || '-'}</div>
                <div className="dev-mono">{eq.serial || 'Sin serial'}</div>
                <div>{eq.ot_numero || '-'}</div>

                <div>
                  {esMaterial ? (
                    <div className="dev-qty-input">
                      <input
                        type="number"
                        min="1"
                        max={eq.cantidadOriginal}
                        value={eq.cantidadDevolver}
                        onChange={e => cambiarCantidad(idx, e.target.value)}
                      />
                      <span>/ {eq.cantidadOriginal}</span>
                    </div>
                  ) : (
                    <span className="dev-qty">{eq.id ? 1 : '-'}</span>
                  )}
                </div>

                <div>
                  <button
                    type="button"
                    className="dev-remove-btn"
                    onClick={() => eliminarItem(idx)}
                  >
                    <i className="ti ti-x" />
                  </button>
                </div>
              </div>
            );
          })}

          {seleccionados.length === 0 && (
            <div className="dev-empty">
              <div>
                <i className="ti ti-package" />
              </div>
              <h3>Aún no has agregado elementos</h3>
              <p>Busca y selecciona equipos o materiales en terreno para devolver.</p>
            </div>
          )}
        </div>

        {enTerreno.length === 0 && (
          <EmptyState icon="ti-package-off" title="Sin equipos en terreno" />
        )}
      </section>

      <section className="dev-panel dev-summary-panel">
        <div className="dev-summary-title">Resumen de devolución</div>

        <div className="dev-summary-grid">
          <div className="dev-summary-card">
            <i className="ti ti-clipboard-check" />
            <div>
              <span>Ítems a devolver</span>
              <strong>{seleccionados.length}</strong>
            </div>
          </div>

          <div className="dev-summary-card">
            <i className="ti ti-box-multiple" />
            <div>
              <span>Unidades totales</span>
              <strong>{totalUnidades}</strong>
            </div>
          </div>

          <div className="dev-summary-card">
            <i className="ti ti-checkup-list" />
            <div>
              <span>Resultado</span>
              <strong>{conservarOT ? 'INGRESADO' : 'STOCK'}</strong>
            </div>
          </div>

          <Btn
            onClick={handleSubmit}
            loading={saving}
            icon="ti-check"
            className="dev-submit-btn"
          >
            Confirmar Devolución
          </Btn>
        </div>
      </section>
    </div>
  );
}