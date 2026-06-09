import React from 'react';
import '../styles/Sidebar.css';
import logoEmpresa from '../assets/logo.png';

const normalizarRol = (valor = '') => {
  return String(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
};

const NAV_ITEMS = [
  {
    id: 'dashboard',
    icon: 'ti-dashboard',
    label: 'Dashboard',
    group: 'general',
    roles: ['ADMIN', 'BODEGA', 'SUPERVISOR'],
  },
  {
    id: 'inventario',
    icon: 'ti-package',
    label: 'Inventario',
    group: 'general',
    roles: ['ADMIN', 'BODEGA', 'SUPERVISOR'],
  },
  {
    id: 'tecnico',
    icon: 'ti-tool',
    label: 'Mis Equipos',
    group: 'general',
    roles: ['TECNICO'],
  },
  {
    id: 'control-calidad',
    icon: 'ti-shield-check',
    label: 'Control de Calidad',
    group: 'general',
    roles: ['CONTROL_CALIDAD'],
  },
  {
    id: 'ot-dashboard',
    icon: 'ti-file-invoice',
    label: 'Dashboard OT',
    group: 'operaciones',
    roles: ['ADMIN', 'BODEGA', 'SUPERVISOR'],
  },
  {
    id: 'asignacion',
    icon: 'ti-truck-delivery',
    label: 'Entrega a Técnico',
    group: 'operaciones',
    roles: ['ADMIN', 'BODEGA'],
  },
  {
    id: 'devolucion',
    icon: 'ti-rotate-clockwise-2',
    label: 'Devolución',
    group: 'operaciones',
    roles: ['ADMIN', 'BODEGA'],
  },
  {
    id: 'reasignacion-ot',
    icon: 'ti-switch-horizontal',
    label: 'Reasignar OT',
    group: 'operaciones',
    roles: ['ADMIN', 'BODEGA'],
  },
  {
    id: 'salidas',
    icon: 'ti-truck',
    label: 'Salidas',
    group: 'operaciones',
    roles: ['ADMIN', 'BODEGA'],
  },
  {
    id: 'movimientos',
    icon: 'ti-history',
    label: 'Movimientos',
    group: 'reportes',
    roles: ['ADMIN', 'BODEGA', 'SUPERVISOR'],
  },
  {
    id: 'reasignaciones',
    icon: 'ti-arrows-exchange',
    label: 'Historial Reasig.',
    group: 'reportes',
    roles: ['ADMIN', 'BODEGA', 'SUPERVISOR'],
  },
  {
    id: 'bodegas',
    icon: 'ti-building-warehouse',
    label: 'Bodegas',
    group: 'config',
    roles: ['ADMIN'],
  },
  {
    id: 'ot',
    icon: 'ti-clipboard-list',
    label: 'Órdenes de Trabajo',
    group: 'config',
    roles: ['ADMIN', 'BODEGA'],
  },
  {
    id: 'carga-masiva',
    icon: 'ti-upload',
    label: 'Carga Masiva',
    group: 'config',
    roles: ['ADMIN'],
  },
];

const GROUPS = {
  general: 'General',
  operaciones: 'Operaciones',
  reportes: 'Reportes',
  config: 'Configuración',
};

export default function Sidebar({ view, setView, user, onLogout, collapsed, setCollapsed }) {
  const rol = normalizarRol(user?.rol || user?.tipo || user?.tipo_usuario || user?.role || '');

  const visibleItems = NAV_ITEMS.filter(item => {
    return item.roles.includes(rol);
  });

  const groups = [...new Set(visibleItems.map(i => i.group))];

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}>
      {/* Logo */}
      <div className={`sidebar-logo ${collapsed ? 'sidebar-logo-collapsed' : ''}`}>
        {!collapsed ? (
          <>
            <div className="logo-content">
              <div className="logo-white-box">
                <img src={logoEmpresa} alt="Logo" className="logo-image" />
              </div>
              <div className="logo-text-wrapper">
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
            <div className="logo-white-box collapsed">
              <img src={logoEmpresa} alt="Logo" className="logo-image" />
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

            {visibleItems
              .filter(i => i.group === group)
              .map(item => {
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
              <div className="user-role">{rol || 'ADMIN'}</div>
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