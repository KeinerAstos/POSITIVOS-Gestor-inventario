// components/TecnicoView.js
function TecnicoView({ user, token, refresh }) {
    const [equipos, setEquipos] = React.useState([]);
    const [actas, setActas] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [loadingActas, setLoadingActas] = React.useState(false);
    const [subView, setSubView] = React.useState('mis-equipos');
    const [subViewData, setSubViewData] = React.useState(null);

    const cargarEquipos = async () => {
        setLoading(true);
        try {
            const res = await fetch(API_BASE + '/inventario/mis-equipos', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error al cargar equipos');
            const data = await res.json();
            setEquipos(data);
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const cargarActas = async () => {
        setLoadingActas(true);
        try {
            const res = await fetch(API_BASE + '/actas-qa', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error al cargar actas');
            const data = await res.json();
            setActas(data);
        } catch (err) {
            alert(err.message);
        } finally {
            setLoadingActas(false);
        }
    };

    const descargarPDF = async (id) => {
        try {
            const res = await fetch(API_BASE + `/actas-qa/${id}/pdf`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error al descargar PDF');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `acta_${id}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert(err.message);
        }
    };

    const crearActaPorOT = (otId, equiposOT) => {
        setSubViewData({ equiposFiltrados: equiposOT });
        setSubView('nueva-acta');
    };

    // Agrupar equipos por numero_ot
    const grupos = React.useMemo(() => {
        const gruposMap = new Map();
        equipos.forEach(eq => {
            const key = eq.numero_ot || 'SIN_OT';
            if (!gruposMap.has(key)) {
                gruposMap.set(key, {
                    numero_ot: eq.numero_ot,
                    equipos: []
                });
            }
            gruposMap.get(key).equipos.push(eq);
        });
        const gruposArray = Array.from(gruposMap.values());
        gruposArray.sort((a, b) => {
            if (a.numero_ot === 'SIN_OT') return 1;
            if (b.numero_ot === 'SIN_OT') return -1;
            return (a.numero_ot || '').localeCompare(b.numero_ot || '');
        });
        return gruposArray;
    }, [equipos]);

    React.useEffect(() => {
        if (subView === 'mis-equipos') cargarEquipos();
        if (subView === 'mis-actas') cargarActas();
    }, [subView, refresh]);

    React.useEffect(() => {
        if (subView === 'mis-equipos') setSubViewData(null);
    }, [subView]);

    if (subView === 'nueva-acta') {
        const equiposParaActa = subViewData?.equiposFiltrados || equipos;
        return React.createElement(FormularioActaQA, {
            equiposAsignados: equiposParaActa,
            token: token,
            onSuccess: () => {
                setSubView('mis-equipos');
                setSubViewData(null);
                cargarEquipos();
            },
            onCancel: () => {
                setSubView('mis-equipos');
                setSubViewData(null);
            }
        });
    }

    if (subView === 'mis-actas') {
        return React.createElement('div', null,
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' } },
                React.createElement('h2', null, `Mis Actas QA (${user?.nombre})`),
                React.createElement('button', {
                    onClick: () => setSubView('mis-equipos'),
                    style: { padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)' }
                }, '← Volver')
            ),
            loadingActas ? React.createElement('div', { style: { textAlign: 'center', padding: '2rem' } }, 'Cargando actas...') :
            actas.length === 0 ? React.createElement('div', { style: { background: 'white', padding: '2rem', textAlign: 'center', borderRadius: 12 } }, 'No has generado ninguna acta') :
            React.createElement('div', { style: { overflowX: 'auto', background: 'white', borderRadius: 12, border: '1px solid var(--border)' } },
                React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse' } },
                    React.createElement('thead', null,
                        React.createElement('tr', null,
                            ['ID', 'Fecha Ejecución', 'Fecha Creación', 'Lugar', 'Estado QA', 'Acción'].map(h =>
                                React.createElement('th', { key: h, style: { padding: '12px', textAlign: 'left', fontSize: 12, borderBottom: '1px solid var(--border)' } }, h)
                            )
                        )
                    ),
                    React.createElement('tbody', null,
                        actas.map(acta => {
                            let estadoQAColor = '';
                            let estadoQATexto = acta.estado_qa || 'PENDIENTE';
                            if (estadoQATexto === 'APROBADO') estadoQAColor = '#2e7d32';
                            else if (estadoQATexto === 'RECHAZADO') estadoQAColor = '#d32f2f';
                            else estadoQAColor = '#ed6c02';
                            return React.createElement('tr', { key: acta.id, style: { borderBottom: '1px solid var(--border)' } },
                                React.createElement('td', { style: { padding: '10px' } }, acta.id),
                                React.createElement('td', { style: { padding: '10px' } }, acta.fecha_ejecucion ? new Date(acta.fecha_ejecucion).toLocaleDateString('es-CO') : '—'),
                                React.createElement('td', { style: { padding: '10px' } }, new Date(acta.created_at).toLocaleDateString('es-CO')),
                                React.createElement('td', { style: { padding: '10px' } }, acta.lugar_instalacion || '—'),
                                React.createElement('td', { style: { padding: '10px' } },
                                    React.createElement('span', { style: { padding: '2px 8px', borderRadius: 12, fontSize: 11, background: estadoQAColor + '20', color: estadoQAColor } }, estadoQATexto)
                                ),
                                React.createElement('td', { style: { padding: '10px' } },
                                    React.createElement('button', {
                                        onClick: () => descargarPDF(acta.id),
                                        style: { padding: '4px 12px', background: 'var(--amber)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }
                                    }, 'Ver PDF')
                                )
                            );
                        })
                    )
                )
            )
        );
    }

    // Vista principal: equipos agrupados por OT con cantidad visible
    return React.createElement('div', null,
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' } },
            React.createElement('h2', null, `Mis equipos (${user?.nombre})`),
            React.createElement('div', { style: { display: 'flex', gap: '0.5rem' } },
                React.createElement('button', { onClick: cargarEquipos, style: { padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)' } }, 'Refrescar'),
                React.createElement('button', {
                    onClick: () => {
                        setSubViewData(null);
                        setSubView('nueva-acta');
                    },
                    style: { padding: '4px 12px', borderRadius: 6, background: 'var(--amber)', color: 'white', border: 'none', cursor: 'pointer' }
                }, 'Nueva Acta QA (todos)'),
                React.createElement('button', {
                    onClick: () => setSubView('mis-actas'),
                    style: { padding: '4px 12px', borderRadius: 6, background: '#0288d1', color: 'white', border: 'none', cursor: 'pointer' }
                }, 'Ver mis actas')
            )
        ),
        loading ? React.createElement('div', { style: { textAlign: 'center', padding: '2rem' } }, 'Cargando...') :
        equipos.length === 0 ? React.createElement('div', { style: { background: 'white', padding: '2rem', textAlign: 'center', borderRadius: 12 } }, 'No tienes equipos asignados') :
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '1.5rem' } },
            grupos.map(grupo => {
                const otDisplay = grupo.numero_ot === 'SIN_OT' ? 'Sin OT' : grupo.numero_ot;
                return React.createElement('div', {
                    key: grupo.numero_ot || 'sin_ot',
                    style: { background: 'white', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden' }
                },
                    React.createElement('div', {
                        style: {
                            padding: '12px 16px',
                            background: 'var(--bg-secondary)',
                            borderBottom: '1px solid var(--border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '8px'
                        }
                    },
                        React.createElement('div', null,
                            React.createElement('strong', { style: { fontSize: '0.9rem' } }, `OT: ${otDisplay}`),
                            React.createElement('span', { style: { marginLeft: '12px', fontSize: '0.75rem', color: 'var(--text-secondary)' } }, `${grupo.equipos.length} equipo(s)`)
                        ),
                        React.createElement('button', {
                            onClick: () => crearActaPorOT(grupo.numero_ot, grupo.equipos),
                            style: { padding: '6px 14px', borderRadius: 20, background: '#2e7d32', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }
                        }, '📄 Crear Acta QA para esta OT')
                    ),
                    React.createElement('div', { style: { overflowX: 'auto' } },
                        React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse' } },
                            React.createElement('thead', null,
                                React.createElement('tr', null,
                                    ['Material', 'Descripción', 'Serial', 'Cantidad', 'Estado', 'Lote'].map(h =>
                                        React.createElement('th', { key: h, style: { padding: '12px', textAlign: 'left', fontSize: 12, borderBottom: '1px solid var(--border)' } }, h)
                                    )
                                )
                            ),
                            React.createElement('tbody', null,
                                grupo.equipos.map(eq => {
                                    const cantidad = eq.cantidad !== undefined ? eq.cantidad : 1;
                                    const esConsumible = !eq.serial && cantidad > 0;
                                    let estadoLabel = eq.estado === 'TERRENO' ? '🔧 En terreno' : eq.estado;
                                    return React.createElement('tr', { key: eq.id, style: { borderBottom: '1px solid var(--border)' } },
                                        React.createElement('td', { style: { padding: '10px', fontFamily: 'monospace' } }, eq.material_id || '—'),
                                        React.createElement('td', { style: { padding: '10px' } },
                                            (eq.material_descripcion || eq.descripcion || '—'),
                                            esConsumible && React.createElement('span', {
                                                style: { marginLeft: '8px', fontSize: '10px', background: '#e3f2fd', padding: '2px 6px', borderRadius: 12, color: '#0d47a1' }
                                            }, 'Consumible')
                                        ),
                                        React.createElement('td', { style: { padding: '10px', fontFamily: 'monospace' } }, eq.serial || '—'),
                                        React.createElement('td', { style: { padding: '10px', textAlign: 'center' } },
                                            cantidad > 1 ? React.createElement('strong', { style: { fontSize: '0.9rem' } }, cantidad) : '1'
                                        ),
                                        React.createElement('td', { style: { padding: '10px' } },
                                            React.createElement('span', { style: { padding: '2px 8px', borderRadius: 12, fontSize: 11, background: '#0288d120', color: '#0288d1' } }, estadoLabel)
                                        ),
                                        React.createElement('td', { style: { padding: '10px' } }, eq.lote || '—')
                                    );
                                })
                            )
                        )
                    )
                );
            })
        )
    );
}