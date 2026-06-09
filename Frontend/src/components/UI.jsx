import React from 'react';
import { ESTADO_META } from '../api.js';
import '../styles/UI.css';

// ─── Badge ────────────────────────────────────────────────────────────────────
export function Badge({ v, children }) {
  const meta = ESTADO_META[v] || { label: v || children || '—', color: '#A1ADAD', bg: 'rgba(161,173,173,0.12)' };
  const label = children || meta.label;
  return (
    <span className="badge" style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30` }}>
      {label}
    </span>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
export function Btn({ children, onClick, variant = 'primary', size = 'md', disabled, loading, icon, className = '', style = {} }) {
  const variantClass = `btn-${variant}`;
  const sizeClass = `btn-${size}`;
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`btn ${variantClass} ${sizeClass} ${loading ? 'btn-loading' : ''} ${className}`}
      style={style}
    >
      {loading
        ? <><i className="ti ti-loader spin" style={{ fontSize: 14 }} /> Procesando...</>
        : <>{icon && <i className={`ti ${icon}`} style={{ fontSize: 15 }} />}{children}</>
      }
    </button>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, style = {}, className = '' }) {
  return (
    <div className={`card ${className}`} style={style}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, actions, icon }) {
  return (
    <div className="card-header">
      <div className="card-header-content">
        {icon && <i className={`ti ${icon} card-header-icon`} />}
        <div>
          <div className="card-header-title">{title}</div>
          {subtitle && <div className="card-header-subtitle">{subtitle}</div>}
        </div>
      </div>
      {actions && <div className="card-header-actions">{actions}</div>}
    </div>
  );
}

// ─── Alert ────────────────────────────────────────────────────────────────────
export function Alert({ type = 'info', msg, onClose }) {
  return (
    <div className={`alert alert-${type}`}>
      <i className={`ti ${type === 'success' ? 'ti-circle-check' : type === 'error' ? 'ti-alert-circle' : type === 'warning' ? 'ti-alert-triangle' : 'ti-info-circle'} alert-icon`} />
      <span className="alert-message">{msg}</span>
      {onClose && (
        <button onClick={onClose} className="alert-close">×</button>
      )}
    </div>
  );
}

// ─── Label ────────────────────────────────────────────────────────────────────
export function Label({ children, required }) {
  return (
    <label className="label">
      {children}{required && <span className="label-required">*</span>}
    </label>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
export function StatCard({ icon, label, value, color = '#10D451', sub }) {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <div className="stat-icon-wrapper" style={{ background: `${color}18` }}>
          <i className={`ti ${icon} stat-icon`} style={{ color }} />
        </div>
        {sub && <span className="stat-sub">{sub}</span>}
      </div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────
export function EmptyState({ icon = 'ti-inbox', title = 'Sin datos', subtitle }) {
  return (
    <div className="empty-state">
      <i className={`ti ${icon} empty-icon`} />
      <div className="empty-title">{title}</div>
      {subtitle && <div className="empty-subtitle">{subtitle}</div>}
    </div>
  );
}

// ─── Loading ─────────────────────────────────────────────────────────────────
export function Loading({ text = 'Cargando...' }) {
  return (
    <div className="loading-container">
      <i className="ti ti-loader loading-spinner" />
      <span className="loading-text">{text}</span>
    </div>
  );
}

// ─── SearchInput ─────────────────────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = 'Buscar...', style = {} }) {
  return (
    <div className="search-input-wrapper" style={style}>
      <i className="ti ti-search search-icon" />
      <input value={value} onChange={onChange} placeholder={placeholder} className="search-input" />
    </div>
  );
}

// ─── Dropdown suggestion list ─────────────────────────────────────────────────
export function DropdownList({ items, onSelect, renderItem, style = {} }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="dropdown-list" style={style}>
      {items.map((item, i) => (
        <div
          key={item.id ?? i}
          onClick={() => onSelect(item)}
          className="dropdown-item"
        >
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
}

// ─── Page header ─────────────────────────────────────────────────────────────
export function PageHeader({ title, icon, subtitle, actions }) {
  return (
    <div className="page-header">
      <div className="page-header-left">
        {icon && (
          <div className="page-header-icon-wrapper">
            <i className={`ti ${icon} page-header-icon`} />
          </div>
        )}
        <div>
          <h2 className="page-header-title">{title}</h2>
          {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export function Pagination({ page, totalPages, total, onPage }) {
  if (totalPages <= 1) return null;
  return (
    <div className="pagination">
      <span className="pagination-info">Página {page} de {totalPages} · {total} registros</span>
      <div className="pagination-buttons">
        <Btn variant="ghost" size="sm" disabled={page === 1} onClick={() => onPage(page - 1)} icon="ti-chevron-left">Anterior</Btn>
        <Btn variant="ghost" size="sm" disabled={page === totalPages} onClick={() => onPage(page + 1)}>Siguiente <i className="ti ti-chevron-right" style={{ fontSize: 13 }} /></Btn>
      </div>
    </div>
  );
}

// ─── Objetos de estilo para tablas y tarjetas (usados en SalidaView y otros) ───
// Mantenemos estos objetos por compatibilidad con componentes existentes (SalidaView)
export const CARD = {
  background: 'var(--bg-card, #FFFFFF)',
  border: '1px solid var(--border, rgba(161,173,173,0.2))',
  borderRadius: 'var(--radius-lg, 14px)',
  overflow: 'hidden',
};

export const TH = {
  textAlign: 'left',
  padding: '12px',
  borderBottom: '1px solid var(--border, rgba(161,173,173,0.2))',
  fontWeight: 600,
  fontSize: 12,
  color: 'var(--text-secondary, #5A6B7A)',
};

export const TD = {
  padding: '12px',
  borderBottom: '1px solid var(--border, rgba(161,173,173,0.2))',
  fontSize: 13,
  color: 'var(--text-primary, #1E2A3A)',
};

export const LBL = {
  display: 'block',
  marginBottom: 4,
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--text-muted, #6B7A8A)',
};