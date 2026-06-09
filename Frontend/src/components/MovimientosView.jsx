import React, { useState, useEffect } from 'react';
import { fmtFecha, fmtFechaHora } from '../api.js';
import { Card, Btn, PageHeader, SearchInput, EmptyState, Loading, Pagination } from './UI.jsx';
import '../styles/MovimientosView.css';

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

export default function MovimientosView() {
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
      const res = await fetch('/api/movimientos/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: tab === 'reasignaciones' ? 'REASIGNACION_OT' : (ft || null),
          fecha_desde: fechaDesde || null,
          fecha_hasta: fechaHasta || null
        })
      });
      if (!res.ok) throw new Error('Error al exportar');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `movimientos_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
    } catch (err) { alert(err.message); }
  };

  const tipos = Object.keys(TIPO_LABELS).sort();
  const movs = data.data || [];

  return (
    <div className="movimientos-fade-in">
      <PageHeader
        title="Historial de Movimientos"
        icon="ti-history"
        actions={<Btn variant="success" size="sm" onClick={exportar} icon="ti-download">Exportar CSV</Btn>}
      />

      <div className="movimientos-tabs">
        {[{ id: 'todos', label: 'Todos' }, { id: 'reasignaciones', label: 'Reasignaciones OT' }].map(t => (
          <button
            key={t.id}
            className={`movimientos-tab ${tab === t.id ? 'movimientos-tab-active' : ''}`}
            onClick={() => { setTab(t.id); setPage(1); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'todos' && (
        <Card className="movimientos-filtros-card">
          <div className="movimientos-filtros">
            <SearchInput
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Material, serie, responsable..."
              className="movimientos-search"
            />
            <select
              className="movimientos-select"
              value={ft}
              onChange={e => { setFt(e.target.value); setPage(1); }}
            >
              <option value="">Todos los tipos</option>
              {tipos.map(t => <option key={t} value={t}>{TIPO_LABELS[t] || t}</option>)}
            </select>
            <input
              type="date"
              className="movimientos-date"
              value={fechaDesde}
              onChange={e => { setFechaDesde(e.target.value); setPage(1); }}
            />
            <input
              type="date"
              className="movimientos-date"
              value={fechaHasta}
              onChange={e => { setFechaHasta(e.target.value); setPage(1); }}
            />
            {(ft || search || fechaDesde || fechaHasta) && (
              <Btn variant="ghost" size="sm" onClick={() => { setFt(''); setSearch(''); setFechaDesde(''); setFechaHasta(''); setPage(1); }} icon="ti-x">Limpiar</Btn>
            )}
          </div>
        </Card>
      )}

      <Card>
        {loading && movs.length === 0 ? <Loading /> : movs.length === 0 ? <EmptyState icon="ti-history-off" title="Sin movimientos" /> : (
          <>
            <div className="movimientos-table-container">
              <table className="movimientos-table">
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
                        <td className="movimientos-fecha">{fmtFechaHora(m.created_at)}</td>
                        <td>
                          <div className="movimientos-material">{m.material || '—'}</div>
                          {m.serial && <div className="movimientos-serial">{m.serial}</div>}
                        </td>
                        <td className="movimientos-cantidad">{m.cantidad || 1}</td>
                        <td>
                          <div>{m.ot_anterior_numero || `OT #${m.ot_anterior || '?'}`}</div>
                          {m.oth_anterior && <div className="movimientos-oth">OTH: {m.oth_anterior}</div>}
                        </td>
                        <td>
                          <div>{m.ot_nueva_numero || `OT #${m.ot_nueva || '?'}`}</div>
                          {m.oth_nueva && <div className="movimientos-oth">OTH: {m.oth_nueva}</div>}
                        </td>
                        <td>{m.usuario || m.tecnico_nombre || '—'}</td>
                        <td className="movimientos-observacion">{m.observacion || '—'}</td>
                      </tr>
                    ) : (
                      <tr key={m.id}>
                        <td>
                          <span className="movimientos-tipo-badge" style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
                            {TIPO_LABELS[m.tipo_movimiento] || m.tipo_movimiento || '—'}
                          </span>
                        </td>
                        <td>
                          <div className="movimientos-material">{m.material || '—'}</div>
                          {m.serial && <div className="movimientos-serial">{m.serial}</div>}
                        </td>
                        <td className="movimientos-cantidad">{m.cantidad || 1}</td>
                        <td className="movimientos-estado-anterior">{m.estado_anterior || '—'}</td>
                        <td className="movimientos-estado-nuevo">{m.estado_nuevo || '—'}</td>
                        <td>{m.ot_anterior_numero || (m.ot_anterior ? `OT #${m.ot_anterior}` : '—')}</td>
                        <td>{m.usuario || m.tecnico_nombre || '—'}</td>
                        <td className="movimientos-fecha">{fmtFecha(m.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={data.pagination?.totalPages || 1} total={data.pagination?.total || 0} onPage={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}