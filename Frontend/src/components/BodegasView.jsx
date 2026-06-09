import React, { useState } from 'react';
import { http } from '../api.js';
import { Card, CardHeader, Btn, Alert, Label, PageHeader, Badge } from './UI.jsx';
import '../styles/BodegasView.css';

export default function BodegasView({ bodegas = [], inv = [], refresh }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [form, setForm] = useState({ nombre: '', ubicacion: '' });

  const handleCreate = async () => {
    if (!form.nombre.trim()) { setAlert({ type: 'error', msg: 'El nombre es obligatorio.' }); return; }
    setSaving(true); setAlert(null);
    try {
      await http.post('/bodegas', form);
      await refresh();
      setForm({ nombre: '', ubicacion: '' }); setShowForm(false);
      setAlert({ type: 'success', msg: 'Bodega creada correctamente.' });
    } catch (err) { setAlert({ type: 'error', msg: err.message }); }
    finally { setSaving(false); }
  };

  return (
    <div className="bodegas-fade-in">
      <PageHeader
        title="Bodegas"
        icon="ti-building-warehouse"
        actions={<Btn size="sm" onClick={() => setShowForm(s => !s)} icon={showForm ? 'ti-x' : 'ti-plus'}>{showForm ? 'Cancelar' : 'Nueva bodega'}</Btn>}
      />
      {alert && <Alert type={alert.type} msg={alert.msg} onClose={() => setAlert(null)} />}
      {showForm && (
        <Card className="bodegas-form-card fade-in">
          <CardHeader title="Nueva bodega" icon="ti-plus" />
          <div className="bodegas-card-body">
            <div className="bodegas-form-grid">
              <div><Label required>Nombre</Label><input className="bodegas-input" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre de la bodega" /></div>
              <div><Label>Ubicación</Label><input className="bodegas-input" value={form.ubicacion} onChange={e => setForm(p => ({ ...p, ubicacion: e.target.value }))} placeholder="Dirección" /></div>
            </div>
            <div className="bodegas-form-actions">
              <Btn onClick={handleCreate} loading={saving} icon="ti-check">Crear</Btn>
              <Btn variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Btn>
            </div>
          </div>
        </Card>
      )}
      <div className="bodegas-grid">
        {bodegas.map(b => {
          const total = inv.filter(i => i.bodega_id === b.id).length;
          const disponible = inv.filter(i => i.bodega_id === b.id && i.estado === 'STOCK').length;
          return (
            <div key={b.id} className={`bodegas-card ${!b.activo ? 'bodegas-card-inactive' : ''}`}>
              <div className="bodegas-card-header">
                <div className="bodegas-card-icon">
                  <i className="ti ti-building-warehouse" />
                </div>
                <div>
                  <div className="bodegas-card-title">{b.nombre}</div>
                  <div className="bodegas-card-subtitle">{b.ubicacion || 'Sin ubicación'}</div>
                </div>
                <Badge v={b.activo ? 'STOCK' : 'CONSUMO'}>{b.activo ? 'Activa' : 'Inactiva'}</Badge>
              </div>
              <div className="bodegas-card-stats">
                <div>
                  <div className="bodegas-stat-label">Total items</div>
                  <div className="bodegas-stat-value">{total}</div>
                </div>
                <div>
                  <div className="bodegas-stat-label">Disponibles</div>
                  <div className="bodegas-stat-value bodegas-stat-disponible">{disponible}</div>
                </div>
                {b.responsable && (
                  <div>
                    <div className="bodegas-stat-label">Responsable</div>
                    <div className="bodegas-stat-responsable">{b.responsable}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}