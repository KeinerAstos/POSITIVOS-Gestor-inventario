import React from 'react';
import '../styles/Sidebar.css';

const NAV_ITEMS = [
  { id: 'dashboard',      icon: 'ti-dashboard',         label: 'Dashboard',          group: 'general' },
  { id: 'inventario',     icon: 'ti-package',           label: 'Inventario',         group: 'general' },
  { id: 'ot-dashboard',   icon: 'ti-file-invoice',      label: 'Dashboard OT',       group: 'operaciones' },
  { id: 'asignacion',     icon: 'ti-truck-delivery',    label: 'Entrega a Técnico',  group: 'operaciones' },
  { id: 'devolucion',     icon: 'ti-rotate-clockwise-2',label: 'Devolución',          group: 'operaciones' },
  { id: 'reasignacion-ot',icon: 'ti-switch-horizontal', label: 'Reasignar OT',       group: 'operaciones' },
  { id: 'salidas',        icon: 'ti-truck',             label: 'Salidas',            group: 'operaciones' },
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
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}>
      {/* Logo */}
      <div className={`sidebar-logo ${collapsed ? 'sidebar-logo-collapsed' : ''}`}>
        {!collapsed ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="logo-icon">
                <i className="ti ti-building-warehouse" />
              </div>
              <div>
                <div className="logo-text">Positivo S+</div>
                <div className="logo-sub">Inventario</div>
              </div>
            </div>
            <button onClick={() => setCollapsed(true)} className="collapse-btn">
              <i className="ti ti-layout-sidebar-left-collapse collapse-btn-icon" />
            </button>
          </>
        ) : (
          <>
            <div className="logo-icon">
              <i className="ti ti-building-warehouse" />
            </div>
            <button onClick={() => setCollapsed(false)} className="expand-btn">
              <i className="ti ti-layout-sidebar-right-collapse expand-btn-icon" />
            </button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className={`sidebar-nav ${collapsed ? 'sidebar-nav-collapsed' : 'sidebar-nav-expanded'}`}>
        {groups.map(group => (
          <div key={group} className="nav-group">
            {!collapsed && (
              <div className="nav-group-title">
                {GROUPS[group]}
              </div>
            )}
            {collapsed && <div className="nav-spacer" />}
            {NAV_ITEMS.filter(i => i.group === group).map(item => {
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`nav-item ${collapsed ? 'nav-item-collapsed' : 'nav-item-expanded'} ${active ? 'nav-item-active' : 'nav-item-inactive'}`}
                >
                  <i className={`ti ${item.icon} nav-icon`} />
                  {!collapsed && item.label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className={`sidebar-footer ${collapsed ? 'sidebar-footer-collapsed' : 'sidebar-footer-expanded'}`}>
        <div className="user-avatar">
          <i className="ti ti-user" />
        </div>
        {!collapsed && (
          <>
            <div className="user-info">
              <div className="user-name">{user?.nombre || 'Usuario'}</div>
              <div className="user-role">{user?.rol || 'admin'}</div>
            </div>
            <button onClick={onLogout} title="Cerrar sesión" className="logout-btn">
              <i className="ti ti-logout logout-icon" />
            </button>
          </>
        )}
      </div>
    </aside>
  );
}