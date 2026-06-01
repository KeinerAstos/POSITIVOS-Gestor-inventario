// components/OTDashboardView.js
function OTDashboardView({ ots, inv, refresh, simplificado = false }) {
    const [selectedOT, setSelectedOT] = React.useState(null);
    const [equiposOT, setEquiposOT] = React.useState([]);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [showDropdown, setShowDropdown] = React.useState(false);
    const [loading, setLoading] = React.useState(false);

    const listaOts = Array.isArray(ots) ? ots : [];
    const listaInventario = Array.isArray(inv) ? inv : [];

    // Versión simplificada: buscar OT directamente con el número
    const buscarOTDirecto = () => {
        if (!searchTerm.trim()) return;
        // Buscar OT cuyo número coincida (exacto o parcial, según convenga)
        const otEncontrada = listaOts.find(ot => 
            ot.numero_ot && ot.numero_ot.toLowerCase() === searchTerm.trim().toLowerCase()
        );
        if (otEncontrada) {
            selectOT(otEncontrada);
        } else {
            alert('No se encontró la OT con el número: ' + searchTerm);
        }
    };

    // Filtrar OT según el término de búsqueda (modo completo)
    const getFilteredOTs = function() {
        if (!searchTerm.trim()) return [];
        var term = searchTerm.toLowerCase();
        return listaOts.filter(function(ot) {
            var numero = (ot.numero_ot || '').toLowerCase();
            var cliente = (ot.cliente || '').toLowerCase();
            var id = ot.id.toString();
            return numero.includes(term) || cliente.includes(term) || id.includes(term);
        }).slice(0, 8);
    };

    var filteredOTs = getFilteredOTs();

    // Seleccionar una OT
    var selectOT = function(ot) {
        setSelectedOT(ot);
        setSearchTerm(ot.numero_ot || ('OT #' + ot.id));
        setShowDropdown(false);
        setLoading(true);
        
        setTimeout(function() {
            var equipos = listaInventario.filter(function(i) {
                return i.ot_id === ot.id;
            });
            setEquiposOT(equipos);
            setLoading(false);
        }, 100);
    };

    // Limpiar selección
    var clearSelection = function() {
        setSelectedOT(null);
        setSearchTerm('');
        setEquiposOT([]);
        setShowDropdown(false);
    };

    // Manejar cambio en el input (modo completo)
    var handleSearchChange = function(e) {
        setSearchTerm(e.target.value);
        setShowDropdown(true);
        if (selectedOT) {
            setSelectedOT(null);
            setEquiposOT([]);
        }
    };

    // Función para obtener el label del estado
    var getEstadoLabel = function(estado) {
        switch(estado) {
            case 'STOCK': return '📦 Stock';
            case 'INGRESADO': return '📋 Ingresado';
            case 'TERRENO': return '🔧 En terreno';
            case 'CONSUMO': return '✅ Consumido';
            case 'DEVUELTO': return '🔄 Devuelto';
            default: return estado || '—';
        }
    };

    // Formatear fecha
    var formatFecha = function(fecha) {
        if (!fecha) return '—';
        try {
            return new Date(fecha).toLocaleDateString('es-CO');
        } catch(e) {
            return '—';
        }
    };

    // Cerrar dropdown al hacer click fuera (solo para modo completo)
    React.useEffect(function() {
        if (simplificado) return;
        var handleClickOutside = function(e) {
            if (!e.target.closest('.ot-search-container')) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return function() {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [simplificado]);

    return React.createElement('div', { style: { padding: '20px' } },
        React.createElement('h2', { style: { margin: '0 0 20px', fontSize: 18, fontWeight: 500 } }, 
            '📊 Dashboard de Órdenes de Trabajo'
        ),
        
        // Buscador de OT (versión simplificada vs completa)
        simplificado ? 
            React.createElement('div', { style: { marginBottom: 20, display: 'flex', gap: 8, alignItems: 'flex-end' } },
                React.createElement('div', { style: { flex: 1 } },
                    React.createElement('label', { style: { display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 500 } }, 
                        'Número de Orden de Trabajo'
                    ),
                    React.createElement('input', {
                        type: 'text',
                        value: searchTerm,
                        onChange: function(e) { setSearchTerm(e.target.value); if (selectedOT) { setSelectedOT(null); setEquiposOT([]); } },
                        placeholder: 'Ej: OT-1001',
                        style: {
                            width: '100%',
                            maxWidth: 400,
                            padding: '10px 12px',
                            borderRadius: 8,
                            border: '1px solid var(--border)',
                            fontSize: 14
                        }
                    })
                ),
                React.createElement('button', {
                    onClick: buscarOTDirecto,
                    style: {
                        padding: '10px 20px',
                        background: 'var(--amber)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 14
                    }
                }, 'Buscar OT')
            ) :
            React.createElement('div', { className: 'ot-search-container', style: { marginBottom: 20, position: 'relative' } },
                React.createElement('label', { style: { display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 500 } }, 
                    'Buscar Orden de Trabajo'
                ),
                React.createElement('div', { style: { position: 'relative' } },
                    React.createElement('input', {
                        type: 'text',
                        value: searchTerm,
                        onChange: handleSearchChange,
                        onFocus: function() { setShowDropdown(true); },
                        placeholder: 'Escribe el número de OT, cliente o ID...',
                        style: {
                            width: '100%',
                            maxWidth: 500,
                            padding: '10px 12px',
                            borderRadius: 8,
                            border: '1px solid var(--border)',
                            fontSize: 14,
                            outline: 'none',
                            background: 'white'
                        }
                    }),
                    searchTerm ? React.createElement('button', {
                        onClick: clearSelection,
                        style: {
                            position: 'absolute',
                            right: 10,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#999',
                            fontSize: 16
                        }
                    }, '×') : null
                ),
                showDropdown && filteredOTs.length > 0 ? React.createElement('div', {
                    style: {
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        maxWidth: 500,
                        background: 'white',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        zIndex: 100,
                        maxHeight: 300,
                        overflowY: 'auto',
                        marginTop: 4
                    }
                },
                    filteredOTs.map(function(ot) {
                        return React.createElement('div', {
                            key: ot.id,
                            onClick: function() { selectOT(ot); },
                            style: {
                                padding: '12px 16px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f0f0f0',
                                transition: 'background 0.2s'
                            },
                            onMouseEnter: function(e) { e.currentTarget.style.background = 'var(--bg-secondary)'; },
                            onMouseLeave: function(e) { e.currentTarget.style.background = 'white'; }
                        },
                            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                                React.createElement('div', null,
                                    React.createElement('strong', { style: { fontSize: 14 } }, ot.numero_ot || ('OT #' + ot.id)),
                                    React.createElement('div', { style: { fontSize: 12, color: '#666', marginTop: 2 } }, ot.cliente || 'Sin cliente')
                                ),
                                React.createElement('span', { 
                                    style: { 
                                        fontSize: 11, 
                                        padding: '2px 8px', 
                                        borderRadius: 12, 
                                        background: ot.estado === 'ABIERTA' ? '#e8f5e9' : '#f5f5f5',
                                        color: ot.estado === 'ABIERTA' ? '#2e7d32' : '#999'
                                    } 
                                }, ot.estado === 'ABIERTA' ? '🟢 Activa' : '🔴 Cerrada')
                            ),
                            ot.destino ? React.createElement('div', { style: { fontSize: 11, color: '#999', marginTop: 4 } },
                                React.createElement('i', { className: 'ti ti-map-pin', style: { fontSize: 11, marginRight: 4 } }),
                                ot.destino
                            ) : null
                        );
                    })
                ) : null,
                showDropdown && searchTerm.trim() && filteredOTs.length === 0 ? React.createElement('div', {
                    style: {
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        maxWidth: 500,
                        background: 'white',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        padding: '16px',
                        textAlign: 'center',
                        color: '#999',
                        fontSize: 13,
                        marginTop: 4
                    }
                },
                    React.createElement('i', { className: 'ti ti-search', style: { fontSize: 20, display: 'block', marginBottom: 8 } }),
                    'No se encontraron OT con: "', searchTerm, '"'
                ) : null
            ),

        // Mostrar contenido si hay OT seleccionada
        selectedOT ? React.createElement('div', null,
            React.createElement('div', { style: { background: 'white', borderRadius: 8, border: '1px solid #e5e7eb', padding: 16, marginBottom: 16 } },
                React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: 12 } },
                    React.createElement('div', null,
                        React.createElement('h3', { style: { margin: '0 0 8px', fontSize: 16, fontWeight: 600 } }, 
                            selectedOT.numero_ot || ('OT #' + selectedOT.id)
                        ),
                        React.createElement('p', { style: { margin: '4px 0', color: '#666' } },
                            React.createElement('i', { className: 'ti ti-building', style: { marginRight: 8 } }),
                            'Cliente: ' + (selectedOT.cliente || 'No especificado')
                        ),
                        React.createElement('p', { style: { margin: '4px 0', color: '#666' } },
                            React.createElement('i', { className: 'ti ti-map-pin', style: { marginRight: 8 } }),
                            'Destino: ' + (selectedOT.destino || 'No especificado')
                        ),
                        React.createElement('p', { style: { margin: '4px 0', color: '#666' } },
                            React.createElement('i', { className: 'ti ti-calendar', style: { marginRight: 8 } }),
                            'Fecha: ' + formatFecha(selectedOT.created_at)
                        )
                    ),
                    React.createElement('span', { 
                        style: { 
                            padding: '6px 12px', 
                            borderRadius: 20, 
                            background: selectedOT.estado === 'ABIERTA' ? '#e8f5e9' : '#f5f5f5',
                            color: selectedOT.estado === 'ABIERTA' ? '#2e7d32' : '#999',
                            fontSize: 12,
                            fontWeight: 500
                        } 
                    }, selectedOT.estado === 'ABIERTA' ? '🟢 Activa' : '🔴 Cerrada')
                )
            ),

            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 } },
                React.createElement('div', { style: { background: 'white', borderRadius: 8, border: '1px solid #e5e7eb', padding: 16, textAlign: 'center' } },
                    React.createElement('div', { style: { fontSize: 28, fontWeight: 600, color: 'var(--amber)' } }, equiposOT.length),
                    React.createElement('div', { style: { fontSize: 12, color: '#666' } }, 'Total Equipos')
                ),
                React.createElement('div', { style: { background: 'white', borderRadius: 8, border: '1px solid #e5e7eb', padding: 16, textAlign: 'center' } },
                    React.createElement('div', { style: { fontSize: 28, fontWeight: 600, color: '#0288d1' } }, 
                        equiposOT.filter(function(e) { return e.serial; }).length
                    ),
                    React.createElement('div', { style: { fontSize: 12, color: '#666' } }, 'Serializados')
                ),
                React.createElement('div', { style: { background: 'white', borderRadius: 8, border: '1px solid #e5e7eb', padding: 16, textAlign: 'center' } },
                    React.createElement('div', { style: { fontSize: 28, fontWeight: 600, color: '#ed6c02' } }, 
                        equiposOT.filter(function(e) { return !e.serial; }).length
                    ),
                    React.createElement('div', { style: { fontSize: 12, color: '#666' } }, 'No Serializados')
                )
            ),

            React.createElement('div', { style: { background: 'white', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden' } },
                React.createElement('div', { style: { padding: 12, borderBottom: '1px solid #e5e7eb', fontWeight: 500, background: 'var(--bg-secondary)' } }, 
                    '📋 Equipos Asignados'
                ),
                loading ? React.createElement('div', { style: { padding: '40px', textAlign: 'center', color: '#666' } },
                    React.createElement('i', { className: 'ti ti-loader spin', style: { fontSize: 24 } }),
                    React.createElement('p', null, 'Cargando equipos...')
                ) : equiposOT.length === 0 ? React.createElement('div', { style: { padding: '40px', textAlign: 'center', color: '#666' } },
                    React.createElement('i', { className: 'ti ti-package-off', style: { fontSize: 48, marginBottom: 16, display: 'block' } }),
                    React.createElement('p', null, 'No hay equipos asignados a esta OT')
                ) : React.createElement('div', { style: { overflowX: 'auto' } },
                    React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse' } },
                        React.createElement('thead', null,
                            React.createElement('tr', null,
                                simplificado ? [
                                    React.createElement('th', { key: 'material', style: { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#666', borderBottom: '1px solid #e5e7eb', background: 'var(--bg-secondary)' } }, 'Material'),
                                    React.createElement('th', { key: 'serie', style: { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#666', borderBottom: '1px solid #e5e7eb', background: 'var(--bg-secondary)' } }, 'Serie'),
                                    React.createElement('th', { key: 'cantidad', style: { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#666', borderBottom: '1px solid #e5e7eb', background: 'var(--bg-secondary)' } }, 'Cant.'),
                                    React.createElement('th', { key: 'estado', style: { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#666', borderBottom: '1px solid #e5e7eb', background: 'var(--bg-secondary)' } }, 'Estado'),
                                    React.createElement('th', { key: 'lote', style: { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#666', borderBottom: '1px solid #e5e7eb', background: 'var(--bg-secondary)' } }, 'Lote')
                                ] : [
                                    React.createElement('th', { key: 'material', style: { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#666', borderBottom: '1px solid #e5e7eb', background: 'var(--bg-secondary)' } }, 'Material'),
                                    React.createElement('th', { key: 'serie', style: { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#666', borderBottom: '1px solid #e5e7eb', background: 'var(--bg-secondary)' } }, 'Serie'),
                                    React.createElement('th', { key: 'cantidad', style: { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#666', borderBottom: '1px solid #e5e7eb', background: 'var(--bg-secondary)' } }, 'Cant.'),
                                    React.createElement('th', { key: 'estado', style: { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#666', borderBottom: '1px solid #e5e7eb', background: 'var(--bg-secondary)' } }, 'Estado'),
                                    React.createElement('th', { key: 'tecnico', style: { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#666', borderBottom: '1px solid #e5e7eb', background: 'var(--bg-secondary)' } }, 'Técnico'),
                                    React.createElement('th', { key: 'ubicacion', style: { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#666', borderBottom: '1px solid #e5e7eb', background: 'var(--bg-secondary)' } }, 'Ubicación')
                                ]
                            )
                        ),
                        React.createElement('tbody', null,
                            equiposOT.map(function(equipo) {
                                return React.createElement('tr', { key: equipo.id, style: { borderBottom: '1px solid #e5e7eb' } },
                                    React.createElement('td', { style: { padding: '10px 12px', fontSize: 13 } },
                                        React.createElement('div', { style: { fontWeight: 500 } }, equipo.descripcion || equipo.material_id),
                                        React.createElement('div', { style: { fontSize: 11, color: '#999' } }, equipo.material_id)
                                    ),
                                    React.createElement('td', { style: { padding: '10px 12px', fontSize: 13, fontFamily: 'monospace' } }, equipo.serial || '—'),
                                    React.createElement('td', { style: { padding: '10px 12px', fontSize: 13, textAlign: 'center' } }, equipo.cantidad || 1),
                                    React.createElement('td', { style: { padding: '10px 12px' } }, React.createElement(Bdg, { v: getEstadoLabel(equipo.estado) })),
                                    simplificado ? 
                                        React.createElement('td', { style: { padding: '10px 12px', fontSize: 13 } }, equipo.lote || '—') :
                                        React.createElement(React.Fragment, null,
                                            React.createElement('td', { style: { padding: '10px 12px', fontSize: 13 } }, equipo.usuario_asignado_nombre || '—'),
                                            React.createElement('td', { style: { padding: '10px 12px', fontSize: 13 } }, equipo.ubicacion || '—')
                                        )
                                );
                            })
                        )
                    )
                )
            )
        ) : React.createElement('div', { style: { background: 'white', borderRadius: 8, border: '1px solid #e5e7eb', padding: '40px', textAlign: 'center', color: '#999' } },
            React.createElement('i', { className: 'ti ti-search', style: { fontSize: 48, marginBottom: 16, display: 'block' } }),
            React.createElement('p', null, simplificado ? 'Ingrese el número de OT y presione "Buscar OT"' : 'Busca y selecciona una Orden de Trabajo para ver sus equipos asignados')
        )
    );
}