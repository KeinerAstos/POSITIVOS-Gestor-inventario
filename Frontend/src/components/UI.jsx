import React from 'react';
import { ESTADO_META } from '../api.js';

// ─── Badge ────────────────────────────────────────────────────────────────────
export function Badge({ v, children }) {
  const meta = ESTADO_META[v] || { label: v || children || '—', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' };
  const label = children || meta.label;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: meta.bg, color: meta.color, whiteSpace: 'nowrap',
      border: `1px solid ${meta.color}30`
    }}>
      {label}
    </span>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
const BTN_VARIANTS = {
  primary: {
    background: 'linear-gradient(135deg, #D97706, #F59E0B)',
    color: '#0F172A', border: 'none',
    shadow: '0 2px 8px rgba(217,119,6,0.35)'
  },
  secondary: {
    background: 'transparent', color: '#94A3B8',
    border: '1px solid rgba(148,163,184,0.2)', shadow: 'none'
  },
  danger: {
    background: 'rgba(239,68,68,0.12)', color: '#EF4444',
    border: '1px solid rgba(239,68,68,0.2)', shadow: 'none'
  },
  success: {
    background: 'rgba(34,197,94,0.12)', color: '#22C55E',
    border: '1px solid rgba(34,197,94,0.2)', shadow: 'none'
  },
  ghost: {
    background: 'rgba(248,250,252,0.05)', color: '#F1F5F9',
    border: '1px solid rgba(148,163,184,0.15)', shadow: 'none'
  }
};

export function Btn({ children, onClick, variant = 'primary', size = 'md', disabled, loading, icon, style = {} }) {
  const v = BTN_VARIANTS[variant] || BTN_VARIANTS.primary;
  const sz = size === 'sm' ? { padding: '5px 12px', fontSize: 12 }
           : size === 'lg' ? { padding: '11px 24px', fontSize: 15 }
           : { padding: '7px 16px', fontSize: 13 };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontFamily: 'inherit', fontWeight: 600, borderRadius: 8, cursor: 'pointer',
        transition: 'all 0.15s', opacity: (disabled || loading) ? 0.5 : 1,
        boxShadow: v.shadow, whiteSpace: 'nowrap',
        ...v, ...sz, ...style
      }}
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
    <div className={className} style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      ...style
    }}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, actions, icon }) {
  return (
    <div style={{
      padding: '14px 18px', borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'rgba(255,255,255,0.02)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {icon && <i className={`ti ${icon}`} style={{ fontSize: 17, color: 'var(--amber-glow)' }} />}
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{subtitle}</div>}
        </div>
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>}
    </div>
  );
}

// ─── Alert ────────────────────────────────────────────────────────────────────
const ALERT_META = {
  success: { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', color: '#22C55E', icon: 'ti-circle-check' },
  error:   { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', color: '#EF4444', icon: 'ti-alert-circle' },
  warning: { bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)', color: '#F97316', icon: 'ti-alert-triangle' },
  info:    { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)', color: '#3B82F6', icon: 'ti-info-circle' },
};

export function Alert({ type = 'info', msg, onClose }) {
  const m = ALERT_META[type] || ALERT_META.info;
  return (
    <div className="fade-in" style={{
      padding: '10px 14px', borderRadius: 10, marginBottom: 16,
      background: m.bg, border: `1px solid ${m.border}`, color: m.color,
      display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, fontWeight: 500
    }}>
      <i className={`ti ${m.icon}`} style={{ fontSize: 16, marginTop: 1, flexShrink: 0 }} />
      <span style={{ flex: 1, lineHeight: 1.5 }}>{msg}</span>
      {onClose && (
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: m.color, fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
      )}
    </div>
  );
}

// ─── Label ────────────────────────────────────────────────────────────────────
export function Label({ children, required }) {
  return (
    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {children}{required && <span style={{ color: '#EF4444', marginLeft: 3 }}>*</span>}
    </label>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
export function StatCard({ icon, label, value, color = 'var(--amber-glow)', sub }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '18px 20px',
      display: 'flex', flexDirection: 'column', gap: 8
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <i className={`ti ${icon}`} style={{ fontSize: 20, color }} />
        </div>
        {sub && <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 20 }}>{sub}</span>}
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────
export function EmptyState({ icon = 'ti-inbox', title = 'Sin datos', subtitle }) {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
      <i className={`ti ${icon}`} style={{ fontSize: 40, marginBottom: 12, display: 'block', opacity: 0.5 }} />
      <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12 }}>{subtitle}</div>}
    </div>
  );
}

// ─── Loading ─────────────────────────────────────────────────────────────────
export function Loading({ text = 'Cargando...' }) {
  return (
    <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
      <i className="ti ti-loader spin" style={{ fontSize: 28, display: 'block', marginBottom: 10, color: 'var(--amber-glow)' }} />
      <span style={{ fontSize: 13 }}>{text}</span>
    </div>
  );
}

// ─── SearchInput ─────────────────────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = 'Buscar...', style = {} }) {
  return (
    <div style={{ position: 'relative', ...style }}>
      <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 15, pointerEvents: 'none' }} />
      <input value={value} onChange={onChange} placeholder={placeholder} style={{ paddingLeft: 32 }} />
    </div>
  );
}

// ─── Dropdown suggestion list ─────────────────────────────────────────────────
export function DropdownList({ items, onSelect, renderItem, style = {} }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
      background: '#1a2744', border: '1px solid var(--border-strong)',
      borderRadius: 10, boxShadow: 'var(--shadow-lg)', zIndex: 200,
      maxHeight: 260, overflowY: 'auto', ...style
    }}>
      {items.map((item, i) => (
        <div
          key={item.id ?? i}
          onClick={() => onSelect(item)}
          style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(217,119,6,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
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
    <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {icon && (
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(217,119,6,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(217,119,6,0.25)' }}>
            <i className={`ti ${icon}`} style={{ fontSize: 22, color: 'var(--amber-glow)' }} />
          </div>
        )}
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h2>
          {subtitle && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</p>}
        </div>
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export function Pagination({ page, totalPages, total, onPage }) {
  if (totalPages <= 1) return null;
  return (
    <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Página {page} de {totalPages} · {total} registros</span>
      <div style={{ display: 'flex', gap: 6 }}>
        <Btn variant="ghost" size="sm" disabled={page === 1} onClick={() => onPage(page - 1)} icon="ti-chevron-left">Anterior</Btn>
        <Btn variant="ghost" size="sm" disabled={page === totalPages} onClick={() => onPage(page + 1)}>Siguiente <i className="ti ti-chevron-right" style={{ fontSize: 13 }} /></Btn>
      </div>
    </div>
  );
}
