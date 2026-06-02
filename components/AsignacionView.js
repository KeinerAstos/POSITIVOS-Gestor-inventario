// components/AsignacionView.js - Versión definitiva con scroll en dropdown de OT
function AsignacionView({ bodegas, inv, ots, tecnicos, refresh }) {
    const listaOts = Array.isArray(ots) ? ots : [];
    const listaInventario = Array.isArray(inv) ? inv : [];
    const listaTecnicos = Array.isArray(tecnicos) ? tecnicos : [];

    const [form, setForm] = React.useState({
        ot_buscar: '',
        ot_id: '',
        usuario_asignado: '',
        usuario_cedula: '',
        usuario_id: null,
        obs: ''
    });
    const [equipos, setEquipos] = React.useState([{ buscar: '', id: null, desc: '', serial: '', estado: '', error: false }]);
    const [materiales, setMateriales] = React.useState([{ inventario_id: '', cantidad: 1, disponible: 0 }]);

    const [saving, setSaving] = React.useState(false);
    const [alert, setAlert] = React.useState(null);
    const [activeDropdown, setActiveDropdown] = React.useState(null);
    const [cargandoOT, setCargandoOT] = React.useState(false);

    const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

    const poolSerialesDisponibles = listaInventario.filter(i => 
        i.serial && 
        (i.estado === 'STOCK' || i.estado === 'INGRESADO') &&
        i.cantidad > 0
    );
    
    const poolMaterialesDisponibles = listaInventario.filter(i => 
        !i.serial && 
        i.cantidad > 0 && 
        (i.estado === 'STOCK' || i.estado === 'INGRESADO')
    );

    // Coincidencias para OT (solo OTs no cerradas)
    const otCoincidencias = form.ot_buscar.trim().length > 0
        ? listaOts
            .filter(ot => ot.estado !== 'completado' && ot.estado !== 'CERRADA')
            .filter(ot => 
                (ot.numero_ot && ot.numero_ot.toLowerCase().includes(form.ot_buscar.toLowerCase())) ||
                (ot.cliente && ot.cliente.toLowerCase().includes(form.ot_buscar.toLowerCase()))
            )
            .slice(0, 8)  // Aumentamos un poco el límite
        : [];

    const cargarPorOT = (otId) => {
        if (!otId) return;
        setCargandoOT(true);
        
        const equiposOT = listaInventario.filter(i => 
            i.serial && 
            i.ot_id === parseInt(otId) &&
            (i.estado === 'STOCK' || i.estado === 'INGRESADO') &&
            i.cantidad > 0
        );
        
        const materialesOT = listaInventario.filter(i => 
            !i.serial && 
            i.ot_id === parseInt(otId) &&
            (i.estado === 'STOCK' || i.estado === 'INGRESADO') &&
            i.cantidad > 0
        );
        
        const nuevosEquipos = equiposOT.length > 0 
            ? equiposOT.map(eq => ({
                buscar: eq.serial,
                id: eq.id,
                desc: eq.descripcion || eq.material_id,
                serial: eq.serial,
                estado: eq.estado,
                error: false
              }))
            : [{ buscar: '', id: null, desc: '', serial: '', estado: '', error: false }];
        
        const nuevosMateriales = materialesOT.length > 0
            ? materialesOT.map(mat => ({
                inventario_id: mat.id,
                cantidad: 1,
                disponible: mat.cantidad
              }))
            : [{ inventario_id: '', cantidad: 1, disponible: 0 }];
        
        setEquipos(nuevosEquipos);
        setMateriales(nuevosMateriales);
        setCargandoOT(false);
        
        if (equiposOT.length === 0 && materialesOT.length === 0) {
            setAlert({ type: 'info', msg: 'No hay equipos ni materiales asociados a esta OT en bodega.' });
            setTimeout(() => setAlert(null), 3000);
        }
    };

    React.useEffect(() => {
        if (form.ot_id) {
            cargarPorOT(form.ot_id);
        } else {
            setEquipos([{ buscar: '', id: null, desc: '', serial: '', estado: '', error: false }]);
            setMateriales([{ inventario_id: '', cantidad: 1, disponible: 0 }]);
        }
    }, [form.ot_id]);

    // Autocompletado técnicos
    const coincidenciasTecnicos = form.usuario_asignado.trim().length > 0
        ? listaTecnicos.filter(t => t.nombre.toLowerCase().includes(form.usuario_asignado.toLowerCase())).slice(0, 5)
        : [];

    const seleccionarTecnicoPredictivo = (tecnico) => {
        setForm(p => ({ ...p, usuario_asignado: tecnico.nombre, usuario_cedula: tecnico.cedula, usuario_id: tecnico.id }));
        setActiveDropdown(null);
    };

    // Autocompletado OT
    const handleOTSearchChange = (e) => {
        const value = e.target.value;
        setForm(p => ({ ...p, ot_buscar: value, ot_id: '' }));
        setActiveDropdown('ot');
    };

    const seleccionarOTPredictivo = (ot) => {
        const displayText = `${ot.numero_ot || ot.id} — ${ot.cliente || 'Sin cliente'}`;
        setForm(p => ({ ...p, ot_buscar: displayText, ot_id: ot.id }));
        setActiveDropdown(null);
    };

    // Lógica equipos serializados
    const handleSerialSearchChange = (index, value) => {
        const nuevos = [...equipos];
        nuevos[index].buscar = value;
        nuevos[index].id = null;
        nuevos[index].estado = '';
        setEquipos(nuevos);
        setActiveDropdown(index);
    };

    const seleccionarEquipoPredictivo = (index, item) => {
        const nuevos = [...equipos];
        nuevos[index].buscar = item.serial;
        nuevos[index].id = item.id;
        nuevos[index].desc = item.descripcion || item.material_id;
        nuevos[index].serial = item.serial;
        nuevos[index].estado = item.estado;
        setEquipos(nuevos);
        setActiveDropdown(null);
    };

    const agregarFilaEquipo = () => setEquipos([...equipos, { buscar: '', id: null, desc: '', serial: '', estado: '', error: false }]);
    const eliminarFilaEquipo = (index) => {
        if (equipos.length === 1) setEquipos([{ buscar: '', id: null, desc: '', serial: '', estado: '', error: false }]);
        else setEquipos(equipos.filter((_, i) => i !== index));
    };

    // Lógica materiales no serializados
    const handleMaterialChange = (index, invId) => {
        const nuevos = [...materiales];
        nuevos[index].inventario_id = invId;
        const match = poolMaterialesDisponibles.find(i => i.id === parseInt(invId));
        nuevos[index].disponible = match ? match.cantidad : 0;
        setMateriales(nuevos);
    };

    const handleMaterialCantChange = (index, cant) => {
        let nuevaCant = parseInt(cant);
        if (isNaN(nuevaCant) || nuevaCant < 1) nuevaCant = 1;
        const disponible = materiales[index].disponible;
        if (nuevaCant > disponible) nuevaCant = disponible;
        const nuevos = [...materiales];
        nuevos[index].cantidad = nuevaCant;
        setMateriales(nuevos);
    };

    const agregarFilaMaterial = () => setMateriales([...materiales, { inventario_id: '', cantidad: 1, disponible: 0 }]);
    const eliminarFilaMaterial = (index) => {
        if (materiales.length === 1) setMateriales([{ inventario_id: '', cantidad: 1, disponible: 0 }]);
        else setMateriales(materiales.filter((_, i) => i !== index));
    };

    // Envío
    const handleEnviarAsignacion = async () => {
        if (!form.usuario_asignado.trim()) {
            setAlert({ type: 'error', msg: 'El técnico es obligatorio.' });
            return;
        }
        if (!form.usuario_id) {
            setAlert({ type: 'error', msg: 'Debe seleccionar un técnico de la lista.' });
            return;
        }

        const idsEquiposValidos = equipos.filter(e => e.id !== null).map(e => e.id);
        const listaMaterialesValidos = materiales.filter(m => m.inventario_id !== '' && m.cantidad > 0).map(m => ({
            inventario_id: parseInt(m.inventario_id),
            cantidad_descontar: m.cantidad
        }));

        if (idsEquiposValidos.length === 0 && listaMaterialesValidos.length === 0) {
            setAlert({ type: 'error', msg: 'Debe seleccionar al menos un equipo o material.' });
            return;
        }

        setSaving(true);
        setAlert(null);
        try {
            await http.post('/inventario/asignar', {
                inventario_ids: idsEquiposValidos,
                materiales_no_serializados: listaMaterialesValidos,
                ot_id: form.ot_id ? parseInt(form.ot_id) : null,
                usuario_asignado: form.usuario_id,
                observacion: form.obs
            });
            if (typeof refresh === 'function') await refresh();
            setEquipos([{ buscar: '', id: null, desc: '', serial: '', estado: '', error: false }]);
            setMateriales([{ inventario_id: '', cantidad: 1, disponible: 0 }]);
            setForm({
                ot_buscar: '',
                ot_id: '',
                usuario_asignado: '',
                usuario_cedula: '',
                usuario_id: null,
                obs: ''
            });
            setAlert({ type: 'success', msg: '¡Equipos entregados al técnico correctamente!' });
        } catch (err) {
            setAlert({ type: 'error', msg: err.message || 'Error al procesar la entrega.' });
        } finally {
            setSaving(false);
        }
    };

    // Utils de estilo
    const getEstadoTexto = (estado) => {
        switch(estado) {
            case 'STOCK': return '📦 Stock libre';
            case 'INGRESADO': return '📋 Asociado a OT';
            case 'TERRENO': return '🔧 En terreno';
            case 'CONSUMO': return '✅ Consumido';
            case 'DEVUELTO': return '🔄 Devuelto';
            default: return estado;
        }
    };

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

    const formatearMaterial = (mat) => {
        const codigo = mat.material_id || '';
        const desc = mat.descripcion || mat.material_descripcion || '';
        return `${codigo} - ${desc} (Stock: ${mat.cantidad})`;
    };

    React.useEffect(() => {
        const handleKeyDown = (e) => { if (e.key === 'Escape') setActiveDropdown(null); };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Renderizado
    return React.createElement('div', { style: { maxWidth: '800px', margin: '0 auto' } },
        React.createElement('h2', { style: { margin: '0 0 1.25rem', fontWeight: 500, fontSize: 18 } }, 'Entrega de Equipos a Técnico'),
        alert && React.createElement(Alert, { type: alert.type, msg: alert.msg, onClose: () => setAlert(null) }),

        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },

            // CARD 1: Datos de la entrega
            React.createElement('div', { style: { ...CARD, padding: '1.25rem' } },
                React.createElement('p', { style: { margin: '0 0 1rem', fontWeight: 500, fontSize: 14 } }, '📋 Datos de la Entrega'),
                React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
                    // Técnico
                    React.createElement('div', { style: { position: 'relative' } },
                        React.createElement('label', { style: LBL }, 'Técnico *'),
                        React.createElement('input', {
                            value: form.usuario_asignado,
                            onChange: e => {
                                setForm(p => ({ ...p, usuario_asignado: e.target.value, usuario_cedula: '', usuario_id: null }));
                                setActiveDropdown('tecnico');
                            },
                            placeholder: 'Busque el técnico...',
                            onFocus: () => setActiveDropdown('tecnico')
                        }),
                        activeDropdown === 'tecnico' && coincidenciasTecnicos.length > 0 && React.createElement('div', {
                            style: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 6, zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 180, overflowY: 'auto' }
                        },
                            coincidenciasTecnicos.map((tecnico, tIdx) => React.createElement('div', {
                                key: tIdx,
                                onClick: () => seleccionarTecnicoPredictivo(tecnico),
                                style: { padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--bg-secondary)', display: 'flex', alignItems: 'center' },
                                onMouseEnter: e => e.currentTarget.style.background = 'var(--bg-secondary)',
                                onMouseLeave: e => e.currentTarget.style.background = 'transparent'
                            },
                                React.createElement('i', { className: 'ti ti-user', style: { marginRight: 8, color: 'var(--text-secondary)', fontSize: 16 } }),
                                tecnico.nombre
                            ))
                        )
                    ),
                    // OT (autocompletado con scroll forzado)
                    React.createElement('div', { style: { position: 'relative', overflow: 'visible' } },
                        React.createElement('label', { style: LBL }, 'OT (Opcional)'),
                        React.createElement('input', {
                            value: form.ot_buscar,
                            onChange: handleOTSearchChange,
                            placeholder: 'Buscar por número de OT o cliente...',
                            onFocus: () => setActiveDropdown('ot'),
                            style: { 
                                borderColor: form.ot_id ? '#2e7d32' : undefined, 
                                backgroundColor: form.ot_id ? '#f0f9f0' : undefined,
                                width: '100%'
                            }
                        }),
                        form.ot_id && React.createElement('span', { style: { position: 'absolute', right: '10px', top: '38px', fontSize: '12px', color: '#2e7d32' } }, '✓'),
                        activeDropdown === 'ot' && otCoincidencias.length > 0 && React.createElement('div', {
                            style: { 
                                position: 'absolute', 
                                top: '100%', 
                                left: 0, 
                                right: 0, 
                                background: '#fff', 
                                border: '1px solid var(--color-border-secondary)', 
                                borderRadius: '8px', 
                                zIndex: 1050, 
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)', 
                                maxHeight: '200px', 
                                overflowY: 'auto',
                                scrollbarWidth: 'thin'
                            }
                        },
                            otCoincidencias.map(ot => React.createElement('div', {
                                key: ot.id,
                                onClick: () => seleccionarOTPredictivo(ot),
                                style: { padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--color-border-tertiary)' },
                                onMouseEnter: e => e.currentTarget.style.backgroundColor = 'var(--color-background-secondary)',
                                onMouseLeave: e => e.currentTarget.style.backgroundColor = 'transparent'
                            },
                                React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                                    React.createElement('strong', { style: { fontSize: '0.85rem' } }, ot.numero_ot || ot.id),
                                    React.createElement('span', { style: { fontSize: '0.7rem', color: 'var(--color-text-secondary)' } }, ot.cliente || 'Sin cliente')
                                ),
                                ot.fecha && React.createElement('div', { style: { fontSize: '0.7rem', color: '#888', marginTop: 4 } }, `📅 ${new Date(ot.fecha).toLocaleDateString()}`)
                            ))
                        )
                    )
                ),
                React.createElement('div', { style: { marginTop: 12 } },
                    React.createElement('label', { style: LBL }, 'Observaciones'),
                    React.createElement('input', { value: form.obs, onChange: f('obs'), placeholder: 'Notas sobre la entrega...' })
                )
            ),

            // CARD 2: Equipos serializados (sin cambios)
            React.createElement('div', { style: { ...CARD, padding: '1.25rem' } },
                React.createElement('p', { style: { margin: '0 0 1rem', fontWeight: 500, fontSize: 14 } }, '🔍 Equipos a Entregar'),
                cargandoOT && React.createElement('div', { style: { fontSize: 12, color: '#666', marginBottom: 8 } }, 'Cargando equipos de la OT...'),
                React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto', paddingRight: 4 } },
                    equipos.map((eq, idx) => {
                        const coincidencias = eq.buscar.trim().length > 1
                            ? poolSerialesDisponibles.filter(i => i.serial && i.serial.toLowerCase().includes(eq.buscar.toLowerCase())).slice(0, 5)
                            : [];
                        return React.createElement('div', { key: idx, style: { display: 'flex', gap: 6, alignItems: 'center', position: 'relative', marginBottom: 4 } },
                            React.createElement('div', { style: { flex: 1, position: 'relative' } },
                                React.createElement('input', {
                                    value: eq.buscar,
                                    onChange: e => handleSerialSearchChange(idx, e.target.value),
                                    placeholder: 'Buscar por número de serie...',
                                    onFocus: () => setActiveDropdown(idx),
                                    style: { border: eq.id ? '1px solid #2e7d32' : '1px solid var(--border)', background: eq.id ? '#f0f9f0' : 'white' }
                                }),
                                activeDropdown === idx && coincidencias.length > 0 && React.createElement('div', {
                                    style: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 6, zIndex: 99, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 200, overflowY: 'auto' }
                                },
                                    coincidencias.map(item => React.createElement('div', {
                                        key: item.id,
                                        onClick: () => seleccionarEquipoPredictivo(idx, item),
                                        style: { padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--bg-secondary)' },
                                        onMouseEnter: e => e.currentTarget.style.background = 'var(--bg-secondary)',
                                        onMouseLeave: e => e.currentTarget.style.background = 'transparent'
                                    },
                                        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                                            React.createElement('div', null,
                                                React.createElement('strong', { style: { fontSize: 13 } }, item.serial),
                                                React.createElement('div', { style: { fontSize: 11, color: 'var(--text-secondary)' } }, item.descripcion || item.material_id)
                                            ),
                                            React.createElement('span', { style: { fontSize: 10, padding: '2px 6px', borderRadius: 10, background: getEstadoColor(item.estado) + '20', color: getEstadoColor(item.estado) } }, getEstadoTexto(item.estado))
                                        ),
                                        item.ot_id && React.createElement('div', { style: { fontSize: 10, color: '#ed6c02', marginTop: 4 } }, `OT asociada: ${item.ot_id}`)
                                    ))
                                )
                            ),
                            eq.id && React.createElement('div', { style: { flex: 1, fontSize: 11, color: 'var(--text-secondary)' } },
                                React.createElement('div', null, eq.desc),
                                eq.estado && React.createElement('span', { style: { fontSize: 10, padding: '2px 6px', borderRadius: 10, background: getEstadoColor(eq.estado) + '20', color: getEstadoColor(eq.estado), display: 'inline-block', marginTop: 4 } }, getEstadoTexto(eq.estado))
                            ),
                            React.createElement('button', { onClick: () => eliminarFilaEquipo(idx), style: { padding: '8px 12px', background: '#FCEBEB', color: '#A32D2D', border: 'none', borderRadius: 6, cursor: 'pointer' } }, '×')
                        );
                    })
                ),
                React.createElement('button', { onClick: agregarFilaEquipo, style: { background: 'none', border: 'none', color: 'var(--amber)', fontSize: 12, cursor: 'pointer', marginTop: 10, padding: 0, fontWeight: 500 } }, '+ Agregar otro equipo'),
                poolSerialesDisponibles.length === 0 && React.createElement('div', { style: { marginTop: 8, fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' } }, '⚠️ No hay equipos disponibles en bodega para entregar.')
            ),

            // CARD 3: Materiales consumibles (sin cambios)
            React.createElement('div', { style: { ...CARD, padding: '1.25rem' } },
                React.createElement('p', { style: { margin: '0 0 1rem', fontWeight: 500, fontSize: 14 } }, '📦 Materiales Consumibles'),
                poolMaterialesDisponibles.length === 0 && React.createElement('div', { style: { marginBottom: 12, padding: '8px', background: '#fff3cd', borderRadius: 6, fontSize: 12, color: '#856404' } },
                    '⚠️ No hay materiales consumibles disponibles en bodega (STOCK o INGRESADO).'
                ),
                React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto', paddingRight: 4 } },
                    materiales.map((mat, idx) => {
                        const selectedMaterial = poolMaterialesDisponibles.find(m => m.id === parseInt(mat.inventario_id));
                        return React.createElement('div', { key: idx, style: { display: 'flex', gap: 6, alignItems: 'center' } },
                            React.createElement('select', {
                                value: mat.inventario_id,
                                onChange: e => handleMaterialChange(idx, e.target.value),
                                style: { flex: 2 },
                                disabled: poolMaterialesDisponibles.length === 0
                            },
                                React.createElement('option', { value: '' }, 'Seleccione material...'),
                                poolMaterialesDisponibles.map(m => {
                                    const label = formatearMaterial(m);
                                    return React.createElement('option', { key: m.id, value: m.id }, label);
                                })
                            ),
                            React.createElement('input', {
                                type: 'number',
                                value: mat.cantidad,
                                onChange: e => handleMaterialCantChange(idx, e.target.value),
                                min: 1,
                                max: mat.disponible || 1,
                                style: { width: 80 },
                                disabled: poolMaterialesDisponibles.length === 0
                            }),
                            React.createElement('button', { 
                                onClick: () => eliminarFilaMaterial(idx), 
                                style: { padding: '8px 12px', background: '#FCEBEB', color: '#A32D2D', border: 'none', borderRadius: 6, cursor: 'pointer' } 
                            }, '×')
                        );
                    })
                ),
                React.createElement('button', { 
                    onClick: agregarFilaMaterial, 
                    disabled: poolMaterialesDisponibles.length === 0,
                    style: { 
                        background: 'none', 
                        border: 'none', 
                        color: poolMaterialesDisponibles.length === 0 ? '#ccc' : 'var(--amber)', 
                        fontSize: 12, 
                        cursor: poolMaterialesDisponibles.length === 0 ? 'not-allowed' : 'pointer', 
                        marginTop: 10, 
                        padding: 0, 
                        fontWeight: 500 
                    } 
                }, '+ Agregar material'),
                React.createElement('hr', { style: { border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' } }),
                React.createElement('div', { style: { background: 'var(--bg-secondary)', padding: '12px', borderRadius: 8, marginBottom: 16 } },
                    React.createElement('p', { style: { fontSize: 12, fontWeight: 500, marginBottom: 8 } }, '📊 Resumen de entrega'),
                    React.createElement('div', { style: { fontSize: 12, display: 'flex', gap: 16, flexWrap: 'wrap' } },
                        React.createElement('span', null, `🔧 Equipos: ${equipos.filter(e => e.id).length}`),
                        React.createElement('span', null, `📦 Materiales: ${materiales.filter(m => m.inventario_id).length}`),
                        form.usuario_id && React.createElement('span', null, `👤 Técnico: ${form.usuario_asignado}`),
                        form.ot_id && React.createElement('span', null, `📋 OT: ${form.ot_buscar}`)
                    )
                ),
                React.createElement(Btn, { onClick: handleEnviarAsignacion, loading: saving, style: { width: '100%', padding: '10px' } }, '🚀 Entregar al Técnico')
            )
        )
    );
}