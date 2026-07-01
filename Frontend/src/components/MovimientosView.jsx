import React, { useEffect, useMemo, useState } from 'react';
import { fmtFecha, fmtFechaHora } from '../api.js';
import { Btn, PageHeader, EmptyState, Loading, Pagination } from './UI.jsx';
import '../styles/MovimientosView.css';

const TIPO_LABELS = {
  INGRESO_BODEGA: 'Ingreso Bodega',
  ENTRADA_STOCK: 'Entrada Stock',
  ASIGNACION_TERRENO: 'Entrega Técnico',
  ENTREGA_TECNICO: 'Entrega Técnico',
  DEVOLUCION_BODEGA: 'Devolución Bodega',
  DEVOLUCION_TECNICO: 'Dev. Técnico',
  REASIGNACION_OT: 'Reasignación OT',
  INSTALACION_CONSUMO: 'Instalación/Consumo',
  ACTUALIZACION: 'Actualización',
  TRANSFERENCIA_BODEGA: 'Transferencia',
  SALIDA_BODEGA: 'Salida Bodega',
  ANULACION_SALIDA: 'Anulación Salida',
};

const TIPO_META = {
  INGRESO_BODEGA: { color: '#22c55e', icon: 'ti-download' },
  ENTRADA_STOCK: { color: '#22c55e', icon: 'ti-package-import' },
  ASIGNACION_TERRENO: { color: '#3b82f6', icon: 'ti-truck-delivery' },
  ENTREGA_TECNICO: { color: '#3b82f6', icon: 'ti-user-check' },
  DEVOLUCION_BODEGA: { color: '#f97316', icon: 'ti-rotate-clockwise-2' },
  DEVOLUCION_TECNICO: { color: '#f97316', icon: 'ti-arrow-back-up' },
  REASIGNACION_OT: { color: '#a78bfa', icon: 'ti-switch-horizontal' },
  INSTALACION_CONSUMO: { color: '#94a3b8', icon: 'ti-check' },
  ACTUALIZACION: { color: '#64748b', icon: 'ti-refresh' },
  TRANSFERENCIA_BODEGA: { color: '#14b8a6', icon: 'ti-transfer' },
  SALIDA_BODEGA: { color: '#ef4444', icon: 'ti-upload' },
  ANULACION_SALIDA: { color: '#fb7185', icon: 'ti-ban' },
};

const TAB_CONFIG = [
  { id: 'todos', label: 'Todos', tipos: [] },
  { id: 'ingresos', label: 'Ingresos', tipos: ['INGRESO_BODEGA', 'ENTRADA_STOCK'] },
  { id: 'entregas', label: 'Entregas', tipos: ['ASIGNACION_TERRENO', 'ENTREGA_TECNICO'] },
  { id: 'devoluciones', label: 'Devoluciones', tipos: ['DEVOLUCION_BODEGA', 'DEVOLUCION_TECNICO'] },
  { id: 'reasignaciones', label: 'Reasignaciones', tipos: ['REASIGNACION_OT'] },
  { id: 'salidas', label: 'Salidas', tipos: ['SALIDA_BODEGA', 'ANULACION_SALIDA'] },
];

