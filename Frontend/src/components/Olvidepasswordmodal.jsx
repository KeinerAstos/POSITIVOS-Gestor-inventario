import React, { useState } from 'react';
import { http } from '../api.js';
import { Alert, Btn } from './UI.jsx';

// Tres pasos: ingresar cédula → mostrar resultado → cerrar
const STEP = { CEDULA: 'cedula', ENVIADO: 'enviado' };

export default function OlvidePasswordModal({ onClose }) {
  const [step, setStep]       = useState(STEP.CEDULA);
  const [cedula, setCedula]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [nombre, setNombre]   = useState('');

  // Overlay cierra con Escape
  React.useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const handleSolicitar = async () => {
    if (!cedula.trim()) { setError('Ingresa tu número de cédula'); return; }
    setLoading(true); setError('');
    try {
      const data = await http.post('/auth/forgot-password', { cedula: cedula.trim() });
      setNombre(data.nombre || 'usuario');
      setStep(STEP.ENVIADO);
    } catch (err) {
      // Si el usuario no existe, mostramos mensaje genérico (no revelar si existe o no)
      setError(err?.response?.data?.error || err.message || 'No se pudo procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="fade-in" style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: 32,
        width: '100%',
        maxWidth: 400,
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
      }}>

        {/* ── Paso 1: ingresar cédula ── */}
        {step === STEP.CEDULA && (
          <>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                margin: '0 auto 14px',
                background: 'rgba(59,130,246,0.12)',
                border: '1px solid rgba(59,130,246,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className="ti ti-key" style={{ fontSize: 26, color: '#60a5fa' }} />
              </div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                Recuperar acceso
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Ingresa tu cédula y un administrador recibirá la solicitud para resetear tu contraseña.
              </p>
            </div>

            {error && <Alert type="error" msg={error} onClose={() => setError('')} />}

            {/* Campo cédula */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.06em', color: 'var(--text-muted)',
                display: 'block', marginBottom: 6,
              }}>
                Número de cédula
              </label>
              <div style={{ position: 'relative' }}>
                <i className="ti ti-id" style={{
                  position: 'absolute', left: 11, top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)', fontSize: 15,
                  pointerEvents: 'none',
                }} />
                <input
                  type="text"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  placeholder="Ej: 12345678"
                  style={{ paddingLeft: 34 }}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSolicitar()}
                />
              </div>
            </div>

            {/* Botones */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10,
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <Btn
                onClick={handleSolicitar}
                loading={loading}
                icon="ti-send"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                Solicitar reset
              </Btn>
            </div>
          </>
        )}

        {/* ── Paso 2: solicitud enviada ── */}
        {step === STEP.ENVIADO && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20,
              margin: '0 auto 18px',
              background: 'rgba(34,197,94,0.12)',
              border: '1px solid rgba(34,197,94,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="ti ti-circle-check" style={{ fontSize: 32, color: '#4ade80' }} />
            </div>

            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Solicitud enviada
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 24 }}>
              La solicitud para <strong style={{ color: 'var(--text-primary)' }}>{nombre}</strong> fue registrada.<br />
              Contacta a tu <strong style={{ color: 'var(--text-primary)' }}>administrador</strong> para que te entregue tu contraseña temporal.
            </p>

            {/* Info adicional */}
            <div style={{
              background: 'rgba(59,130,246,0.07)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 10, padding: '12px 14px',
              marginBottom: 22, textAlign: 'left',
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <i className="ti ti-info-circle" style={{ color: '#60a5fa', fontSize: 16, marginTop: 1, flexShrink: 0 }} />
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
                  El administrador verá tu solicitud en el módulo de <strong>Gestión de usuarios</strong> y generará una contraseña temporal para ti.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                width: '100%', padding: '11px 0', borderRadius: 10,
                background: 'rgba(59,130,246,0.15)',
                border: '1px solid rgba(59,130,246,0.3)',
                color: '#60a5fa', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Entendido
            </button>
          </div>
        )}
      </div>
    </div>
  );
}