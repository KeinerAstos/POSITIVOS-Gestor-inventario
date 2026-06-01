// components/DevolucionView.js
function DevolucionView({ bodegas, inv, ots, tecnicos, refresh }) {
    const listaInventario = Array.isArray(inv) ? inv : [];
    const listaTecnicos = Array.isArray(tecnicos) ? tecnicos : [];
    const listaOts = Array.isArray(ots) ? ots : [];

    const [equipos, setEquipos] = React.useState([{ buscar: '', id: null, desc: '', serial: '', tecnico: '', ot_id: null, error: false }]);
    const [form, setForm] = React.useState({
        conservar_ot: true,  // Si se conserva la OT o se libera
        observacion: ''
    });
    const [saving, setSaving] = React.useState(false);
    const [alert, setAlert] = React.useState(null);
    const [activeDropdown, setActiveDropdown] = React.useState(null);

    // ✅ Equipos que están en TERRENO (con el técnico) y pueden devolverse
    const equiposEnTerreno = listaInventario.filter(i => 
        i.serial && 
        i.estado === 'TERRENO' &&
        i.cantidad > 0
    );

    // LÓGICA DE AUTOCOMPLETE PARA SERIALES
    const handleSerialSearchChange = (index, value) => {
        const nuevos = [...equipos];
        nuevos[index].buscar = value;
        nuevos[index].id = null;
        nuevos[index].tecnico = '';
        nuevos[index].ot_id = null;
        setEquipos(nuevos);
        setActiveDropdown(index);
    };

    const seleccionarEquipoPredictivo = (index, item) => {
        const nuevos = [...equipos];
        nuevos[index].buscar = item.serial;
        nuevos[index].id = item.id;
        nuevos[index].desc = item.descripcion || item.desc;
        nuevos[index].serial = item.serial;
        nuevos[index].tecnico = item.usuario_asignado_nombre || 'Técnico asignado';
        nuevos[index].ot_id = item.ot_id;
        setEquipos(nuevos);
        setActiveDropdown(null);
    };

    const agregarFilaEquipo = () => setEquipos([...equipos, { buscar: '', id: null, desc: '', serial: '', tecnico: '', ot_id: null, error: false }]);
    const eliminarFilaEquipo = (index) => {
        if (equipos.length === 1) setEquipos([{ buscar: '', id: null, desc: '', serial: '', tecnico: '', ot_id: null, error: false }]);
        else setEquipos(equipos.filter((_, i) => i !== index));
    };

    const handleDevolucion = async () => {
        const idsEquiposValidos = equipos.filter(e => e.id !== null).map(e => e.id);

        if (idsEquiposValidos.length === 0) {
            setAlert({ type: 'error', msg: 'Debes seleccionar al menos un equipo para devolver.' });
            return;
        }

        setSaving(true); 
        setAlert(null);
        
        try {
            // Enviar cada equipo individualmente
            for (const equipoId of idsEquiposValidos) {
                await http.post('/inventario/devolver-bodega', {
                    inventario_id: equipoId,
                    conservar_ot: form.conservar_ot,
                    observacion: form.observacion
                });
            }

            if (typeof refresh === 'function') await refresh();
            
            setEquipos([{ buscar: '', id: null, desc: '', serial: '', tecnico: '', ot_id: null, error: false }]);
            setForm({ conservar_ot: true, observacion: '' });
            setAlert({ type: 'success', msg: 'Equipos devueltos a bodega correctamente.' });
            
        } catch (err) {
            setAlert({ type: 'error', msg: err.message || 'Error al procesar la devolución.' });
        } finally {
            setSaving(false);
        }
    };

    // Cerrar listas desplegables con Escape
    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setActiveDropdown(null);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return React.createElement('div', { style: { maxWidth: '800px', margin: '0 auto' } },
        React.createElement('h2', { style: { margin: '0 0 1.25rem', fontWeight: 500, fontSize: 18 } }, 'Devolución de Equipos a Bodega'),
        alert && React.createElement(Alert, { type: alert.type, msg: alert.msg, onClose: () => setAlert(null) }),

        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },

            // CARD 1: CONFIGURACIÓN DE DEVOLUCIÓN
            React.createElement('div', { style: { ...CARD, padding: '1.25rem' } },
                React.createElement('p', { style: { margin: '0 0 1rem', fontWeight: 500, fontSize: 14 } }, '⚙️ Configuración de Devolución'),
                
                React.createElement('div', { style: { marginBottom: 16 } },
                    React.createElement('label', { style: { ...LBL, display: 'flex', alignItems: 'center', gap: 8 } },
                        React.createElement('input', {
                            type: 'checkbox',
                            checked: form.conservar_ot,
                            onChange: e => setForm(p => ({ ...p, conservar_ot: e.target.checked })),
                            style: { width: 'auto' }
                        }),
                        ' Mantener asociación con la OT actual'
                    ),
                    React.createElement('p', { style: { fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, marginLeft: 24 } },
                        form.conservar_ot 
                            ? '✅ El equipo conservará su OT y quedará como INGRESADO (disponible para reasignar)' 
                            : '🔄 El equipo se liberará de la OT y quedará como STOCK (libre)'
                    )
                ),

                React.createElement('div', null,
                    React.createElement('label', { style: LBL }, 'Observaciones'),
                    React.createElement('input', { 
                        value: form.observacion, 
                        onChange: e => setForm(p => ({ ...p, observacion: e.target.value })), 
                        placeholder: 'Motivo de la devolución...' 
                    })
                )
            ),

            // CARD 2: EQUIPOS A DEVOLVER
            React.createElement('div', { style: { ...CARD, padding: '1.25rem' } },
                React.createElement('p', { style: { margin: '0 0 1rem', fontWeight: 500, fontSize: 14 } }, '🔧 Equipos en Terreno para Devolver'),
                
                React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto', paddingRight: 4 } },
                    equipos.map((eq, idx) => {
                        const coincidencias = eq.buscar.trim().length > 1
                            ? equiposEnTerreno.filter(i => 
                                i.serial && 
                                i.serial.toLowerCase().includes(eq.buscar.toLowerCase())
                              ).slice(0, 5)
                            : [];

                        return React.createElement('div', { key: idx, style: { display: 'flex', gap: 6, alignItems: 'center', position: 'relative', marginBottom: 4 } },
                            React.createElement('div', { style: { flex: 2, position: 'relative' } },
                                React.createElement('input', {
                                    value: eq.buscar,
                                    onChange: e => handleSerialSearchChange(idx, e.target.value),
                                    placeholder: 'Buscar por número de serie...',
                                    onFocus: () => setActiveDropdown(idx),
                                    style: { 
                                        border: eq.id ? '1px solid #ed6c02' : '1px solid var(--border)',
                                        background: eq.id ? '#fff8f0' : 'white'
                                    }
                                }),
                                activeDropdown === idx && coincidencias.length > 0 && React.createElement('div', {
                                    style: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 6, zIndex: 99, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 200, overflowY: 'auto' }
                                },
                                    coincidencias.map(item => React.createElement('div', {
                                        key: item.id,
                                        onClick: () => seleccionarEquipoPredictivo(idx, item),
                                        style: { padding: '10px 12px', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid var(--bg-secondary)' },
                                        onMouseEnter: e => e.target.style.background = 'var(--bg-secondary)',
                                        onMouseLeave: e => e.target.style.background = 'transparent'
                                    },
                                        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                                            React.createElement('div', null,
                                                React.createElement('strong', { style: { fontSize: 13 } }, item.serial),
                                                React.createElement('div', { style: { fontSize: 11, color: 'var(--text-secondary)' } }, item.descripcion || item.material_id)
                                            ),
                                            React.createElement('span', { 
                                                style: { 
                                                    fontSize: 10, 
                                                    padding: '2px 6px', 
                                                    borderRadius: 10, 
                                                    background: '#0288d120',
                                                    color: '#0288d1'
                                                } 
                                            }, '🔧 En terreno')
                                        ),
                                        item.usuario_asignado_nombre && React.createElement('div', { style: { fontSize: 10, color: '#666', marginTop: 4 } },
                                            `Técnico: ${item.usuario_asignado_nombre}`
                                        ),
                                        item.ot_id && React.createElement('div', { style: { fontSize: 10, color: '#ed6c02', marginTop: 2 } },
                                            `OT: ${item.ot_id}`
                                        )
                                    ))
                                )
                            ),
                            eq.id && React.createElement('div', { style: { flex: 2, fontSize: 11, color: 'var(--text-secondary)' } },
                                React.createElement('div', null, eq.desc),
                                React.createElement('div', { style: { fontSize: 10, marginTop: 4, display: 'flex', gap: 8 } },
                                    eq.tecnico && React.createElement('span', { style: { color: '#0288d1' } }, `👤 ${eq.tecnico}`),
                                    eq.ot_id && React.createElement('span', { style: { color: '#ed6c02' } }, `📋 OT #${eq.ot_id}`)
                                )
                            ),
                            React.createElement('button', { 
                                onClick: () => eliminarFilaEquipo(idx), 
                                style: { padding: '8px 12px', background: '#FCEBEB', color: '#A32D2D', border: 'none', borderRadius: 6, cursor: 'pointer' } 
                            }, '×')
                        );
                    })
                ),
                
                React.createElement('button', { onClick: agregarFilaEquipo, style: { background: 'none', border: 'none', color: 'var(--amber)', fontSize: 12, cursor: 'pointer', marginTop: 10, padding: 0, fontWeight: 500 } }, 
                    '+ Agregar otro equipo'
                ),
                
                equiposEnTerreno.length === 0 && React.createElement('div', { style: { marginTop: 8, fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', padding: 16 } },
                    React.createElement('i', { className: 'ti ti-truck-return', style: { fontSize: 32, display: 'block', marginBottom: 8 } }),
                    'No hay equipos en terreno para devolver.'
                )
            ),

            // Resumen y botón
            React.createElement('div', { style: { ...CARD, padding: '1.25rem' } },
                React.createElement('div', { style: { background: 'var(--bg-secondary)', padding: '12px', borderRadius: 8, marginBottom: 16 } },
                    React.createElement('p', { style: { fontSize: 12, fontWeight: 500, marginBottom: 8 } }, '📊 Resumen de Devolución'),
                    React.createElement('div', { style: { fontSize: 12, display: 'flex', gap: 16 } },
                        React.createElement('span', null, `🔧 Equipos a devolver: ${equipos.filter(e => e.id).length}`),
                        React.createElement('span', null, form.conservar_ot ? '📋 Conservar OT' : '🔄 Liberar OT')
                    )
                ),
                
                React.createElement(Btn, { onClick: handleDevolucion, loading: saving, style: { width: '100%', padding: '10px' } }, 
                    '🔄 Confirmar Devolución a Bodega'
                )
            )
        )
    );
}