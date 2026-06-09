import React from 'react';
import { fmtFecha } from '../api.js';
import { StatCard, Card, CardHeader, EmptyState, Badge, PageHeader } from './UI.jsx';

export default function DashboardView({ bodegas = [], inv = [], mov = [] }) {
  const totalEquipos    = inv.length;
  const enStock         = inv.filter(i => i.estado === 'STOCK' || i.estado === 'INGRESADO').length;
  const enTerreno       = inv.filter(i => i.estado === 'TERRENO').length;
  const consumidos      = inv.filter(i => i.estado === 'CONSUMO').length;
  const devueltos       = inv.filter(i => i.estado === 'DEVUELTO').length;
  const movRecientes    = Array.isArray(mov) ? mov.slice(0, 12) : [];

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
    <div className="fade-in">
      <PageHeader title="Dashboard" icon="ti-dashboard" subtitle="Resumen general del inventario" />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        <StatCard icon="ti-package" label="Total Equipos" value={totalEquipos} color="var(--amber-glow)" />
        <StatCard icon="ti-building-warehouse" label="En Bodega" value={enStock} color="#22C55E" />
        <StatCard icon="ti-truck-delivery" label="En Terreno" value={enTerreno} color="#3B82F6" />
        <StatCard icon="ti-check" label="Consumidos" value={consumidos} color="#94A3B8" />
        <StatCard icon="ti-rotate-clockwise-2" label="Devueltos" value={devueltos} color="#14B8A6" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
        {/* Equipos por bodega */}
        <Card>
          <CardHeader title="Por Bodega" icon="ti-chart-bar" />
          <div style={{ padding: '16px' }}>
            {equiposPorBodega.length === 0
              ? <EmptyState icon="ti-building-warehouse" title="Sin bodegas" />
              : equiposPorBodega.map(b => (
                <div key={b.nombre} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{b.nombre}</span>
                    <span style={{ fontSize: 12, color: 'var(--amber-glow)', fontWeight: 600 }}>{b.total}</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 99,
                      width: `${totalEquipos > 0 ? (b.total / totalEquipos) * 100 : 0}%`,
                      background: 'linear-gradient(90deg, #D97706, #F59E0B)',
                      transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
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
              <div style={{ overflowX: 'auto' }}>
                <table>
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
                            <span style={{
                              display: 'inline-block', padding: '3px 9px',
                              borderRadius: 20, fontSize: 10, fontWeight: 600,
                              background: `${color}18`, color,
                              border: `1px solid ${color}30`
                            }}>
                              {getTipoLabel(m.tipo_movimiento || m.tipo)}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 500, fontSize: 13 }}>{m.material || '—'}</div>
                            {m.serial && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{m.serial}</div>}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                              <span style={{ color: '#F97316' }}>{m.estado_anterior || '—'}</span>
                              <i className="ti ti-arrow-right" style={{ fontSize: 10, color: 'var(--text-muted)' }} />
                              <span style={{ color: '#22C55E' }}>{m.estado_nuevo || '—'}</span>
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{fmtFecha(m.created_at)}</td>
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
