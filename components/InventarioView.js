// components/InventarioView.js
function InventarioView({ bodegas, inv, materiales, ots, setView, setTransferItem, refresh }) {
    const [fb, setFb] = React.useState('');
    const [fe, setFe] = React.useState('');
    const [srch, setSrch] = React.useState('');
    const [showF, setShowF] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [alert, setAlert] = React.useState(null);

    // Buscador de OT existente
    const [buscarOT, setBuscarOT] = React.useState('');
    const [showOtDropdown, setShowOtDropdown] = React.useState(false);
    const [otSeleccionada, setOtSeleccionada] = React.useState(null);

    // Datos para nueva OT (cuando no existe)
    const [nuevaOTData, setNuevaOTData] = React.useState({
        cliente: '',
        destino: '',
        mostrarFormulario: false
    });

    // Buscador de material (autocompletado)
    const [buscarMaterial, setBuscarMaterial] = React.useState('');
    const [showMaterialDropdown, setShowMaterialDropdown] = React.useState(false);
    const [materialSeleccionado, setMaterialSeleccionado] = React.useState(null);

    // Estado para exportar por estado
    const [reporteEstado, setReporteEstado] = React.useState('');

    const [form, setForm] = React.useState({
        material_id: '',
        serial: '',
        cantidad: 1,
        bodega_id: '',
        ot_id: '',
        ubicacion: '',
        documento_material: '',
        oth: '',
        lote: 'NO VALORADO'
    });

    const listaOts = Array.isArray(ots) ? ots : [];
    const listaMateriales = Array.isArray(materiales) ? materiales : [];
    const listaInventario = Array.isArray(inv) ? inv : [];

    console.log('📊 Inventario recibido:', listaInventario.length, 'equipos');
    console.log('📊 Equipos sin serial:', listaInventario.filter(i => !i.serial).length);

    const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
    const fnNuevaOT = k => e => setNuevaOTData(p => ({ ...p, [k]: e.target.value }));

    // Verificar si la OT escrita existe
    const otExiste = (numeroOT) => {
        if (!numeroOT) return false;
        return listaOts.some(ot => ot.numero_ot === numeroOT);
    };

    const otExistente = (numeroOT) => listaOts.find(ot => ot.numero_ot === numeroOT);

    // Filtrar OT existentes para autocompletado
    const getFilteredOTs = () => {
        if (!buscarOT.trim()) return [];
        const term = buscarOT.toLowerCase();
        return listaOts.filter(ot => {
            const numero = (ot.numero_ot || '').toLowerCase();
            const cliente = (ot.cliente || '').toLowerCase();
            return numero.includes(term) || cliente.includes(term);
        }).slice(0, 5);
    };

    const filteredOTs = getFilteredOTs();

    // Filtrar materiales para autocompletado
    const getFilteredMaterials = () => {
        if (!buscarMaterial.trim()) return [];
        const term = buscarMaterial.toLowerCase();
        return listaMateriales.filter(m =>
            m.codigo_sap.toLowerCase().includes(term) || m.descripcion.toLowerCase().includes(term)
        ).slice(0, 5);
    };

    const filteredMaterials = getFilteredMaterials();

    // Filtrar inventario (para la tabla) - respeta filtros de bodega, estado y búsqueda
    // Filtrar inventario (para la tabla) - búsqueda en todos los campos
    const filtered = listaInventario.filter(i => {
        if (fb && i.bodega_id !== parseInt(fb)) return false;
        if (fe && i.estado !== fe) return false;
        if (srch) {
            const term = srch.toLowerCase();
            // Reunir todos los campos relevantes en un solo string
            const searchable = [
                i.material_id,
                i.material_descripcion || i.descripcion || i.desc,
                i.serial,
                i.documento_material,
                i.numero_ot,
                i.oth,
                i.lote,
                i.ubicacion,
                i.estado
            ].filter(Boolean).join(' ').toLowerCase();
            if (!searchable.includes(term)) return false;
        }
        return true;
    });

    // ---- FUNCIONES DE EXPORTACIÓN ----

    // Exportar con los filtros actuales de la tabla
    const exportarInventarioCSV = () => {
        if (filtered.length === 0) {
            alert('No hay equipos para exportar con los filtros actuales');
            return;
        }
        const headers = ['Material', 'Código', 'Serie', 'Doc. Material', 'OTH', 'Lote', 'Cantidad', 'Ubicación', 'Bodega', 'Estado', 'OT Asociada'];
        const rows = filtered.map(item => [
            item.descripcion || '',
            item.material_id || '',
            item.serial || '',
            item.documento_material || '',
            item.oth || '',
            item.lote || '',
            item.cantidad,
            item.ubicacion || '',
            getBod(item.bodega_id),
            item.estado,
            item.numero_ot || ''
        ]);
        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', `inventario_filtrado_${new Date().toISOString().slice(0, 19)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Exportar por estado (ignora filtros de búsqueda y bodega)
    const exportarPorEstado = () => {
        let datosReporte = listaInventario;
        if (reporteEstado) {
            datosReporte = listaInventario.filter(i => i.estado === reporteEstado);
        }
        if (datosReporte.length === 0) {
            alert(`No hay equipos con estado ${reporteEstado || 'seleccionado'}`);
            return;
        }
        const headers = ['Material', 'Código', 'Serie', 'Doc. Material', 'OTH', 'Lote', 'Cantidad', 'Ubicación', 'Bodega', 'Estado', 'OT Asociada'];
        const rows = datosReporte.map(item => [
            item.descripcion || '',
            item.material_id || '',
            item.serial || '',
            item.documento_material || '',
            item.oth || '',
            item.lote || '',
            item.cantidad,
            item.ubicacion || '',
            getBod(item.bodega_id),
            item.estado,
            item.numero_ot || ''
        ]);
        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', `inventario_${reporteEstado || 'todos'}_${new Date().toISOString().slice(0, 19)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    // ---------------------------------

    // Seleccionar OT existente
    const selectOT = (ot) => {
        setOtSeleccionada(ot);
        setBuscarOT(ot.numero_ot);
        setForm(p => ({ ...p, ot_id: ot.id }));
        setShowOtDropdown(false);
        setNuevaOTData({ cliente: '', destino: '', mostrarFormulario: false });
    };

    const clearOT = () => {
        setOtSeleccionada(null);
        setBuscarOT('');
        setForm(p => ({ ...p, ot_id: '' }));
        setShowOtDropdown(false);
        setNuevaOTData({ cliente: '', destino: '', mostrarFormulario: false });
    };

    const handleOTChange = (e) => {
        const value = e.target.value;
        setBuscarOT(value);
        setShowOtDropdown(true);
        if (otSeleccionada) {
            setOtSeleccionada(null);
            setForm(p => ({ ...p, ot_id: '' }));
        }
        if (value && !otExiste(value)) {
            setNuevaOTData(prev => ({ ...prev, mostrarFormulario: true }));
        } else {
            setNuevaOTData(prev => ({ ...prev, mostrarFormulario: false }));
        }
    };

    const handleMaterialSearchChange = (e) => {
        const value = e.target.value;
        setBuscarMaterial(value);
        setShowMaterialDropdown(true);
        if (materialSeleccionado) {
            setMaterialSeleccionado(null);
            setForm(p => ({ ...p, material_id: '' }));
        }
    };

    const selectMaterial = (material) => {
        setMaterialSeleccionado(material);
        setBuscarMaterial(material.codigo_sap + ' - ' + material.descripcion);
        setForm(p => ({ ...p, material_id: material.codigo_sap }));
        setShowMaterialDropdown(false);
    };

    const clearMaterial = () => {
        setMaterialSeleccionado(null);
        setBuscarMaterial('');
        setForm(p => ({ ...p, material_id: '' }));
        setShowMaterialDropdown(false);
    };

    const handleCreate = async () => {
        if (!form.material_id) {
            setAlert({ type: 'error', msg: 'Debes seleccionar un material.' });
            return;
        }
        if (!form.bodega_id) {
            setAlert({ type: 'error', msg: 'Debes seleccionar una bodega.' });
            return;
        }
        setSaving(true);
        setAlert(null);
        try {
            let otId = form.ot_id;
            if (buscarOT && buscarOT.trim() !== '') {
                const otExistenteObj = otExistente(buscarOT);
                if (otExistenteObj) {
                    otId = otExistenteObj.id;
                    setOtSeleccionada(otExistenteObj);
                    setForm(p => ({ ...p, ot_id: otId }));
                } else {
                    if (!nuevaOTData.cliente) {
                        setAlert({ type: 'error', msg: 'La OT no existe. Debes ingresar el cliente para crearla.' });
                        setSaving(false);
                        return;
                    }
                    const nuevaOT = await http.post('/ot', {
                        numero_ot: buscarOT,
                        cliente: nuevaOTData.cliente || 'Pendiente',
                        destino: nuevaOTData.destino || 'Pendiente',
                        estado: 'ABIERTA'
                    });
                    otId = nuevaOT.id;
                    setOtSeleccionada(nuevaOT);
                    setForm(p => ({ ...p, ot_id: otId }));
                    await refresh();
                }
            }
            const data = {
                material_id: form.material_id,
                serial: form.serial?.trim() || null,
                cantidad: parseInt(form.cantidad) || 1,
                bodega_id: parseInt(form.bodega_id),
                ubicacion: form.ubicacion || null,
                ot_id: otId || null,
                documento_material: form.documento_material || null,
                oth: form.oth || null,
                lote: form.lote || 'NO VALORADO'
            };
            await http.post('/inventario', data);
            await refresh();
            setForm({
                material_id: '', serial: '', cantidad: 1, bodega_id: '', ot_id: '', ubicacion: '',
                documento_material: '', oth: '', lote: 'NO VALORADO'
            });
            setBuscarOT('');
            setOtSeleccionada(null);
            setBuscarMaterial('');
            setMaterialSeleccionado(null);
            setNuevaOTData({ cliente: '', destino: '', mostrarFormulario: false });
            setShowF(false);
            setAlert({ type: 'success', msg: 'Equipo registrado correctamente' });
        } catch (err) {
            console.error(err);
            setAlert({ type: 'error', msg: err.message || 'Error al procesar la solicitud' });
        } finally {
            setSaving(false);
        }
    };

    const getBod = (id) => {
        const bodega = bodegas.find(b => b.id === id);
        return bodega ? bodega.nombre : 'Sin bodega';
    };

    const estadosFiltro = ['STOCK', 'INGRESADO', 'TERRENO', 'CONSUMO', 'DEVUELTO'];
    const totalConSerial = listaInventario.filter(i => i.serial).length;
    const totalSinSerial = listaInventario.filter(i => !i.serial).length;

    return React.createElement('div', null,
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' } },
            React.createElement('h2', { style: { margin: 0, fontWeight: 500, fontSize: 18 } }, 'Inventario'),
            React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
                React.createElement(Btn, { onClick: () => setShowF(!showF) },
                    React.createElement('i', { className: `ti ti-${showF ? 'minus' : 'plus'}` }), showF ? ' Cerrar' : ' Nuevo item'
                ),
                React.createElement(Btn, { onClick: exportarInventarioCSV, style: { background: '#2e7d32', color: 'white' } },
                    React.createElement('i', { className: 'ti ti-download' }), ' Exportar (actual)'
                ),
                React.createElement('select', { value: reporteEstado, onChange: e => setReporteEstado(e.target.value), style: { padding: '5px', borderRadius: '6px', border: '1px solid var(--border)' } },
                    React.createElement('option', { value: '' }, 'Todos los estados'),
                    estadosFiltro.map(e => React.createElement('option', { key: e, value: e }, e))
                ),
                React.createElement(Btn, { onClick: exportarPorEstado, style: { background: '#0288d1', color: 'white' } },
                    React.createElement('i', { className: 'ti ti-download' }), ' Exportar por estado'
                )
            )
        ),
        alert && React.createElement(Alert, { type: alert.type, msg: alert.msg, onClose: () => setAlert(null) }),

        // FORMULARIO
        showF && React.createElement('div', { style: { ...CARD, padding: '1rem', marginBottom: '1rem' } },
            React.createElement('p', { style: { margin: '0 0 1rem', fontWeight: 500, fontSize: 14 } }, '📦 Registrar nuevo equipo o material'),
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 } },
                // Material (autocompletado)
                React.createElement('div', { style: { position: 'relative' } },
                    React.createElement('label', { style: LBL }, 'Material *'),
                    React.createElement('div', { style: { position: 'relative' } },
                        React.createElement('input', {
                            type: 'text',
                            value: buscarMaterial,
                            onChange: handleMaterialSearchChange,
                            onFocus: () => setShowMaterialDropdown(true),
                            placeholder: 'Escribe código o descripción del material...',
                            style: { paddingRight: buscarMaterial ? '30px' : '0' }
                        }),
                        buscarMaterial && React.createElement('button', {
                            onClick: clearMaterial,
                            style: { position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '14px' }
                        }, '×')
                    ),
                    showMaterialDropdown && filteredMaterials.length > 0 && React.createElement('div', {
                        style: { position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: 200, overflowY: 'auto', marginTop: 4 }
                    },
                        filteredMaterials.map(m => React.createElement('div', {
                            key: m.codigo_sap, onClick: () => selectMaterial(m),
                            style: { padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' },
                            onMouseEnter: e => e.currentTarget.style.background = 'var(--bg-secondary)',
                            onMouseLeave: e => e.currentTarget.style.background = 'white'
                        },
                            React.createElement('strong', null, m.codigo_sap),
                            React.createElement('div', { style: { fontSize: 12, color: '#666' } }, m.descripcion)
                        ))
                    )
                ),
                // Serial
                React.createElement('div', null,
                    React.createElement('label', { style: LBL }, 'Número de Serie'),
                    React.createElement('input', { value: form.serial, onChange: f('serial'), placeholder: 'S/N o MAC Address' })
                ),
                // Cantidad
                React.createElement('div', null,
                    React.createElement('label', { style: LBL }, 'Cantidad'),
                    React.createElement('input', { type: 'number', min: 1, value: form.cantidad, onChange: f('cantidad') })
                ),
                // Bodega
                React.createElement('div', null,
                    React.createElement('label', { style: LBL }, 'Bodega *'),
                    React.createElement('select', { value: form.bodega_id, onChange: f('bodega_id') },
                        React.createElement('option', { value: '' }, 'Seleccionar bodega...'),
                        bodegas.filter(b => b.activo).map(b => React.createElement('option', { key: b.id, value: b.id }, b.nombre))
                    )
                ),
                // Ubicación
                React.createElement('div', null,
                    React.createElement('label', { style: LBL }, 'Ubicación'),
                    React.createElement('input', { value: form.ubicacion, onChange: f('ubicacion'), placeholder: 'Ej: Pasillo A - Estante 2' })
                ),
                // Documento material
                React.createElement('div', null,
                    React.createElement('label', { style: LBL }, 'Doc. Material'),
                    React.createElement('input', { value: form.documento_material, onChange: f('documento_material'), placeholder: 'Ej: 4906541345' })
                ),
                // OTH
                React.createElement('div', null,
                    React.createElement('label', { style: LBL }, 'OTH'),
                    React.createElement('input', { value: form.oth, onChange: f('oth'), placeholder: 'Número OTH' })
                ),
                // Lote
                React.createElement('div', null,
                    React.createElement('label', { style: LBL }, 'Lote'),
                    React.createElement('select', { value: form.lote, onChange: f('lote') },
                        React.createElement('option', { value: 'VALORADO' }, 'VALORADO'),
                        React.createElement('option', { value: 'NO VALORADO' }, 'NO VALORADO')
                    )
                ),
                // OT - Campo principal
                React.createElement('div', { style: { position: 'relative' } },
                    React.createElement('label', { style: LBL }, 'Número de OT'),
                    React.createElement('div', { style: { position: 'relative' } },
                        React.createElement('input', {
                            type: 'text', value: buscarOT, onChange: handleOTChange, onFocus: () => setShowOtDropdown(true),
                            placeholder: 'Escribe el número de OT...', style: { paddingRight: buscarOT ? '30px' : '0' }
                        }),
                        buscarOT && React.createElement('button', {
                            onClick: clearOT,
                            style: { position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '14px' }
                        }, '×')
                    ),
                    showOtDropdown && filteredOTs.length > 0 && React.createElement('div', {
                        style: { position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: 200, overflowY: 'auto', marginTop: 4 }
                    },
                        filteredOTs.map(ot => React.createElement('div', {
                            key: ot.id, onClick: () => selectOT(ot),
                            style: { padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' },
                            onMouseEnter: e => e.currentTarget.style.background = 'var(--bg-secondary)',
                            onMouseLeave: e => e.currentTarget.style.background = 'white'
                        },
                            React.createElement('strong', null, ot.numero_ot),
                            React.createElement('div', { style: { fontSize: 12, color: '#666' } }, ot.cliente || 'Sin cliente')
                        ))
                    )
                )
            ),
            // Formulario adicional para nueva OT
            buscarOT && !otSeleccionada && !otExiste(buscarOT) && nuevaOTData.mostrarFormulario && React.createElement('div', {
                style: { marginTop: 16, padding: '12px', background: '#fff8e1', borderRadius: 8, border: '1px solid #ffe0b2' }
            },
                React.createElement('p', { style: { margin: '0 0 12px', fontWeight: 500, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 } },
                    React.createElement('i', { className: 'ti ti-alert-circle', style: { color: 'var(--amber)' } }),
                    'La OT "', buscarOT, '" no existe. Ingresa los datos para crearla:'
                ),
                React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
                    React.createElement('div', null,
                        React.createElement('label', { style: LBL }, 'Cliente *'),
                        React.createElement('input', { value: nuevaOTData.cliente, onChange: fnNuevaOT('cliente'), placeholder: 'Nombre del cliente', autoFocus: true })
                    ),
                    React.createElement('div', null,
                        React.createElement('label', { style: LBL }, 'Destino'),
                        React.createElement('input', { value: nuevaOTData.destino, onChange: fnNuevaOT('destino'), placeholder: 'Dirección del proyecto' })
                    )
                ),
                React.createElement('div', { style: { marginTop: 8, fontSize: 11, color: '#666' } },
                    React.createElement('i', { className: 'ti ti-info-circle' }), ' Esta OT se creará automáticamente al guardar el equipo.'
                )
            ),
            buscarOT && otExiste(buscarOT) && !otSeleccionada && React.createElement('div', {
                style: { marginTop: 12, padding: '8px 12px', background: '#e8f5e9', borderRadius: 6, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }
            },
                React.createElement('i', { className: 'ti ti-check-circle', style: { color: '#2e7d32' } }),
                React.createElement('span', null, 'La OT "', buscarOT, '" ya existe. Se asociará automáticamente al guardar.')
            ),
            otSeleccionada && React.createElement('div', {
                style: { marginTop: 12, padding: '8px 12px', background: '#e8f5e9', borderRadius: 6, fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
            },
                React.createElement('span', null,
                    React.createElement('strong', null, '✓ OT seleccionada: '),
                    otSeleccionada.numero_ot, ' - ', otSeleccionada.cliente || 'Sin cliente'
                ),
                React.createElement('button', { onClick: clearOT, style: { background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 12 } }, 'Cambiar')
            ),
            React.createElement('div', { style: { marginTop: 20, display: 'flex', gap: 8, justifyContent: 'flex-end' } },
                React.createElement(Btn, { onClick: handleCreate, loading: saving }, 'Guardar Equipo'),
                React.createElement(Btn, {
                    secondary: true, onClick: () => {
                        setShowF(false);
                        setBuscarOT('');
                        setOtSeleccionada(null);
                        setBuscarMaterial('');
                        setMaterialSeleccionado(null);
                        setNuevaOTData({ cliente: '', destino: '', mostrarFormulario: false });
                        setForm({ material_id: '', serial: '', cantidad: 1, bodega_id: '', ot_id: '', ubicacion: '', documento_material: '', oth: '', lote: 'NO VALORADO' });
                    }
                }, 'Cancelar')
            )
        ),

        // FILTROS
        React.createElement('div', { style: { ...CARD, padding: '0.75rem', marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' } },
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0 0.5rem', borderRadius: 6, flex: 1, minWidth: 200 } },
                React.createElement('i', { className: 'ti ti-search', style: { marginRight: 6 } }),
                React.createElement('input', {
                    style: { background: 'transparent', border: 'none', padding: '6px 0' },
                    placeholder: 'Buscar por cualquier campo (material, serie, OT, lote, doc, OTH, ubicación, estado)...',
                    value: srch,
                    onChange: e => setSrch(e.target.value)
                })
            ),
            React.createElement('select', { style: { width: 'auto', minWidth: 160 }, value: fb, onChange: e => setFb(e.target.value) },
                React.createElement('option', { value: '' }, 'Todas las bodegas'),
                bodegas.map(b => React.createElement('option', { key: b.id, value: b.id }, b.nombre))
            ),
            React.createElement('select', { style: { width: 'auto', minWidth: 160 }, value: fe, onChange: e => setFe(e.target.value) },
                React.createElement('option', { value: '' }, 'Todos los estados'),
                estadosFiltro.map(e => React.createElement('option', { key: e, value: e }, e))
            )
        ),

        // TABLA
        React.createElement('div', { style: CARD },
            React.createElement('div', { style: { padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 } },
                React.createElement('span', { style: { fontSize: 12, color: 'var(--text-secondary)' } }, '📊 Mostrando ', filtered.length, ' de ', listaInventario.length, ' equipos'),
                React.createElement('div', { style: { display: 'flex', gap: 16 } },
                    React.createElement('span', { style: { fontSize: 12, color: '#2e7d32' } }, '🔢 Con serial: ', totalConSerial),
                    React.createElement('span', { style: { fontSize: 12, color: '#ed6c02' } }, '📦 Sin serial: ', totalSinSerial)
                )
            ),
            React.createElement('div', { style: { overflowX: 'auto' } },
                React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse', minWidth: 1100 } },
                    React.createElement('thead', null,
                        React.createElement('tr', null,
                            ['Cantidad', 'Material', 'Descripción', 'Nº Serie', 'Doc. Material', 'OT Asociada (OTP)', 'OTH', 'Lote', 'Ubicación', 'Estado', 'Acción'].map(h =>
                                React.createElement('th', { key: h, style: TH }, h)
                            )
                        )
                    ),
                    React.createElement('tbody', null,
                        filtered.length === 0 ?
                            React.createElement('tr', null,
                                React.createElement('td', { colSpan: 11, style: { ...TD, textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' } },
                                    React.createElement('i', { className: 'ti ti-package-off', style: { fontSize: 32, marginBottom: 8, display: 'block' } }),
                                    'No se encontraron artículos'
                                )
                            ) :
                            filtered.map(item => {
                                let estadoColor = '#6b7280';
                                let estadoLabel = item.estado;
                                switch (item.estado) {
                                    case 'STOCK': estadoColor = '#2e7d32'; estadoLabel = '📦 Stock libre'; break;
                                    case 'INGRESADO': estadoColor = '#ed6c02'; estadoLabel = '📋 Ingresado (con OT)'; break;
                                    case 'TERRENO': estadoColor = '#0288d1'; estadoLabel = '🔧 En terreno'; break;
                                    case 'CONSUMO': estadoColor = '#6b7280'; estadoLabel = '✅ Consumido'; break;
                                    case 'DEVUELTO': estadoColor = '#757575'; estadoLabel = '🔄 Devuelto'; break;
                                }
                                return React.createElement('tr', { key: item.id, style: { borderBottom: '1px solid var(--border)' } },
                                    // 1. Cantidad
                                    React.createElement('td', { style: { ...TD, textAlign: 'center' } }, item.cantidad),
                                    // 2. Material (código)
                                    React.createElement('td', { style: TD }, item.material_id),
                                    // 3. Descripción
                                    React.createElement('td', { style: TD }, item.material_descripcion || '—'),
                                    // 4. Nº Serie
                                    React.createElement('td', { style: TD },
                                        item.serial ?
                                            React.createElement('code', { style: { background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 4, fontSize: 11 } }, item.serial) :
                                            React.createElement('span', { style: { color: 'var(--text-secondary)', fontStyle: 'italic' } }, '—')
                                    ),
                                    // 5. Doc. Material
                                    React.createElement('td', { style: TD }, item.documento_material || '—'),
                                    // 6. OT Asociada (OTP)
                                    React.createElement('td', { style: TD },
                                        item.numero_ot ?
                                            React.createElement('span', { style: { background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 12, fontSize: 11 } },
                                                React.createElement('i', { className: 'ti ti-file-invoice', style: { marginRight: 4 } }), item.numero_ot
                                            ) :
                                            React.createElement('span', { style: { color: 'var(--text-secondary)', fontSize: 12, fontStyle: 'italic' } }, '—')
                                    ),
                                    // 7. OTH
                                    React.createElement('td', { style: TD }, item.oth || '—'),
                                    // 8. Lote
                                    React.createElement('td', { style: TD }, item.lote || '—'),
                                    // 9. Ubicación
                                    React.createElement('td', { style: TD }, item.ubicacion || '—'),
                                    // 10. Estado
                                    React.createElement('td', { style: TD },
                                        React.createElement('span', {
                                            style: {
                                                display: 'inline-block',
                                                padding: '4px 10px',
                                                borderRadius: 20,
                                                fontSize: 11,
                                                fontWeight: 500,
                                                background: estadoColor + '20',
                                                color: estadoColor
                                            }
                                        }, estadoLabel)
                                    ),
                                    // 11. Acción
                                    React.createElement('td', { style: TD },
                                        React.createElement(Btn, { small: true, onClick: () => { setTransferItem(item); setView('transferir'); } }, 'Transferir')
                                    )
                                );
                            })
                    )
                )
            )
        )
    );
}