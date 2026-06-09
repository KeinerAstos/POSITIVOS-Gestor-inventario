export const API_BASE = '/api';

export const ESTADOS = {
  STOCK: 'STOCK',
  INGRESADO: 'INGRESADO',
  TERRENO: 'TERRENO',
  CONSUMO: 'CONSUMO',
  DEVUELTO: 'DEVUELTO',
};

export const ESTADO_META = {
  STOCK:     { label: 'Stock',      color: '#22C55E', bg: 'rgba(34,197,94,0.12)',   icon: 'ti-building-warehouse' },
  INGRESADO: { label: 'Ingresado',  color: '#F97316', bg: 'rgba(249,115,22,0.12)',  icon: 'ti-file-invoice' },
  TERRENO:   { label: 'En Terreno', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  icon: 'ti-truck-delivery' },
  CONSUMO:   { label: 'Consumido',  color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', icon: 'ti-check' },
  DEVUELTO:  { label: 'Devuelto',   color: '#14B8A6', bg: 'rgba(20,184,166,0.12)',  icon: 'ti-rotate-clockwise-2' },
};

export const http = {
  async get(path) {
    const token = localStorage.getItem('token');
    const res = await fetch(API_BASE + path, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Error de servidor');
    }
    return res.json();
  },
  async post(path, body) {
    const token = localStorage.getItem('token');
    const res = await fetch(API_BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Error de servidor');
    }
    return res.json();
  },
  async put(path, body) {
    const token = localStorage.getItem('token');
    const res = await fetch(API_BASE + path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Error de servidor');
    }
    return res.json();
  }
};

export const fmtFecha = (f) => {
  if (!f) return '—';
  try { return new Date(f).toLocaleDateString('es-CO', { day:'2-digit', month:'2-digit', year:'numeric' }); }
  catch { return '—'; }
};

export const fmtFechaHora = (f) => {
  if (!f) return '—';
  try { return new Date(f).toLocaleString('es-CO', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
  catch { return '—'; }
};