export default function MovimientosView() {
  const [data, setData] = useState({
    data: [],
    pagination: { total: 0, page: 1, limit: 20, totalPages: 1 },
  });

  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('todos');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [estadoAnterior, setEstadoAnterior] = useState('');
  const [estadoNuevo, setEstadoNuevo] = useState('');
  const [search, setSearch] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportTipo, setExportTipo] = useState('');
  const [exportTodo, setExportTodo] = useState(true);
  const [exportDesde, setExportDesde] = useState('');
  const [exportHasta, setExportHasta] = useState('');

  const tabActual = TAB_CONFIG.find(t => t.id === tab) || TAB_CONFIG[0];

  const cargar = async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams({ page, limit: 20 });

      if (tabActual.tipos.length > 0) {
        params.set('tipos', tabActual.tipos.join(','));
      } else if (tipoFiltro) {
        params.set('tipo', tipoFiltro);
      }

      if (search) params.set('search', search);
      if (fechaDesde) params.set('fecha_desde', fechaDesde);
      if (fechaHasta) params.set('fecha_hasta', fechaHasta);
      if (estadoAnterior) params.set('estado_anterior', estadoAnterior);
      if (estadoNuevo) params.set('estado_nuevo', estadoNuevo);

      const res = await fetch(`/api/movimientos?${params}`);
      const json = await res.json();

      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [tab, tipoFiltro, estadoAnterior, estadoNuevo, search, fechaDesde, fechaHasta, page]);

  const movs = data.data || [];

  const tiposReales = useMemo(() => {
    return Object.keys(TIPO_LABELS).sort();
  }, []);

  const estadosAnteriores = useMemo(() => {
    return [...new Set(movs.map(m => m.estado_anterior).filter(Boolean))].sort();
  }, [movs]);

  const estadosNuevos = useMemo(() => {
    return [...new Set(movs.map(m => m.estado_nuevo).filter(Boolean))].sort();
  }, [movs]);

  const kpis = useMemo(() => {
    const total = data.pagination?.total || movs.length;
    const entradas = movs.filter(m => ['INGRESO_BODEGA', 'ENTRADA_STOCK'].includes(m.tipo_movimiento)).length;
    const entregas = movs.filter(m => ['ASIGNACION_TERRENO', 'ENTREGA_TECNICO'].includes(m.tipo_movimiento)).length;
    const devoluciones = movs.filter(m => ['DEVOLUCION_BODEGA', 'DEVOLUCION_TECNICO'].includes(m.tipo_movimiento)).length;
    const reasignaciones = movs.filter(m => m.tipo_movimiento === 'REASIGNACION_OT').length;
    const salidas = movs.filter(m => ['SALIDA_BODEGA', 'ANULACION_SALIDA'].includes(m.tipo_movimiento)).length;

    return { total, entradas, entregas, devoluciones, reasignaciones, salidas };
  }, [movs, data]);

  const limpiarFiltros = () => {
    setTipoFiltro('');
    setEstadoAnterior('');
    setEstadoNuevo('');
    setSearch('');
    setFechaDesde('');
    setFechaHasta('');
    setPage(1);
  };

  const exportar = async () => {
    try {
      const body = {
        tipo: exportTipo || null,
        fecha_desde: exportTodo ? null : exportDesde,
        fecha_hasta: exportTodo ? null : exportHasta,
      };

      const res = await fetch('/api/movimientos/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Error exportando movimientos');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');

      a.href = url;
      a.download = exportTodo
        ? `Movimientos_Completos_${new Date().toISOString().slice(0, 10)}.csv`
        : `Movimientos_${exportDesde || 'inicio'}_${exportHasta || 'fin'}.csv`;

      a.click();
      window.URL.revokeObjectURL(url);
      setShowExportModal(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const renderTipo = (tipo) => {
    const meta = TIPO_META[tipo] || { color: '#64748b', icon: 'ti-circle' };

    return (
      <span className="mov-tipo-badge" style={{ '--mov-color': meta.color }}>
        <i className={`ti ${meta.icon}`} />
        {TIPO_LABELS[tipo] || tipo || '—'}
      </span>
    );
  };

  const renderTransicion = (m) => (
    <div className="mov-transition">
      <span>{m.estado_anterior || '—'}</span>
      <i className="ti ti-arrow-right" />
      <strong>{m.estado_nuevo || '—'}</strong>
    </div>
  );

  return (
    <div className="mov-page">
      <PageHeader
        title="Historial de Movimientos"
        icon="ti-history"
        subtitle="Consulta, audita y exporta todos los movimientos de inventario"
        actions={
          <Btn
            variant="success"
            size="sm"
            onClick={() => setShowExportModal(true)}
            icon="ti-download"
          >
            Exportar CSV
          </Btn>
        }
      />

      <section className="mov-kpi-grid">
        <div className="mov-kpi-card">
          <i className="ti ti-database" />
          <span>Total movimientos</span>
          <strong>{kpis.total}</strong>
          <small>Todos los registros</small>
        </div>

        <div className="mov-kpi-card green">
          <i className="ti ti-package-import" />
          <span>Ingresos</span>
          <strong>{kpis.entradas}</strong>
          <small>En esta consulta</small>
        </div>

        <div className="mov-kpi-card blue">
          <i className="ti ti-truck-delivery" />
          <span>Entregas</span>
          <strong>{kpis.entregas}</strong>
          <small>En esta consulta</small>
        </div>

        <div className="mov-kpi-card orange">
          <i className="ti ti-rotate-clockwise-2" />
          <span>Devoluciones</span>
          <strong>{kpis.devoluciones}</strong>
          <small>En esta consulta</small>
        </div>

        <div className="mov-kpi-card purple">
          <i className="ti ti-switch-horizontal" />
          <span>Reasignaciones</span>
          <strong>{kpis.reasignaciones}</strong>
          <small>En esta consulta</small>
        </div>

        <div className="mov-kpi-card red">
          <i className="ti ti-upload" />
          <span>Salidas</span>
          <strong>{kpis.salidas}</strong>
          <small>En esta consulta</small>
        </div>
      </section>

      <section className="mov-panel">
        <div className="mov-tabs">
          {TAB_CONFIG.map(t => (
            <button
              key={t.id}
              className={`mov-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => {
                setTab(t.id);
                setTipoFiltro('');
                setPage(1);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mov-filters">
          <div className="mov-search">
            <i className="ti ti-search" />
            <input
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por material, serie, SAP, OT o responsable..."
            />
          </div>

          <select
            value={tipoFiltro}
            disabled={tab !== 'todos'}
            onChange={e => {
              setTipoFiltro(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos los tipos</option>
            {tiposReales.map(t => (
              <option key={t} value={t}>
                {TIPO_LABELS[t] || t}
              </option>
            ))}
          </select>

          <select
            value={estadoAnterior}
            onChange={e => {
              setEstadoAnterior(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Estado anterior</option>
            {estadosAnteriores.map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>

          <select
            value={estadoNuevo}
            onChange={e => {
              setEstadoNuevo(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Estado nuevo</option>
            {estadosNuevos.map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>

          <input
            type="date"
            value={fechaDesde}
            onChange={e => {
              setFechaDesde(e.target.value);
              setPage(1);
            }}
          />

          <input
            type="date"
            value={fechaHasta}
            onChange={e => {
              setFechaHasta(e.target.value);
              setPage(1);
            }}
          />

          <button type="button" onClick={limpiarFiltros}>
            <i className="ti ti-refresh" />
            Limpiar
          </button>
        </div>
      </section>

      <section className="mov-panel">
        {loading && movs.length === 0 ? (
          <Loading />
        ) : movs.length === 0 ? (
          <EmptyState icon="ti-history-off" title="Sin movimientos" />
        ) : (
          <>
            <div className="mov-table">
              <div className="mov-row mov-head">
                <div>Tipo</div>
                <div>Material / SAP / Serie</div>
                <div>Transición</div>
                <div>OT</div>
                <div>Responsable</div>
                <div>Fecha</div>
                <div>Acción</div>
              </div>

              {movs.map(m => {
                const expanded = expandedId === m.id;

                return (
                  <React.Fragment key={m.id}>
                    <div className={`mov-row mov-body ${expanded ? 'expanded' : ''}`}>
                      <div>{renderTipo(m.tipo_movimiento)}</div>

                      <div>
                        <div className="mov-material">{m.material || '—'}</div>
                        <div className="mov-subline">
                          SAP: {m.material_id || m.codigo_sap || '—'}
                        </div>
                        <div className="mov-subline">
                          Serie: {m.serial || '—'}
                        </div>
                      </div>

                      <div>{renderTransicion(m)}</div>

                      <div>
                        {m.tipo_movimiento === 'REASIGNACION_OT' ? (
                          <>
                            <div>Origen: {m.ot_anterior_numero || m.ot_anterior || '—'}</div>
                            <div className="mov-subline">Destino: {m.ot_nueva_numero || m.ot_nueva || '—'}</div>
                          </>
                        ) : (
                          <div>{m.ot_nueva_numero || m.ot_nueva || m.ot_numero || '—'}</div>
                        )}
                      </div>

                      <div className="mov-user">
                        <div className="mov-avatar">
                          {(m.usuario || m.tecnico_nombre || 'B').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <strong>{m.usuario || m.tecnico_nombre || '—'}</strong>
                          <span>{m.usuario_tipo || 'Responsable'}</span>
                        </div>
                      </div>

                      <div>
                        <div>{fmtFecha(m.created_at)}</div>
                        <div className="mov-subline">{fmtFechaHora(m.created_at).split(',')[1] || ''}</div>
                      </div>

                      <div>
                        <button
                          className="mov-action"
                          onClick={() => setExpandedId(expanded ? null : m.id)}
                        >
                          <i className={`ti ${expanded ? 'ti-chevron-up' : 'ti-eye'}`} />
                        </button>
                      </div>
                    </div>

                    {expanded && (
                      <div className="mov-detail">
                        <div className="mov-detail-title">
                          <i className={`ti ${TIPO_META[m.tipo_movimiento]?.icon || 'ti-info-circle'}`} />
                          <strong>Detalle del movimiento #{m.id}</strong>
                          {renderTipo(m.tipo_movimiento)}
                        </div>

                        <div className="mov-detail-grid">
                          <div>
                            <h4>Material</h4>
                            <p><b>Descripción:</b> {m.material || '—'}</p>
                            <p><b>SAP:</b> {m.material_id || m.codigo_sap || '—'}</p>
                            <p><b>Serie:</b> {m.serial || '—'}</p>
                            <p><b>Cantidad:</b> {m.cantidad || 1}</p>
                          </div>

                          <div>
                            <h4>Transición</h4>
                            {renderTransicion(m)}
                            <p><b>Fecha:</b> {fmtFechaHora(m.created_at)}</p>
                            <p><b>Responsable:</b> {m.usuario || m.tecnico_nombre || '—'}</p>
                          </div>

                          <div>
                            <h4>Información OT</h4>
                            <p><b>OT origen:</b> {m.ot_anterior_numero || m.ot_anterior || '—'}</p>
                            <p><b>OT destino:</b> {m.ot_nueva_numero || m.ot_nueva || m.ot_numero || '—'}</p>
                            <p><b>OTH origen:</b> {m.oth_anterior || '—'}</p>
                            <p><b>OTH destino:</b> {m.oth_nueva || '—'}</p>
                          </div>

                          <div>
                            <h4>Observación</h4>
                            <p>{m.observacion || 'Sin observación'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            <Pagination
              page={page}
              totalPages={data.pagination?.totalPages || 1}
              total={data.pagination?.total || 0}
              onPage={setPage}
            />
          </>
        )}
      </section>

      {showExportModal && (
        <div className="mov-modal-backdrop">
          <div className="mov-modal">
            <div className="mov-modal-header">
              <div>
                <h3>Exportar movimientos</h3>
                <p>Selecciona el tipo de movimientos y el rango de fechas que deseas descargar.</p>
              </div>

              <button
                className="mov-close-btn"
                onClick={() => setShowExportModal(false)}
              >
                ×
              </button>
            </div>

            <div className="mov-modal-body">
              <div className="mov-field">
                <label>Tipo de movimiento</label>

                <select
                  value={exportTipo}
                  onChange={e => setExportTipo(e.target.value)}
                >
                  <option value="">Todos los movimientos</option>
                  {Object.keys(TIPO_LABELS).map(tipo => (
                    <option key={tipo} value={tipo}>
                      {TIPO_LABELS[tipo]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mov-export-mode">
                <label className={`mov-export-option ${exportTodo ? 'active' : ''}`}>
                  <input
                    type="radio"
                    checked={exportTodo}
                    onChange={() => setExportTodo(true)}
                  />

                  <div>
                    <strong>Toda la base</strong>
                    <span>Descarga todos los movimientos registrados en el sistema.</span>
                  </div>
                </label>

                <label className={`mov-export-option ${!exportTodo ? 'active' : ''}`}>
                  <input
                    type="radio"
                    checked={!exportTodo}
                    onChange={() => setExportTodo(false)}
                  />

                  <div>
                    <strong>Rango de fechas</strong>
                    <span>Descarga únicamente los movimientos comprendidos entre dos fechas.</span>
                  </div>
                </label>
              </div>

              {!exportTodo && (
                <div className="mov-export-dates">
                  <div className="mov-field">
                    <label>Fecha inicial</label>
                    <input
                      type="date"
                      value={exportDesde}
                      onChange={e => setExportDesde(e.target.value)}
                    />
                  </div>

                  <div className="mov-field">
                    <label>Fecha final</label>
                    <input
                      type="date"
                      value={exportHasta}
                      onChange={e => setExportHasta(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mov-modal-footer">
              <Btn
                variant="ghost"
                onClick={() => setShowExportModal(false)}
              >
                Cancelar
              </Btn>

              <Btn
                variant="success"
                icon="ti-download"
                onClick={exportar}
              >
                Descargar CSV
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}