import React, { useMemo, useState } from 'react';
import { http } from '../api.js';
import { Card, CardHeader, Btn, Alert, Label, PageHeader } from './UI.jsx';
import '../styles/AsignacionView.css';

export default function AsignacionView({ inv = [], ots = [], tecnicos = [], refresh }) {
  const [otBusqueda, setOtBusqueda] = useState('');
  const [otId, setOtId] = useState(null);
  const [showOtList, setShowOtList] = useState(false);
  const [tecnicoId, setTecnicoId] = useState('');
  const [seleccionados, setSeleccionados] = useState([]);
  const [observacion, setObservacion] = useState('');
  const [alert, setAlert] = useState(null);
  const [saving, setSaving] = useState(false);

  const ESTADOS_ASIGNABLES = ['STOCK', 'INGRESADO', 'DEVUELTO'];

  const otsConEquipos = useMemo(() => {
    const ids = new Set(
      inv
        .filter(i =>
          i.ot_id &&
          ESTADOS_ASIGNABLES.includes(String(i.estado || '').toUpperCase())
        )
        .map(i => Number(i.ot_id))
    );

    return ots.filter(o => ids.has(Number(o.id)));
  }, [inv, ots]);

  const otsFiltradas = useMemo(() => {
    const t = otBusqueda.trim().toLowerCase();
    if (t.length < 2 || otId) return [];

    return otsConEquipos
      .filter(o =>
        String(o.numero_ot || '').toLowerCase().includes(t) ||
        String(o.cliente || '').toLowerCase().includes(t) ||
        String(o.destino || '').toLowerCase().includes(t)
      )
      .slice(0, 10);
  }, [otBusqueda, otsConEquipos, otId]);

  const equiposDeOT = useMemo(() => {
    if (!otId) return [];

    return inv.filter(i =>
      Number(i.ot_id) === Number(otId) &&
      ESTADOS_ASIGNABLES.includes(String(i.estado || '').toUpperCase())
    );
  }, [inv, otId]);

  const totalCantidadSeleccionada = useMemo(() => {
    return equiposDeOT
      .filter(i => seleccionados.includes(i.id))
      .reduce((acc, i) => acc + Number(i.cantidad || 0), 0);
  }, [equiposDeOT, seleccionados]);

  const tecnicoSeleccionado = useMemo(() => {
    return tecnicos.find(t => Number(t.id) === Number(tecnicoId));
  }, [tecnicos, tecnicoId]);

  const toggleEquipo = (id) => {
    setSeleccionados(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  const toggleTodos = () => {
    if (!equiposDeOT.length) return;

    if (seleccionados.length === equiposDeOT.length) {
      setSeleccionados([]);
    } else {
      setSeleccionados(equiposDeOT.map(i => i.id));
    }
  };

  const limpiarOT = () => {
    setOtBusqueda('');
    setOtId(null);
    setSeleccionados([]);
    setShowOtList(false);
  };

  const seleccionarOT = (o) => {
    setOtBusqueda(o.numero_ot || `OT #${o.id}`);
    setOtId(o.id);
    setSeleccionados([]);
    setShowOtList(false);
  };

  const asignar = async () => {
    if (!otId) return setAlert({ type: 'error', msg: 'Selecciona una OT.' });
    if (!tecnicoId) return setAlert({ type: 'error', msg: 'Selecciona un técnico.' });
    if (!seleccionados.length) return setAlert({ type: 'error', msg: 'Selecciona al menos un equipo.' });

    setSaving(true);
    setAlert(null);

    try {
      await http.post('/inventario/asignar', {
        inventario_ids: seleccionados,
        materiales_no_serializados: [],
        ot_id: Number(otId),
        usuario_asignado: Number(tecnicoId),
        observacion: observacion || 'Entrega a técnico'
      });

      await refresh();
      limpiarOT();
      setTecnicoId('');
      setObservacion('');
      setAlert({ type: 'success', msg: 'Equipos entregados al técnico correctamente.' });
    } catch (err) {
      setAlert({ type: 'error', msg: err.message || 'Error entregando equipos al técnico.' });
    } finally {
      setSaving(false);
    }
  };

  const estadoClass = (estado) => {
    const e = String(estado || '').toUpperCase();
    if (e === 'STOCK') return 'asig-badge-ok';
    if (e === 'INGRESADO') return 'asig-badge-info';
    if (e === 'DEVUELTO') return 'asig-badge-warn';
    return 'asig-badge-info';
  };

  return (
    <div className="asig-page">
      <PageHeader
        title="Entrega a Técnico"
        icon="ti-user-check"
        subtitle="Asigna equipos de una OT a un técnico"
      />

      {alert && <Alert type={alert.type} msg={alert.msg} onClose={() => setAlert(null)} />}

      <Card>
        <CardHeader title="Datos de asignación" icon="ti-file-invoice" />

        <div className="asig-form">
          <div className="asig-field asig-search-field">
            <Label required>Buscar OT</Label>

            <div className="asig-control">
              <i className="ti ti-search" />

              <input
                value={otBusqueda}
                onChange={e => {
                  setOtBusqueda(e.target.value);
                  setOtId(null);
                  setSeleccionados([]);
                  setShowOtList(true);
                }}
                onFocus={() => setShowOtList(true)}
                placeholder="Escribe número de OT, cliente o destino..."
              />

              {otBusqueda && (
                <button type="button" onClick={limpiarOT} className="asig-clear-btn">
                  ×
                </button>
              )}
            </div>

            {showOtList && otsFiltradas.length > 0 && (
              <div className="asig-ot-list">
                {otsFiltradas.map(o => (
                  <button
                    type="button"
                    key={o.id}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => seleccionarOT(o)}
                    className="asig-ot-item"
                  >
                    <div>
                      <strong>{o.numero_ot || `OT #${o.id}`}</strong>
                      <span>{o.cliente || 'Sin cliente'} {o.destino ? `· ${o.destino}` : ''}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="asig-field">
            <Label required>Técnico</Label>

            <div className="asig-control">
              <i className="ti ti-user-check" />

              <select value={tecnicoId} onChange={e => setTecnicoId(e.target.value)}>
                <option value="">Seleccionar técnico...</option>
                {tecnicos.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} - {t.cedula}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="asig-field">
            <Label>Observación</Label>

            <textarea
              value={observacion}
              onChange={e => setObservacion(e.target.value)}
              placeholder="Motivo de entrega..."
              maxLength={200}
            />

            <div className="asig-counter">{observacion.length} / 200</div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Equipos disponibles en la OT"
          icon="ti-package"
          subtitle={`${equiposDeOT.length} disponibles`}
        />

        <div className="asig-table-wrap">
          {!otId && (
            <div className="asig-empty">
              Busca y selecciona una OT para cargar los equipos.
            </div>
          )}

          {otId && equiposDeOT.length === 0 && (
            <Alert
              type="error"
              msg="Esta OT no tiene equipos disponibles para entregar a técnico."
            />
          )}

          {equiposDeOT.length > 0 && (
            <div className="asig-table">
              <div className="asig-row asig-head">
                <div>
                  <input
                    type="checkbox"
                    checked={equiposDeOT.length > 0 && seleccionados.length === equiposDeOT.length}
                    onChange={toggleTodos}
                  />
                </div>
                <div>Código SAP</div>
                <div>Descripción</div>
                <div>Serial</div>
                <div>Cantidad</div>
                <div>Estado</div>
                <div>Ubicación</div>
              </div>

              {equiposDeOT.map(i => {
                const checked = seleccionados.includes(i.id);

                return (
                  <label
                    key={i.id}
                    className={`asig-row asig-body ${checked ? 'is-selected' : ''}`}
                  >
                    <div>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEquipo(i.id)}
                      />
                    </div>

                    <div className="asig-code">{i.material_id || '-'}</div>
                    <div title={i.descripcion || i.material_descripcion || ''}>
                      {i.descripcion || i.material_descripcion || '-'}
                    </div>
                    <div>{i.serial || 'Sin serie'}</div>
                    <div>
                      <span className="asig-qty">{i.cantidad || 0}</span>
                    </div>
                    <div>
                      <span className={`asig-badge ${estadoClass(i.estado)}`}>
                        {i.estado}
                      </span>
                    </div>
                    <div>{i.ubicacion || 'Sin ubicación'}</div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="asig-footer">
          <div>
            <i className="ti ti-users" />
            <strong>{seleccionados.length}</strong> equipos seleccionados
          </div>

          <div>
            Técnico:
            <strong>{tecnicoSeleccionado?.nombre || 'Sin seleccionar'}</strong>
          </div>

          <div>
            Total cantidad:
            <span className="asig-total">{totalCantidadSeleccionada}</span>
          </div>
        </div>

        <div className="asig-actions">
          <Btn onClick={asignar} loading={saving} icon="ti-send">
            Entregar a Técnico
          </Btn>
        </div>
      </Card>
    </div>
  );
}