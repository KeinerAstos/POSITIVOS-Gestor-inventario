import React, { useState, useEffect, useMemo } from 'react';
import { http, fmtFecha } from '../api.js';
import { Card, CardHeader, Btn, Badge, PageHeader, EmptyState, Loading } from './UI.jsx';
import FormularioActaQA from './FormularioActaQA.jsx';
import { FORMATOS_QA } from '../config/formatosqa.js';

export default function TecnicoView({ user, token, refresh: refreshParent }) {
  const [equipos, setEquipos]       = useState([]);
  const [actas, setActas]           = useState([]);
  const [loading, setLoading]       = useState(false);
  const [loadingActas, setLoadingActas] = useState(false);
  const [subView, setSubView]       = useState('mis-equipos');
  const [subViewData, setSubViewData] = useState(null);
  const [expandedOTs, setExpandedOTs] = useState({});

  /* ── fetch ── */
  const cargarEquipos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventario/mis-equipos', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Error al cargar equipos');
      setEquipos(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const [formatosQa, setFormatosQa] = useState([]);
  const cargarFormatosQa = async () => {
    try {
      const res = await fetch('/api/actas-qa/formatos', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Error cargando formatos QA');

      const data = await res.json();

      setFormatosQa(Array.isArray(data) ? data.filter(Boolean) : []);
    } catch (err) {
      console.error(err);
      setFormatosQa([]);
    }
  };

  const cargarActas = async () => {
    setLoadingActas(true);
    try {
      const res = await fetch('/api/actas-qa', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      setActas(await res.json());
    } catch { }
    finally { setLoadingActas(false); }
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

  useEffect(() => {
    cargarFormatosQa();
    if (subView === 'mis-equipos') cargarEquipos();
    if (subView === 'mis-actas')   cargarActas();
  }, [subView]);

  /* ── agrupar por OT ── */
  const grupos = useMemo(() => {
    const map = new Map();
    equipos.forEach(eq => {
      const key = eq.numero_ot || 'SIN_OT';
      if (!map.has(key)) map.set(key, { numero_ot: eq.numero_ot, equipos: [] });
      map.get(key).equipos.push(eq);
    });
    return [...map.values()].sort((a, b) => {
      if (!a.numero_ot) return 1;
      if (!b.numero_ot) return -1;
      return (a.numero_ot || '').localeCompare(b.numero_ot || '');
    });
  }, [equipos]);

  const toggleOT = (key) => setExpandedOTs(p => ({ ...p, [key]: !p[key] }));
  const isOpen = (key) => expandedOTs[key] !== false; // open by default


  if (subView === 'seleccionar-formato-qa') {
  const equiposSeleccionados = subViewData?.equiposFiltrados || equipos;

  const formatosValidos = Array.isArray(formatosQa)
    ? formatosQa.filter(Boolean)
    : [];

  return (
    <div className="fade-in">
      <PageHeader
        title="Seleccionar formato QA"
        icon="ti-files"
        subtitle="Escoge el formato que deseas diligenciar"
        actions={
          <Btn
            variant="secondary"
            onClick={() => {
              setSubView('mis-equipos');
              setSubViewData(null);
            }}
            icon="ti-arrow-left"
          >
            Volver
          </Btn>
        }
      />

      <Card style={{ marginBottom: 16 }}>
        <div style={{ padding: 18 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Equipos incluidos:
            <strong style={{ color: 'var(--amber-glow)', marginLeft: 6 }}>
              {equiposSeleccionados.length}
            </strong>
          </div>
        </div>
      </Card>

      {formatosValidos.length === 0 ? (
        <EmptyState
          icon="ti-files-off"
          title="No hay formatos QA disponibles"
          subtitle="Revisa el endpoint /api/actas-qa/formatos en el backend."
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          {formatosValidos.map(formato => (
            <Card key={formato.id || formato.archivo || formato.nombre}>
              <div style={{ padding: 20 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: 'rgba(217,119,6,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(217,119,6,0.25)',
                    marginBottom: 14,
                  }}
                >
                  <i
                    className={`ti ${formato?.icon || 'ti-file-text'}`}
                    style={{ fontSize: 22, color: 'var(--amber-glow)' }}
                  />
                </div>

                <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>
                  {formato?.nombre || 'Formato QA'}
                </h3>

                <p
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: 13,
                    lineHeight: 1.5,
                    minHeight: 44,
                    marginBottom: 16,
                  }}
                >
                  {formato?.descripcion || 'Formato disponible para generación de acta QA.'}
                </p>

                <Btn
                  size="sm"
                  icon="ti-arrow-right"
                  disabled={!formato?.id}
                  onClick={() => {
                    if (!formato?.id) return;

                    setSubViewData(prev => ({
                      ...(prev || {}),
                      equiposFiltrados: equiposSeleccionados,
                      formatoQa: formato,
                    }));

                    setSubView('nueva-acta');
                  }}
                >
                  Usar formato
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

  /* ── sub-views ── */
  if (subView === 'nueva-acta') {
    return (
      <div style={{ padding: '0 0 32px' }}>
        <FormularioActaQA
          equiposAsignados={subViewData?.equiposFiltrados || equipos}
          formatoQa={subViewData?.formatoQa}
          token={token}
          onSuccess={() => {
            setSubView('mis-equipos');
            setSubViewData(null);
            cargarEquipos();
            refreshParent?.();
          }}
          onCancel={() => {
            setSubView('seleccionar-formato-qa');
          }}
        />
      </div>
    );
  }

  if (subView === 'mis-actas') {
    const QA_COLORS = { PENDIENTE: '#F97316', APROBADO: '#22C55E', RECHAZADO: '#EF4444' };
    return (
      <div className="fade-in">
        <PageHeader
          title={`Mis Actas QA — ${user?.nombre || ''}`}
          icon="ti-clipboard-check"
          actions={<Btn variant="secondary" onClick={() => setSubView('mis-equipos')} icon="ti-arrow-left">Volver</Btn>}
        />
        {loadingActas ? <Loading /> : actas.length === 0 ? (
          <EmptyState icon="ti-clipboard-off" title="Sin actas" subtitle="Aún no has generado ninguna acta QA" />
        ) : (
          <Card>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    {['ID', 'Formato', 'Fecha Ejecución', 'Fecha Creación', 'Lugar', 'Estado QA', 'Acciones'].map(h => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {actas.map(acta => {
                    const estado = acta.estado_qa || 'PENDIENTE';
                    const color  = QA_COLORS[estado] || '#94A3B8';
                    return (
                      <tr key={acta.id}>
                        <td className="mono" style={{ fontSize: 12 }}>#{acta.id}</td>
                        <td>{fmtFecha(acta.fecha_ejecucion)}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{fmtFecha(acta.created_at)}</td>
                        <td>{acta.lugar_instalacion || '—'}</td>
                        <td>{acta.nombre_formato || acta.tipo_formato || 'Acta QA'}</td>
                        <td>
                          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${color}18`, color, border: `1px solid ${color}30` }}>{estado}</span>
                        </td>
                        <td>
                          <Btn variant="ghost" size="sm" onClick={() => descargarPDF(acta.id)} icon="ti-file-description">PDF</Btn>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    );
  }

  /* ── mis equipos (default) ── */
  return (
    <div className="fade-in">
      <PageHeader
        title={`Mis Equipos — ${user?.nombre || ''}`}
        icon="ti-tool"
        subtitle={`${equipos.length} equipo(s) asignados`}
        actions={
          <>
            <Btn variant="secondary" size="sm" onClick={cargarEquipos} icon="ti-refresh">Refrescar</Btn>
            <Btn variant="ghost" size="sm" onClick={() => setSubView('mis-actas')} icon="ti-clipboard-list">Ver mis actas</Btn>
            <Btn
              size="sm"
              onClick={() => {
                setSubViewData({ equiposFiltrados: equipos });
                setSubView('seleccionar-formato-qa');
              }}
              icon="ti-plus"
            >
              Nueva Acta QA
            </Btn>
          </>
        }
      />

      {loading ? <Loading /> : equipos.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '48px', textAlign: 'center' }}>
          <i className="ti ti-package-off" style={{ fontSize: 40, color: 'var(--text-muted)', display: 'block', marginBottom: 12 }} />
          <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>No tienes equipos asignados actualmente</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {grupos.map(grupo => {
            const key = grupo.numero_ot || 'SIN_OT';
            const label = grupo.numero_ot || 'Sin OT';
            const open = isOpen(key);

            return (
              <Card key={key}>
                {/* Cabecera del grupo */}
                <div
                  onClick={() => toggleOT(key)}
                  style={{
                    padding: '14px 18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: 'rgba(255,255,255,0.02)',
                    flexWrap: 'wrap',
                    gap: 10,
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(217,119,6,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(217,119,6,0.25)' }}>
                      <i className="ti ti-file-invoice" style={{ fontSize: 17, color: 'var(--amber-glow)' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--amber-glow)' }}>OT: {label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{grupo.equipos.length} equipo(s)</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Btn
                      variant="success"
                      size="sm"
                      icon="ti-clipboard-check"
                      onClick={e => {
                        e.stopPropagation();
                        setSubViewData({ equiposFiltrados: grupo.equipos });
                        setSubView('seleccionar-formato-qa');
                      }}
                    >
                      Crear Acta QA
                    </Btn>
                    <i className={`ti ti-chevron-${open ? 'up' : 'down'}`} style={{ color: 'var(--text-muted)', fontSize: 16 }} />
                  </div>
                </div>

                {/* Tabla de equipos */}
                {open && (
                  <div className="fade-in" style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          {['Material', 'Descripción', 'Serie', 'Cantidad', 'Estado', 'Lote'].map(h => <th key={h}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.equipos.map(eq => {
                          const cantidad = eq.cantidad ?? 1;
                          const esConsumible = !eq.serial && cantidad > 0;
                          return (
                            <tr key={eq.id}>
                              <td className="mono" style={{ fontSize: 12 }}>{eq.material_id || '—'}</td>
                              <td>
                                <span style={{ fontWeight: 500 }}>{eq.material_descripcion || eq.descripcion || '—'}</span>
                                {esConsumible && (
                                  <span style={{ marginLeft: 8, fontSize: 10, background: 'rgba(59,130,246,0.12)', color: '#3B82F6', padding: '2px 7px', borderRadius: 12 }}>Consumible</span>
                                )}
                              </td>
                              <td className="mono" style={{ fontSize: 12 }}>{eq.serial || '—'}</td>
                              <td style={{ textAlign: 'center' }}>
                                {cantidad > 1
                                  ? <strong style={{ color: 'var(--amber-glow)', fontSize: 15 }}>{cantidad}</strong>
                                  : 1
                                }
                              </td>
                              <td>
                                <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(59,130,246,0.12)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.2)' }}>
                                  🔧 En terreno
                                </span>
                              </td>
                              <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{eq.lote || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
