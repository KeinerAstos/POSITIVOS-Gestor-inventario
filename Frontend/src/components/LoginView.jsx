import React, { useState } from 'react';
import { http } from '../api.js';
import { Alert, Btn } from './UI.jsx';

export default function LoginView({ onLogin }) {
  const [form, setForm] = useState({ usuario: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form.usuario || !form.password) { setError('Completa todos los campos'); return; }
    setLoading(true); setError('');
    try {
      const data = await http.post('/auth/login', form);
      if (data.token) {
        localStorage.setItem('token', data.token);
        onLogin(data.user || data, data.token);
      } else throw new Error('Credenciales incorrectas');
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-app)',
      backgroundImage: `radial-gradient(ellipse at 20% 50%, rgba(217,119,6,0.07) 0%, transparent 60%),
                        radial-gradient(ellipse at 80% 20%, rgba(59,130,246,0.05) 0%, transparent 50%)`,
    }}>
      {/* Grid pattern overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: `linear-gradient(rgba(148,163,184,0.03) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(148,163,184,0.03) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }} />

      <div className="fade-in" style={{ width: '100%', maxWidth: 400, padding: '0 20px', position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: 'linear-gradient(135deg, #D97706, #F59E0B)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 0 40px rgba(217,119,6,0.4)',
          }}>
            <i className="ti ti-building-warehouse" style={{ fontSize: 32, color: '#0F172A' }} />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>BodegaOps</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Gestión de inventario multi-bodega</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 20, padding: '32px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 24 }}>Iniciar sesión</h2>

          {error && <Alert type="error" msg={error} onClose={() => setError('')} />}

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Usuario
            </label>
            <div style={{ position: 'relative' }}>
              <i className="ti ti-user" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 15, pointerEvents: 'none' }} />
              <input
                value={form.usuario}
                onChange={e => setForm(p => ({ ...p, usuario: e.target.value }))}
                placeholder="Tu nombre de usuario"
                style={{ paddingLeft: 34 }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <i className="ti ti-lock" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 15, pointerEvents: 'none' }} />
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
                style={{ paddingLeft: 34 }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>
          </div>

          <Btn onClick={handleSubmit} loading={loading} style={{ width: '100%', justifyContent: 'center', padding: '11px' }}>
            Ingresar al sistema
          </Btn>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 20 }}>
          Sistema de gestión de inventario · v1.0
        </p>
      </div>
    </div>
  );
}
