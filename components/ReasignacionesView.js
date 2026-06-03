// components/ReasignacionesView.js
function ReasignacionesView() {
    const [data, setData] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [fechaDesde, setFechaDesde] = React.useState('');
    const [fechaHasta, setFechaHasta] = React.useState('');

    const cargar = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ tipo: 'REASIGNACION_OT' });
            if (fechaDesde) params.append('fecha_desde', fechaDesde);
            if (fechaHasta) params.append('fecha_hasta', fechaHasta);
            const res = await fetch(`${API_BASE}/movimientos?${params}`);
            const json = await res.json();
            setData(json.data);
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => { cargar(); }, [fechaDesde, fechaHasta]);

    return React.createElement('div', null,
        React.createElement('h2', { style: { marginBottom: '1rem' } }, '🔄 Historial de Reasignaciones entre OT'),
        React.createElement('div', { style: { display: 'flex', gap: 12, marginBottom: '1rem' } },
            React.createElement('input', { type: 'date', value: fechaDesde, onChange: e => setFechaDesde(e.target.value), placeholder: 'Desde' }),
            React.createElement('input', { type: 'date', value: fechaHasta, onChange: e => setFechaHasta(e.target.value), placeholder: 'Hasta' }),
            React.createElement('button', { onClick: cargar, style: { padding: '4px 12px' } }, 'Filtrar')
        ),
        loading ? 'Cargando...' :
        React.createElement('div', { style: { overflowX: 'auto' } },
            React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse' } },
                React.createElement('thead', null,
                    React.createElement('tr', null,
                        ['Fecha', 'Material', 'Serie', 'Cantidad', 'OT Origen (OTH)', 'OT Destino (OTH)', 'Responsable', 'Observación'].map(h => React.createElement('th', { key: h, style: TH }, h))
                    )
                ),
                React.createElement('tbody', null,
                    data.map(m => React.createElement('tr', { key: m.id, style: { borderBottom: '1px solid var(--border)' } },
                        React.createElement('td', { style: TD }, new Date(m.created_at).toLocaleString()),
                        React.createElement('td', { style: TD }, m.material || '—'),
                        React.createElement('td', { style: TD }, m.serial || '—'),
                        React.createElement('td', { style: { ...TD, textAlign: 'center' } }, m.cantidad || 1),
                        React.createElement('td', { style: TD },
                            (m.ot_anterior_numero || `OT #${m.ot_anterior}`),
                            m.oth_anterior && React.createElement('div', { style: { fontSize: 10, color: '#888' } }, `OTH: ${m.oth_anterior}`)
                        ),
                        React.createElement('td', { style: TD },
                            (m.ot_nueva_numero || `OT #${m.ot_nueva}`),
                            m.oth_nueva && React.createElement('div', { style: { fontSize: 10, color: '#888' } }, `OTH: ${m.oth_nueva}`)
                        ),
                        React.createElement('td', { style: TD }, m.usuario || '—'),
                        React.createElement('td', { style: TD, fontSize: 12, color: '#555' }, m.observacion || '—')
                    ))
                )
            )
        )
    );
}