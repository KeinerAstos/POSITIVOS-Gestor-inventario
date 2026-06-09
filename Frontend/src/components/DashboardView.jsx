// src/components/Views/DashboardView.jsx
import React from 'react';
import { fmtFecha } from '../api.js';
import { StatCard, Card, CardHeader, EmptyState, Badge, PageHeader } from './UI.jsx';
import '../styles/DashboardView.css';

export default function DashboardView({ bodegas = [], inv = [], mov = [] }) {
  const totalEquipos = inv.length;
  const enStock = inv.filter(i => i.estado === 'STOCK' || i.estado === 'INGRESADO').length;
  const enTerreno = inv.filter(i => i.estado === 'TERRENO').length;
  const consumidos = inv.filter(i => i.estado === 'CONSUMO').length;
  const devueltos = inv.filter(i => i.estado === 'DEVUELTO').length;
  const movRecientes = Array.isArray(mov) ? mov.slice(0, 12) : [];

  const equiposPorBodega = bodegas.map(b => ({
    nombre: b.nombre,
    total: inv.filter(i => i.bodega_id === b.id).length,
    stock: inv.filter(i => i.bodega_id === b.id && (i.estado === 'STOCK' || i.estado === 'INGRESADO')).length,
  }));

  const getTipoColor = (tipo) => {
    if (!tipo) return '#94A3B8';
    if (tipo.includes('INGRESO') || tipo.includes('ENTRADA')) return '#22C55E';
    if (tipo.includes('ENTREGA') || tipo.includes('ASIGNACION')) return '#3B82F6';
    if (tipo.includes('DEVOLUCION')) return '#F97316';
    if (tipo.includes('REASIGNACION')) return '#A78BFA';
    if (tipo.includes('CONSUMO') || tipo.includes('INSTALACION')) return '#94A3B8';
    return '#64748B';
  };

  const getTipoLabel = (tipo) => (tipo || '—').replace(/_/g, ' ');

  return (
    <div className="dashboard-fade-in">
      <PageHeader title="Dashboard" icon="ti-dashboard" subtitle="Resumen general del inventario" />

      {/* Stats */}
      <div className="dashboard-stats-grid">
        <StatCard icon="ti-package" label="Total Equipos" value={totalEquipos} color="var(--amber-glow)" />
        <StatCard icon="ti-building-warehouse" label="En Bodega" value={enStock} color="#22C55E" />
        <StatCard icon="ti-truck-delivery" label="En Terreno" value={enTerreno} color="#3B82F6" />
        <StatCard icon="ti-check" label="Consumidos" value={consumidos} color="#94A3B8" />
        <StatCard icon="ti-rotate-clockwise-2" label="Devueltos" value={devueltos} color="#14B8A6" />
      </div>

      <div className="dashboard-main-grid">
        {/* Equipos por bodega */}
        <Card>
          <CardHeader title="Por Bodega" icon="ti-chart-bar" />
          <div className="dashboard-bodega-list">
            {equiposPorBodega.length === 0
              ? <EmptyState icon="ti-building-warehouse" title="Sin bodegas" />
              : equiposPorBodega.map(b => (
                <div key={b.nombre} className="dashboard-bodega-item">
                  <div className="dashboard-bodega-header">
                    <span className="dashboard-bodega-name">{b.nombre}</span>
                    <span className="dashboard-bodega-total">{b.total}</span>
                  </div>
                  <div className="dashboard-progress-bar">
                    <div
                      className="dashboard-progress-fill"
                      style={{ width: `${totalEquipos > 0 ? (b.total / totalEquipos) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="dashboard-bodega-stock">
                    {b.stock} disponibles
                  </div>
                </div>
              ))
            }
          </div>
        </Card>

        {/* Movimientos recientes */}
        <Card>
          <CardHeader title="Últimos Movimientos" icon="ti-history" />
          {movRecientes.length === 0
            ? <EmptyState icon="ti-history-off" title="Sin movimientos" subtitle="No hay actividad reciente" />
            : (
              <div className="dashboard-table-container">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Material</th>
                      <th>Estado</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movRecientes.map(m => {
                      const color = getTipoColor(m.tipo_movimiento || m.tipo);
                      return (
                        <tr key={m.id}>
                          <td>
                            <span
                              className="dashboard-movimiento-badge"
                              style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
                            >
                              {getTipoLabel(m.tipo_movimiento || m.tipo)}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 500, fontSize: 13 }}>{m.material || '—'}</div>
                            {m.serial && <div className="dashboard-serial">{m.serial}</div>}
                          </td>
                          <td>
                            <div className="dashboard-estado-transition">
                              <span className="dashboard-estado-anterior">{m.estado_anterior || '—'}</span>
                              <i className="ti ti-arrow-right dashboard-arrow-icon" />
                              <span className="dashboard-estado-nuevo">{m.estado_nuevo || '—'}</span>
                            </div>
                          </td>
                          <td className="dashboard-fecha">{fmtFecha(m.created_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </Card>
      </div>
    </div>
  );
}