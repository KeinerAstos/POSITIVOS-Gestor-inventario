import React, { useMemo, useState } from 'react';
import { http } from '../api.js';
import { Btn, Alert, Label, PageHeader } from './UI.jsx';
import '../styles/ReasignacionOTView.css';

const ESTADOS_BODEGA = ['STOCK', 'INGRESADO'];

const norm = (v) => String(v ?? '').trim().toLowerCase();
const estadoOk = (v) => ESTADOS_BODEGA.includes(String(v || '').toUpperCase());

export default function ReasignacionOTView({ inv = [], ots = [], refresh }) {
  const [otOrigen, setOtOrigen] = useState('');
  const [otOrigenId, setOtOrigenId] = useState(null);
  const [showOrigenDrop, setShowOrigenDrop] = useState(false);

  const [otDestino, setOtDestino] = useState('');
  const [otDestinoId, setOtDestinoId] = useState(null);
  const [otDestinoInfo, setOtDestinoInfo] = useState(null);
  const [showDestinoDrop, setShowDestinoDrop] = useState(false);

  const [nuevoOth, setNuevoOth] = useState('');
  const [observacion, setObservacion] = useState('');
  const [selectedEquipoIds, setSelectedEquipoIds] = useState([]);
  const [materialRows, setMaterialRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  const otsConInventario = useMemo(() => {
    const resumen = new Map();

    inv.forEach((item) => {
      if (!item.ot_id || !estadoOk(item.estado)) return;

      const id = Number(item.ot_id);
      const actual = resumen.get(id) || { equipos: 0, materiales: 0, cantidad: 0 };

      if (item.serial) actual.equipos += 1;
      else if (Number(item.cantidad || 0) > 0) {
        actual.materiales += 1;
        actual.cantidad += Number(item.cantidad || 0);
      }

      resumen.set(id, actual);
    });

    return ots
      .filter((o) => resumen.has(Number(o.id)))
      .map((o) => ({ ...o, _resumen: resumen.get(Number(o.id)) }));
  }, [inv, ots]);

  const filteredOrigenOTs = useMemo(() => {
    const t = norm(otOrigen);
    if (t.length < 2 || otOrigenId) return [];

    return otsConInventario
      .filter((o) =>
        norm(o.numero_ot).includes(t) ||
        norm(o.cliente).includes(t) ||
        norm(o.destino).includes(t)
      )
      .slice(0, 8);
  }, [otOrigen, otOrigenId, otsConInventario]);

  const filteredDestinoOTs = useMemo(() => {
    const t = norm(otDestino);
    if (t.length < 2 || otDestinoId) return [];

    return ots
      .filter((o) =>
        Number(o.id) !== Number(otOrigenId) &&
        (
          norm(o.numero_ot).includes(t) ||
          norm(o.cliente).includes(t) ||
          norm(o.destino).includes(t)
        )
      )
      .slice(0, 8);
  }, [otDestino, otDestinoId, ots, otOrigenId]);

  const itemsOrigen = useMemo(() => {
    if (!otOrigenId) return [];

    return inv.filter((i) =>
      Number(i.ot_id) === Number(otOrigenId) &&
      estadoOk(i.estado) &&
      (i.serial || Number(i.cantidad || 0) > 0)
    );
  }, [inv, otOrigenId]);

  const equiposOrigen = useMemo(() => itemsOrigen.filter((i) => i.serial), [itemsOrigen]);
  const materialesOrigen = useMemo(() => itemsOrigen.filter((i) => !i.serial && Number(i.cantidad || 0) > 0), [itemsOrigen]);

  const selectedMaterialRows = useMemo(() => materialRows.filter((m) => m.selected), [materialRows]);

  const totalCantidadMaterial = useMemo(() => {
    return selectedMaterialRows.reduce((acc, m) => acc + Number(m.cantidad || 0), 0);
  }, [selectedMaterialRows]);

  const seleccionarOrigen = (ot) => {
    const origenItems = inv.filter((i) =>
      Number(i.ot_id) === Number(ot.id) &&
      estadoOk(i.estado) &&
      (i.serial || Number(i.cantidad || 0) > 0)
    );

    const equipos = origenItems.filter((i) => i.serial);
    const materiales = origenItems.filter((i) => !i.serial && Number(i.cantidad || 0) > 0);

    setOtOrigen(ot.numero_ot || `OT #${ot.id}`);
    setOtOrigenId(ot.id);
    setShowOrigenDrop(false);
    setSelectedEquipoIds(equipos.map((i) => i.id));
    setMaterialRows(materiales.map((m) => ({
      id: m.id,
      selected: true,
      cantidad: Number(m.cantidad || 1),
      disponible: Number(m.cantidad || 1),
    })));
    setAlert(null);
  };

  const limpiarOrigen = () => {
    setOtOrigen('');
    setOtOrigenId(null);
    setShowOrigenDrop(false);
    setSelectedEquipoIds([]);
    setMaterialRows([]);
  };

  const seleccionarDestino = (ot) => {
    setOtDestino(ot.numero_ot || `OT #${ot.id}`);
    setOtDestinoId(ot.id);
    setOtDestinoInfo(ot);
    setShowDestinoDrop(false);
  };

  const limpiarDestino = () => {
    setOtDestino('');
    setOtDestinoId(null);
    setOtDestinoInfo(null);
    setShowDestinoDrop(false);
  };

  const toggleEquipo = (id) => {
    setSelectedEquipoIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleTodosEquipos = () => {
    if (selectedEquipoIds.length === equiposOrigen.length) setSelectedEquipoIds([]);
    else setSelectedEquipoIds(equiposOrigen.map((i) => i.id));
  };

  const toggleMaterial = (id) => {
    setMaterialRows((prev) => prev.map((m) =>
      m.id === id ? { ...m, selected: !m.selected } : m
    ));
  };

  const toggleTodosMateriales = () => {
    const todos = materialRows.length > 0 && materialRows.every((m) => m.selected);
    setMaterialRows((prev) => prev.map((m) => ({ ...m, selected: !todos })));
  };

  const cambiarCantidadMaterial = (id, value) => {
    setMaterialRows((prev) => prev.map((m) => {
      if (m.id !== id) return m;
      const next = Math.max(1, Math.min(Number(value || 1), Number(m.disponible || 1)));
      return { ...m, cantidad: next };
    }));
  };

  const handleSubmit = async () => {
    const ids = selectedEquipoIds;
    const mats = selectedMaterialRows;

    if (!otOrigenId) return setAlert({ type: 'error', msg: 'Selecciona la OT origen.' });
    if (!otDestinoId) return setAlert({ type: 'error', msg: 'Selecciona la OT destino.' });
    if (Number(otOrigenId) === Number(otDestinoId)) return setAlert({ type: 'error', msg: 'La OT destino no puede ser igual a la OT origen.' });
    if (!ids.length && !mats.length) return setAlert({ type: 'error', msg: 'Selecciona al menos un equipo o material.' });

    setSaving(true);
    setAlert(null);

    try {
      const uid = window.CURRENT_USER_ID || 1;

      for (const id of ids) {
        await http.post('/inventario/reasignar-ot', {
          inventario_id: id,
          ot_destino: otDestinoId,
          oth: nuevoOth || null,
          usuario_id: uid,
          observacion: observacion || 'Reasignación entre OT',
        });
      }

      for (const mat of mats) {
        await http.post('/inventario/reasignar-ot', {
          inventario_id: Number(mat.id),
          ot_destino: otDestinoId,
          oth: nuevoOth || null,
          usuario_id: uid,
          observacion: observacion || 'Reasignación de material',
          cantidad: Number(mat.cantidad || 1),
        });
      }

      await refresh();
      limpiarOrigen();
      limpiarDestino();
      setNuevoOth('');
      setObservacion('');
      setAlert({ type: 'success', msg: 'Reasignación completada correctamente.' });
    } catch (err) {
      setAlert({ type: 'error', msg: err.message || 'Error realizando la reasignación.' });
    } finally {
      setSaving(false);
    }
  };

  const renderOtOption = (o) => (
    <button type="button" key={o.id} className="rot-option" onMouseDown={(e) => e.preventDefault()} onClick={() => seleccionarOrigen(o)}>
      <div>
        <strong>{o.numero_ot || `OT #${o.id}`}</strong>
        <span>{o.cliente || 'Sin cliente'}{o.destino ? ` · ${o.destino}` : ''}</span>
      </div>
      <div className="rot-option-meta">
        <span>{o._resumen?.equipos || 0} eq</span>
        <span>{o._resumen?.materiales || 0} mat</span>
      </div>
    </button>
  );

  return (
    <div className="rot-page">
      <PageHeader title="Reasignar entre OT" icon="ti-switch-horizontal" subtitle="Mueve equipos y materiales de una OT a otra" />

      {alert && <Alert type={alert.type} msg={alert.msg} onClose={() => setAlert(null)} />}

      <section className="rot-panel rot-hero">
        <div className="rot-panel-head">
          <div>
            <h3>Datos de reasignación</h3>
            <p>Selecciona una OT origen con inventario disponible, define la OT destino y confirma los elementos a mover.</p>
          </div>
          <div className="rot-kpis">
            <span>{selectedEquipoIds.length} equipos</span>
            <span>{selectedMaterialRows.length} materiales</span>
            <span>{totalCantidadMaterial} unidades</span>
          </div>
        </div>

        <div className="rot-form-grid">
          <div className="rot-field rot-search-field">
            <Label required>OT origen</Label>
            <div className="rot-input-icon">
              <i className="ti ti-file-search" />
              <input
                value={otOrigen}
                onChange={(e) => {
                  setOtOrigen(e.target.value);
                  setOtOrigenId(null);
                  setSelectedEquipoIds([]);
                  setMaterialRows([]);
                  setShowOrigenDrop(true);
                }}
                onFocus={() => setShowOrigenDrop(true)}
                placeholder="Buscar por número de OT, cliente o destino..."
              />
              {otOrigen && <button type="button" onClick={limpiarOrigen}>×</button>}
            </div>

            {showOrigenDrop && filteredOrigenOTs.length > 0 && (
              <div className="rot-dropdown">
                {filteredOrigenOTs.map(renderOtOption)}
              </div>
            )}
          </div>

          <div className="rot-field rot-search-field">
            <Label required>OT destino</Label>
            <div className="rot-input-icon">
              <i className="ti ti-file-invoice" />
              <input
                value={otDestino}
                onChange={(e) => {
                  setOtDestino(e.target.value);
                  setOtDestinoId(null);
                  setOtDestinoInfo(null);
                  setShowDestinoDrop(true);
                }}
                onFocus={() => setShowDestinoDrop(true)}
                placeholder="Buscar por número de OT, cliente o destino..."
              />
              {otDestino && <button type="button" onClick={limpiarDestino}>×</button>}
            </div>

            {showDestinoDrop && filteredDestinoOTs.length > 0 && (
              <div className="rot-dropdown">
                {filteredDestinoOTs.map((o) => (
                  <button type="button" key={o.id} className="rot-option" onMouseDown={(e) => e.preventDefault()} onClick={() => seleccionarDestino(o)}>
                    <div>
                      <strong>{o.numero_ot || `OT #${o.id}`}</strong>
                      <span>{o.cliente || 'Sin cliente'}{o.destino ? ` · ${o.destino}` : ''}</span>
                    </div>
                    <div className="rot-status-pill">{o.estado || 'OT'}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rot-field">
            <Label>Nuevo OTH</Label>
            <div className="rot-input-icon">
              <i className="ti ti-hash" />
              <input value={nuevoOth} onChange={(e) => setNuevoOth(e.target.value)} placeholder="Opcional si cambia..." />
            </div>
          </div>
        </div>

        {(otOrigenId || otDestinoInfo) && (
          <div className="rot-route">
            <div><span>Origen</span><strong>{otOrigen || 'Sin seleccionar'}</strong></div>
            <i className="ti ti-arrow-right" />
            <div><span>Destino</span><strong>{otDestinoInfo?.numero_ot || otDestino || 'Sin seleccionar'}</strong></div>
          </div>
        )}
      </section>

      <section className="rot-panel">
        <div className="rot-section-title">
          <div>
            <i className="ti ti-barcode" />
            <div>
              <h3>Equipos serializados</h3>
              <p>{selectedEquipoIds.length} de {equiposOrigen.length} seleccionados</p>
            </div>
          </div>
        </div>

        {!otOrigenId && <div className="rot-empty">Selecciona una OT origen para cargar los equipos.</div>}
        {otOrigenId && equiposOrigen.length === 0 && <div className="rot-empty">La OT origen no tiene equipos serializados disponibles.</div>}

        {equiposOrigen.length > 0 && (
          <div className="rot-table-wrap">
            <div className="rot-table rot-equipment-table">
              <div className="rot-tr rot-th">
                <div><input type="checkbox" checked={selectedEquipoIds.length === equiposOrigen.length} onChange={toggleTodosEquipos} /></div>
                <div>Código SAP</div>
                <div>Descripción</div>
                <div>Serial</div>
                <div>Estado</div>
                <div>Ubicación</div>
              </div>
              {equiposOrigen.map((i) => {
                const checked = selectedEquipoIds.includes(i.id);
                return (
                  <label key={i.id} className={`rot-tr rot-td ${checked ? 'is-selected' : ''}`}>
                    <div><input type="checkbox" checked={checked} onChange={() => toggleEquipo(i.id)} /></div>
                    <div className="rot-strong">{i.material_id || '-'}</div>
                    <div title={i.descripcion || i.material_descripcion || ''}>{i.descripcion || i.material_descripcion || '-'}</div>
                    <div className="rot-mono">{i.serial || '-'}</div>
                    <div><span className={`rot-badge rot-badge-${String(i.estado || '').toLowerCase()}`}>{i.estado || '-'}</span></div>
                    <div>{i.ubicacion || 'Sin ubicación'}</div>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section className="rot-panel">
        <div className="rot-section-title">
          <div>
            <i className="ti ti-package" />
            <div>
              <h3>Materiales no serializados</h3>
              <p>{selectedMaterialRows.length} de {materialesOrigen.length} seleccionados · {totalCantidadMaterial} unidades</p>
            </div>
          </div>
        </div>

        {!otOrigenId && <div className="rot-empty">Selecciona una OT origen para cargar los materiales.</div>}
        {otOrigenId && materialesOrigen.length === 0 && <div className="rot-empty">La OT origen no tiene materiales disponibles.</div>}

        {materialesOrigen.length > 0 && (
          <div className="rot-table-wrap">
            <div className="rot-table rot-material-table">
              <div className="rot-tr rot-th">
                <div><input type="checkbox" checked={materialRows.length > 0 && materialRows.every((m) => m.selected)} onChange={toggleTodosMateriales} /></div>
                <div>Código SAP</div>
                <div>Descripción</div>
                <div>Disponible</div>
                <div>A reasignar</div>
                <div>Estado</div>
                <div>Ubicación</div>
              </div>
              {materialesOrigen.map((i) => {
                const row = materialRows.find((m) => m.id === i.id) || { selected: false, cantidad: 1, disponible: i.cantidad };
                return (
                  <label key={i.id} className={`rot-tr rot-td ${row.selected ? 'is-selected' : ''}`}>
                    <div><input type="checkbox" checked={row.selected} onChange={() => toggleMaterial(i.id)} /></div>
                    <div className="rot-strong">{i.material_id || '-'}</div>
                    <div title={i.descripcion || i.material_descripcion || ''}>{i.descripcion || i.material_descripcion || '-'}</div>
                    <div><span className="rot-qty">{i.cantidad || 0}</span></div>
                    <div>
                      <input
                        className="rot-qty-input"
                        type="number"
                        min="1"
                        max={row.disponible || 1}
                        disabled={!row.selected}
                        value={row.cantidad}
                        onChange={(e) => cambiarCantidadMaterial(i.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div><span className={`rot-badge rot-badge-${String(i.estado || '').toLowerCase()}`}>{i.estado || '-'}</span></div>
                    <div>{i.ubicacion || 'Sin ubicación'}</div>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section className="rot-panel rot-footer-panel">
        <div className="rot-field">
          <Label>Observación</Label>
          <textarea value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Motivo de la reasignación..." />
        </div>
        <div className="rot-summary">
          <div><span>Origen</span><strong>{otOrigen || 'Sin seleccionar'}</strong></div>
          <div><span>Destino</span><strong>{otDestino || 'Sin seleccionar'}</strong></div>
          <Btn onClick={handleSubmit} loading={saving} icon="ti-switch-horizontal" disabled={saving}>
            Confirmar Reasignación
          </Btn>
        </div>
      </section>
    </div>
  );
}