import React, { useState, useEffect, useMemo } from 'react';
import { http } from '../api.js';
import { Card, CardHeader, Btn, Alert, Label, PageHeader, SearchInput, EmptyState, Loading } from './UI.jsx';

const ROLES = ['ADMIN', 'BODEGA', 'TECNICO', 'SUPERVISOR', 'CONTROL_CALIDAD', 'PRECONFIGURADOR'];

const ROL_META = {
  ADMIN:            { color: '#F97316', bg: 'rgba(249,115,22,0.12)'  },
  BODEGA:           { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)'  },
  TECNICO:          { color: '#22C55E', bg: 'rgba(34,197,94,0.12)'   },
  SUPERVISOR:       { color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  CONTROL_CALIDAD:  { color: '#14B8A6', bg: 'rgba(20,184,166,0.12)'  },
  PRECONFIGURADOR:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
};

function RolBadge({ rol }) {
  const meta = ROL_META[rol] || { color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' };
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30`,
      whiteSpace: 'nowrap',
    }}>
      {rol}
    </span>
  );
}

const EMPTY_FORM = { cedula: '', nombre: '', tipo_usuario: 'TECNICO', bodega_id: '', activo: true };

export default function UsuariosView({ bodegas = [] }) {
  const [usuarios, setUsuarios]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [alert, setAlert]         = useState(null);
  const [search, setSearch]       = useState('');
  const [filtroRol, setFiltroRol] = useState('');

  // Modal crear/editar
  const [showForm, setShowForm]   = useState(false);
  const [editando, setEditando]   = useState(null); // null = crear, objeto = editar
  const [form, setForm]           = useState({ ...EMPTY_FORM });

  // Modal resetear password
  const [resetando, setResetando]           = useState(null);
  const [passwordTemporal, setPasswordTemporal] = useState('');
  const [showPassword, setShowPassword]     = useState(false);

  /* ── fetch ── */
  const cargar = async () => {
    setLoading(true);
    try {
      const data = await http.get('/usuarios');
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (err) {
      setAlert({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  /* ── filtrado ── */
  const filtrados = useMemo(() => usuarios.filter(u => {
    if (filtroRol && u.tipo_usuario !== filtroRol) return false;
    if (search) {
      const t = search.toLowerCase();
      if (!(u.nombre || '').toLowerCase().includes(t) &&
          !(u.cedula || '').toLowerCase().includes(t)) return false;
    }
    return true;
  }), [usuarios, search, filtroRol]);

  /* ── helpers ── */
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const abrirCrear = () => {
    setEditando(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
    setAlert(null);
  };

  const abrirEditar = (u) => {
    setEditando(u);
    setForm({
      cedula:       u.cedula,
      nombre:       u.nombre,
      tipo_usuario: u.tipo_usuario,
      bodega_id:    u.bodega_id || '',
      activo:       u.activo,
    });
    setShowForm(true);
    setAlert(null);
  };

  const cerrarForm = () => {
    setShowForm(false);
    setEditando(null);
    setForm({ ...EMPTY_FORM });
  };

  /* ── crear / editar ── */
  const handleGuardar = async () => {
    if (!form.cedula.trim() || !form.nombre.trim()) {
      setAlert({ type: 'error', msg: 'Cédula y nombre son obligatorios.' }); return;
    }
    setSaving(true); setAlert(null);
    try {
      if (editando) {
        await http.put(`/usuarios/${editando.id}`, {
          nombre:       form.nombre,
          tipo_usuario: form.tipo_usuario,
          bodega_id:    form.bodega_id || null,
          activo:       form.activo,
        });
        setAlert({ type: 'success', msg: `Usuario ${form.nombre} actualizado.` });
      } else {
        await http.post('/usuarios', {
          cedula:       form.cedula,
          nombre:       form.nombre,
          tipo_usuario: form.tipo_usuario,
          bodega_id:    form.bodega_id || null,
        });
        setAlert({ type: 'success', msg: `Usuario ${form.nombre} creado. Contraseña inicial: su cédula.` });
      }
      await cargar();
      cerrarForm();
    } catch (err) {
      setAlert({ type: 'error', msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  /* ── toggle activo ── */
  const toggleActivo = async (u) => {
    try {
      await http.put(`/usuarios/${u.id}`, { activo: !u.activo });
      await cargar();
    } catch (err) {
      setAlert({ type: 'error', msg: err.message });
    }
  };

  /* ── reset password ── */
  const handleReset = async (u) => {
    setResetando(u);
    setPasswordTemporal('');
    setShowPassword(false);
  };

  const confirmarReset = async () => {
    try {
      const res = await http.post(`/usuarios/${resetando.id}/reset-password`, {});
      setPasswordTemporal(res.password_temporal);
      setShowPassword(true);
    } catch (err) {
      setAlert({ type: 'error', msg: err.message });
      setResetando(null);
    }
  };

  /* ── stats ── */
  const stats = useMemo(() => ({
    total:   usuarios.length,
    activos: usuarios.filter(u => u.activo).length,
    porRol:  ROLES.map(r => ({ rol: r, count: usuarios.filter(u => u.tipo_usuario === r).length })).filter(r => r.count > 0),
  }), [usuarios]);

  /* ── render ── */
  return (
    <div className="fade-in">
      <PageHeader
        title="Gestión de Usuarios"
        icon="ti-users"
        subtitle={`${stats.total} usuarios registrados · ${stats.activos} activos`}
        actions={
          <Btn size="sm" icon="ti-plus" onClick={abrirCrear}>Nuevo Usuario</Btn>
        }
      />

      {alert && <Alert type={alert.type} msg={alert.msg} onClose={() => setAlert(null)} />}

      {/* Stats rápidas */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        {stats.porRol.map(({ rol, count }) => {
          const meta = ROL_META[rol] || { color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' };
          return (
            <div key={rol} style={{
              padding: '8px 16px', borderRadius: 10,
              background: meta.bg, border: `1px solid ${meta.color}30`,
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            }} onClick={() => setFiltroRol(filtroRol === rol ? '' : rol)}>
              <span style={{ fontSize: 11, fontWeight: 600, color: meta.color }}>{rol}</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: meta.color, lineHeight: 1 }}>{count}</span>
            </div>
          );
        })}
      </div>

      {/* Formulario crear/editar */}
      {showForm && (
        <Card style={{ marginBottom: 20 }} className="fade-in">
          <CardHeader
            title={editando ? `Editar — ${editando.nombre}` : 'Nuevo usuario'}
            icon={editando ? 'ti-edit' : 'ti-user-plus'}
          />
          <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
              <div>
                <Label required>Cédula</Label>
                <input
                  value={form.cedula}
                  onChange={f('cedula')}
                  placeholder="Número de cédula"
                  disabled={!!editando}
                  style={{ opacity: editando ? 0.6 : 1 }}
                />
                {!editando && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    La cédula será la contraseña inicial del usuario.
                  </div>
                )}
              </div>
              <div>
                <Label required>Nombre completo</Label>
                <input value={form.nombre} onChange={f('nombre')} placeholder="Nombre del usuario" />
              </div>
              <div>
                <Label required>Rol</Label>
                <select value={form.tipo_usuario} onChange={f('tipo_usuario')}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <Label>Bodega asignada</Label>
                <select value={form.bodega_id} onChange={f('bodega_id')}>
                  <option value="">Sin bodega específica</option>
                  {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
              </div>
              {editando && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 20 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.activo}
                      onChange={f('activo')}
                      style={{ width: 'auto', accentColor: 'var(--amber-glow)' }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 500, color: form.activo ? '#22C55E' : '#EF4444' }}>
                      {form.activo ? 'Usuario activo' : 'Usuario inactivo'}
                    </span>
                  </label>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={handleGuardar} loading={saving} icon="ti-check">
                {editando ? 'Guardar cambios' : 'Crear usuario'}
              </Btn>
              <Btn variant="secondary" onClick={cerrarForm}>Cancelar</Btn>
            </div>
          </div>
        </Card>
      )}

      {/* Filtros */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ padding: '12px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <SearchInput
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o cédula..."
            style={{ flex: 1, minWidth: 200 }}
          />
          <select value={filtroRol} onChange={e => setFiltroRol(e.target.value)} style={{ width: 200 }}>
            <option value="">Todos los roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {(search || filtroRol) && (
            <Btn variant="ghost" size="sm" onClick={() => { setSearch(''); setFiltroRol(''); }} icon="ti-x">
              Limpiar
            </Btn>
          )}
        </div>
      </Card>

      {/* Tabla */}
      <Card>
        {loading ? <Loading text="Cargando usuarios..." /> :
         filtrados.length === 0 ? (
          <EmptyState icon="ti-users-off" title="Sin usuarios" subtitle="No hay usuarios que coincidan con los filtros" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Cédula</th>
                  <th>Rol</th>
                  <th>Bodega</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(u => (
                  <tr key={u.id}>
                    {/* Nombre + avatar */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                          background: `${(ROL_META[u.tipo_usuario] || { bg: 'rgba(148,163,184,0.12)' }).bg}`,
                          border: `1px solid ${(ROL_META[u.tipo_usuario] || { color: '#94A3B8' }).color}30`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <i className="ti ti-user" style={{ fontSize: 14, color: (ROL_META[u.tipo_usuario] || { color: '#94A3B8' }).color }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{u.nombre}</div>
                          {u.debe_cambiar_password && (
                            <div style={{ fontSize: 10, color: '#F97316', marginTop: 2 }}>
                              ⚠ Debe cambiar contraseña
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>{u.cedula}</td>
                    <td><RolBadge rol={u.tipo_usuario} /></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.bodega_nombre || '—'}</td>
                    <td>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: u.activo ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                        color: u.activo ? '#22C55E' : '#EF4444',
                        border: `1px solid ${u.activo ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                      }}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Btn variant="ghost" size="sm" icon="ti-edit" onClick={() => abrirEditar(u)}>
                          Editar
                        </Btn>
                        <Btn variant="ghost" size="sm" icon="ti-key" onClick={() => handleReset(u)}>
                          Resetear
                        </Btn>
                        <Btn
                          variant={u.activo ? 'danger' : 'success'}
                          size="sm"
                          icon={u.activo ? 'ti-user-off' : 'ti-user-check'}
                          onClick={() => toggleActivo(u)}
                        >
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal reset password */}
      {resetando && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20,
        }}>
          <div className="fade-in" style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 16, width: '100%', maxWidth: 420,
            boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <i className="ti ti-key" style={{ fontSize: 18, color: '#F97316' }} />
                <strong style={{ fontSize: 15 }}>Resetear contraseña</strong>
              </div>
              {!showPassword && (
                <button onClick={() => setResetando(null)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: 20,
                }}>×</button>
              )}
            </div>

            <div style={{ padding: 24 }}>
              {!showPassword ? (
                // Confirmación
                <>
                  <div style={{
                    padding: '14px 16px', borderRadius: 10, marginBottom: 20,
                    background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)',
                  }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{resetando.nombre}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cédula: {resetando.cedula} · {resetando.tipo_usuario}</div>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
                    Se generará una contraseña temporal aleatoria. El usuario deberá cambiarla en su próximo inicio de sesión.
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn onClick={confirmarReset} icon="ti-key" style={{ flex: 1, justifyContent: 'center' }}>
                      Generar contraseña temporal
                    </Btn>
                    <Btn variant="secondary" onClick={() => setResetando(null)}>Cancelar</Btn>
                  </div>
                </>
              ) : (
                // Mostrar contraseña generada
                <>
                  <div style={{
                    padding: '14px 16px', borderRadius: 10, marginBottom: 16,
                    background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <i className="ti ti-circle-check" style={{ fontSize: 20, color: '#22C55E', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#22C55E', fontWeight: 500 }}>
                      Contraseña reseteada correctamente
                    </span>
                  </div>

                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                    Entrégale esta contraseña temporal a <strong>{resetando.nombre}</strong>:
                  </p>

                  {/* Contraseña destacada */}
                  <div style={{
                    padding: '16px', borderRadius: 12, marginBottom: 20,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700,
                      color: 'var(--amber-glow)', letterSpacing: '0.15em',
                    }}>
                      {passwordTemporal}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                      El usuario deberá cambiarla al iniciar sesión
                    </div>
                  </div>

                  {/* Botón copiar */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <Btn
                      variant="ghost"
                      icon="ti-copy"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => {
                        navigator.clipboard.writeText(passwordTemporal);
                        setAlert({ type: 'success', msg: 'Contraseña copiada al portapapeles.' });
                      }}
                    >
                      Copiar contraseña
                    </Btn>
                    <Btn
                      variant="primary"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => { setResetando(null); setPasswordTemporal(''); setShowPassword(false); }}
                    >
                      Listo
                    </Btn>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                    ⚠ Esta contraseña no se volverá a mostrar. Anótala antes de cerrar.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}