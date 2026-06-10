import React, { useState } from 'react';
import { http } from '../api.js';
import { Alert, Btn } from './UI.jsx';

export default function CambiarPasswordModal({ user, token, onSuccess }) {
  const [form, setForm]   = useState({ actual: '', nuevo: '', confirmar: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.actual || !form.nuevo || !form.confirmar) {
      setError('Completa todos los campos'); return;
    }
    if (form.nuevo.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres'); return;
    }
    if (form.nuevo !== form.confirmar) {
      setError('Las contraseñas no coinciden'); return;
    }
    setLoading(true); setError('');
    try {
      await http.put(`/usuarios/${user.id}/cambiar-password`, {
        password_actual: form.actual,
        password_nuevo:  form.nuevo,
      });
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg-app)',
      backgroundImage: `radial-gradient(ellipse at 20% 50%, rgba(217,119,6,0.07) 0%, transparent 60%)`,
    }}>
      <div className="fade-in" style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 20, padding: 32, width: '100%', maxWidth: 420,
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
      }}>
        {/* Ícono + título */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 14px',
            background: 'rgba(249,115,22,0.15)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(249,115,22,0.3)',
          }}>
            <i className="ti ti-lock-open" style={{ fontSize: 26, color: '#F97316' }} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
            Cambiar contraseña
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Por seguridad debes establecer una nueva contraseña antes de continuar.
          </p>
        </div>

        {error && <Alert type="error" msg={error} onClose={() => setError('')} />}

        {/* Campos */}
        {[
          ['actual',    'Contraseña temporal',  'La que te entregó el administrador'],
          ['nuevo',     'Nueva contraseña',      'Mínimo 6 caracteres'],
          ['confirmar', 'Confirmar contraseña',  'Repite la nueva contraseña'],
        ].map(([key, label, placeholder]) => (
          <div key={key} style={{ marginBottom: 14 }}>
            <label style={{
              fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.06em', color: 'var(--text-muted)',
              display: 'block', marginBottom: 6,
            }}>
              {label}
            </label>
            <div style={{ position: 'relative' }}>
              <i className="ti ti-lock" style={{
                position: 'absolute', left: 11, top: '50%',
                transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 15,
                pointerEvents: 'none',
              }} />
              <input
                type="password"
                value={form[key]}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                placeholder={placeholder}
                style={{ paddingLeft: 34 }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>
          </div>
        ))}

        <Btn
          onClick={handleSubmit}
          loading={loading}
          icon="ti-check"
          style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
        >
          Cambiar contraseña
        </Btn>
      </div>
    </div>
  );
}
