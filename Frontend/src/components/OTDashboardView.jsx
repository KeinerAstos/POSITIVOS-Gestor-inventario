import React, { useState, useEffect, useMemo } from 'react';
import { fmtFecha } from '../api.js';
import { Card, CardHeader, Label, PageHeader, EmptyState, Badge, DropdownList } from './UI.jsx';
import '../styles/OTDashboardView.css';

export default function OTDashboardView({ ots = [], inv = [] }) {
  const [search, setSearch] = useState('');
  const [showDrop, setShowDrop] = useState(false);
  const [selectedOT, setSelectedOT] = useState(null);
  const [equiposOT, setEquiposOT] = useState([]);

  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    const t = search.toLowerCase();
    return ots.filter(o => (o.numero_ot||'').toLowerCase().includes(t) || (o.cliente||'').toLowerCase().includes(t) || String(o.id).includes(t)).slice(0, 10);
  }, [search, ots]);

  const selectOT = (ot) => {
    setSelectedOT(ot);
    setSearch(ot.numero_ot || `OT #${ot.id}`);
    setShowDrop(false);
    setEquiposOT(inv.filter(i => i.ot_id === ot.id));
  };

  useEffect(() => {
    const fn = e => { if (!e.target.closest('.ot-dash-search')) setShowDrop(false); };
    document.addEventListener('click', fn);
    return () => document.removeEventListener('click', fn);
  }, []);

  const serialCount = equiposOT.filter(e => e.serial).length;
  const noSerialCount = equiposOT.filter(e => !e.serial).length;

  return (
    <div className="otdash-fade-in">
      <PageHeader title="Dashboard OT" icon="ti-file-invoice" subtitle="Consulta equipos por orden de trabajo" />
      <div className="otdash-search-container ot-dash-search">
        <Label>Buscar Orden de Trabajo</Label>
        <div className="otdash-search-wrapper">
          <i className="ti ti-search otdash-search-icon" />
          <input
            className="otdash-search-input"
            value={search}
            onChange={e => { setSearch(e.target.value); setShowDrop(true); if (selectedOT) { setSelectedOT(null); setEquiposOT([]); } }}
            onFocus={() => setShowDrop(true)}
            placeholder="Número de OT, cliente o ID..."
          />
          {search && (
            <button className="otdash-clear-btn" onClick={() => { setSearch(''); setSelectedOT(null); setEquiposOT([]); }}>×</button>
          )}
        </div>
        <DropdownList
          items={showDrop ? filtered : []}
          onSelect={selectOT}
          renderItem={o => (
            <div className="otdash-dropdown-item">
              <div>
                <strong className="otdash-dropdown-title">{o.numero_ot}</strong>
                <div className="otdash-dropdown-subtitle">{o.cliente}</div>
              </div>
              <span className={`otdash-estado-badge ${o.estado === 'ABIERTA' || o.estado === 'en_progreso' ? 'otdash-estado-activa' : 'otdash-estado-cerrada'}`}>
                {o.estado}
              </span>
            </div>
          )}
        />
      </div>

      {selectedOT ? (
        <div className="otdash-selected">
          <Card className="otdash-info-card">
            <div className="otdash-info-content">
              <div>
                <h3 className="otdash-ot-numero">{selectedOT.numero_ot}</h3>
                <div className="otdash-ot-details">
                  <span><i className="ti ti-building" /> {selectedOT.cliente || 'Sin cliente'}</span>
                  {selectedOT.destino && <span><i className="ti ti-map-pin" /> {selectedOT.destino}</span>}
                  <span><i className="ti ti-calendar" /> {fmtFecha(selectedOT.created_at)}</span>
                </div>
              </div>
              <span className={`otdash-ot-estado ${selectedOT.estado === 'ABIERTA' || selectedOT.estado === 'en_progreso' ? 'otdash-ot-estado-activa' : 'otdash-ot-estado-cerrada'}`}>
                {selectedOT.estado}
              </span>
            </div>
          </Card>
          <div className="otdash-stats-grid">
            {[
              { label: 'Total Equipos', value: equiposOT.length, color: 'var(--amber-glow)' },
              { label: 'Serializados', value: serialCount, color: '#3B82F6' },
              { label: 'No Serializados', value: noSerialCount, color: '#F97316' }
            ].map(s => (
              <div key={s.label} className="otdash-stat-card">
                <div className="otdash-stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="otdash-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
          <Card>
            <CardHeader title="Equipos Asignados" icon="ti-package" subtitle={`${equiposOT.length} items`} />
            {equiposOT.length === 0 ? <EmptyState icon="ti-package-off" title="Sin equipos" subtitle="Esta OT no tiene equipos asignados" /> : (
              <div className="otdash-table-container">
                <table className="otdash-table">
                  <thead>
                    <tr><th>Material</th><th>Serie</th><th>Cant.</th><th>Estado</th><th>Técnico</th><th>Ubicación</th></tr>
                  </thead>
                  <tbody>
                    {equiposOT.map(e => (
                      <tr key={e.id}>
                        <td>
                          <div className="otdash-material">{e.descripcion || e.material_id}</div>
                          <div className="otdash-material-id">{e.material_id}</div>
                        </td>
                        <td className="otdash-serial">{e.serial || '—'}</td>
                        <td className="otdash-cantidad">{e.cantidad || 1}</td>
                        <td><Badge v={e.estado} /></td>
                        <td>{e.usuario_asignado_nombre || '—'}</td>
                        <td className="otdash-ubicacion">{e.ubicacion || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      ) : (
        <EmptyState icon="ti-file-search" title="Selecciona una OT" subtitle="Busca y selecciona una orden de trabajo para ver sus equipos" />
      )}
    </div>
  );
}