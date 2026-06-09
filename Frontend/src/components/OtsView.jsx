import React, { useState, useMemo } from 'react';
import { http, fmtFecha } from '../api.js';
import { Card, CardHeader, Btn, Alert, Label, PageHeader, SearchInput, EmptyState } from './UI.jsx';
import '../styles/OtsView.css';

const OT_ESTADOS = {
  pendiente: { color: '#F97316', label: 'Pendiente' },
  en_progreso: { color: '#3B82F6', label: 'En Progreso' },
  completado: { color: '#22C55E', label: 'Completado' },
  ABIERTA: { color: '#22C55E', label: 'Abierta' },
  CERRADA: { color: '#94A3B8', label: 'Cerrada' }
};

export default function OtsView({ ots = [], refresh }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ numero: '', cliente: '', destino: '', estado: 'pendiente' });

  const filtered = useMemo(() => ots.filter(o => !search || (o.numero_ot||'').toLowerCase().includes(search.toLowerCase()) || (o.cliente||'').toLowerCase().includes(search.toLowerCase())), [ots, search]);

  const handleCreate = async () => {
    if (!form.numero || !form.cliente) { setAlert({ type: 'error', msg: 'Número y cliente son obligatorios.' }); return; }
    setSaving(true); setAlert(null);
    try {
      await http.post('/ot', { numero_ot: form.numero, cliente: form.cliente, destino: form.destino, estado: form.estado });
      await refresh();
      setForm({ numero: '', cliente: '', destino: '', estado: 'pendiente' }); setShowForm(false);
      setAlert({ type: 'success', msg: 'OT creada correctamente.' });
    } catch (err) { setAlert({ type: 'error', msg: err.message }); }
    finally { setSaving(false); }
  };

  const handleEstado = async (ot, estado) => {
    try { await http.put('/ot/' + ot.id, { estado }); await refresh(); }
    catch (err) { setAlert({ type: 'error', msg: err.message }); }
  };

  return (
    <div className="ots-fade-in">
      <PageHeader
        title="Órdenes de Trabajo"
        icon="ti-clipboard-list"
        actions={<Btn size="sm" onClick={() => setShowForm(s => !s)} icon={showForm ? 'ti-x' : 'ti-plus'}>{showForm ? 'Cancelar' : 'Nueva OT'}</Btn>}
      />
      {alert && <Alert type={alert.type} msg={alert.msg} onClose={() => setAlert(null)} />}
      {showForm && (
        <Card className="ots-form-card fade-in">
          <CardHeader title="Nueva orden de trabajo" icon="ti-plus" />
          <div className="ots-card-body">
            <div className="ots-form-grid">
              <div><Label required>N° OT</Label><input className="ots-input" value={form.numero} onChange={e => setForm(p => ({ ...p, numero: e.target.value }))} placeholder="OT-2025-XXXX" /></div>
              <div><Label required>Cliente</Label><input className="ots-input" value={form.cliente} onChange={e => setForm(p => ({ ...p, cliente: e.target.value }))} placeholder="Nombre del cliente" /></div>
              <div><Label>Destino</Label><input className="ots-input" value={form.destino} onChange={e => setForm(p => ({ ...p, destino: e.target.value }))} placeholder="Dirección" /></div>
              <div><Label>Estado</Label><select className="ots-select" value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}>
                <option value="pendiente">Pendiente</option>
                <option value="en_progreso">En Progreso</option>
                <option value="completado">Completado</option>
              </select></div>
            </div>
            <div className="ots-form-actions">
              <Btn onClick={handleCreate} loading={saving} icon="ti-check">Crear OT</Btn>
              <Btn variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Btn>
            </div>
          </div>
        </Card>
      )}
      <Card className="ots-search-card">
        <div className="ots-search-container">
          <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar OT o cliente..." />
        </div>
      </Card>
      <Card>
        {filtered.length === 0 ? <EmptyState icon="ti-clipboard-off" title="Sin órdenes" /> : (
          <div className="ots-table-container">
            <table className="ots-table">
              <thead>
                <tr><th>N° OT</th><th>Cliente</th><th>Destino</th><th>Estado</th><th>Fecha</th><th>Acción</th></tr>
              </thead>
              <tbody>
                {filtered.map(ot => {
                  const est = OT_ESTADOS[ot.estado] || { color: '#94A3B8', label: ot.estado };
                  return (
                    <tr key={ot.id}>
                      <td><span className="ots-ot-numero">{ot.numero_ot || ot.numero}</span></td>
                      <td className="ots-cliente">{ot.cliente}</td>
                      <td className="ots-destino">{ot.destino || '—'}</td>
                      <td><span className="ots-estado-badge" style={{ background: `${est.color}18`, color: est.color, border: `1px solid ${est.color}30` }}>{est.label}</span></td>
                      <td className="ots-fecha">{fmtFecha(ot.created_at || ot.fecha)}</td>
                      <td>
                        {ot.estado !== 'completado' && ot.estado !== 'CERRADA' && (
                          <Btn variant="ghost" size="sm" onClick={() => handleEstado(ot, ot.estado === 'pendiente' || ot.estado === 'ABIERTA' ? 'en_progreso' : 'completado')}>
                            {ot.estado === 'pendiente' || ot.estado === 'ABIERTA' ? 'Iniciar' : 'Completar'}
                          </Btn>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}