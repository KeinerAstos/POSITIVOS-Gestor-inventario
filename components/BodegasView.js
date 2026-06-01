// components/BodegasView.js
function BodegasView({ bodegas, inv, refresh }) {
    const [show, setShow] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [alert, setAlert] = React.useState(null);
    const [form, setForm] = React.useState({ nombre: '', ubicacion: '' });
    const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

    const handleCreate = async () => {
        if (!form.nombre.trim()) {
            setAlert({ type: 'error', msg: 'El nombre de la bodega es obligatorio' });
            return;
        }
        setSaving(true); setAlert(null);
        try {
            await http.post('/bodegas', { nombre: form.nombre, ubicacion: form.ubicacion });
            await refresh();
            setForm({ nombre: '', ubicacion: '' }); setShow(false);
            setAlert({ type: 'success', msg: 'Bodega creada correctamente' });
        } catch (err) {
            setAlert({ type: 'error', msg: err.message });
        } finally { setSaving(false); }
    };

    return React.createElement('div', null,
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' } },
            React.createElement('h2', { style: { margin: 0, fontWeight: 500, fontSize: 18 } }, 'Bodegas'),
            React.createElement(Btn, { onClick: () => setShow(s => !s) },
                React.createElement('i', { className: 'ti ti-plus', style: { fontSize: 14 }, 'aria-hidden': 'true' }), ' Nueva bodega'
            )
        ),
        alert && React.createElement(Alert, { type: alert.type, msg: alert.msg, onClose: () => setAlert(null) }),
        show && React.createElement('div', { style: { ...CARD, padding: '1rem', marginBottom: '1rem' } },
            React.createElement('p', { style: { margin: '0 0 0.75rem', fontWeight: 500, fontSize: 14 } }, 'Nueva bodega'),
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 } },
                React.createElement('div', null,
                    React.createElement('label', { style: LBL }, 'Nombre *'),
                    React.createElement('input', { value: form.nombre, onChange: f('nombre'), placeholder: 'Nombre de la bodega' })
                ),
                React.createElement('div', null,
                    React.createElement('label', { style: LBL }, 'Ubicación'),
                    React.createElement('input', { value: form.ubicacion, onChange: f('ubicacion'), placeholder: 'Dirección' })
                )
            ),
            React.createElement('div', { style: { display: 'flex', gap: 8 } },
                React.createElement(Btn, { onClick: handleCreate, loading: saving }, 'Crear bodega'),
                React.createElement(Btn, { secondary: true, onClick: () => setShow(false) }, 'Cancelar')
            )
        ),
        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 12 } },
            bodegas.map(b => {
                const items = inv.filter(i => i.bodega_id === b.id).length;
                const disp = inv.filter(i => i.bodega_id === b.id && i.estado === ESTADOS.STOCK).length;
                return React.createElement('div', { key: b.id, style: { ...CARD, padding: '1.25rem', opacity: b.activo ? 1 : 0.6 } },
                    React.createElement('div', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 } },
                        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                            React.createElement('div', { style: { width: 34, height: 34, borderRadius: 8, background: 'var(--amber-light)', border: '1px solid var(--amber-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } },
                                React.createElement('i', { className: 'ti ti-home', style: { fontSize: 18, color: 'var(--amber)' }, 'aria-hidden': 'true' })
                            ),
                            React.createElement('div', null,
                                React.createElement('p', { style: { margin: 0, fontWeight: 500, fontSize: 14 } }, b.nombre),
                                React.createElement('p', { style: { margin: 0, fontSize: 12, color: 'var(--text-secondary)' } }, b.ubicacion || 'Sin ubicación')
                            )
                        ),
                        React.createElement(Bdg, { v: b.activo ? 'activo' : 'inactivo' })
                    ),
                    React.createElement('div', { style: { display: 'flex', gap: 20, borderTop: '1px solid var(--border)', paddingTop: 10 } },
                        React.createElement('div', null,
                            React.createElement('p', { style: { margin: 0, fontSize: 11, color: 'var(--text-secondary)' } }, 'Total items'),
                            React.createElement('p', { style: { margin: 0, fontSize: 22, fontWeight: 500 } }, '' + items)
                        ),
                        React.createElement('div', null,
                            React.createElement('p', { style: { margin: 0, fontSize: 11, color: 'var(--text-secondary)' } }, 'Disponibles'),
                            React.createElement('p', { style: { margin: 0, fontSize: 22, fontWeight: 500 } }, '' + disp)
                        ),
                        React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                            React.createElement('p', { style: { margin: 0, fontSize: 11, color: 'var(--text-secondary)' } }, 'Responsable'),
                            React.createElement('p', { style: { margin: 0, fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, b.responsable || '—')
                        )
                    )
                );
            })
        )
    );
}