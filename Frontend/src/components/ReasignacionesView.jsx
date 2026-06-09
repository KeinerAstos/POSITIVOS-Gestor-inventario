import React, { useState, useEffect } from 'react';
import { fmtFechaHora } from '../api.js';
import { Card, Btn, Label, PageHeader, EmptyState, Loading } from './UI.jsx';
import '../styles/ReasignacionesView.css';

export default function ReasignacionesView() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const cargar = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tipo: 'REASIGNACION_OT' });
      if (desde) params.append('fecha_desde', desde);
      if (hasta) params.append('fecha_hasta', hasta);
      const res = await fetch(`/api/movimientos?${params}`);
      const json = await res.json();
      setData(json.data || []);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, [desde, hasta]);

  return (
    <div className="reasignaciones-fade-in">
      <PageHeader title="Historial de Reasignaciones" icon="ti-arrows-exchange" />
      <Card className="reasignaciones-filtros-card">
        <div className="reasignaciones-filtros">
          <div className="reasignaciones-filtro-item">
            <Label>Desde</Label>
            <input type="date" className="reasignaciones-date" value={desde} onChange={e => setDesde(e.target.value)} />
          </div>
          <div className="reasignaciones-filtro-item">
            <Label>Hasta</Label>
            <input type="date" className="reasignaciones-date" value={hasta} onChange={e => setHasta(e.target.value)} />
          </div>
          <Btn variant="ghost" size="sm" onClick={cargar} icon="ti-refresh">Filtrar</Btn>
        </div>
      </Card>
      <Card>
        {loading ? <Loading /> : data.length === 0 ? <EmptyState icon="ti-switch-horizontal" title="Sin reasignaciones" /> : (
          <div className="reasignaciones-table-container">
            <table className="reasignaciones-table">
              <thead>
                <tr>
                  {['Fecha', 'Material', 'Serie', 'Cant.', 'OT Origen', 'OT Destino', 'Responsable', 'Observación'].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.map(m => (
                  <tr key={m.id}>
                    <td className="reasignaciones-fecha">{fmtFechaHora(m.created_at)}</td>
                    <td className="reasignaciones-material">{m.material || '—'}</td>
                    <td className="reasignaciones-serial">{m.serial || '—'}</td>
                    <td className="reasignaciones-cantidad">{m.cantidad || 1}</td>
                    <td>
                      <div>{m.ot_anterior_numero || `OT #${m.ot_anterior || '?'}`}</div>
                      {m.oth_anterior && <div className="reasignaciones-oth">OTH: {m.oth_anterior}</div>}
                    </td>
                    <td>
                      <div>{m.ot_nueva_numero || `OT #${m.ot_nueva || '?'}`}</div>
                      {m.oth_nueva && <div className="reasignaciones-oth">OTH: {m.oth_nueva}</div>}
                    </td>
                    <td>{m.usuario || '—'}</td>
                    <td className="reasignaciones-observacion">{m.observacion || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}