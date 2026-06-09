import React, { useState, useEffect, useCallback } from 'react';
import { http } from './api.js';

import LoginView    from './components/LoginView.jsx';
import Sidebar      from './components/Sidebar.jsx';
import DashboardView from './components/DashboardView.jsx';
import InventarioView from './components/InventarioView.jsx';
import AsignacionView from './components/AsignacionView.jsx';
import TecnicoView  from './components/TecnicoView.jsx';
import FormularioActaQA from './components/FormularioActaQA.jsx';

import {
  DevolucionView,
  ReasignacionOTView,
  MovimientosView,
  ReasignacionesView,
  BodegasView,
  OtsView,
  OTDashboardView,
  ControlCalidadView,
  CargaMasivaView,
} from './components/Views.jsx';

// ─── Topbar ───────────────────────────────────────────────────────
function Topbar({ view, user, collapsed }) {
  const VIEW_LABELS = {
    dashboard: 'Dashboard', inventario: 'Inventario', 'ot-dashboard': 'Dashboard OT',
    asignacion: 'Entrega a Técnico', devolucion: 'Devolución', 'reasignacion-ot': 'Reasignar OT',
    movimientos: 'Movimientos', reasignaciones: 'Historial Reasignaciones',
    bodegas: 'Bodegas', ot: 'Órdenes de Trabajo', 'carga-masiva': 'Carga Masiva',
    'control-calidad': 'Control de Calidad QA', 'tecnico': 'Vista Técnico',
  };
  return (
    <div style={{
      height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', borderBottom: '1px solid var(--border)',
      background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(8px)',
      position: 'sticky', top: 0, zIndex: 40,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber-glow)' }} className="pulse" />
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          {VIEW_LABELS[view] || view}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--text-muted)' }}>
        <i className="ti ti-server" style={{ fontSize: 14 }} />
        <span>localhost:3000</span>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }} />
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]         = useState(null);
  const [token, setToken]       = useState(null);
  const [view, setView]         = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);

  // Data stores
  const [bodegas, setBodegas]     = useState([]);
  const [inv, setInv]             = useState([]);
  const [mov, setMov]             = useState([]);
  const [ots, setOts]             = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [tecnicos, setTecnicos]   = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  /* ── restore session ── */
  useEffect(() => {
    const t = localStorage.getItem('token');
    const u = localStorage.getItem('user');
    if (t && u) {
      try { setToken(t); setUser(JSON.parse(u)); }
      catch { localStorage.clear(); }
    }
  }, []);

  /* ── load all data ── */
  const loadAll = useCallback(async () => {
    if (!token) return;
    setDataLoading(true);
    try {
      const [b, i, m, o, mat, tec] = await Promise.allSettled([
        http.get('/bodegas'),
        http.get('/inventario'),
        http.get('/movimientos?limit=50'),
        http.get('/ot'),
        http.get('/materiales'),
        http.get('/usuarios?rol=tecnico'),
      ]);
      if (b.status === 'fulfilled') setBodegas(Array.isArray(b.value) ? b.value : []);
      if (i.status === 'fulfilled') setInv(Array.isArray(i.value) ? i.value : []);
      if (m.status === 'fulfilled') setMov(Array.isArray(m.value?.data) ? m.value.data : Array.isArray(m.value) ? m.value : []);
      if (o.status === 'fulfilled') setOts(Array.isArray(o.value?.data) ? o.value.data : Array.isArray(o.value) ? o.value : []);
      if (mat.status === 'fulfilled') setMateriales(Array.isArray(mat.value) ? mat.value : []);
      if (tec.status === 'fulfilled') {
        const list = Array.isArray(tec.value?.data) ? tec.value.data : Array.isArray(tec.value) ? tec.value : [];
        setTecnicos(list);
      }
    } catch (err) { console.error('Error cargando datos:', err); }
    finally { setDataLoading(false); }
  }, [token]);

  useEffect(() => { if (token) loadAll(); }, [token]);

  /* ── auth handlers ── */
  const handleLogin = (u, t) => {
    setUser(u); setToken(t);
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
    window.CURRENT_USER_ID = u?.id;
    // Redirigir según rol
    if (u?.rol === 'tecnico') setView('tecnico');
    else setView('dashboard');
  };

  const handleLogout = () => {
    setUser(null); setToken(null);
    localStorage.clear();
    setView('dashboard');
    setBodegas([]); setInv([]); setMov([]); setOts([]); setMateriales([]); setTecnicos([]);
  };

  if (!user || !token) return <LoginView onLogin={handleLogin} />;

  /* ── props comunes ── */
  const common = { bodegas, inv, ots, materiales, tecnicos, refresh: loadAll };

  /* ── render view ── */
  const renderView = () => {
    switch (view) {
      case 'dashboard':       return <DashboardView {...{ bodegas, inv, mov }} />;
      case 'inventario':      return <InventarioView {...common} />;
      case 'ot-dashboard':    return <OTDashboardView {...{ ots, inv, refresh: loadAll }} />;
      case 'asignacion':      return <AsignacionView {...common} />;
      case 'devolucion':      return <DevolucionView {...{ inv, refresh: loadAll }} />;
      case 'reasignacion-ot': return <ReasignacionOTView {...{ inv, ots, refresh: loadAll }} />;
      case 'movimientos':     return <MovimientosView />;
      case 'reasignaciones':  return <ReasignacionesView />;
      case 'bodegas':         return <BodegasView {...{ bodegas, inv, refresh: loadAll }} />;
      case 'ot':              return <OtsView {...{ ots, refresh: loadAll }} />;
      case 'carga-masiva':    return <CargaMasivaView {...{ bodegas, materiales, refresh: loadAll }} />;
      case 'control-calidad': return <ControlCalidadView token={token} />;
      case 'tecnico':         return <TecnicoView {...{ user, token, refresh: loadAll }} />;
      default:                return <DashboardView {...{ bodegas, inv, mov }} />;
    }
  };

  /* ── nav guard: técnico solo ve su vista ── */
  const handleSetView = (v) => {
    if (user?.rol === 'tecnico' && v !== 'tecnico') return;
    setView(v);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <Sidebar
        view={view}
        setView={handleSetView}
        user={user}
        onLogout={handleLogout}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar view={view} user={user} collapsed={collapsed} />

        {/* Content */}
        <main style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          background: 'var(--bg-app)',
          backgroundImage: `radial-gradient(ellipse at 80% 0%, rgba(217,119,6,0.04) 0%, transparent 60%)`,
        }}>
          {dataLoading && inv.length === 0 && bodegas.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
              <i className="ti ti-loader spin" style={{ fontSize: 32, color: 'var(--amber-glow)' }} />
              <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Cargando datos del sistema...</span>
            </div>
          ) : (
            renderView()
          )}
        </main>

        {/* Footer */}
        <div style={{
          height: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', borderTop: '1px solid var(--border)',
          fontSize: 11, color: 'var(--text-muted)',
          background: 'rgba(15,23,42,0.8)',
        }}>
          <span>BodegaOps v1.0 · Sistema de Inventario Multi-Bodega</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-circle-check" style={{ color: '#22C55E', fontSize: 12 }} />
            {bodegas.length} bodegas · {inv.length} equipos
          </span>
        </div>
      </div>
    </div>
  );
}
