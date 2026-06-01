function ControlCalidadView({ user, token }) {
    const [actas, setActas] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [expandedGroups, setExpandedGroups] = React.useState({});

    const cargarActas = async () => {
        try {
            const res = await fetch(API_BASE + '/actas-qa/para-calidad', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error al cargar actas');
            const data = await res.json();
            setActas(data);
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        cargarActas();
    }, []);

    const toggleDay = (fecha) => {
        setExpandedGroups(prev => ({ ...prev, [fecha]: !prev[fecha] }));
    };
    const toggleTecnico = (fecha, tecnicoId) => {
        const key = `${fecha}_${tecnicoId}`;
        setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
    };
    const isDayExpanded = (fecha) => expandedGroups[fecha] !== false;
    const isTecnicoExpanded = (fecha, tecnicoId) => expandedGroups[`${fecha}_${tecnicoId}`] !== false;

    const actualizarEstado = async (id, estado, comentario) => {
        try {
            const res = await fetch(API_BASE + `/actas-qa/${id}/estado-qa`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ estado_qa: estado, comentario_qa: comentario })
            });
            if (!res.ok) throw new Error('Error al actualizar');
            cargarActas(); // recargar
        } catch (err) {
            alert(err.message);
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

    // Agrupar actas por fecha y luego por técnico
    const groupedByDay = {};
    actas.forEach(acta => {
        const fecha = new Date(acta.created_at).toISOString().split('T')[0];
        if (!groupedByDay[fecha]) groupedByDay[fecha] = {};
        const tecnicoId = acta.tecnico_id;
        if (!groupedByDay[fecha][tecnicoId]) {
            groupedByDay[fecha][tecnicoId] = {
                tecnicoNombre: acta.tecnico_nombre,
                actas: []
            };
        }
        groupedByDay[fecha][tecnicoId].actas.push(acta);
    });

    if (loading) return React.createElement('div', { style: { textAlign: 'center', padding: '2rem' } }, 'Cargando actas...');

    return React.createElement('div', null,
        React.createElement('h2', { style: { marginBottom: '1rem' } }, 'Control de Calidad QA'),
        Object.keys(groupedByDay).sort().reverse().map(fecha =>
            React.createElement('div', { key: fecha, style: { marginBottom: '1rem', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' } },
                React.createElement('div', {
                    style: { background: 'var(--bg-secondary)', padding: '0.75rem 1rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
                    onClick: () => toggleDay(fecha)
                },
                    React.createElement('span', { style: { fontWeight: 500 } }, `📅 ${fecha} (${Object.keys(groupedByDay[fecha]).length} técnicos)`),
                    React.createElement('i', { className: `ti ti-chevron-${isDayExpanded(fecha) ? 'up' : 'down'}` })
                ),
                isDayExpanded(fecha) && React.createElement('div', { style: { padding: '0.5rem' } },
                    Object.keys(groupedByDay[fecha]).map(tecnicoId => {
                        const tecnico = groupedByDay[fecha][tecnicoId];
                        const key = `${fecha}_${tecnicoId}`;
                        return React.createElement('div', { key: tecnicoId, style: { marginBottom: '0.5rem', border: '1px solid var(--border)', borderRadius: 6 } },
                            React.createElement('div', {
                                style: { background: 'var(--bg-secondary)', padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
                                onClick: () => toggleTecnico(fecha, tecnicoId)
                            },
                                React.createElement('span', { style: { fontWeight: 500 } }, `👤 ${tecnico.tecnicoNombre} (${tecnico.actas.length} actas)`),
                                React.createElement('i', { className: `ti ti-chevron-${isTecnicoExpanded(fecha, tecnicoId) ? 'up' : 'down'}` })
                            ),
                            isTecnicoExpanded(fecha, tecnicoId) && React.createElement('div', { style: { padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' } },
                                tecnico.actas.map(acta =>
                                    React.createElement('div', { key: acta.id, style: { background: 'white', padding: '0.75rem', borderRadius: 6, border: '1px solid var(--border)' } },
                                        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' } },
                                            React.createElement('span', null, `Acta #${acta.id} - ${acta.fecha_ejecucion || 'Sin fecha'} - ${acta.lugar_instalacion || 'Sin lugar'}`),
                                            React.createElement('button', { onClick: () => descargarPDF(acta.id), style: { padding: '2px 8px', background: 'var(--amber)', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' } }, 'Ver PDF')
                                        ),
                                        React.createElement('div', { style: { display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' } },
                                            React.createElement('select', {
                                                value: acta.estado_qa || 'PENDIENTE',
                                                onChange: e => actualizarEstado(acta.id, e.target.value, acta.comentario_qa || '')
                                            },
                                                React.createElement('option', { value: 'PENDIENTE' }, 'Pendiente'),
                                                React.createElement('option', { value: 'APROBADO' }, 'Aprobado'),
                                                React.createElement('option', { value: 'RECHAZADO' }, 'Rechazado')
                                            ),
                                            React.createElement('input', {
                                                type: 'text',
                                                placeholder: 'Comentario',
                                                value: acta.comentario_qa || '',
                                                onChange: e => actualizarEstado(acta.id, acta.estado_qa || 'PENDIENTE', e.target.value),
                                                style: { flex: 1 }
                                            })
                                        )
                                    )
                                )
                            )
                        );
                    })
                )
            )
        )
    );
}