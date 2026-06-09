// components/SalidasView.js
function SalidasView({ user, refresh }) {
    // Estados para listado
    const [salidas, setSalidas] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [pagina, setPagina] = React.useState(1);
    const [totalPaginas, setTotalPaginas] = React.useState(1);
    const [filtroDestino, setFiltroDestino] = React.useState('');
    const [filtroFecha, setFiltroFecha] = React.useState('');

    // Estados para formulario de nueva salida
    const [showForm, setShowForm] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [alert, setAlert] = React.useState(null);
    const [equiposDisponibles, setEquiposDisponibles] = React.useState([]);
    const [loadingEquipos, setLoadingEquipos] = React.useState(false);
    
    const [form, setForm] = React.useState({
        fecha: new Date().toISOString().split('T')[0],
        destino: '',
        motivo: '',
        observaciones: '',
        items: []
    });

    // Para selección de equipos
    const [buscarEquipo, setBuscarEquipo] = React.useState('');
    const [equipoSeleccionado, setEquipoSeleccionado] = React.useState(null);
    const [cantidadSeleccionada, setCantidadSeleccionada] = React.useState(1);
    const [showEquipoDropdown, setShowEquipoDropdown] = React.useState(false);

    // Detalle de salida (modal)
    const [detalleSalida, setDetalleSalida] = React.useState(null);
    const [showDetalle, setShowDetalle] = React.useState(false);

    const token = localStorage.getItem('token');

    // Obtener lista de salidas (pagina, filtros)
    const cargarSalidas = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: pagina, limit: 20 });
            if (filtroDestino) params.append('destino', filtroDestino);
            if (filtroFecha) params.append('desde', filtroFecha);
            const data = await http.get(`/salidas?${params}`, token);
            setSalidas(data.data);
            setTotalPaginas(data.pagination.totalPages);
        } catch (err) {
            setAlert({ type: 'error', msg: err.message });
        } finally {
            setLoading(false);
        }
    };

    // Cargar equipos disponibles (STOCK o INGRESADO)
    const cargarEquiposDisponibles = async () => {
        setLoadingEquipos(true);
        try {
            const inventario = await http.get('/inventario', token);
            const disponibles = inventario.filter(item => 
                item.estado === 'STOCK' || item.estado === 'INGRESADO'
            );
            setEquiposDisponibles(disponibles);
        } catch (err) {
            console.error('Error cargando inventario:', err);
            setAlert({ type: 'error', msg: 'No se pudo cargar el inventario disponible' });
        } finally {
            setLoadingEquipos(false);
        }
    };

    React.useEffect(() => {
        cargarSalidas();
    }, [pagina, filtroDestino, filtroFecha]);

    React.useEffect(() => {
        if (showForm) {
            cargarEquiposDisponibles();
        }
    }, [showForm]);

    // Agregar equipo a la lista de items
    const agregarItem = () => {
        if (!equipoSeleccionado) {
            setAlert({ type: 'error', msg: 'Seleccione un equipo primero' });
            return;
        }
        let cantidad = cantidadSeleccionada;
        if (equipoSeleccionado.serial && cantidad !== 1) {
            setAlert({ type: 'error', msg: 'Los equipos serializados solo pueden salir de a 1 unidad' });
            return;
        }
        if (cantidad > (equipoSeleccionado.cantidad || 1)) {
            setAlert({ type: 'error', msg: `No hay suficiente stock. Disponible: ${equipoSeleccionado.cantidad || 1}` });
            return;
        }
        const yaAgregado = form.items.some(i => i.inventario_id === equipoSeleccionado.id);
        if (yaAgregado) {
            setAlert({ type: 'error', msg: 'Este equipo ya está en la lista de salida' });
            return;
        }
        setForm(p => ({
            ...p,
            items: [...p.items, {
                inventario_id: equipoSeleccionado.id,
                cantidad: cantidad,
                observacion_item: ''
            }]
        }));
        setEquipoSeleccionado(null);
        setBuscarEquipo('');
        setCantidadSeleccionada(1);
        setShowEquipoDropdown(false);
    };

    const eliminarItem = (index) => {
        setForm(p => ({
            ...p,
            items: p.items.filter((_, i) => i !== index)
        }));
    };

    const handleCrearSalida = async () => {
        if (!user || !user.id) {
            setAlert({ type: 'error', msg: 'No se ha identificado al usuario responsable. Cierra sesión y vuelve a ingresar.' });
            return;
        }
        if (!form.destino.trim()) {
            setAlert({ type: 'error', msg: 'El destino es obligatorio' });
            return;
        }
        if (form.items.length === 0) {
            setAlert({ type: 'error', msg: 'Agregue al menos un equipo a la salida' });
            return;
        }
        setSaving(true);
        setAlert(null);
        try {
            const payload = {
                fecha: form.fecha,
                destino: form.destino,
                motivo: form.motivo,
                responsable_id: user.id,   // ← Automático: el usuario logueado
                observaciones: form.observaciones,
                items: form.items
            };
            await http.post('/salidas', payload, token);
            await cargarSalidas();
            setShowForm(false);
            setForm({
                fecha: new Date().toISOString().split('T')[0],
                destino: '',
                motivo: '',
                observaciones: '',
                items: []
            });
            setAlert({ type: 'success', msg: 'Salida registrada correctamente' });
            if (refresh) refresh();
        } catch (err) {
            setAlert({ type: 'error', msg: err.message });
        } finally {
            setSaving(false);
        }
    };

    const verDetalle = async (id) => {
        try {
            const data = await http.get(`/salidas/${id}`, token);
            setDetalleSalida(data);
            setShowDetalle(true);
        } catch (err) {
            setAlert({ type: 'error', msg: err.message });
        }
    };

    const imprimirComprobante = async (salida) => {
        let datosCompletos;
        if (salida.detalles) {
            datosCompletos = salida;
        } else {
            try {
                datosCompletos = await http.get(`/salidas/${salida.id}`, token);
            } catch (err) {
                setAlert({ type: 'error', msg: 'No se pudo obtener los detalles para imprimir' });
                return;
            }
        }
        const cabecera = datosCompletos.cabecera || datosCompletos;
        const detalles = datosCompletos.detalles || [];
        const ventana = window.open('', '_blank');
        ventana.document.write(`
            <html>
            <head>
                <title>Comprobante de Salida ${cabecera.consecutivo}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; }
                    h1 { color: #ed6c02; }
                    .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
                    .info { margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background: #f5f5f5; }
                    .footer { margin-top: 40px; text-align: center; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>COMPROBANTE DE SALIDA</h1>
                    <p><strong>N°:</strong> ${cabecera.consecutivo}</p>
                </div>
                <div class="info">
                    <p><strong>Fecha:</strong> ${new Date(cabecera.fecha).toLocaleDateString('es-CO')}</p>
                    <p><strong>Destino:</strong> ${cabecera.destino}</p>
                    <p><strong>Motivo:</strong> ${cabecera.motivo || '—'}</p>
                    <p><strong>Responsable:</strong> ${cabecera.responsable_nombre || user?.nombre || 'Usuario actual'}</p>
                    <p><strong>Observaciones:</strong> ${cabecera.observaciones || '—'}</p>
                </div>
                <h3>Equipos / Materiales</h3>
                <table>
                    <thead>
                        <tr><th>Cantidad</th><th>Material / Serial</th><th>Observación</th></tr>
                    </thead>
                    <tbody>
                        ${detalles.map(d => `
                            <tr>
                                <td>${d.cantidad}</td>
                                <td>${d.serial || d.material_descripcion || d.material_id || '—'}</td>
                                <td>${d.observacion_item || '—'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="footer">
                    <p>Este comprobante es una constancia de la salida de inventario.</p>
                    <p>Generado por: ${cabecera.created_by_nombre || user?.nombre || 'Sistema'} - ${new Date().toLocaleString()}</p>
                </div>
                <script>window.print();</script>
            </body>
            </html>
        `);
        ventana.document.close();
    };

    return React.createElement('div', null,
        alert && React.createElement(Alert, { type: alert.type, msg: alert.msg, onClose: () => setAlert(null) }),

        // Header
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' } },
            React.createElement('h2', { style: { margin: 0, fontWeight: 500, fontSize: 18 } }, '🚚 Salidas de Inventario'),
            React.createElement(Btn, { onClick: () => setShowForm(!showForm) },
                React.createElement('i', { className: `ti ti-${showForm ? 'x' : 'plus'}` }), showForm ? ' Cancelar' : ' Nueva Salida'
            )
        ),

        // Formulario de nueva salida (sin campo responsable)
        showForm && React.createElement('div', { style: { ...CARD, padding: '1.25rem', marginBottom: '1rem' } },
            React.createElement('p', { style: { fontWeight: 500, marginBottom: '1rem' } }, '📝 Registrar nueva salida'),
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 } },
                React.createElement('div', null,
                    React.createElement('label', { style: LBL }, 'Fecha *'),
                    React.createElement('input', { type: 'date', value: form.fecha, onChange: e => setForm(p => ({ ...p, fecha: e.target.value })) })
                ),
                React.createElement('div', null,
                    React.createElement('label', { style: LBL }, 'Destino *'),
                    React.createElement('input', { value: form.destino, onChange: e => setForm(p => ({ ...p, destino: e.target.value })), placeholder: 'Ej: A011 TABASCO POPAYÁN' })
                ),
                React.createElement('div', null,
                    React.createElement('label', { style: LBL }, 'Motivo'),
                    React.createElement('input', { value: form.motivo, onChange: e => setForm(p => ({ ...p, motivo: e.target.value })), placeholder: 'Ej: Traslado Telecom' })
                ),
                React.createElement('div', null,
                    React.createElement('label', { style: LBL }, 'Observaciones generales'),
                    React.createElement('textarea', { value: form.observaciones, onChange: e => setForm(p => ({ ...p, observaciones: e.target.value })), rows: 2, placeholder: 'Notas adicionales...' })
                )
            ),
            // Mensaje informativo sobre el responsable automático
            React.createElement('div', { style: { marginTop: '0.5rem', fontSize: 12, color: 'var(--text-secondary)' } },
                React.createElement('i', { className: 'ti ti-info-circle' }), ' El responsable será ', React.createElement('strong', null, user?.nombre || 'usuario actual'), ' automáticamente.'
            ),

            // Selección de equipos (sin cambios)
            React.createElement('div', { style: { marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' } },
                React.createElement('p', { style: { fontWeight: 500, marginBottom: '0.5rem' } }, 'Agregar equipos/materiales'),
                React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' } },
                    React.createElement('div', { style: { flex: 2, position: 'relative' } },
                        React.createElement('label', { style: LBL }, 'Equipo o material'),
                        React.createElement('input', {
                            value: buscarEquipo,
                            onChange: e => { setBuscarEquipo(e.target.value); setShowEquipoDropdown(true); if (e.target.value === '') setEquipoSeleccionado(null); },
                            onFocus: () => setShowEquipoDropdown(true),
                            placeholder: 'Buscar por serial o descripción...'
                        }),
                        showEquipoDropdown && equiposDisponibles.filter(eq => 
                            (eq.serial && eq.serial.toLowerCase().includes(buscarEquipo.toLowerCase())) ||
                            (eq.material_descripcion && eq.material_descripcion.toLowerCase().includes(buscarEquipo.toLowerCase()))
                        ).slice(0, 5).map(eq => 
                            React.createElement('div', { key: eq.id, onClick: () => { setEquipoSeleccionado(eq); setBuscarEquipo(eq.serial || eq.material_descripcion); setShowEquipoDropdown(false); }, style: { position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 6, zIndex: 100, padding: '8px', cursor: 'pointer' } },
                                React.createElement('div', null, React.createElement('strong', null, eq.serial || eq.material_descripcion)),
                                React.createElement('div', { style: { fontSize: 12 } }, `${eq.material_id || eq.codigo_sap} - Stock: ${eq.cantidad || 1}`)
                            )
                        )
                    ),
                    React.createElement('div', { style: { flex: 1 } },
                        React.createElement('label', { style: LBL }, 'Cantidad'),
                        React.createElement('input', { type: 'number', min: 1, value: cantidadSeleccionada, onChange: e => setCantidadSeleccionada(parseInt(e.target.value) || 1), disabled: equipoSeleccionado?.serial } )
                    ),
                    React.createElement(Btn, { onClick: agregarItem, secondary: true }, '➕ Agregar')
                ),
                // Lista de items agregados
                form.items.length > 0 && React.createElement('div', { style: { marginTop: '1rem' } },
                    React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse' } },
                        React.createElement('thead', null,
                            React.createElement('tr', null,
                                React.createElement('th', { style: TH }, 'Cantidad'),
                                React.createElement('th', { style: TH }, 'Material / Serie'),
                                React.createElement('th', { style: TH }, 'Observación'),
                                React.createElement('th', { style: TH }, 'Acción')
                            )
                        ),
                        React.createElement('tbody', null,
                            form.items.map((item, idx) => {
                                const eq = equiposDisponibles.find(e => e.id === item.inventario_id);
                                return React.createElement('tr', { key: idx, style: { borderBottom: '1px solid var(--border)' } },
                                    React.createElement('td', { style: TD }, item.cantidad),
                                    React.createElement('td', { style: TD }, eq ? (eq.serial || eq.material_descripcion) : item.inventario_id),
                                    React.createElement('td', { style: TD },
                                        React.createElement('input', { type: 'text', placeholder: 'Nota (opcional)', value: item.observacion_item, onChange: e => setForm(p => ({ ...p, items: p.items.map((i, i2) => i2 === idx ? { ...i, observacion_item: e.target.value } : i) })) })
                                    ),
                                    React.createElement('td', { style: TD }, React.createElement('button', { onClick: () => eliminarItem(idx), style: { background: 'none', border: 'none', color: '#d32f2f', cursor: 'pointer' } }, '🗑️'))
                                );
                            })
                        )
                    )
                )
            ),
            React.createElement('div', { style: { marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: 8 } },
                React.createElement(Btn, { onClick: handleCrearSalida, loading: saving }, 'Registrar Salida'),
                React.createElement(Btn, { secondary: true, onClick: () => setShowForm(false) }, 'Cancelar')
            )
        ),

        // Filtros y tabla (sin cambios)
        React.createElement('div', { style: { ...CARD, padding: '1rem', marginBottom: '1rem', display: 'flex', gap: 12, flexWrap: 'wrap' } },
            React.createElement('input', { type: 'text', placeholder: 'Destino...', value: filtroDestino, onChange: e => { setFiltroDestino(e.target.value); setPagina(1); }, style: { flex: 2 } }),
            React.createElement('input', { type: 'date', value: filtroFecha, onChange: e => { setFiltroFecha(e.target.value); setPagina(1); } }),
            React.createElement(Btn, { onClick: () => { setFiltroDestino(''); setFiltroFecha(''); setPagina(1); }, secondary: true }, 'Limpiar filtros')
        ),

        React.createElement('div', { style: CARD },
            loading ? React.createElement('div', { style: { padding: '2rem', textAlign: 'center' } }, 'Cargando...') :
            salidas.length === 0 ? React.createElement('div', { style: { padding: '2rem', textAlign: 'center' } }, 'No hay salidas registradas') :
            React.createElement(React.Fragment, null,
                React.createElement('div', { style: { overflowX: 'auto' } },
                    React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse' } },
                        React.createElement('thead', null,
                            React.createElement('tr', null,
                                ['Consecutivo', 'Fecha', 'Destino', 'Motivo', 'Responsable', 'Cant. Items', 'Acciones'].map(h => React.createElement('th', { key: h, style: TH }, h))
                            )
                        ),
                        React.createElement('tbody', null,
                            salidas.map(s => React.createElement('tr', { key: s.id, style: { borderBottom: '1px solid var(--border)' } },
                                React.createElement('td', { style: TD }, React.createElement('strong', null, s.consecutivo)),
                                React.createElement('td', { style: TD }, new Date(s.fecha).toLocaleDateString('es-CO')),
                                React.createElement('td', { style: TD }, s.destino),
                                React.createElement('td', { style: TD }, s.motivo || '—'),
                                React.createElement('td', { style: TD }, s.responsable_nombre || '—'),
                                React.createElement('td', { style: TD }, s.total_items),
                                React.createElement('td', { style: TD },
                                    React.createElement('div', { style: { display: 'flex', gap: 6 } },
                                        React.createElement('button', { onClick: () => verDetalle(s.id), style: { background: 'none', border: 'none', cursor: 'pointer', color: '#0288d1' }, title: 'Ver detalle' }, '👁️'),
                                        React.createElement('button', { onClick: () => imprimirComprobante(s), style: { background: 'none', border: 'none', cursor: 'pointer', color: '#ed6c02' }, title: 'Imprimir comprobante' }, '🖨️')
                                    )
                                )
                            ))
                        )
                    )
                ),
                totalPaginas > 1 && React.createElement('div', { style: { padding: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center', gap: 8 } },
                    React.createElement('button', { onClick: () => setPagina(p => Math.max(1, p-1)), disabled: pagina === 1 }, 'Anterior'),
                    React.createElement('span', null, `Página ${pagina} de ${totalPaginas}`),
                    React.createElement('button', { onClick: () => setPagina(p => Math.min(totalPaginas, p+1)), disabled: pagina === totalPaginas }, 'Siguiente')
                )
            )
        ),

        showDetalle && detalleSalida && React.createElement('div', { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 } },
            React.createElement('div', { style: { background: 'white', borderRadius: 12, maxWidth: 800, width: '90%', maxHeight: '80%', overflow: 'auto', padding: '1.5rem' } },
                React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' } },
                    React.createElement('h3', null, `Detalle de ${detalleSalida.cabecera?.consecutivo || detalleSalida.consecutivo}`),
                    React.createElement('button', { onClick: () => setShowDetalle(false), style: { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' } }, '×')
                ),
                React.createElement('p', null, React.createElement('strong', null, 'Destino: '), detalleSalida.cabecera?.destino || detalleSalida.destino),
                React.createElement('p', null, React.createElement('strong', null, 'Motivo: '), detalleSalida.cabecera?.motivo || detalleSalida.motivo || '—'),
                React.createElement('p', null, React.createElement('strong', null, 'Responsable: '), detalleSalida.cabecera?.responsable_nombre || detalleSalida.responsable_nombre || '—'),
                React.createElement('p', null, React.createElement('strong', null, 'Observaciones: '), detalleSalida.cabecera?.observaciones || detalleSalida.observaciones || '—'),
                React.createElement('h4', null, 'Equipos incluidos'),
                React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse' } },
                    React.createElement('thead', null,
                        React.createElement('tr', null,
                            React.createElement('th', { style: TH }, 'Cantidad'),
                            React.createElement('th', { style: TH }, 'Material / Serie'),
                            React.createElement('th', { style: TH }, 'Observación')
                        )
                    ),
                    React.createElement('tbody', null,
                        (detalleSalida.detalles || []).map((d, idx) => React.createElement('tr', { key: idx, style: { borderBottom: '1px solid var(--border)' } },
                            React.createElement('td', { style: TD }, d.cantidad),
                            React.createElement('td', { style: TD }, d.serial || d.material_descripcion || d.material_id || '—'),
                            React.createElement('td', { style: TD }, d.observacion_item || '—')
                        ))
                    )
                ),
                React.createElement('div', { style: { marginTop: '1rem', textAlign: 'right' } },
                    React.createElement(Btn, { onClick: () => imprimirComprobante(detalleSalida.cabecera || detalleSalida) }, '🖨️ Imprimir comprobante')
                )
            )
        )
    );
}