// components/OtrosViews.js

// ── TRANSFERIR ──
function TransferirView({ bodegas, inv, movimientos, transferItem, setTransferItem, refresh }) {
    const [form, setForm] = React.useState({ inv_id: transferItem?.id || '', bod_dest: '', obs: '' });
    const [saving, setSaving] = React.useState(false);
    const [alert, setAlert] = React.useState(null);
    const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

    const selItem = inv.find(i => i.id === parseInt(form.inv_id));
    const bodOrigen = bodegas.find(b => b.id === selItem?.bodega_id);
    const bodDest = bodegas.find(b => b.id === parseInt(form.bod_dest));
    const destOpts = bodegas.filter(b => b.activo && b.id !== selItem?.bodega_id);
    const recents = movimientos.filter(m => m.tipo === 'TRANSFERENCIA_BODEGA');

    const handleTransfer = async () => {
        if (!selItem || !form.bod_dest) return;
        setSaving(true); setAlert(null);
        try {
            await http.post('/movimientos/transferencia', {
                inventario_id: selItem.id, bodega_destino_id: parseInt(form.bod_dest),
                usuario_id: CURRENT_USER_ID, observacion: form.obs || null,
            });
            await refresh();
            setAlert({ type: 'success', msg: selItem.desc + ' transferido a ' + bodDest?.nombre });
            setTransferItem(null); setForm({ inv_id: '', bod_dest: '', obs: '' });
        } catch (err) { setAlert({ type: 'error', msg: err.message }); }
        finally { setSaving(false); }
    };

    return React.createElement('div', null,
        React.createElement('h2', { style: { margin: '0 0 1.25rem', fontWeight: 500, fontSize: 18 } }, 'Transferir entre bodegas'),
        alert && React.createElement(Alert, { type: alert.type, msg: alert.msg, onClose: () => setAlert(null) }),
        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
            React.createElement('div', { style: { ...CARD, padding: '1.25rem' } },
                React.createElement('p', { style: { margin: '0 0 1rem', fontWeight: 500, fontSize: 14 } }, 'Nueva transferencia'),
                React.createElement('div', { style: { marginBottom: 12 } },
                    React.createElement('label', { style: LBL }, 'Item a transferir *'),
                    React.createElement('select', { value: form.inv_id, onChange: e => { setForm(p => ({ ...p, inv_id: e.target.value, bod_dest: '' })); setTransferItem(null); } },
                        React.createElement('option', { value: '' }, 'Seleccionar item...'),
                        inv.filter(i => i.estado !== 'instalado').map(i => React.createElement('option', { key: i.id, value: i.id }, i.desc + (i.serial ? ' — ' + i.serial : '')))
                    )
                ),
                selItem && React.createElement('div', { style: { background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 12px', marginBottom: 12 } },
                    React.createElement('p', { style: { margin: 0, fontSize: 12, color: 'var(--text-secondary)' } }, 'Bodega actual'),
                    React.createElement('p', { style: { margin: 0, fontSize: 14, fontWeight: 500 } }, bodOrigen?.nombre || '—')
                ),
                React.createElement('div', { style: { marginBottom: 12 } },
                    React.createElement('label', { style: LBL }, 'Bodega destino *'),
                    React.createElement('select', { value: form.bod_dest, onChange: f('bod_dest'), disabled: !selItem },
                        React.createElement('option', { value: '' }, 'Seleccionar destino...'),
                        destOpts.map(b => React.createElement('option', { key: b.id, value: b.id }, b.nombre))
                    )
                ),
                React.createElement('div', { style: { marginBottom: 16 } },
                    React.createElement('label', { style: LBL }, 'Observación'),
                    React.createElement('input', { value: form.obs, onChange: f('obs'), placeholder: 'Motivo de la transferencia...' })
                ),
                selItem && form.bod_dest && React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--amber-light)', borderRadius: 8, marginBottom: 14, fontSize: 13 } },
                    React.createElement('span', { style: { color: 'var(--amber-dark)', fontWeight: 500 } }, bodOrigen?.nombre),
                    React.createElement('i', { className: 'ti ti-arrow-right', style: { fontSize: 16, color: 'var(--amber)' }, 'aria-hidden': 'true' }),
                    React.createElement('span', { style: { color: 'var(--amber-dark)', fontWeight: 500 } }, bodDest?.nombre)
                ),
                React.createElement(Btn, { onClick: handleTransfer, disabled: !selItem || !form.bod_dest, loading: saving },
                    React.createElement('i', { className: 'ti ti-arrow-right', style: { fontSize: 14 }, 'aria-hidden': 'true' }), ' Confirmar transferencia'
                )
            ),
            React.createElement('div', { style: CARD },
                React.createElement('div', { style: { padding: '1rem', borderBottom: '1px solid var(--border)' } },
                    React.createElement('p', { style: { margin: 0, fontWeight: 500, fontSize: 14 } }, 'Transferencias recientes')
                ),
                recents.length === 0
                    ? React.createElement('p', { style: { padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13, margin: 0 } }, 'Sin transferencias registradas')
                    : recents.map(m => React.createElement('div', { key: m.id, style: { padding: '10px 1rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'flex-start' } },
                        React.createElement('i', { className: 'ti ti-arrow-right', style: { fontSize: 16, color: 'var(--amber)', marginTop: 2, flexShrink: 0 }, 'aria-hidden': 'true' }),
                        React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                            React.createElement('p', { style: { margin: 0, fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, m.desc || '—'),
                            m.serial && React.createElement('p', { style: { margin: 0, fontSize: 11, fontFamily: 'monospace', color: 'var(--text-secondary)' } }, m.serial),
                            React.createElement('p', { style: { margin: 0, fontSize: 12, color: 'var(--text-secondary)' } }, (m.origen || '—') + ' → ' + (m.destino || '—'))
                        ),
                        React.createElement('span', { style: { fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' } }, m.fecha ? new Date(m.fecha).toLocaleDateString('es-CO') : '—')
                    ))
            )
        )
    );
}

// components/OtrosViews.js (fragmento corregido de MovimientosView)

function MovimientosView() {
    // Estados para filtros y paginación
    const [ft, setFt] = React.useState('');
    const [searchTerm, setSearchTerm] = React.useState('');
    const [fechaDesde, setFechaDesde] = React.useState('');
    const [fechaHasta, setFechaHasta] = React.useState('');
    const [pagina, setPagina] = React.useState(1);
    const [movimientosData, setMovimientosData] = React.useState({ data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } });
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);

    // Estados independientes para el reporte de exportación
    const [reporteTipo, setReporteTipo] = React.useState('');
    const [reporteFechaDesde, setReporteFechaDesde] = React.useState('');
    const [reporteFechaHasta, setReporteFechaHasta] = React.useState('');

    // Función para cargar movimientos desde el backend
    const cargarMovimientos = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                page: pagina,
                limit: 20,
                ...(ft && { tipo: ft }),
                ...(searchTerm && { search: searchTerm }),
                ...(fechaDesde && { fecha_desde: fechaDesde }),
                ...(fechaHasta && { fecha_hasta: fechaHasta })
            });
            const response = await fetch(`${API_BASE}/movimientos?${params}`);
            if (!response.ok) throw new Error('Error al cargar movimientos');
            const data = await response.json();
            setMovimientosData(data);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Recargar cuando cambian los filtros o la página
    React.useEffect(() => {
        cargarMovimientos();
    }, [ft, searchTerm, fechaDesde, fechaHasta, pagina]);

    // Limpiar filtros y volver a página 1
    const limpiarFiltros = () => {
        setFt('');
        setSearchTerm('');
        setFechaDesde('');
        setFechaHasta('');
        setPagina(1);
    };

    // Funciones de paginación
    const irPaginaAnterior = () => {
        if (pagina > 1) setPagina(pagina - 1);
    };
    const irPaginaSiguiente = () => {
        if (pagina < movimientosData.pagination.totalPages) setPagina(pagina + 1);
    };

    // Exportar con los filtros actuales de la tabla (usando el endpoint de exportación)
    const exportarCSV = async () => {
        try {
            const response = await fetch(`${API_BASE}/movimientos/export`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipo: ft || null,
                    fecha_desde: fechaDesde || null,
                    fecha_hasta: fechaHasta || null
                })
            });
            if (!response.ok) {
                const error = await response.json();
                alert(error.error || 'Error al exportar');
                return;
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `movimientos_filtrados_${new Date().toISOString().slice(0, 19)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            alert('Error al conectar con el servidor');
        }
    };

    // Exportación con filtros independientes (reporte personalizado)
    const exportarConFiltrosBackend = async () => {
        try {
            const response = await fetch(`${API_BASE}/movimientos/export`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipo: reporteTipo || null,
                    fecha_desde: reporteFechaDesde || null,
                    fecha_hasta: reporteFechaHasta || null
                })
            });
            if (!response.ok) {
                const error = await response.json();
                alert(error.error || 'Error al exportar');
                return;
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `movimientos_${reporteTipo || 'todos'}_${new Date().toISOString().slice(0, 19)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            alert('Error al conectar con el servidor');
        }
    };

    // Funciones auxiliares de formato
    const getTipoLabel = (tipo) => {
        const labels = {
            'INGRESO_BODEGA': '📥 Ingreso a Bodega',
            'ENTRADA_STOCK': '📥 Entrada a Stock',
            'ENTRADA_INVENTARIO': '📥 Entrada a Inventario',
            'INGRESO_ASIGNADO': '📥 Ingreso Asignado',
            'ASIGNACION_TERRENO': '🚚 Entrega a Técnico',
            'ENTREGA_EQUIPOS': '🚚 Entrega de Equipos',
            'ASIGNACION_OT': '📋 Asignación a OT',
            'ENTREGA_TECNICO': '🚚 Entrega a Técnico',
            'DEVOLUCION_BODEGA': '🔄 Devolución a Bodega',
            'TRANSFERENCIA_BODEGA': '📦 Transferencia',
            'REASIGNACION_TERRENO': '🔄 Reasignación a Terreno',
            'REASIGNACION_OT': '🔄 Reasignación entre OT',
            'INSTALACION_CONSUMO': '✅ Instalación/Consumo',
            'ACTUALIZACION': '✏️ Actualización'
        };
        return labels[tipo] || tipo.replace(/_/g, ' ');
    };

    const formatFecha = (fecha) => {
        if (!fecha) return '—';
        try {
            const d = new Date(fecha);
            return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch { return '—'; }
    };

    const getTipoColor = (tipo) => {
        const colors = {
            'INGRESO_BODEGA': '#2e7d32', 'ENTRADA_STOCK': '#2e7d32', 'ENTRADA_INVENTARIO': '#2e7d32', 'INGRESO_ASIGNADO': '#2e7d32',
            'ASIGNACION_TERRENO': '#0288d1', 'ENTREGA_EQUIPOS': '#0288d1', 'ASIGNACION_OT': '#0288d1', 'ENTREGA_TECNICO': '#0288d1',
            'DEVOLUCION_BODEGA': '#ed6c02', 'TRANSFERENCIA_BODEGA': '#9c27b0', 'REASIGNACION_TERRENO': '#ed6c02',
            'REASIGNACION_OT': '#ed6c02', 'INSTALACION_CONSUMO': '#6b7280', 'ACTUALIZACION': '#757575'
        };
        return colors[tipo] || '#6b7280';
    };

    const movimientosArray = movimientosData.data;
    const totalItems = movimientosData.pagination.total;
    const totalPaginas = movimientosData.pagination.totalPages;

    // Tipos únicos para el selector (se pueden obtener de una vez o cargar aparte, pero para simplificar usamos los que ya conocemos)
    const tiposUnicos = React.useMemo(() => {
        // Podríamos llamar a un endpoint aparte, pero por ahora usamos una lista fija actualizada
        return [
            'INGRESO_BODEGA', 'ENTRADA_STOCK', 'ENTRADA_INVENTARIO', 'INGRESO_ASIGNADO',
            'ASIGNACION_TERRENO', 'ENTREGA_EQUIPOS', 'ASIGNACION_OT', 'ENTREGA_TECNICO',
            'DEVOLUCION_BODEGA', 'TRANSFERENCIA_BODEGA', 'REASIGNACION_TERRENO',
            'REASIGNACION_OT', 'INSTALACION_CONSUMO', 'ACTUALIZACION'
        ].sort();
    }, []);

    if (loading && movimientosArray.length === 0) {
        return React.createElement('div', { style: { padding: '3rem', textAlign: 'center' } },
            React.createElement('i', { className: 'ti ti-loader spin', style: { fontSize: 24 } }),
            ' Cargando movimientos...'
        );
    }

    if (error) {
        return React.createElement('div', { style: { padding: '3rem', textAlign: 'center', color: 'red' } },
            'Error: ', error
        );
    }

    return React.createElement('div', null,
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: 12 } },
            React.createElement('h2', { style: { margin: 0, fontWeight: 500, fontSize: 18 } }, 'Historial de Movimientos'),
            React.createElement('div', { style: { display: 'flex', gap: 8 } },
                React.createElement('button', { onClick: limpiarFiltros, style: { padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: 12 } },
                    React.createElement('i', { className: 'ti ti-clear-formatting', style: { marginRight: 4 } }), 'Limpiar filtros'
                ),
                React.createElement('button', { onClick: exportarCSV, style: { padding: '6px 12px', background: '#2e7d32', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 } },
                    React.createElement('i', { className: 'ti ti-download', style: { marginRight: 4 } }), ' Exportar (filtros actuales)'
                )
            )
        ),

        // Panel de filtros independientes para reporte
        React.createElement('div', { style: { ...CARD, padding: '1rem', marginBottom: '1rem', background: 'var(--bg-secondary)' } },
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' } },
                React.createElement('select', { value: reporteTipo, onChange: e => setReporteTipo(e.target.value), style: { padding: '6px' } },
                    React.createElement('option', { value: '' }, 'Todos los tipos'),
                    tiposUnicos.map(t => React.createElement('option', { key: t, value: t }, getTipoLabel(t)))
                ),
                React.createElement('input', { type: 'date', value: reporteFechaDesde, onChange: e => setReporteFechaDesde(e.target.value), placeholder: 'Desde', style: { padding: '5px' } }),
                React.createElement('input', { type: 'date', value: reporteFechaHasta, onChange: e => setReporteFechaHasta(e.target.value), placeholder: 'Hasta', style: { padding: '5px' } }),
                React.createElement('button', { onClick: exportarConFiltrosBackend, style: { padding: '6px 12px', background: '#0288d1', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 } },
                    React.createElement('i', { className: 'ti ti-download', style: { marginRight: 4 } }), ' Exportar con estos filtros'
                )
            )
        ),

        // Filtros de la tabla principal
        React.createElement('div', { style: { ...CARD, padding: '1rem', marginBottom: '1rem' } },
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 } },
                React.createElement('div', null,
                    React.createElement('label', { style: LBL }, 'Tipo de movimiento'),
                    React.createElement('select', { value: ft, onChange: e => { setFt(e.target.value); setPagina(1); }, style: { width: '100%' } },
                        React.createElement('option', { value: '' }, '📋 Todos los tipos'),
                        tiposUnicos.map(t => React.createElement('option', { key: t, value: t }, getTipoLabel(t)))
                    )
                ),
                React.createElement('div', null,
                    React.createElement('label', { style: LBL }, 'Buscar'),
                    React.createElement('input', { type: 'text', value: searchTerm, onChange: e => { setSearchTerm(e.target.value); setPagina(1); }, placeholder: 'Material, serie o responsable...', style: { padding: '7px 10px' } })
                ),
                React.createElement('div', null,
                    React.createElement('label', { style: LBL }, 'Desde'),
                    React.createElement('input', { type: 'date', value: fechaDesde, onChange: e => { setFechaDesde(e.target.value); setPagina(1); } })
                ),
                React.createElement('div', null,
                    React.createElement('label', { style: LBL }, 'Hasta'),
                    React.createElement('input', { type: 'date', value: fechaHasta, onChange: e => { setFechaHasta(e.target.value); setPagina(1); } })
                )
            )
        ),

        // Tabla de movimientos
        React.createElement('div', { style: CARD },
            loading ?
                React.createElement('div', { style: { padding: '3rem', textAlign: 'center' } },
                    React.createElement('i', { className: 'ti ti-loader spin', style: { fontSize: 24 } }),
                    ' Cargando...'
                ) :
                movimientosArray.length === 0 ?
                    React.createElement('div', { style: { padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' } },
                        React.createElement('i', { className: 'ti ti-history-off', style: { fontSize: 48, marginBottom: 16, display: 'block' } }),
                        React.createElement('p', null, 'No hay movimientos con los filtros seleccionados')
                    ) :
                    React.createElement(React.Fragment, null,
                        React.createElement('div', { style: { overflowX: 'auto' } },
                            React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse', minWidth: 800 } },
                                React.createElement('thead', null,
                                    React.createElement('tr', null,
                                        ['Tipo', 'Material / Serie', 'Estado', 'OT', 'Responsable', 'Fecha'].map(h => React.createElement('th', { key: h, style: TH }, h))
                                    )
                                ),
                                React.createElement('tbody', null,
                                    movimientosArray.map(m => {
                                        const tipoColor = getTipoColor(m.tipo_movimiento);
                                        // Mostrar OT (puede ser ID o número real según backend)
                                        let otDisplay = '—';
                                        if (m.ot_nueva_numero) otDisplay = m.ot_nueva_numero;
                                        else if (m.ot_anterior_numero) otDisplay = m.ot_anterior_numero;
                                        else if (m.ot_nueva) otDisplay = `OT#${m.ot_nueva}`;
                                        else if (m.ot_anterior) otDisplay = `OT#${m.ot_anterior}`;

                                        return React.createElement('tr', { key: m.id, style: { borderBottom: '1px solid var(--border)' } },
                                            React.createElement('td', { style: TD },
                                                React.createElement('span', { style: { display: 'inline-block', padding: '4px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500, background: tipoColor + '20', color: tipoColor } }, getTipoLabel(m.tipo_movimiento))
                                            ),
                                            React.createElement('td', { style: TD },
                                                React.createElement('div', { style: { fontWeight: 500, fontSize: 13 } }, m.material || '—'),
                                                m.serial && React.createElement('div', { style: { fontSize: 11, color: 'var(--text-secondary)' } }, React.createElement('i', { className: 'ti ti-barcode', style: { marginRight: 4 } }), 'Serie: ', m.serial)
                                            ),
                                            React.createElement('td', { style: TD },
                                                React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 } },
                                                    React.createElement('span', { style: { color: '#ed6c02' } }, m.estado_anterior || '—'),
                                                    React.createElement('i', { className: 'ti ti-arrow-right', style: { fontSize: 12 } }),
                                                    React.createElement('span', { style: { color: '#2e7d32' } }, m.estado_nuevo || '—')
                                                )
                                            ),
                                            React.createElement('td', { style: TD }, otDisplay),
                                            React.createElement('td', { style: TD }, m.usuario || m.tecnico_nombre || '—'),
                                            React.createElement('td', { style: TD, fontSize: 12, color: 'var(--text-secondary)' }, formatFecha(m.created_at))
                                        );
                                    })
                                )
                            )
                        ),
                        totalPaginas > 1 && React.createElement('div', { style: { padding: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 } },
                            React.createElement('div', { style: { fontSize: 12, color: 'var(--text-secondary)' } },
                                `Mostrando página ${pagina} de ${totalPaginas} (${totalItems} movimientos totales)`
                            ),
                            React.createElement('div', { style: { display: 'flex', gap: 4 } },
                                React.createElement('button', { onClick: irPaginaAnterior, disabled: pagina === 1, style: { padding: '4px 10px', borderRadius: 4, border: '1px solid var(--border)', background: 'white', cursor: pagina === 1 ? 'not-allowed' : 'pointer', opacity: pagina === 1 ? 0.5 : 1 } }, '← Anterior'),
                                React.createElement('span', { style: { padding: '4px 12px', fontSize: 12 } }, `Página ${pagina} de ${totalPaginas}`),
                                React.createElement('button', { onClick: irPaginaSiguiente, disabled: pagina === totalPaginas, style: { padding: '4px 10px', borderRadius: 4, border: '1px solid var(--border)', background: 'white', cursor: pagina === totalPaginas ? 'not-allowed' : 'pointer', opacity: pagina === totalPaginas ? 0.5 : 1 } }, 'Siguiente →')
                            )
                        )
                    )
        )
    );
}
// ── ORDENES DE TRABAJO ──
function OtsView({ ots, refresh }) {
    const [showF, setShowF] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [alert, setAlert] = React.useState(null);
    const [form, setForm] = React.useState({ numero: '', cliente: '', destino: '', estado: 'pendiente' });
    const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

    const handleCreate = async () => {
        if (!form.numero || !form.cliente) return;
        setSaving(true); setAlert(null);
        try {
            await http.post('/ot', { numero_ot: form.numero, cliente: form.cliente, destino: form.destino, estado: form.estado });
            await refresh();
            setForm({ numero: '', cliente: '', destino: '', estado: 'pendiente' }); setShowF(false);
            setAlert({ type: 'success', msg: 'OT creada correctamente' });
        } catch (err) { setAlert({ type: 'error', msg: err.message }); }
        finally { setSaving(false); }
    };

    const handleEstado = async (ot, nuevoEstado) => {
        try {
            await http.put('/ot/' + ot.id, { estado: nuevoEstado });
            await refresh();
        } catch (err) { setAlert({ type: 'error', msg: err.message }); }
    };

    return React.createElement('div', null,
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' } },
            React.createElement('h2', { style: { margin: 0, fontWeight: 500, fontSize: 18 } }, 'Órdenes de trabajo'),
            React.createElement(Btn, { onClick: () => setShowF(s => !s) },
                React.createElement('i', { className: 'ti ti-plus', style: { fontSize: 14 }, 'aria-hidden': 'true' }), ' Nueva OT'
            )
        ),
        alert && React.createElement(Alert, { type: alert.type, msg: alert.msg, onClose: () => setAlert(null) }),
        showF && React.createElement('div', { style: { ...CARD, padding: '1rem', marginBottom: '1rem' } },
            React.createElement('p', { style: { margin: '0 0 0.75rem', fontWeight: 500, fontSize: 14 } }, 'Nueva orden de trabajo'),
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 12 } },
                React.createElement('div', null, React.createElement('label', { style: LBL }, 'N° OT *'), React.createElement('input', { value: form.numero, onChange: f('numero'), placeholder: 'OT-2025-XXXX' })),
                React.createElement('div', null, React.createElement('label', { style: LBL }, 'Cliente *'), React.createElement('input', { value: form.cliente, onChange: f('cliente'), placeholder: 'Nombre del cliente' })),
                React.createElement('div', null, React.createElement('label', { style: LBL }, 'Destino'), React.createElement('input', { value: form.destino, onChange: f('destino'), placeholder: 'Dirección' })),
                React.createElement('div', null, React.createElement('label', { style: LBL }, 'Estado'),
                    React.createElement('select', { value: form.state || form.estado, onChange: f('estado') },
                        ['pendiente', 'en_progreso', 'completado'].map(e => React.createElement('option', { key: e, value: e }, BADGE[e].lbl))
                    )
                )
            ),
            React.createElement('div', { style: { display: 'flex', gap: 8 } },
                React.createElement(Btn, { onClick: handleCreate, loading: saving }, 'Crear OT'),
                React.createElement(Btn, { secondary: true, onClick: () => setShowF(false) }, 'Cancelar')
            )
        ),
        React.createElement('div', { style: CARD },
            React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' } },
                React.createElement('colgroup', null,
                    React.createElement('col', { style: { width: '16%' } }), React.createElement('col', { style: { width: '18%' } }),
                    React.createElement('col', { style: { width: '30%' } }), React.createElement('col', { style: { width: '14%' } }),
                    React.createElement('col', { style: { width: '10%' } }), React.createElement('col', { style: { width: '12%' } })
                ),
                React.createElement('thead', null, React.createElement('tr', null, ['N° OT', 'Cliente', 'Destino', 'Estado', 'Fecha', 'Acción'].map(h => React.createElement('th', { key: h, style: TH }, h)))),
                React.createElement('tbody', null,
                    ots.length === 0 && React.createElement('tr', null, React.createElement('td', { colSpan: 6, style: { ...TD, textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' } }, 'Sin órdenes de trabajo')),
                    ots.map(ot => React.createElement('tr', { key: ot.id },
                        React.createElement('td', { style: TD }, React.createElement('span', { style: { fontFamily: 'monospace', fontSize: 12, fontWeight: 500 } }, ot.numero)),
                        React.createElement('td', { style: TD }, React.createElement('span', { style: { fontSize: 13 } }, ot.cliente)),
                        React.createElement('td', { style: TD }, React.createElement('span', { style: { fontSize: 13, color: 'var(--text-secondary)' } }, ot.destino || '—')),
                        React.createElement('td', { style: TD }, React.createElement(Bdg, { v: ot.estado })),
                        React.createElement('td', { style: TD }, React.createElement('span', { style: { fontSize: 12, color: 'var(--text-secondary)' } }, ot.fecha || '—')),
                        React.createElement('td', { style: TD },
                            ot.estado !== 'completado' && React.createElement(Btn, {
                                small: true, secondary: true, onClick: () => handleEstado(ot, ot.estado === 'pendiente' ? 'en_progreso' : 'completado')
                            }, ot.estado === 'pendiente' ? 'Iniciar' : 'Completar')
                        )
                    ))
                )
            )
        )
    );
}