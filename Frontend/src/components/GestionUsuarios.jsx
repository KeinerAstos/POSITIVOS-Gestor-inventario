import { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const ROLES = ["ADMIN", "TECNICO", "BODEGA"];

const ROL_BADGE = {
  ADMIN:   { style: { background: "#3c2f6e", color: "#a78bfa", border: "1px solid #5b44a8" }, label: "Admin"   },
  TECNICO: { style: { background: "#1a3a4a", color: "#38bdf8", border: "1px solid #1e6080" }, label: "Técnico" },
  BODEGA:  { style: { background: "#2e2a1a", color: "#fbbf24", border: "1px solid #78520a" }, label: "Bodega"  },
};

const darkStyles = {
  page:        { minHeight: "100vh", background: "#0f1117", color: "#e2e8f0", fontFamily: "system-ui, sans-serif" },
  container:   { maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem" },
  header:      { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", gap: 12 },
  title:       { fontSize: 22, fontWeight: 600, color: "#f8fafc", margin: 0 },
  subtitle:    { fontSize: 13, color: "#64748b", marginTop: 4 },
  btnPrimary:  { background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" },
  filterRow:   { display: "flex", gap: 10, marginBottom: "1.25rem", flexWrap: "wrap" },
  input:       { flex: 1, minWidth: 180, background: "#1e2330", border: "1px solid #2d3748", borderRadius: 8, color: "#cbd5e1", padding: "9px 12px", fontSize: 14, outline: "none" },
  select:      { background: "#1e2330", border: "1px solid #2d3748", borderRadius: 8, color: "#cbd5e1", padding: "9px 12px", fontSize: 14, outline: "none", minWidth: 160 },
  tableWrap:   { background: "#161b27", border: "1px solid #1e2d3d", borderRadius: 12, overflow: "hidden" },
  th:          { textAlign: "left", padding: "11px 18px", fontSize: 12, fontWeight: 500, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #1e2d3d", background: "#12171f" },
  thRight:     { textAlign: "right", padding: "11px 18px", fontSize: 12, fontWeight: 500, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #1e2d3d", background: "#12171f" },
  td:          { padding: "13px 18px", fontSize: 14, borderBottom: "1px solid #1a2234", color: "#cbd5e1", verticalAlign: "middle" },
  tdRight:     { padding: "13px 18px", fontSize: 14, borderBottom: "1px solid #1a2234", color: "#cbd5e1", verticalAlign: "middle", textAlign: "right" },
  tdMono:      { padding: "13px 18px", fontSize: 13, borderBottom: "1px solid #1a2234", color: "#94a3b8", verticalAlign: "middle", fontFamily: "monospace" },
  tdBold:      { padding: "13px 18px", fontSize: 14, borderBottom: "1px solid #1a2234", color: "#f1f5f9", verticalAlign: "middle", fontWeight: 500 },
  badge:       { display: "inline-block", padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500 },
  btnReset:    { background: "#1c1a0e", border: "1px solid #78520a", color: "#fbbf24", borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 },
  btnEdit:     { background: "#111827", border: "1px solid #2d3748", color: "#94a3b8", borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 },
  empty:       { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem 0", color: "#475569", gap: 8 },
  countNote:   { fontSize: 12, color: "#475569", textAlign: "right", marginTop: 10 },
};

function authHeaders() {
  const token = localStorage.getItem("token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

// ─── Modal base (dark) ────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.65)" }}>
      <div style={{ background: "#161b27", border: "1px solid #1e2d3d", borderRadius: 14, width: "100%", maxWidth: 440, boxShadow: "0 25px 50px rgba(0,0,0,0.6)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #1e2d3d" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#f1f5f9" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: "20px 20px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Input/Select dark ────────────────────────────────────────────────────────
const fieldStyle = { width: "100%", background: "#1a2030", border: "1px solid #2d3748", borderRadius: 8, color: "#cbd5e1", padding: "9px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" };
const labelStyle = { display: "block", fontSize: 13, fontWeight: 500, color: "#94a3b8", marginBottom: 5 };

// ─── Modal: Crear usuario ─────────────────────────────────────────────────────
function ModalCrearUsuario({ bodegas, onClose, onCreado }) {
  const [form, setForm] = useState({ cedula: "", nombre: "", tipo_usuario: "TECNICO", bodega_id: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.cedula.trim() || !form.nombre.trim()) { setError("Cédula y nombre son obligatorios."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/usuarios`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ ...form, bodega_id: form.bodega_id || null }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear usuario");
      onCreado(data); onClose();
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <Modal title="Nuevo usuario" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div><label style={labelStyle}>Cédula</label><input name="cedula" value={form.cedula} onChange={handleChange} placeholder="Número de cédula" style={fieldStyle} /></div>
        <div><label style={labelStyle}>Nombre completo</label><input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre del usuario" style={fieldStyle} /></div>
        <div>
          <label style={labelStyle}>Rol</label>
          <select name="tipo_usuario" value={form.tipo_usuario} onChange={handleChange} style={fieldStyle}>
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Bodega (opcional)</label>
          <select name="bodega_id" value={form.bodega_id} onChange={handleChange} style={fieldStyle}>
            <option value="">Sin bodega asignada</option>
            {bodegas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>
        </div>
        <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>La contraseña inicial será la cédula del usuario.</p>
        {error && <p style={{ fontSize: 13, color: "#f87171", background: "#1f1315", borderRadius: 7, padding: "8px 12px", margin: 0 }}>{error}</p>}
        <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px 0", borderRadius: 8, background: "#1a2030", border: "1px solid #2d3748", color: "#94a3b8", fontSize: 14, cursor: "pointer" }}>Cancelar</button>
          <button onClick={handleSubmit} disabled={loading} style={{ flex: 1, padding: "9px 0", borderRadius: 8, background: "#1d4ed8", border: "none", color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>{loading ? "Creando…" : "Crear usuario"}</button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Modal: Editar usuario ────────────────────────────────────────────────────
function ModalEditarUsuario({ usuario, bodegas, onClose, onActualizado }) {
  const [form, setForm] = useState({ nombre: usuario.nombre, tipo_usuario: usuario.tipo_usuario, bodega_id: usuario.bodega_id || "", activo: usuario.activo });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/usuarios/${usuario.id}`, { method: "PUT", headers: authHeaders(), body: JSON.stringify({ ...form, bodega_id: form.bodega_id || null }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al actualizar");
      onActualizado(data); onClose();
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <Modal title={`Editar — ${usuario.nombre}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div><label style={labelStyle}>Nombre completo</label><input name="nombre" value={form.nombre} onChange={handleChange} style={fieldStyle} /></div>
        <div>
          <label style={labelStyle}>Rol</label>
          <select name="tipo_usuario" value={form.tipo_usuario} onChange={handleChange} style={fieldStyle}>
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Bodega</label>
          <select name="bodega_id" value={form.bodega_id} onChange={handleChange} style={fieldStyle}>
            <option value="">Sin bodega asignada</option>
            {bodegas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, color: "#94a3b8" }}>
          <input type="checkbox" name="activo" checked={form.activo} onChange={handleChange} style={{ width: 15, height: 15, accentColor: "#3b82f6" }} />
          Usuario activo
        </label>
        {error && <p style={{ fontSize: 13, color: "#f87171", background: "#1f1315", borderRadius: 7, padding: "8px 12px", margin: 0 }}>{error}</p>}
        <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px 0", borderRadius: 8, background: "#1a2030", border: "1px solid #2d3748", color: "#94a3b8", fontSize: 14, cursor: "pointer" }}>Cancelar</button>
          <button onClick={handleSubmit} disabled={loading} style={{ flex: 1, padding: "9px 0", borderRadius: 8, background: "#1d4ed8", border: "none", color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>{loading ? "Guardando…" : "Guardar cambios"}</button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Modal: Contraseña temporal ───────────────────────────────────────────────
function ModalPasswordTemporal({ nombre, password, onClose }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = () => {
    navigator.clipboard.writeText(password);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <Modal title="Contraseña reseteada" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center", textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#1a2a1e", border: "1px solid #166534", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🔑</div>
        <p style={{ fontSize: 13, color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>
          Entrega esta contraseña temporal a <strong style={{ color: "#e2e8f0" }}>{nombre}</strong>. Al ingresar se le pedirá que la cambie por una nueva.
        </p>
        <div style={{ width: "100%", background: "#0f1117", border: "1px solid #2d3748", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
            <span style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>Contraseña temporal</span>
            <span style={{ fontFamily: "monospace", fontSize: 26, fontWeight: 700, letterSpacing: "0.15em", color: "#f8fafc" }}>{password}</span>
          </div>
          <button onClick={copiar} style={{ background: "#1d4ed8", border: "none", borderRadius: 7, padding: "7px 14px", fontSize: 13, color: "#fff", cursor: "pointer", fontWeight: 500, flexShrink: 0 }}>
            {copiado ? "✓ Copiado" : "Copiar"}
          </button>
        </div>
        <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>
          Dísela a <strong style={{ color: "#94a3b8" }}>{nombre}</strong> — al ingresar se le pedirá que la cambie por una nueva.
        </p>
        <button onClick={onClose} style={{ width: "100%", padding: "10px 0", borderRadius: 8, background: "#1a2030", border: "1px solid #2d3748", color: "#94a3b8", fontSize: 14, cursor: "pointer" }}>
          Cerrar
        </button>
      </div>
    </Modal>
  );
}

// ─── Modal: Solicitudes de reset ──────────────────────────────────────────────
function ModalSolicitudes({ solicitudes, onAtender, onClose }) {
  return (
    <Modal title="Solicitudes de acceso pendientes" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {solicitudes.length === 0 ? (
          <p style={{ color: "#475569", fontSize: 13, textAlign: "center", padding: "1rem 0", margin: 0 }}>
            No hay solicitudes pendientes.
          </p>
        ) : (
          <>
            <p style={{ fontSize: 12, color: "#475569", margin: "0 0 4px" }}>
              {solicitudes.length} solicitud{solicitudes.length !== 1 ? "es" : ""} esperando atención.
            </p>
            {solicitudes.map((s) => (
              <div
                key={s.id}
                style={{
                  background: "#0f1117",
                  border: "1px solid #2d3748",
                  borderRadius: 9,
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "#f1f5f9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {s.nombre}
                  </p>
                  <p style={{ margin: "3px 0 0", fontSize: 12, color: "#475569", fontFamily: "monospace" }}>
                    {s.cedula} · {new Date(s.creado_en).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </div>
                <button
                  onClick={() => onAtender(s)}
                  style={{ ...{ background: "#1c1a0e", border: "1px solid #78520a", color: "#fbbf24", borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }, flexShrink: 0 }}
                >
                  🔑 Resetear
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </Modal>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function GestionUsuarios() {
  const [usuarios, setUsuarios]               = useState([]);
  const [bodegas, setBodegas]                 = useState([]);
  const [solicitudes, setSolicitudes]         = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [busqueda, setBusqueda]               = useState("");
  const [filtroRol, setFiltroRol]             = useState("");
  const [resetLoading, setResetLoading]       = useState(null);

  const [modalCrear, setModalCrear]           = useState(false);
  const [modalEditar, setModalEditar]         = useState(null);
  const [modalPassword, setModalPassword]     = useState(null);
  const [modalSolicitudes, setModalSolicitudes] = useState(false);

  const cargarUsuarios = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/usuarios`, { headers: authHeaders() });
      const data = await res.json();
      setUsuarios(Array.isArray(data) ? data : []);
    } catch { setUsuarios([]); } finally { setLoading(false); }
  }, []);

  const cargarBodegas = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/bodegas`, { headers: authHeaders() });
      const data = await res.json();
      setBodegas(Array.isArray(data) ? data : []);
    } catch { setBodegas([]); }
  }, []);

  const cargarSolicitudes = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/usuarios/solicitudes-reset/pendientes`, { headers: authHeaders() });
      const data = await res.json();
      setSolicitudes(Array.isArray(data) ? data : []);
    } catch { setSolicitudes([]); }
  }, []);

  useEffect(() => {
    cargarUsuarios();
    cargarBodegas();
    cargarSolicitudes();
  }, [cargarUsuarios, cargarBodegas, cargarSolicitudes]);

  const handleReset = async (usuario) => {
    if (!window.confirm(`¿Resetear la contraseña de ${usuario.nombre}?`)) return;
    setResetLoading(usuario.id);
    try {
      const res = await fetch(`${API_BASE}/usuarios/${usuario.id}/reset-password`, { method: "POST", headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setModalPassword({ nombre: usuario.nombre, password: data.password_temporal });
    } catch (err) { alert("Error al resetear contraseña: " + err.message); } finally { setResetLoading(null); }
  };

  const handleAtenderSolicitud = async (solicitud) => {
    try {
      await fetch(`${API_BASE}/usuarios/solicitudes-reset/${solicitud.id}/atender`, {
        method: "POST",
        headers: authHeaders(),
      });
      // Quitar de la lista local
      setSolicitudes((prev) => prev.filter((s) => s.id !== solicitud.id));
      setModalSolicitudes(false);
      // Reusar el flujo de reset existente
      const usuario = usuarios.find((u) => u.id === solicitud.usuario_id);
      if (usuario) handleReset(usuario);
    } catch (err) {
      alert("Error al atender solicitud: " + err.message);
    }
  };

  const usuariosFiltrados = usuarios.filter((u) => {
    const q = busqueda.toLowerCase();
    const coincideBusqueda = !q || u.nombre?.toLowerCase().includes(q) || u.cedula?.toLowerCase().includes(q);
    const coincideRol = !filtroRol || u.tipo_usuario === filtroRol;
    return coincideBusqueda && coincideRol;
  });

  return (
    <div style={darkStyles.page}>
      <div style={darkStyles.container}>

        {/* Cabecera */}
        <div style={darkStyles.header}>
          <div>
            <h1 style={darkStyles.title}>Usuarios del sistema</h1>
            <p style={darkStyles.subtitle}>{usuarios.length} usuarios registrados</p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {/* Botón de solicitudes — solo aparece si hay pendientes */}
            {solicitudes.length > 0 && (
              <button
                onClick={() => setModalSolicitudes(true)}
                style={{
                  ...darkStyles.btnPrimary,
                  background: "#92400e",
                  border: "1px solid #b45309",
                  position: "relative",
                }}
              >
                🔔 Solicitudes
                <span style={{
                  background: "#f59e0b",
                  color: "#0f1117",
                  borderRadius: "50%",
                  width: 20,
                  height: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {solicitudes.length}
                </span>
              </button>
            )}
            <button onClick={() => setModalCrear(true)} style={darkStyles.btnPrimary}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Nuevo usuario
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div style={darkStyles.filterRow}>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o cédula…"
            style={darkStyles.input}
          />
          <select value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)} style={darkStyles.select}>
            <option value="">Todos los roles</option>
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>

        {/* Tabla */}
        <div style={darkStyles.tableWrap}>
          {loading ? (
            <div style={darkStyles.empty}><span style={{ fontSize: 13 }}>Cargando usuarios…</span></div>
          ) : usuariosFiltrados.length === 0 ? (
            <div style={darkStyles.empty}>
              <span style={{ fontSize: 36 }}>👤</span>
              <p style={{ fontSize: 13, margin: 0 }}>
                {busqueda || filtroRol ? "Sin resultados para ese filtro." : "No hay usuarios registrados."}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={darkStyles.th}>Cédula</th>
                    <th style={darkStyles.th}>Nombre</th>
                    <th style={darkStyles.th}>Rol</th>
                    <th style={darkStyles.th}>Bodega</th>
                    <th style={darkStyles.th}>Estado</th>
                    <th style={darkStyles.thRight}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.map((u) => {
                    const badge = ROL_BADGE[u.tipo_usuario] || { style: { background: "#1e2330", color: "#94a3b8", border: "1px solid #2d3748" }, label: u.tipo_usuario };
                    return (
                      <tr
                        key={u.id}
                        style={{ transition: "background 0.15s" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#1a2035"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <td style={darkStyles.tdMono}>{u.cedula}</td>
                        <td style={darkStyles.tdBold}>{u.nombre}</td>
                        <td style={darkStyles.td}>
                          <span style={{ ...darkStyles.badge, ...badge.style }}>{badge.label}</span>
                        </td>
                        <td style={darkStyles.td}>
                          {u.bodega_nombre || <span style={{ color: "#334155" }}>—</span>}
                        </td>
                        <td style={darkStyles.td}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: u.activo ? "#4ade80" : "#f87171" }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: u.activo ? "#22c55e" : "#ef4444", flexShrink: 0 }} />
                            {u.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td style={darkStyles.tdRight}>
                          <div style={{ display: "inline-flex", gap: 8 }}>
                            <button
                              onClick={() => handleReset(u)}
                              disabled={resetLoading === u.id}
                              style={{ ...darkStyles.btnReset, opacity: resetLoading === u.id ? 0.5 : 1 }}
                            >
                              🔑 {resetLoading === u.id ? "…" : "Resetear"}
                            </button>
                            <button onClick={() => setModalEditar(u)} style={darkStyles.btnEdit}>
                              ✏️ Editar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {(busqueda || filtroRol) && !loading && (
          <p style={darkStyles.countNote}>Mostrando {usuariosFiltrados.length} de {usuarios.length} usuarios</p>
        )}
      </div>

      {/* Modales */}
      {modalCrear && (
        <ModalCrearUsuario
          bodegas={bodegas}
          onClose={() => setModalCrear(false)}
          onCreado={(nuevo) => setUsuarios((prev) => [...prev, nuevo])}
        />
      )}
      {modalEditar && (
        <ModalEditarUsuario
          usuario={modalEditar}
          bodegas={bodegas}
          onClose={() => setModalEditar(null)}
          onActualizado={(act) => setUsuarios((prev) => prev.map((u) => (u.id === act.id ? act : u)))}
        />
      )}
      {modalPassword && (
        <ModalPasswordTemporal
          nombre={modalPassword.nombre}
          password={modalPassword.password}
          onClose={() => setModalPassword(null)}
        />
      )}
      {modalSolicitudes && (
        <ModalSolicitudes
          solicitudes={solicitudes}
          onAtender={handleAtenderSolicitud}
          onClose={() => setModalSolicitudes(false)}
        />
      )}
    </div>
  );
}