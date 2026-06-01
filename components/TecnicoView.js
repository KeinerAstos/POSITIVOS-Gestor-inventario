// components/TecnicoView.js
function TecnicoView({ user, token, refresh }) {
    const [equipos, setEquipos] = React.useState([]);
    const [actas, setActas] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [loadingActas, setLoadingActas] = React.useState(false);
    const [subView, setSubView] = React.useState('mis-equipos');

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

    React.useEffect(() => {
        if (subView === 'mis-equipos') cargarEquipos();
        if (subView === 'mis-actas') cargarActas();
    }, [subView, refresh]);

    if (subView === 'nueva-acta') {
        return React.createElement(FormularioActaQA, {
            equiposAsignados: equipos,
            token: token,
            onSuccess: () => setSubView('mis-equipos'),
            onCancel: () => setSubView('mis-equipos')
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

    // Vista principal: lista de equipos (solo lectura, sin botones de acción)
    return React.createElement('div', null,
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' } },
            React.createElement('h2', null, `Mis equipos (${user?.nombre})`),
            React.createElement('div', { style: { display: 'flex', gap: '0.5rem' } },
                React.createElement('button', { onClick: cargarEquipos, style: { padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)' } }, 'Refrescar'),
                React.createElement('button', {
                    onClick: () => setSubView('nueva-acta'),
                    style: { padding: '4px 12px', borderRadius: 6, background: 'var(--amber)', color: 'white', border: 'none', cursor: 'pointer' }
                }, 'Nueva Acta QA'),
                React.createElement('button', {
                    onClick: () => setSubView('mis-actas'),
                    style: { padding: '4px 12px', borderRadius: 6, background: '#0288d1', color: 'white', border: 'none', cursor: 'pointer' }
                }, 'Ver mis actas')
            )
        ),
        loading ? React.createElement('div', { style: { textAlign: 'center', padding: '2rem' } }, 'Cargando...') :
            equipos.length === 0 ? React.createElement('div', { style: { background: 'white', padding: '2rem', textAlign: 'center', borderRadius: 12 } }, 'No tienes equipos asignados') :
            React.createElement('div', { style: { overflowX: 'auto', background: 'white', borderRadius: 12, border: '1px solid var(--border)' } },
                React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse' } },
                    React.createElement('thead', null,
                        React.createElement('tr', null,
                            ['Material', 'Descripción', 'Serial', 'Estado', 'Número OT', 'Lote'].map(h =>
                                React.createElement('th', { key: h, style: { padding: '12px', textAlign: 'left', fontSize: 12, borderBottom: '1px solid var(--border)' } }, h)
                            )
                        )
                    ),
                    React.createElement('tbody', null,
                        equipos.map(eq => {
                            let estadoLabel = eq.estado === 'TERRENO' ? '🔧 En terreno' : eq.estado;
                            return React.createElement('tr', { key: eq.id, style: { borderBottom: '1px solid var(--border)' } },
                                React.createElement('td', { style: { padding: '10px', fontFamily: 'monospace' } }, eq.material_id || '—'),
                                React.createElement('td', { style: { padding: '10px' } }, eq.material_descripcion || eq.descripcion || '—'),
                                React.createElement('td', { style: { padding: '10px', fontFamily: 'monospace' } }, eq.serial || '—'),
                                React.createElement('td', { style: { padding: '10px' } },
                                    React.createElement('span', { style: { padding: '2px 8px', borderRadius: 12, fontSize: 11, background: '#0288d120', color: '#0288d1' } }, estadoLabel)
                                ),
                                React.createElement('td', { style: { padding: '10px', fontFamily: 'monospace' } }, eq.numero_ot || '—'),
                                React.createElement('td', { style: { padding: '10px' } }, eq.lote || '—')
                            );
                        })
                    )
                )
            )
    );
}