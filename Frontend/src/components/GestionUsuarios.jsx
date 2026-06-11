import { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const ROLES = ["ADMIN", "TECNICO", "BODEGA"];

const ROL_BADGE = {
  ADMIN:   { bg: "bg-purple-100 text-purple-800",  label: "Admin"   },
  TECNICO: { bg: "bg-blue-100 text-blue-800",      label: "Técnico" },
  BODEGA:  { bg: "bg-amber-100 text-amber-800",    label: "Bodega"  },
};

// ─── helpers ─────────────────────────────────────────────────────────────────
function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── Modal genérico ───────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Modal: Crear usuario ─────────────────────────────────────────────────────
function ModalCrearUsuario({ bodegas, onClose, onCreado }) {
  const [form, setForm] = useState({
    cedula: "", nombre: "", tipo_usuario: "TECNICO", bodega_id: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.cedula.trim() || !form.nombre.trim()) {
      setError("Cédula y nombre son obligatorios.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/usuarios`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          ...form,
          bodega_id: form.bodega_id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear usuario");
      onCreado(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Nuevo usuario" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cédula</label>
          <input
            name="cedula" value={form.cedula} onChange={handleChange}
            placeholder="Número de cédula"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
          <input
            name="nombre" value={form.nombre} onChange={handleChange}
            placeholder="Nombre del usuario"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
          <select
            name="tipo_usuario" value={form.tipo_usuario} onChange={handleChange}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bodega (opcional)</label>
          <select
            name="bodega_id" value={form.bodega_id} onChange={handleChange}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Sin bodega asignada</option>
            {bodegas.map((b) => (
              <option key={b.id} value={b.id}>{b.nombre}</option>
            ))}
          </select>
        </div>

        <p className="text-xs text-gray-400">
          La contraseña inicial será la cédula del usuario. Se le pedirá cambiarla al primer inicio de sesión.
        </p>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "Creando…" : "Crear usuario"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Modal: Editar usuario ────────────────────────────────────────────────────
function ModalEditarUsuario({ usuario, bodegas, onClose, onActualizado }) {
  const [form, setForm] = useState({
    nombre:      usuario.nombre,
    tipo_usuario: usuario.tipo_usuario,
    bodega_id:   usuario.bodega_id || "",
    activo:      usuario.activo,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/usuarios/${usuario.id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          ...form,
          bodega_id: form.bodega_id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al actualizar");
      onActualizado(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Editar — ${usuario.nombre}`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
          <input
            name="nombre" value={form.nombre} onChange={handleChange}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
          <select
            name="tipo_usuario" value={form.tipo_usuario} onChange={handleChange}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bodega</label>
          <select
            name="bodega_id" value={form.bodega_id} onChange={handleChange}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Sin bodega asignada</option>
            {bodegas.map((b) => (
              <option key={b.id} value={b.id}>{b.nombre}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox" name="activo" checked={form.activo} onChange={handleChange}
            className="w-4 h-4 rounded accent-blue-600"
          />
          <span className="text-sm text-gray-700">Usuario activo</span>
        </label>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Modal: Resultado de reset ────────────────────────────────────────────────
function ModalPasswordTemporal({ nombre, password, onClose }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = () => {
    navigator.clipboard.writeText(password);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <Modal title="Contraseña reseteada" onClose={onClose}>
      <div className="space-y-4 text-center">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto text-2xl">
          🔑
        </div>
        <p className="text-sm text-gray-600">
          Entrega esta contraseña temporal a <strong>{nombre}</strong>. Deberá cambiarla al iniciar sesión.
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <span className="font-mono text-xl font-bold tracking-widest text-gray-800">
            {password}
          </span>
          <button
            onClick={copiar}
            className="text-xs px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            {copiado ? "✓ Copiado" : "Copiar"}
          </button>
        </div>
        <button
          onClick={onClose}
          className="w-full py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm text-gray-700 transition-colors"
        >
          Cerrar
        </button>
      </div>
    </Modal>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function GestionUsuarios() {
  const [usuarios, setUsuarios]         = useState([]);
  const [bodegas, setBodegas]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [busqueda, setBusqueda]         = useState("");
  const [filtroRol, setFiltroRol]       = useState("");
  const [resetLoading, setResetLoading] = useState(null); // id del usuario en proceso

  // Modales
  const [modalCrear, setModalCrear]                 = useState(false);
  const [modalEditar, setModalEditar]               = useState(null);   // usuario
  const [modalPassword, setModalPassword]           = useState(null);   // { nombre, password }

  // ── Carga inicial ────────────────────────────────────────────────────────────
  const cargarUsuarios = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/usuarios`, { headers: authHeaders() });
      const data = await res.json();
      setUsuarios(Array.isArray(data) ? data : []);
    } catch {
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarBodegas = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/bodegas`, { headers: authHeaders() });
      const data = await res.json();
      setBodegas(Array.isArray(data) ? data : []);
    } catch {
      setBodegas([]);
    }
  }, []);

  useEffect(() => {
    cargarUsuarios();
    cargarBodegas();
  }, [cargarUsuarios, cargarBodegas]);

  // ── Reset password ───────────────────────────────────────────────────────────
  const handleReset = async (usuario) => {
    if (!window.confirm(`¿Resetear la contraseña de ${usuario.nombre}?`)) return;
    setResetLoading(usuario.id);
    try {
      const res = await fetch(`${API_BASE}/usuarios/${usuario.id}/reset-password`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setModalPassword({ nombre: usuario.nombre, password: data.password_temporal });
    } catch (err) {
      alert("Error al resetear contraseña: " + err.message);
    } finally {
      setResetLoading(null);
    }
  };

  // ── Filtrado ─────────────────────────────────────────────────────────────────
  const usuariosFiltrados = usuarios.filter((u) => {
    const q = busqueda.toLowerCase();
    const coincideBusqueda =
      !q ||
      u.nombre?.toLowerCase().includes(q) ||
      u.cedula?.toLowerCase().includes(q);
    const coincideRol = !filtroRol || u.tipo_usuario === filtroRol;
    return coincideBusqueda && coincideRol;
  });

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Usuarios del sistema</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {usuarios.length} usuarios registrados
            </p>
          </div>
          <button
            onClick={() => setModalCrear(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-sm"
          >
            <span className="text-lg leading-none">+</span> Nuevo usuario
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o cédula…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
            className="sm:w-44 px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los roles</option>
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
              Cargando usuarios…
            </div>
          ) : usuariosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
              <span className="text-4xl">👤</span>
              <p className="text-sm">
                {busqueda || filtroRol ? "Sin resultados para ese filtro." : "No hay usuarios registrados."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Cédula</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Nombre</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Rol</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Bodega</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Estado</th>
                    <th className="text-right px-5 py-3 font-medium text-gray-500">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {usuariosFiltrados.map((u) => {
                    const badge = ROL_BADGE[u.tipo_usuario] || { bg: "bg-gray-100 text-gray-600", label: u.tipo_usuario };
                    return (
                      <tr key={u.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-5 py-3 font-mono text-gray-700">{u.cedula}</td>
                        <td className="px-5 py-3 font-medium text-gray-800">{u.nombre}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-gray-500">
                          {u.bodega_nombre || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${u.activo ? "text-green-700" : "text-red-500"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.activo ? "bg-green-500" : "bg-red-400"}`} />
                            {u.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleReset(u)}
                              disabled={resetLoading === u.id}
                              title="Resetear contraseña"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
                            >
                              {resetLoading === u.id ? "…" : "🔑 Resetear"}
                            </button>
                            <button
                              onClick={() => setModalEditar(u)}
                              title="Editar usuario"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
                            >
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

        {/* Contador filtrado */}
        {(busqueda || filtroRol) && !loading && (
          <p className="text-xs text-gray-400 mt-3 text-right">
            Mostrando {usuariosFiltrados.length} de {usuarios.length} usuarios
          </p>
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
          onActualizado={(actualizado) =>
            setUsuarios((prev) =>
              prev.map((u) => (u.id === actualizado.id ? actualizado : u))
            )
          }
        />
      )}

      {modalPassword && (
        <ModalPasswordTemporal
          nombre={modalPassword.nombre}
          password={modalPassword.password}
          onClose={() => setModalPassword(null)}
        />
      )}
    </div>
  );
}
