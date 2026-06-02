// components/DevolucionView.js - Versión corregida (muestra número de OT)

function DevolucionView({ bodegas, inv, ots, tecnicos, refresh }) {
    const listaInventario = Array.isArray(inv) ? inv : [];
    const listaTecnicos = Array.isArray(tecnicos) ? tecnicos : [];
    const listaOts = Array.isArray(ots) ? ots : [];

    const [equipos, setEquipos] = React.useState([{ 
        buscar: '', id: null, desc: '', serial: '', tecnico: '', 
        ot_id: null, ot_numero: null, cantidadOriginal: 1, cantidadDevolver: 1, error: false 
    }]);
    const [form, setForm] = React.useState({
        conservar_ot: true,
        observacion: ''
    });
    const [saving, setSaving] = React.useState(false);
    const [alert, setAlert] = React.useState(null);
    const [activeDropdown, setActiveDropdown] = React.useState(null);

    const itemsEnTerreno = listaInventario.filter(i => i.estado === 'TERRENO' && i.cantidad > 0);

    const styles = {
        container: { maxWidth: '900px', margin: '0 auto', padding: '0 12px' },
        title: { fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--color-text-primary)', letterSpacing: '-0.01em' },
        card: { backgroundColor: 'var(--color-background-primary)', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.02)', border: '0.5px solid var(--color-border-tertiary)', overflow: 'hidden' },
        cardHeader: { padding: '1rem 1.25rem', borderBottom: '0.5px solid var(--color-border-tertiary)', backgroundColor: 'var(--color-background-secondary)', fontWeight: 500, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-primary)' },
        cardBody: { padding: '1.25rem' },
        inputGroup: { marginBottom: '1rem' },
        label: { display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.4rem', color: 'var(--color-text-secondary)' },
        input: { width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid var(--color-border-secondary)', fontSize: '0.85rem', transition: 'all 0.2s', outline: 'none', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-background-primary)' },
        checkboxLabel: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--color-text-primary)' },
        helpText: { fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem', marginLeft: '1.5rem' },
        row: { display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap' },
        searchWrapper: { flex: '3', position: 'relative', minWidth: '200px' },
        selectedInfo: { flex: '4', display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: 'var(--color-background-secondary)', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--color-border-secondary)' },
        cantidadWrapper: { flex: '1', minWidth: '100px' },
        deleteButton: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-danger)', fontSize: '1.2rem', padding: '8px', borderRadius: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', width: '32px', height: '32px' },
        addButton: { background: 'transparent', border: '1px dashed var(--color-border-secondary)', borderRadius: '40px', padding: '8px 16px', fontSize: '0.8rem', fontWeight: 500, color: 'var(--amber)', cursor: 'pointer', marginTop: '8px', width: '100%', transition: 'all 0.2s' },
        dropdown: { position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, backgroundColor: '#fff', border: '1.5px solid #d0d5dd', borderRadius: '14px', boxShadow: '0 16px 40px rgba(0,0,0,0.16)', zIndex: 100, maxHeight: '400px', overflowY: 'auto' },
        dropdownItem: { padding: '14px 18px', borderBottom: '1px solid #f2f4f7', cursor: 'pointer', transition: 'background 0.15s' },
        summaryBox: { backgroundColor: 'var(--color-background-secondary)', borderRadius: '14px', padding: '1rem', marginBottom: '1.25rem' },
        summaryRow: { display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--color-text-primary)' },
        button: { width: '100%', padding: '12px', fontWeight: 600, borderRadius: '40px', border: 'none', cursor: 'pointer', background: 'var(--amber)', color: 'white', transition: 'opacity 0.2s' }
    };

    const handleSerialSearchChange = (index, value) => {
        const nuevos = [...equipos];
        nuevos[index] = {
            buscar: value, id: null, desc: '', serial: '', tecnico: '', ot_id: null, ot_numero: null,
            cantidadOriginal: 1, cantidadDevolver: 1, error: false
        };
        setEquipos(nuevos);
        setActiveDropdown(index);
    };

    const seleccionarItemPredictivo = (index, item) => {
        const nuevos = [...equipos];
        const cantidadOriginal = item.cantidad || 1;
        nuevos[index] = {
            buscar: item.serial || (item.descripcion || item.material_id),
            id: item.id,
            desc: item.descripcion || item.material_id,
            serial: item.serial,
            tecnico: item.usuario_asignado_nombre || 'Técnico asignado',
            ot_id: item.ot_id,
            ot_numero: item.numero_ot,
            cantidadOriginal: cantidadOriginal,
            cantidadDevolver: cantidadOriginal,
            error: false
        };
        setEquipos(nuevos);
        setActiveDropdown(null);
    };

    const handleCantidadChange = (index, nuevaCantidad) => {
        const nuevos = [...equipos];
        const cantidad = Math.min(Math.max(1, Number(nuevaCantidad)), nuevos[index].cantidadOriginal);
        nuevos[index].cantidadDevolver = isNaN(cantidad) ? 1 : cantidad;
        setEquipos(nuevos);
    };

    const agregarFila = () => setEquipos([...equipos, { 
        buscar: '', id: null, desc: '', serial: '', tecnico: '', 
        ot_id: null, ot_numero: null, cantidadOriginal: 1, cantidadDevolver: 1, error: false 
    }]);

    const eliminarFila = (index) => {
        if (equipos.length === 1) {
            setEquipos([{ buscar: '', id: null, desc: '', serial: '', tecnico: '', ot_id: null, ot_numero: null, cantidadOriginal: 1, cantidadDevolver: 1, error: false }]);
        } else {
            setEquipos(equipos.filter((_, i) => i !== index));
        }
    };

    const handleDevolucion = async () => {
        const itemsValidos = equipos.filter(e => e.id !== null).map(e => ({
            id: e.id,
            cantidad: e.cantidadDevolver
        }));

        if (itemsValidos.length === 0) {
            setAlert({ type: 'error', msg: 'Debes seleccionar al menos un elemento para devolver.' });
            return;
        }

        setSaving(true);
        setAlert(null);

        try {
            for (const item of itemsValidos) {
                await http.post('/inventario/devolver-bodega', {
                    inventario_id: item.id,
                    conservar_ot: form.conservar_ot,
                    observacion: form.observacion,
                    cantidad_devolver: item.cantidad
                });
            }

            if (typeof refresh === 'function') await refresh();

            setEquipos([{ buscar: '', id: null, desc: '', serial: '', tecnico: '', ot_id: null, ot_numero: null, cantidadOriginal: 1, cantidadDevolver: 1, error: false }]);
            setForm({ conservar_ot: true, observacion: '' });
            setAlert({ type: 'success', msg: 'Devolución procesada correctamente.' });

        } catch (err) {
            setAlert({ type: 'error', msg: err.message || 'Error al procesar la devolución.' });
        } finally {
            setSaving(false);
        }
    };

    React.useEffect(() => {
        const handleKeyDown = (e) => { if (e.key === 'Escape') setActiveDropdown(null); };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const totalUnidades = equipos.reduce((sum, eq) => sum + (eq.id ? eq.cantidadDevolver : 0), 0);
    const elementosSeleccionados = equipos.filter(e => e.id).length;

    return React.createElement('div', { style: styles.container },
        React.createElement('h2', { style: styles.title }, '↩️ Devolución a Bodega'),

        alert && React.createElement(Alert, { type: alert.type, msg: alert.msg, onClose: () => setAlert(null) }),

        // Card 1: Configuración
        React.createElement('div', { style: { ...styles.card, marginBottom: '20px' } },
            React.createElement('div', { style: styles.cardHeader },
                React.createElement('span', null, '⚙️'),
                'Configuración de Devolución'
            ),
            React.createElement('div', { style: styles.cardBody },
                React.createElement('div', { style: styles.inputGroup },
                    React.createElement('label', { style: styles.checkboxLabel },
                        React.createElement('input', {
                            type: 'checkbox',
                            checked: form.conservar_ot,
                            onChange: e => setForm(p => ({ ...p, conservar_ot: e.target.checked })),
                            style: { width: 'auto' }
                        }),
                        ' Mantener asociación con la OT actual'
                    ),
                    React.createElement('div', { style: styles.helpText },
                        form.conservar_ot
                            ? '✅ El equipo conservará su OT y quedará como INGRESADO (disponible para reasignar)'
                            : '🔄 El equipo se liberará de la OT y quedará como STOCK (libre)'
                    )
                ),
                React.createElement('div', { style: styles.inputGroup },
                    React.createElement('label', { style: styles.label }, 'Observaciones (opcional)'),
                    React.createElement('input', {
                        style: styles.input,
                        value: form.observacion,
                        onChange: e => setForm(p => ({ ...p, observacion: e.target.value })),
                        placeholder: 'Motivo de la devolución, daños, notas...'
                    })
                )
            )
        ),

        // Card 2: Elementos a devolver
        React.createElement('div', { style: { ...styles.card, marginBottom: '20px' } },
            React.createElement('div', { style: styles.cardHeader },
                React.createElement('span', null, '🔧'),
                'Elementos en Terreno'
            ),
            React.createElement('div', { style: { ...styles.cardBody, paddingTop: '0.5rem' } },
                React.createElement('div', { style: { maxHeight: '460px', overflowY: 'auto', paddingRight: '6px' } },
                    equipos.map((eq, idx) => {
                        const coincidencias = eq.buscar.trim().length > 1
                            ? itemsEnTerreno.filter(i => {
                                const busqueda = i.serial || i.descripcion || i.material_id;
                                return busqueda && busqueda.toLowerCase().includes(eq.buscar.toLowerCase());
                              }).slice(0, 6)
                            : [];

                        const mostrarCantidadInput = eq.id && !eq.serial && eq.cantidadOriginal > 1;

                        return React.createElement('div', { key: idx, style: { marginBottom: '16px', borderBottom: idx !== equipos.length - 1 ? '1px solid var(--color-border-tertiary)' : 'none', paddingBottom: '12px' } },
                            React.createElement('div', { style: styles.row },

                                // Campo de búsqueda
                                React.createElement('div', { style: styles.searchWrapper },
                                    React.createElement('input', {
                                        style: {
                                            ...styles.input,
                                            borderColor: eq.id ? '#2e7d32' : 'var(--color-border-secondary)',
                                            backgroundColor: eq.id ? '#f0f9f0' : 'var(--color-background-primary)',
                                            paddingRight: eq.id ? '30px' : '12px'
                                        },
                                        value: eq.buscar,
                                        onChange: e => handleSerialSearchChange(idx, e.target.value),
                                        placeholder: 'Buscar por serial o descripción...',
                                        onFocus: () => setActiveDropdown(idx)
                                    }),
                                    eq.id && React.createElement('span', { style: { position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#2e7d32' } }, '✓'),

                                    activeDropdown === idx && coincidencias.length > 0 && React.createElement('div', { style: styles.dropdown },
                                        coincidencias.map(item => {
                                            const nombrePrincipal = item.serial || item.descripcion || item.material_id || '(sin nombre)';
                                            const descripcionSub = item.serial && item.descripcion ? item.descripcion : null;
                                            return React.createElement('div', {
                                                key: item.id,
                                                onClick: () => seleccionarItemPredictivo(idx, item),
                                                style: styles.dropdownItem,
                                                onMouseEnter: e => e.currentTarget.style.backgroundColor = 'var(--color-background-secondary)',
                                                onMouseLeave: e => e.currentTarget.style.backgroundColor = 'var(--color-background-primary)'
                                            },
                                                // Fila 1: nombre + badge estado
                                                React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' } },
                                                    React.createElement('span', { style: { fontWeight: 600, fontSize: '1rem', color: '#111', lineHeight: '1.4', flex: 1 } }, nombrePrincipal),
                                                    React.createElement('span', { style: { flexShrink: 0, fontSize: '0.75rem', background: '#e8f5e9', padding: '3px 10px', borderRadius: '20px', color: '#2e7d32', fontWeight: 600, border: '1px solid #c8e6c9' } }, item.estado || 'TERRENO')
                                                ),
                                                // Fila 2: descripción (solo si hay serial Y descripción distintos)
                                                descripcionSub && React.createElement('div', { style: { fontSize: '0.85rem', color: '#555', marginTop: '4px' } }, descripcionSub),
                                                // Fila 3: metadatos
                                                React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '8px', fontSize: '0.82rem', color: '#555' } },
                                                    item.usuario_asignado_nombre && React.createElement('span', null, `👤 ${item.usuario_asignado_nombre}`),
                                                    item.numero_ot && React.createElement('span', null, `📋 OT ${item.numero_ot}`),
                                                    React.createElement('span', null, `📦 Cant: ${item.cantidad}`)
                                                )
                                            );
                                        })
                                    )
                                ),

                                // Información del elemento seleccionado
                                eq.id && React.createElement('div', { style: styles.selectedInfo },
                                    React.createElement('div', { style: { fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-primary)' } }, eq.desc || 'Sin descripción'),
                                    React.createElement('div', { style: { display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--color-text-secondary)' } },
                                        eq.serial && React.createElement('span', null, `🔢 Serie: ${eq.serial}`),
                                        React.createElement('span', null, `👤 ${eq.tecnico}`),
                                        React.createElement('span', null, `📋 OT ${eq.ot_numero || eq.ot_id}`)
                                    )
                                ),

                                // Campo cantidad (solo si aplica)
                                mostrarCantidadInput && React.createElement('div', { style: styles.cantidadWrapper },
                                    React.createElement('label', { style: { ...styles.label, fontSize: '0.7rem' } }, 'Cantidad a devolver'),
                                    React.createElement('input', {
                                        type: 'number',
                                        min: 1,
                                        max: eq.cantidadOriginal,
                                        value: eq.cantidadDevolver,
                                        onChange: e => handleCantidadChange(idx, e.target.value),
                                        style: { ...styles.input, textAlign: 'center', padding: '0.4rem' }
                                    })
                                ),

                                // Botón eliminar
                                React.createElement('button', {
                                    onClick: () => eliminarFila(idx),
                                    style: styles.deleteButton,
                                    onMouseEnter: e => e.currentTarget.style.backgroundColor = 'var(--color-background-danger)',
                                    onMouseLeave: e => e.currentTarget.style.backgroundColor = 'transparent'
                                }, '✕')
                            )
                        );
                    })
                ),
                React.createElement('button', {
                    onClick: agregarFila,
                    style: styles.addButton,
                    onMouseEnter: e => e.currentTarget.style.backgroundColor = 'var(--color-background-secondary)',
                    onMouseLeave: e => e.currentTarget.style.backgroundColor = 'transparent'
                }, '+ Agregar otro elemento'),

                itemsEnTerreno.length === 0 && React.createElement('div', { style: { textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' } },
                    React.createElement('i', { className: 'ti ti-package-off', style: { fontSize: '2rem', display: 'block', marginBottom: '0.5rem' } }),
                    'No hay elementos en terreno para devolver.'
                )
            )
        ),

        // Card 3: Resumen y acción
        React.createElement('div', { style: styles.card },
            React.createElement('div', { style: styles.cardBody },
                React.createElement('div', { style: styles.summaryBox },
                    React.createElement('div', { style: styles.summaryRow },
                        React.createElement('span', null, '🔧 Elementos a devolver:'),
                        React.createElement('strong', null, `${elementosSeleccionados} ${elementosSeleccionados === 1 ? 'ítem' : 'ítems'}`)
                    ),
                    React.createElement('div', { style: styles.summaryRow },
                        React.createElement('span', null, '📦 Total de unidades:'),
                        React.createElement('strong', null, totalUnidades)
                    ),
                    React.createElement('div', { style: styles.summaryRow },
                        React.createElement('span', null, form.conservar_ot ? '📋 Conservar OT' : '🔄 Liberar OT'),
                        React.createElement('span', null, null)
                    )
                ),
                React.createElement('button', {
                    onClick: handleDevolucion,
                    disabled: saving,
                    style: { ...styles.button, opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }
                }, saving ? 'Procesando...' : '✅ Confirmar Devolución')
            )
        )
    );
}