// components/ReasignacionOTView.js (corregido)
function ReasignacionOTView({ inv, ots, refresh }) {
    const listaInventario = Array.isArray(inv) ? inv : [];
    const listaOts = Array.isArray(ots) ? ots : [];

    const [equipos, setEquipos] = React.useState([{ 
        buscar: '', id: null, desc: '', serial: '', 
        ot_actual_id: null, ot_actual_numero: '', oth_actual: '', error: false 
    }]);
    const [materiales, setMateriales] = React.useState([{ 
        inventario_id: '', cantidad: 1, disponible: 0, 
        ot_actual_id: null, ot_actual_numero: '', oth_actual: '' 
    }]);
    const [otDestino, setOtDestino] = React.useState('');
    const [otDestinoId, setOtDestinoId] = React.useState(null);
    const [otDestinoInfo, setOtDestinoInfo] = React.useState(null);
    const [showOtDropdown, setShowOtDropdown] = React.useState(false);
    const [nuevoOth, setNuevoOth] = React.useState('');
    const [observacion, setObservacion] = React.useState('');
    const [saving, setSaving] = React.useState(false);
    const [alert, setAlert] = React.useState(null);
    const [activeDropdown, setActiveDropdown] = React.useState(null);

    const usuarioId = window.CURRENT_USER_ID || 1;

    const equiposConOT = listaInventario.filter(i =>
        i.serial && i.ot_id !== null && (i.estado === 'STOCK' || i.estado === 'INGRESADO')
    );
    const materialesConOT = listaInventario.filter(i =>
        !i.serial && i.cantidad > 0 && (i.estado === 'INGRESADO' || i.estado === 'STOCK')
    );

    const getFilteredOTs = () => {
        if (!otDestino.trim()) return [];
        const term = otDestino.toLowerCase();
        return listaOts.filter(ot => {
            const numero = (ot.numero_ot || '').toLowerCase();
            const cliente = (ot.cliente || '').toLowerCase();
            const match = numero.includes(term) || cliente.includes(term);
            const currentOtId = equipos[0]?.ot_actual_id;
            return match && ot.id !== currentOtId;
        }).slice(0, 8);
    };
    const filteredOTs = getFilteredOTs();

    // Equipos serializados
    const handleEquipoSearchChange = (index, value) => {
        const nuevos = [...equipos];
        nuevos[index].buscar = value;
        nuevos[index].id = null;
        nuevos[index].ot_actual_id = null;
        nuevos[index].ot_actual_numero = '';
        nuevos[index].oth_actual = '';
        setEquipos(nuevos);
        setActiveDropdown(index);
    };

    const seleccionarEquipoPredictivo = (index, item) => {
        const nuevos = [...equipos];
        nuevos[index].buscar = item.serial;
        nuevos[index].id = item.id;
        nuevos[index].desc = item.descripcion || item.material_id;
        nuevos[index].serial = item.serial;
        nuevos[index].ot_actual_id = item.ot_id;
        nuevos[index].ot_actual_numero = item.numero_ot || '';
        nuevos[index].oth_actual = item.oth || '';
        setEquipos(nuevos);
        setActiveDropdown(null);
    };

    const agregarFilaEquipo = () => setEquipos([...equipos, { 
        buscar: '', id: null, desc: '', serial: '', 
        ot_actual_id: null, ot_actual_numero: '', oth_actual: '', error: false 
    }]);
    const eliminarFilaEquipo = (index) => {
        if (equipos.length === 1) {
            setEquipos([{ buscar: '', id: null, desc: '', serial: '', ot_actual_id: null, ot_actual_numero: '', oth_actual: '', error: false }]);
        } else {
            setEquipos(equipos.filter((_, i) => i !== index));
        }
    };

    // Materiales no serializados
    const handleMaterialChange = (index, invId) => {
        const nuevos = [...materiales];
        nuevos[index].inventario_id = invId;
        const match = materialesConOT.find(i => i.id === parseInt(invId));
        nuevos[index].disponible = match ? match.cantidad : 0;
        nuevos[index].ot_actual_id = match ? match.ot_id : null;
        nuevos[index].ot_actual_numero = match ? (match.numero_ot || '') : '';
        nuevos[index].oth_actual = match ? (match.oth || '') : '';
        // Reiniciar cantidad a 1
        nuevos[index].cantidad = 1;
        setMateriales(nuevos);
    };

    const handleMaterialCantChange = (index, cant) => {
        const nuevos = [...materiales];
        let nuevaCant = parseInt(cant);
        if (isNaN(nuevaCant) || nuevaCant < 1) nuevaCant = 1;
        const disponible = nuevos[index].disponible;
        if (nuevaCant > disponible) nuevaCant = disponible;
        nuevos[index].cantidad = nuevaCant;
        setMateriales(nuevos);
    };

    const agregarFilaMaterial = () => setMateriales([...materiales, { 
        inventario_id: '', cantidad: 1, disponible: 0, 
        ot_actual_id: null, ot_actual_numero: '', oth_actual: '' 
    }]);
    const eliminarFilaMaterial = (index) => {
        if (materiales.length === 1) {
            setMateriales([{ inventario_id: '', cantidad: 1, disponible: 0, ot_actual_id: null, ot_actual_numero: '', oth_actual: '' }]);
        } else {
            setMateriales(materiales.filter((_, i) => i !== index));
        }
    };

    // Selección OT destino
    const selectOTDestino = (ot) => {
        setOtDestino(ot.numero_ot || `OT #${ot.id}`);
        setOtDestinoId(ot.id);
        setOtDestinoInfo(ot);
        setShowOtDropdown(false);
    };
    const handleOtDestinoChange = (e) => {
        setOtDestino(e.target.value);
        setShowOtDropdown(true);
        if (otDestinoId) {
            setOtDestinoId(null);
            setOtDestinoInfo(null);
        }
    };
    const clearOtDestino = () => {
        setOtDestino('');
        setOtDestinoId(null);
        setOtDestinoInfo(null);
        setShowOtDropdown(false);
    };

    const getOTInfo = (otId) => listaOts.find(ot => ot.id === otId);

    // Envío corregido
    const handleReasignar = async () => {
        const idsEquipos = equipos.filter(e => e.id !== null).map(e => e.id);
        const materialesValidos = materiales.filter(m => m.inventario_id !== '');

        if (idsEquipos.length === 0 && materialesValidos.length === 0) {
            setAlert({ type: 'error', msg: 'Debes seleccionar al menos un equipo o material para reasignar.' });
            return;
        }
        if (!otDestinoId) {
            setAlert({ type: 'error', msg: 'Debes seleccionar una OT de destino.' });
            return;
        }

        setSaving(true);
        setAlert(null);

        try {
            // Reasignar equipos serializados (no necesitan cantidad)
            for (const id of idsEquipos) {
                await http.post('/inventario/reasignar-ot', {
                    inventario_id: id,
                    ot_destino: otDestinoId,
                    oth: nuevoOth || null,
                    usuario_id: usuarioId,
                    observacion: observacion || 'Reasignación entre OT'
                });
            }
            // Reasignar materiales no serializados (con cantidad)
            for (const mat of materialesValidos) {
                await http.post('/inventario/reasignar-ot', {
                    inventario_id: parseInt(mat.inventario_id),
                    ot_destino: otDestinoId,
                    oth: nuevoOth || null,
                    usuario_id: usuarioId,
                    observacion: observacion || 'Reasignación de material entre OT',
                    cantidad: mat.cantidad   // ← aquí está la clave
                });
            }

            if (typeof refresh === 'function') await refresh();

            // Resetear formulario
            setEquipos([{ buscar: '', id: null, desc: '', serial: '', ot_actual_id: null, ot_actual_numero: '', oth_actual: '', error: false }]);
            setMateriales([{ inventario_id: '', cantidad: 1, disponible: 0, ot_actual_id: null, ot_actual_numero: '', oth_actual: '' }]);
            setOtDestino('');
            setOtDestinoId(null);
            setOtDestinoInfo(null);
            setNuevoOth('');
            setObservacion('');
            setAlert({ type: 'success', msg: 'Elementos reasignados correctamente.' });

        } catch (err) {
            setAlert({ type: 'error', msg: err.message || 'Error al procesar la reasignación.' });
        } finally {
            setSaving(false);
        }
    };

    // Efectos para cerrar dropdowns
    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setActiveDropdown(null);
                setShowOtDropdown(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    React.useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.ot-destino-container')) setShowOtDropdown(false);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const getEstadoColor = (estado) => {
        switch(estado) {
            case 'STOCK': return '#2e7d32';
            case 'INGRESADO': return '#ed6c02';
            case 'TERRENO': return '#0288d1';
            case 'CONSUMO': return '#6b7280';
            case 'DEVUELTO': return '#757575';
            default: return '#9e9e9e';
        }
    };

    return React.createElement('div', { style: { maxWidth: '1000px', margin: '0 auto' } },
        React.createElement('h2', { style: { margin: '0 0 1.25rem', fontWeight: 500, fontSize: 18 } }, '🔄 Reasignar Equipos y Materiales entre OT'),
        alert && React.createElement(Alert, { type: alert.type, msg: alert.msg, onClose: () => setAlert(null) }),

        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
            // CARD 1: OT DESTINO (sin cambios)
            React.createElement('div', { style: { ...CARD, padding: '1.25rem' } },
                React.createElement('p', { style: { margin: '0 0 1rem', fontWeight: 500, fontSize: 14 } }, '📋 OT Destino'),
                React.createElement('div', { className: 'ot-destino-container', style: { position: 'relative', marginBottom: 16 } },
                    React.createElement('label', { style: LBL }, 'Buscar OT Destino *'),
                    React.createElement('div', { style: { position: 'relative' } },
                        React.createElement('input', {
                            type: 'text',
                            value: otDestino,
                            onChange: handleOtDestinoChange,
                            onFocus: () => setShowOtDropdown(true),
                            placeholder: 'Escribe número de OT o cliente...',
                            style: { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }
                        }),
                        otDestino && React.createElement('button', { onClick: clearOtDestino, style: { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#999' } }, '×')
                    ),
                    showOtDropdown && filteredOTs.length > 0 && React.createElement('div', { style: { position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: 250, overflowY: 'auto', marginTop: 4 } },
                        filteredOTs.map(ot => React.createElement('div', { key: ot.id, onClick: () => selectOTDestino(ot), style: { padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }, onMouseEnter: e => e.currentTarget.style.background = 'var(--bg-secondary)', onMouseLeave: e => e.currentTarget.style.background = 'white' },
                            React.createElement('strong', null, ot.numero_ot || `OT #${ot.id}`),
                            React.createElement('div', { style: { fontSize: 12, color: '#666' } }, ot.cliente || 'Sin cliente'),
                            ot.destino && React.createElement('div', { style: { fontSize: 11, color: '#999' } }, ot.destino)
                        ))
                    )
                ),
                otDestinoInfo && React.createElement('div', { style: { background: 'var(--bg-secondary)', padding: 12, borderRadius: 6 } },
                    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                        React.createElement('div', null,
                            React.createElement('strong', null, otDestinoInfo.numero_ot || `OT #${otDestinoInfo.id}`),
                            React.createElement('div', { style: { fontSize: 12, marginTop: 4 } }, 'Cliente: ' + (otDestinoInfo.cliente || 'N/A')),
                            React.createElement('div', { style: { fontSize: 12 } }, 'Destino: ' + (otDestinoInfo.destino || 'N/A'))
                        ),
                        React.createElement('span', { style: { fontSize: 11, padding: '2px 8px', borderRadius: 12, background: otDestinoInfo.estado === 'ABIERTA' ? '#e8f5e9' : '#f5f5f5', color: otDestinoInfo.estado === 'ABIERTA' ? '#2e7d32' : '#999' } }, otDestinoInfo.estado === 'ABIERTA' ? '🟢 Activa' : '🔴 Cerrada')
                    )
                )
            ),

            // CARD 2: NUEVO OTH (opcional)
            React.createElement('div', { style: { ...CARD, padding: '1.25rem' } },
                React.createElement('label', { style: LBL }, 'Nuevo OTH (opcional)'),
                React.createElement('input', {
                    type: 'text',
                    value: nuevoOth,
                    onChange: e => setNuevoOth(e.target.value),
                    placeholder: 'Ingrese el nuevo número OTH si es necesario...',
                    style: { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)' }
                })
            ),

            // CARD 3: EQUIPOS SERIALIZADOS (sin cambios)
            React.createElement('div', { style: { ...CARD, padding: '1.25rem' } },
                React.createElement('p', { style: { margin: '0 0 1rem', fontWeight: 500, fontSize: 14 } }, '🔧 Equipos Serializados a Reasignar'),
                React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto', paddingRight: 4 } },
                    equipos.map((eq, idx) => {
                        const coincidencias = eq.buscar.trim().length > 1 ? equiposConOT.filter(i => i.serial.toLowerCase().includes(eq.buscar.toLowerCase())).slice(0, 5) : [];
                        const otInfo = getOTInfo(eq.ot_actual_id);
                        return React.createElement('div', { key: idx, style: { display: 'flex', gap: 6, alignItems: 'center', position: 'relative', marginBottom: 4 } },
                            React.createElement('div', { style: { flex: 2, position: 'relative' } },
                                React.createElement('input', {
                                    value: eq.buscar,
                                    onChange: e => handleEquipoSearchChange(idx, e.target.value),
                                    placeholder: 'Buscar por número de serie...',
                                    onFocus: () => setActiveDropdown(idx),
                                    style: { border: eq.id ? '1px solid #ed6c02' : '1px solid var(--border)', background: eq.id ? '#fff8f0' : 'white' }
                                }),
                                activeDropdown === idx && coincidencias.length > 0 && React.createElement('div', { style: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 6, zIndex: 99, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 200, overflowY: 'auto' } },
                                    coincidencias.map(item => React.createElement('div', { key: item.id, onClick: () => seleccionarEquipoPredictivo(idx, item), style: { padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--bg-secondary)' }, onMouseEnter: e => e.currentTarget.style.background = 'var(--bg-secondary)', onMouseLeave: e => e.currentTarget.style.background = 'white' },
                                        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                                            React.createElement('div', null,
                                                React.createElement('strong', { style: { fontSize: 13 } }, item.serial),
                                                React.createElement('div', { style: { fontSize: 11, color: '#666' } }, item.descripcion || item.material_id)
                                            ),
                                            React.createElement('span', { style: { fontSize: 10, padding: '2px 6px', borderRadius: 10, background: '#ed6c0220', color: '#ed6c02' } }, 
                                                `OT #${item.ot_id || '?'}`
                                            )
                                        ),
                                        item.oth && React.createElement('div', { style: { fontSize: 10, color: '#666', marginTop: 2 } }, `OTH: ${item.oth}`),
                                        React.createElement('div', { style: { fontSize: 10, color: '#666', marginTop: 2 } }, 'Cliente: ' + (getOTInfo(item.ot_id)?.cliente || 'N/A'))
                                    ))
                                )
                            ),
                            eq.id && React.createElement('div', { style: { flex: 2, fontSize: 12 } },
                                React.createElement('div', { style: { fontWeight: 500 } }, eq.desc),
                                React.createElement('div', { style: { fontSize: 10, color: '#ed6c02', marginTop: 2 } }, 
                                    'OT Actual: ' + (eq.ot_actual_numero || (otInfo ? (otInfo.numero_ot || `OT #${otInfo.id}`) : `OT #${eq.ot_actual_id}`))
                                ),
                                eq.oth_actual && React.createElement('div', { style: { fontSize: 10, color: '#666' } }, 'OTH actual: ' + eq.oth_actual),
                                otInfo && React.createElement('div', { style: { fontSize: 10, color: '#666' } }, 'Cliente: ' + (otInfo.cliente || 'N/A'))
                            ),
                            React.createElement('button', { onClick: () => eliminarFilaEquipo(idx), style: { padding: '8px 12px', background: '#FCEBEB', color: '#A32D2D', border: 'none', borderRadius: 6, cursor: 'pointer' } }, '×')
                        );
                    })
                ),
                React.createElement('button', { onClick: agregarFilaEquipo, style: { background: 'none', border: 'none', color: 'var(--amber)', fontSize: 12, cursor: 'pointer', marginTop: 10, padding: 0, fontWeight: 500 } }, '+ Agregar otro equipo')
            ),

            // CARD 4: MATERIALES NO SERIALIZADOS (con cantidad ahora se envía correctamente)
            React.createElement('div', { style: { ...CARD, padding: '1.25rem' } },
                React.createElement('p', { style: { margin: '0 0 1rem', fontWeight: 500, fontSize: 14 } }, '📦 Materiales No Serializados a Reasignar'),
                React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto', paddingRight: 4 } },
                    materiales.map((mat, idx) => {
                        const otInfo = getOTInfo(mat.ot_actual_id);
                        return React.createElement('div', { key: idx, style: { display: 'flex', gap: 6, alignItems: 'center' } },
                            React.createElement('select', {
                                value: mat.inventario_id,
                                onChange: e => handleMaterialChange(idx, e.target.value),
                                style: { flex: 2 }
                            },
                                React.createElement('option', { value: '' }, 'Seleccione material...'),
                                materialesConOT.map(m => React.createElement('option', { key: m.id, value: m.id }, 
                                    `${m.descripcion || m.material_id} (Stock: ${m.cantidad}, OT: ${m.numero_ot || m.ot_id})`
                                ))
                            ),
                            React.createElement('input', {
                                type: 'number',
                                value: mat.cantidad,
                                onChange: e => handleMaterialCantChange(idx, e.target.value),
                                placeholder: 'Cant',
                                min: 1,
                                max: mat.disponible || 1,
                                style: { width: 80 }
                            }),
                            mat.ot_actual_id && React.createElement('div', { style: { fontSize: 11, color: '#ed6c02', minWidth: 120 } }, 
                                `OT actual: ${mat.ot_actual_numero || otInfo?.numero_ot || mat.ot_actual_id}`
                            ),
                            mat.oth_actual && React.createElement('div', { style: { fontSize: 10, color: '#666', marginLeft: 8 } }, `OTH: ${mat.oth_actual}`),
                            React.createElement('button', { onClick: () => eliminarFilaMaterial(idx), style: { padding: '8px 12px', background: '#FCEBEB', color: '#A32D2D', border: 'none', borderRadius: 6, cursor: 'pointer' } }, '×')
                        );
                    })
                ),
                React.createElement('button', { onClick: agregarFilaMaterial, style: { background: 'none', border: 'none', color: 'var(--amber)', fontSize: 12, cursor: 'pointer', marginTop: 10, padding: 0, fontWeight: 500 } }, '+ Agregar otro material')
            ),

            // CARD 5: Observación y Resumen
            React.createElement('div', { style: { ...CARD, padding: '1.25rem' } },
                React.createElement('label', { style: LBL }, 'Observación (Opcional)'),
                React.createElement('textarea', {
                    value: observacion,
                    onChange: e => setObservacion(e.target.value),
                    placeholder: 'Motivo de la reasignación...',
                    style: { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', minHeight: 80, resize: 'vertical' }
                }),
                React.createElement('div', { style: { background: 'var(--bg-secondary)', padding: 12, borderRadius: 8, margin: '16px 0' } },
                    React.createElement('p', { style: { fontSize: 12, fontWeight: 500, marginBottom: 8 } }, '📊 Resumen de Reasignación'),
                    React.createElement('div', { style: { fontSize: 12, display: 'flex', flexDirection: 'column', gap: 8 } },
                        React.createElement('div', null, '🔧 Equipos serializados: ', equipos.filter(e => e.id).length),
                        React.createElement('div', null, '📦 Materiales: ', materiales.filter(m => m.inventario_id).length),
                        otDestinoInfo && React.createElement('div', null, '📋 Nueva OT: ', otDestinoInfo.numero_ot || `OT #${otDestinoInfo.id}`),
                        nuevoOth && React.createElement('div', null, '🆕 Nuevo OTH: ', nuevoOth),
                        equipos.filter(e => e.id).length > 0 && React.createElement('div', { style: { marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8 } },
                            React.createElement('p', { style: { fontWeight: 500, marginBottom: 4 } }, 'Cambios en equipos:'),
                            equipos.filter(e => e.id).map(e => 
                                React.createElement('div', { key: e.id, style: { fontSize: 11, marginBottom: 4 } },
                                    React.createElement('span', { style: { fontFamily: 'monospace' } }, e.serial),
                                    ' | OT anterior: ', e.ot_actual_numero || 'N/A',
                                    e.oth_actual ? ` | OTH anterior: ${e.oth_actual}` : '',
                                    ' → Nueva OT: ', otDestinoInfo?.numero_ot || '?',
                                    nuevoOth ? ` | Nuevo OTH: ${nuevoOth}` : ''
                                )
                            )
                        )
                    )
                ),
                React.createElement(Btn, { onClick: handleReasignar, loading: saving, style: { width: '100%', padding: '10px' } }, '🔄 Confirmar Reasignación')
            )
        )
    );
}