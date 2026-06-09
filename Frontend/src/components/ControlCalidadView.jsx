import React, { useState, useEffect, useMemo } from 'react';
import { http } from '../api.js';
import { Card, Btn, PageHeader, EmptyState, Loading } from './UI.jsx';
import '../styles/ControlCalidadView.css';

export default function ControlCalidadView({ token }) {
  const [actas, setActas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/actas-qa/para-calidad', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Error al cargar');
      setActas(await res.json());
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  const toggle = key => setExpanded(p => ({ ...p, [key]: !p[key] }));
  const isOpen = key => expanded[key] !== false;

  const actualizarEstado = async (id, estado, comentario) => {
    try {
      await http.put(`/actas-qa/${id}/estado-qa`, { estado_qa: estado, comentario_qa: comentario });
      cargar();
    } catch { }
  };

  const descargarPDF = async (id) => {
    try {
      const res = await fetch(`/api/actas-qa/${id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `acta_${id}.pdf`;
      a.click();
    } catch { alert('Error al descargar PDF'); }
  };

  const grouped = useMemo(() => {
    const r = {};
    actas.forEach(a => {
      const fecha = new Date(a.created_at).toISOString().split('T')[0];
      if (!r[fecha]) r[fecha] = {};
      if (!r[fecha][a.tecnico_id]) r[fecha][a.tecnico_id] = { nombre: a.tecnico_nombre, actas: [] };
      r[fecha][a.tecnico_id].actas.push(a);
    });
    return r;
  }, [actas]);

  const QA_COLORS = { PENDIENTE: '#F97316', APROBADO: '#22C55E', RECHAZADO: '#EF4444' };

  if (loading) return <Loading text="Cargando actas QA..." />;

  return (
    <div className="calidad-fade-in">
      <PageHeader title="Control de Calidad QA" icon="ti-clipboard-check" subtitle={`${actas.length} actas registradas`} />
      {Object.keys(grouped).sort().reverse().map(fecha => (
        <Card key={fecha} className="calidad-card">
          <div className="calidad-card-header" onClick={() => toggle(fecha)}>
            <span className="calidad-card-title"><i className="ti ti-calendar" /> {fecha} · {Object.keys(grouped[fecha]).length} técnico(s)</span>
            <i className={`ti ti-chevron-${isOpen(fecha) ? 'up' : 'down'}`} />
          </div>
          {isOpen(fecha) && (
            <div className="calidad-card-body">
              {Object.entries(grouped[fecha]).map(([tid, tec]) => (
                <div key={tid} className="calidad-tecnico-group">
                  <div className="calidad-tecnico-header" onClick={() => toggle(`${fecha}_${tid}`)}>
                    <span><i className="ti ti-user" /> {tec.nombre} · {tec.actas.length} acta(s)</span>
                    <i className={`ti ti-chevron-${isOpen(`${fecha}_${tid}`) ? 'up' : 'down'}`} />
                  </div>
                  {isOpen(`${fecha}_${tid}`) && (
                    <div className="calidad-actas-list">
                      {tec.actas.map(acta => {
                        const qac = QA_COLORS[acta.estado_qa || 'PENDIENTE'] || '#F97316';
                        return (
                          <div key={acta.id} className="calidad-acta-item">
                            <div className="calidad-acta-header">
                              <span className="calidad-acta-title">Acta #{acta.id} · {acta.fecha_ejecucion || 'Sin fecha'} · {acta.lugar_instalacion || 'Sin lugar'}</span>
                              <div className="calidad-acta-actions">
                                <span className="calidad-acta-badge" style={{ background: `${qac}18`, color: qac, border: `1px solid ${qac}30` }}>
                                  {acta.estado_qa || 'PENDIENTE'}
                                </span>
                                <Btn variant="ghost" size="sm" onClick={() => descargarPDF(acta.id)} icon="ti-file-description">PDF</Btn>
                              </div>
                            </div>
                            <div className="calidad-acta-controls">
                              <select
                                className="calidad-select"
                                value={acta.estado_qa || 'PENDIENTE'}
                                onChange={e => actualizarEstado(acta.id, e.target.value, acta.comentario_qa || '')}
                              >
                                <option value="PENDIENTE">Pendiente</option>
                                <option value="APROBADO">Aprobado</option>
                                <option value="RECHAZADO">Rechazado</option>
                              </select>
                              <input
                                className="calidad-input"
                                value={acta.comentario_qa || ''}
                                onChange={e => actualizarEstado(acta.id, acta.estado_qa || 'PENDIENTE', e.target.value)}
                                placeholder="Comentario QA..."
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}
      {Object.keys(grouped).length === 0 && <EmptyState icon="ti-clipboard-off" title="Sin actas QA" subtitle="No hay actas pendientes de revisión" />}
    </div>
  );
}