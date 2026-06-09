import React from 'react';

const NAV_ITEMS = [
  { id: 'dashboard',      icon: 'ti-dashboard',         label: 'Dashboard',          group: 'general' },
  { id: 'inventario',     icon: 'ti-package',           label: 'Inventario',         group: 'general' },
  { id: 'ot-dashboard',   icon: 'ti-file-invoice',      label: 'Dashboard OT',       group: 'operaciones' },
  { id: 'asignacion',     icon: 'ti-truck-delivery',    label: 'Entrega a Técnico',  group: 'operaciones' },
  { id: 'devolucion',     icon: 'ti-rotate-clockwise-2',label: 'Devolución',          group: 'operaciones' },
  { id: 'reasignacion-ot',icon: 'ti-switch-horizontal', label: 'Reasignar OT',       group: 'operaciones' },
  { id: 'movimientos',    icon: 'ti-history',           label: 'Movimientos',        group: 'reportes' },
  { id: 'reasignaciones', icon: 'ti-arrows-exchange',   label: 'Historial Reasig.',  group: 'reportes' },
  { id: 'bodegas',        icon: 'ti-building-warehouse',label: 'Bodegas',            group: 'config' },
  { id: 'ot',             icon: 'ti-clipboard-list',    label: 'Órdenes de Trabajo', group: 'config' },
  { id: 'carga-masiva',   icon: 'ti-upload',            label: 'Carga Masiva',       group: 'config' },
];

const GROUPS = {
  general:     'General',
  operaciones: 'Operaciones',
  reportes:    'Reportes',
  config:      'Configuración',
};

export default function Sidebar({ view, setView, user, onLogout, collapsed, setCollapsed }) {
  const groups = [...new Set(NAV_ITEMS.map(i => i.group))];

  return (
    <aside style={{
      width: collapsed ? 64 : 240,
      flexShrink: 0,
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
      overflow: 'hidden',
      zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{
        padding: collapsed ? '18px 0' : '18px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        justifyContent: collapsed ? 'center' : 'space-between',
        minHeight: 64,
      }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'linear-gradient(135deg, #D97706, #F59E0B)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, boxShadow: '0 0 16px rgba(217,119,6,0.4)'
            }}>
              <i className="ti ti-building-warehouse" style={{ fontSize: 18, color: '#0F172A' }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>BodegaOps</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Multi-bodega</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, #D97706, #F59E0B)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(217,119,6,0.4)'
          }}>
            <i className="ti ti-building-warehouse" style={{ fontSize: 18, color: '#0F172A' }} />
          </div>
        )}
        {!collapsed && (
          <button onClick={() => setCollapsed(true)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: 4, borderRadius: 6,
            display: 'flex', alignItems: 'center'
          }}>
            <i className="ti ti-layout-sidebar-left-collapse" style={{ fontSize: 18 }} />
          </button>
        )}
      </div>

      {/* Collapse button when collapsed */}
      {collapsed && (
        <button onClick={() => setCollapsed(false)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', padding: '10px 0', display: 'flex',
          alignItems: 'center', justifyContent: 'center'
        }}>
          <i className="ti ti-layout-sidebar-right-collapse" style={{ fontSize: 18 }} />
        </button>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: collapsed ? '8px 8px' : '12px 10px', overflowY: 'auto', overflowX: 'hidden' }}>
        {groups.map(group => (
          <div key={group} style={{ marginBottom: 8 }}>
            {!collapsed && (
              <div style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: 'var(--text-muted)',
                padding: '6px 8px 4px', marginTop: 4
              }}>
                {GROUPS[group]}
              </div>
            )}
            {collapsed && <div style={{ height: 8 }} />}
            {NAV_ITEMS.filter(i => i.group === group).map(item => {
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  title={collapsed ? item.label : undefined}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: collapsed ? '9px' : '8px 10px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    background: active
                      ? 'linear-gradient(135deg, rgba(217,119,6,0.2), rgba(245,158,11,0.1))'
                      : 'transparent',
                    color: active ? 'var(--amber-glow)' : 'var(--text-secondary)',
                    fontWeight: active ? 600 : 400,
                    fontSize: 13,
                    marginBottom: 2,
                    transition: 'all 0.15s',
                    borderLeft: active ? '2px solid var(--amber-glow)' : '2px solid transparent',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <i className={`ti ${item.icon}`} style={{ fontSize: 17, flexShrink: 0 }} />
                  {!collapsed && item.label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div style={{
        padding: collapsed ? '12px 8px' : '12px 14px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(217,119,6,0.3), rgba(245,158,11,0.2))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid rgba(217,119,6,0.3)'
        }}>
          <i className="ti ti-user" style={{ fontSize: 15, color: 'var(--amber-glow)' }} />
        </div>
        {!collapsed && (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.nombre || 'Usuario'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.tipo || 'admin'}</div>
            </div>
            <button onClick={onLogout} title="Cerrar sesión" style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: 4, borderRadius: 6
            }}>
              <i className="ti ti-logout" style={{ fontSize: 16 }} />
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
