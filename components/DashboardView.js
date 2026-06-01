// components/DashboardView.js
function Dashboard({ bodegas, inv, mov }) {
    // Asegurar que los datos son arrays
    const listaInventario = Array.isArray(inv) ? inv : [];
    const listaMovimientos = Array.isArray(mov) ? mov : [];
    const listaBodegas = Array.isArray(bodegas) ? bodegas : [];

    // Estadísticas
    const totalEquipos = listaInventario.length;
    const equiposEnStock = listaInventario.filter(i => i.estado === 'STOCK' || i.estado === 'INGRESADO').length;
    const equiposEnTerreno = listaInventario.filter(i => i.estado === 'TERRENO').length;
    const equiposConsumidos = listaInventario.filter(i => i.estado === 'CONSUMO').length;
    
    // Movimientos recientes (últimos 10)
    const movimientosRecientes = listaMovimientos.slice(0, 10);
    
    // Equipos por bodega
    const equiposPorBodega = listaBodegas.map(b => ({
        nombre: b.nombre,
        cantidad: listaInventario.filter(i => i.bodega_id === b.id).length
    }));

    // Función para obtener color del estado
    const getEstadoColor = (estado) => {
        switch(estado) {
            case 'STOCK': return '#2e7d32';
            case 'INGRESADO': return '#ed6c02';
            case 'TERRENO': return '#0288d1';
            case 'CONSUMO': return '#6b7280';
            case 'DEVUELTO': return '#757575';
            default: return '#9e9e9e';
        }
    };

    // Formatear fecha
    const formatFecha = (fecha) => {
        if (!fecha) return '—';
        try {
            return new Date(fecha).toLocaleDateString('es-CO');
        } catch(e) {
            return '—';
        }
    };

    return React.createElement('div', null,
        React.createElement('h2', { style: { margin: '0 0 1.25rem', fontWeight: 500, fontSize: 18 } }, 'Dashboard'),
        
        // Tarjetas de estadísticas
        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 } },
            React.createElement('div', { style: { ...CARD, padding: '1.25rem', textAlign: 'center' } },
                React.createElement('i', { className: 'ti ti-package', style: { fontSize: 32, color: 'var(--amber)' } }),
                React.createElement('div', { style: { fontSize: 28, fontWeight: 600, marginTop: 8 } }, totalEquipos),
                React.createElement('div', { style: { fontSize: 13, color: 'var(--text-secondary)' } }, 'Total Equipos')
            ),
            React.createElement('div', { style: { ...CARD, padding: '1.25rem', textAlign: 'center' } },
                React.createElement('i', { className: 'ti ti-building-warehouse', style: { fontSize: 32, color: '#2e7d32' } }),
                React.createElement('div', { style: { fontSize: 28, fontWeight: 600, marginTop: 8 } }, equiposEnStock),
                React.createElement('div', { style: { fontSize: 13, color: 'var(--text-secondary)' } }, 'En Bodega')
            ),
            React.createElement('div', { style: { ...CARD, padding: '1.25rem', textAlign: 'center' } },
                React.createElement('i', { className: 'ti ti-truck-delivery', style: { fontSize: 32, color: '#0288d1' } }),
                React.createElement('div', { style: { fontSize: 28, fontWeight: 600, marginTop: 8 } }, equiposEnTerreno),
                React.createElement('div', { style: { fontSize: 13, color: 'var(--text-secondary)' } }, 'En Terreno')
            ),
            React.createElement('div', { style: { ...CARD, padding: '1.25rem', textAlign: 'center' } },
                React.createElement('i', { className: 'ti ti-checkbox', style: { fontSize: 32, color: '#6b7280' } }),
                React.createElement('div', { style: { fontSize: 28, fontWeight: 600, marginTop: 8 } }, equiposConsumidos),
                React.createElement('div', { style: { fontSize: 13, color: 'var(--text-secondary)' } }, 'Consumidos')
            )
        ),

        // Gráfico simple de equipos por bodega
        React.createElement('div', { style: { ...CARD, marginBottom: 24 } },
            React.createElement('div', { style: { padding: '1rem', borderBottom: '1px solid var(--border)' } },
                React.createElement('p', { style: { margin: 0, fontWeight: 500 } }, '📊 Equipos por Bodega')
            ),
            React.createElement('div', { style: { padding: '1rem' } },
                equiposPorBodega.map(b => 
                    React.createElement('div', { key: b.nombre, style: { marginBottom: 12 } },
                        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 } },
                            React.createElement('span', null, b.nombre),
                            React.createElement('span', { style: { fontWeight: 500 } }, b.cantidad)
                        ),
                        React.createElement('div', { style: { background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' } },
                            React.createElement('div', { 
                                style: { 
                                    width: (b.cantidad / (totalEquipos || 1)) * 100 + '%', 
                                    height: 6, 
                                    background: 'var(--amber)',
                                    borderRadius: 4
                                } 
                            })
                        )
                    )
                )
            )
        ),

        // Movimientos recientes
        React.createElement('div', { style: CARD },
            React.createElement('div', { style: { padding: '1rem', borderBottom: '1px solid var(--border)' } },
                React.createElement('p', { style: { margin: 0, fontWeight: 500 } }, '🔄 Últimos Movimientos')
            ),
            movimientosRecientes.length === 0 ?
                React.createElement('div', { style: { padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' } },
                    React.createElement('i', { className: 'ti ti-history-off', style: { fontSize: 32, marginBottom: 8, display: 'block' } }),
                    'No hay movimientos recientes'
                ) :
                React.createElement('div', { style: { overflowX: 'auto' } },
                    React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse' } },
                        React.createElement('thead', null,
                            React.createElement('tr', null,
                                React.createElement('th', { style: TH }, 'Tipo'),
                                React.createElement('th', { style: TH }, 'Material'),
                                React.createElement('th', { style: TH }, 'Estado'),
                                React.createElement('th', { style: TH }, 'Fecha')
                            )
                        ),
                        React.createElement('tbody', null,
                            movimientosRecientes.map(m => {
                                let tipoLabel = m.tipo_movimiento || m.tipo || '—';
                                let tipoColor = '#6b7280';
                                if (tipoLabel.includes('INGRESO')) tipoColor = '#2e7d32';
                                if (tipoLabel.includes('ENTREGA') || tipoLabel.includes('ASIGNACION')) tipoColor = '#0288d1';
                                if (tipoLabel.includes('DEVOLUCION')) tipoColor = '#ed6c02';
                                
                                return React.createElement('tr', { key: m.id, style: { borderBottom: '1px solid var(--border)' } },
                                    React.createElement('td', { style: TD },
                                        React.createElement('span', { 
                                            style: { 
                                                display: 'inline-block', 
                                                padding: '2px 8px', 
                                                borderRadius: 12, 
                                                fontSize: 10, 
                                                fontWeight: 500,
                                                background: tipoColor + '20',
                                                color: tipoColor
                                            } 
                                        }, tipoLabel.replace(/_/g, ' '))
                                    ),
                                    React.createElement('td', { style: TD },
                                        React.createElement('div', { style: { fontWeight: 500, fontSize: 13 } }, m.material || '—'),
                                        m.serial && React.createElement('div', { style: { fontSize: 10, color: 'var(--text-secondary)' } }, m.serial)
                                    ),
                                    React.createElement('td', { style: TD },
                                        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 } },
                                            React.createElement('span', { style: { color: '#ed6c02' } }, m.estado_anterior || '—'),
                                            React.createElement('i', { className: 'ti ti-arrow-right', style: { fontSize: 10 } }),
                                            React.createElement('span', { style: { color: '#2e7d32' } }, m.estado_nuevo || '—')
                                        )
                                    ),
                                    React.createElement('td', { style: TD, fontSize: 12, color: 'var(--text-secondary)' }, formatFecha(m.created_at))
                                );
                            })
                        )
                    )
                )
        )
    );
}