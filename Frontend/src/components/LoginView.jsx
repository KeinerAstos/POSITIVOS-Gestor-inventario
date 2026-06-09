import React, { useState } from 'react';
import { http } from '../api.js';
import { Alert, Btn } from './UI.jsx';
import '../styles/LoginView.css';

export default function LoginView({ onLogin }) {
  const [form, setForm] = useState({ cedula: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.cedula || !form.password) {
      setError('Completa todos los campos');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await http.post('/auth/login', {
        cedula: form.cedula,
        password: form.password
      });
      if (data.token) {
        localStorage.setItem('token', data.token);
        onLogin(data.user || data, data.token);
      } else {
        throw new Error('Credenciales incorrectas');
      }
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-grid-bg" />
      <div className="login-card-wrapper fade-in">
        <div className="login-logo">
          <div className="logo-circle">
            <i className="ti ti-plus" />
          </div>
          <h1 className="login-title">POSITIVO S+</h1>
          <p className="login-subtitle">Tecnología que transforma</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form-card">
          <h2 className="login-form-title">Acceso al sistema</h2>
          {error && <Alert type="error" msg={error} onClose={() => setError('')} />}

          <div className="input-group">
            <label className="input-label">Cédula</label>
            <div className="input-icon-wrapper">
              <i className="ti ti-id input-icon" />
              <input
                type="text"
                value={form.cedula}
                onChange={(e) => setForm({ ...form, cedula: e.target.value })}
                placeholder="Número de identificación"
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Contraseña</label>
            <div className="input-icon-wrapper">
              <i className="ti ti-lock input-icon" />
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Ingrese su contraseña"
              />
            </div>
          </div>

          <Btn type="submit" loading={loading} className="login-btn">
            Ingresar
          </Btn>

          <div className="login-extra">
            <a href="#">¿Olvidó su contraseña?</a>
          </div>
        </form>

        <p className="login-footer">Sistema de gestión de inventario · v2.0</p>
      </div>
    </div>
  );
}