// components/FormularioActaQA.js
function FormularioActaQA({ equiposAsignados, token, onSuccess, onCancel }) {
    const [formData, setFormData] = React.useState({
        fecha_ejecucion: new Date().toISOString().split('T')[0],
        hora_inicio: '',
        hora_salida: '',
        tiempo_transporte: '',
        tiempo_antesala: '',
        tiempo_ejecucion: '',
        tiempo_espera_claro: '',
        ingeniero_outsourcing: '',
        multimetro: '',
        analizador_ber: '',
        soporte_claro: '',
        firma_acta: false,
        caso_seguimiento: false,
        problemas_instalacion: false,
        mediciones_electricas: { fase_neutro: '', fase_tierra: '', neutro_tierra: '' },
        lugar_instalacion: 'RACK',
        observaciones: '',
        pruebas_servicio: { ping_central: '', traceroute: '', firmware: '' },
        equipos_instalados: [],
        equipos_desinstalados: []
    });
    const [loading, setLoading] = React.useState(false);
    const [equipoSeleccionado, setEquipoSeleccionado] = React.useState('');
    const [nuevoEquipoInstalado, setNuevoEquipoInstalado] = React.useState({ sap: '', descripcion: '', serial: '', placa: '' });
    const [nuevoEquipoDesinstalado, setNuevoEquipoDesinstalado] = React.useState({ sap: '', descripcion: '', serial: '', placa: '' });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleMedicionChange = (campo, value) => {
        setFormData(prev => ({
            ...prev,
            mediciones_electricas: { ...prev.mediciones_electricas, [campo]: value }
        }));
    };

    const handlePruebaChange = (campo, value) => {
        setFormData(prev => ({
            ...prev,
            pruebas_servicio: { ...prev.pruebas_servicio, [campo]: value }
        }));
    };

    // Agregar equipo desde la lista del técnico
    const agregarEquipoDesdeLista = () => {
        if (!equipoSeleccionado) return;
        const equipo = equiposAsignados.find(eq => eq.id === parseInt(equipoSeleccionado));
        if (equipo) {
            const nuevoEquipo = {
                sap: equipo.material_id || '',
                descripcion: equipo.descripcion || '',
                serial: equipo.serial || '',
                placa: equipo.placa || ''
            };
            setFormData(prev => ({
                ...prev,
                equipos_instalados: [...prev.equipos_instalados, nuevoEquipo]
            }));
            setEquipoSeleccionado('');
        }
    };

    // Agregar equipo manualmente
    const agregarEquipoInstalado = () => {
        if (nuevoEquipoInstalado.sap && nuevoEquipoInstalado.descripcion && nuevoEquipoInstalado.serial) {
            setFormData(prev => ({
                ...prev,
                equipos_instalados: [...prev.equipos_instalados, { ...nuevoEquipoInstalado }]
            }));
            setNuevoEquipoInstalado({ sap: '', descripcion: '', serial: '', placa: '' });
        } else {
            alert('Debe ingresar al menos SAP, Descripción y Serie');
        }
    };

    const eliminarEquipoInstalado = (index) => {
        setFormData(prev => ({
            ...prev,
            equipos_instalados: prev.equipos_instalados.filter((_, i) => i !== index)
        }));
    };

    // Agregar equipo desinstalado (similar)
    const agregarEquipoDesinstalado = () => {
        if (nuevoEquipoDesinstalado.sap && nuevoEquipoDesinstalado.descripcion && nuevoEquipoDesinstalado.serial) {
            setFormData(prev => ({
                ...prev,
                equipos_desinstalados: [...prev.equipos_desinstalados, { ...nuevoEquipoDesinstalado }]
            }));
            setNuevoEquipoDesinstalado({ sap: '', descripcion: '', serial: '', placa: '' });
        } else {
            alert('Debe ingresar al menos SAP, Descripción y Serie');
        }
    };

    const eliminarEquipoDesinstalado = (index) => {
        setFormData(prev => ({
            ...prev,
            equipos_desinstalados: prev.equipos_desinstalados.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Guardar acta
            const response = await fetch(API_BASE + '/actas-qa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al guardar el acta');
            }
            const data = await response.json();
            alert(`Acta guardada correctamente (ID: ${data.id})`);

            // Solicitar el PDF
            const pdfResponse = await fetch(API_BASE + `/actas-qa/${data.id}/pdf`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!pdfResponse.ok) throw new Error('Error al generar el PDF');

            const blob = await pdfResponse.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `acta_${data.id}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            onSuccess();
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return React.createElement('div', { style: { maxHeight: '80vh', overflowY: 'auto', padding: '1rem' } },
        React.createElement('h2', { style: { marginBottom: '1rem' } }, 'Nueva Acta QA'),
        React.createElement('form', { onSubmit: handleSubmit },
            // Sección 1: Datos generales (igual)
            React.createElement('div', { style: { ...CARD, padding: '1rem', marginBottom: '1rem' } },
                React.createElement('h3', null, 'Datos generales'),
                React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '0.5rem' } },
                    React.createElement('div', null, React.createElement('label', { style: LBL }, 'Fecha ejecución'), React.createElement('input', { type: 'date', name: 'fecha_ejecucion', value: formData.fecha_ejecucion, onChange: handleChange, required: true })),
                    React.createElement('div', null, React.createElement('label', { style: LBL }, 'Hora inicio'), React.createElement('input', { type: 'time', name: 'hora_inicio', value: formData.hora_inicio, onChange: handleChange, required: true })),
                    React.createElement('div', null, React.createElement('label', { style: LBL }, 'Hora salida'), React.createElement('input', { type: 'time', name: 'hora_salida', value: formData.hora_salida, onChange: handleChange })),
                    React.createElement('div', null, React.createElement('label', { style: LBL }, 'Tiempo transporte (min)'), React.createElement('input', { type: 'number', name: 'tiempo_transporte', value: formData.tiempo_transporte, onChange: handleChange })),
                    React.createElement('div', null, React.createElement('label', { style: LBL }, 'Tiempo antesala (min)'), React.createElement('input', { type: 'number', name: 'tiempo_antesala', value: formData.tiempo_antesala, onChange: handleChange })),
                    React.createElement('div', null, React.createElement('label', { style: LBL }, 'Tiempo ejecución (min)'), React.createElement('input', { type: 'number', name: 'tiempo_ejecucion', value: formData.tiempo_ejecucion, onChange: handleChange })),
                    React.createElement('div', null, React.createElement('label', { style: LBL }, 'Tiempo espera Claro (min)'), React.createElement('input', { type: 'number', name: 'tiempo_espera_claro', value: formData.tiempo_espera_claro, onChange: handleChange })),
                    React.createElement('div', null, React.createElement('label', { style: LBL }, 'Ingeniero outsourcing'), React.createElement('input', { type: 'text', name: 'ingeniero_outsourcing', value: formData.ingeniero_outsourcing, onChange: handleChange })),
                    React.createElement('div', null, React.createElement('label', { style: LBL }, 'Soporte Claro'), React.createElement('input', { type: 'text', name: 'soporte_claro', value: formData.soporte_claro, onChange: handleChange })),
                )
            ),
            // Sección 2: Mediciones eléctricas (igual)
            React.createElement('div', { style: { ...CARD, padding: '1rem', marginBottom: '1rem' } },
                React.createElement('h3', null, 'Mediciones eléctricas'),
                React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem' } },
                    React.createElement('div', null, React.createElement('label', { style: LBL }, 'Fase-Neutro (V)'), React.createElement('input', { type: 'number', step: '0.01', value: formData.mediciones_electricas.fase_neutro, onChange: e => handleMedicionChange('fase_neutro', e.target.value) })),
                    React.createElement('div', null, React.createElement('label', { style: LBL }, 'Fase-Tierra (V)'), React.createElement('input', { type: 'number', step: '0.01', value: formData.mediciones_electricas.fase_tierra, onChange: e => handleMedicionChange('fase_tierra', e.target.value) })),
                    React.createElement('div', null, React.createElement('label', { style: LBL }, 'Neutro-Tierra (V)'), React.createElement('input', { type: 'number', step: '0.01', value: formData.mediciones_electricas.neutro_tierra, onChange: e => handleMedicionChange('neutro_tierra', e.target.value) }))
                )
            ),
            // Sección 3: Equipos instalados (nueva versión)
            React.createElement('div', { style: { ...CARD, padding: '1rem', marginBottom: '1rem' } },
                React.createElement('h3', null, 'Equipos instalados'),
                React.createElement('div', { style: { marginBottom: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' } },
                    React.createElement('select', {
                        value: equipoSeleccionado,
                        onChange: e => setEquipoSeleccionado(e.target.value),
                        style: { flex: 1 }
                    },
                        React.createElement('option', { value: '' }, '-- Seleccionar de mis equipos --'),
                        equiposAsignados.map(eq => React.createElement('option', { key: eq.id, value: eq.id }, `${eq.serial || eq.descripcion} (${eq.estado})`))
                    ),
                    React.createElement('button', { type: 'button', onClick: agregarEquipoDesdeLista, style: { padding: '0 12px' } }, 'Agregar')
                ),
                React.createElement('div', { style: { marginBottom: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' } },
                    React.createElement('input', { type: 'text', placeholder: 'Código SAP', value: nuevoEquipoInstalado.sap, onChange: e => setNuevoEquipoInstalado({ ...nuevoEquipoInstalado, sap: e.target.value }), style: { width: '120px' } }),
                    React.createElement('input', { type: 'text', placeholder: 'Descripción', value: nuevoEquipoInstalado.descripcion, onChange: e => setNuevoEquipoInstalado({ ...nuevoEquipoInstalado, descripcion: e.target.value }), style: { width: '180px' } }),
                    React.createElement('input', { type: 'text', placeholder: 'Serie', value: nuevoEquipoInstalado.serial, onChange: e => setNuevoEquipoInstalado({ ...nuevoEquipoInstalado, serial: e.target.value }), style: { width: '150px' } }),
                    React.createElement('input', { type: 'text', placeholder: 'Placa (opcional)', value: nuevoEquipoInstalado.placa, onChange: e => setNuevoEquipoInstalado({ ...nuevoEquipoInstalado, placa: e.target.value }), style: { width: '120px' } }),
                    React.createElement('button', { type: 'button', onClick: agregarEquipoInstalado, style: { padding: '0 12px' } }, '+')
                ),
                React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse' } },
                    React.createElement('thead', null,
                        React.createElement('tr', null,
                            ['Código SAP', 'Descripción', 'Serie', 'Placa', 'Acción'].map(h => React.createElement('th', { key: h, style: TH }, h))
                        )
                    ),
                    React.createElement('tbody', null,
                        formData.equipos_instalados.map((eq, idx) => React.createElement('tr', { key: idx },
                            React.createElement('td', { style: TD }, eq.sap),
                            React.createElement('td', { style: TD }, eq.descripcion),
                            React.createElement('td', { style: TD }, eq.serial),
                            React.createElement('td', { style: TD }, eq.placa || '—'),
                            React.createElement('td', { style: TD }, React.createElement('button', { type: 'button', onClick: () => eliminarEquipoInstalado(idx), style: { color: 'red' } }, 'Eliminar'))
                        ))
                    )
                )
            ),
            // Sección 4: Equipos desinstalados (similar)
            React.createElement('div', { style: { ...CARD, padding: '1rem', marginBottom: '1rem' } },
                React.createElement('h3', null, 'Equipos desinstalados / trasladados'),
                React.createElement('div', { style: { marginBottom: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' } },
                    React.createElement('input', { type: 'text', placeholder: 'Código SAP', value: nuevoEquipoDesinstalado.sap, onChange: e => setNuevoEquipoDesinstalado({ ...nuevoEquipoDesinstalado, sap: e.target.value }), style: { width: '120px' } }),
                    React.createElement('input', { type: 'text', placeholder: 'Descripción', value: nuevoEquipoDesinstalado.descripcion, onChange: e => setNuevoEquipoDesinstalado({ ...nuevoEquipoDesinstalado, descripcion: e.target.value }), style: { width: '180px' } }),
                    React.createElement('input', { type: 'text', placeholder: 'Serie', value: nuevoEquipoDesinstalado.serial, onChange: e => setNuevoEquipoDesinstalado({ ...nuevoEquipoDesinstalado, serial: e.target.value }), style: { width: '150px' } }),
                    React.createElement('input', { type: 'text', placeholder: 'Placa (opcional)', value: nuevoEquipoDesinstalado.placa, onChange: e => setNuevoEquipoDesinstalado({ ...nuevoEquipoDesinstalado, placa: e.target.value }), style: { width: '120px' } }),
                    React.createElement('button', { type: 'button', onClick: agregarEquipoDesinstalado, style: { padding: '0 12px' } }, '+')
                ),
                React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse' } },
                    React.createElement('thead', null,
                        React.createElement('tr', null,
                            ['Código SAP', 'Descripción', 'Serie', 'Placa', 'Acción'].map(h => React.createElement('th', { key: h, style: TH }, h))
                        )
                    ),
                    React.createElement('tbody', null,
                        formData.equipos_desinstalados.map((eq, idx) => React.createElement('tr', { key: idx },
                            React.createElement('td', { style: TD }, eq.sap),
                            React.createElement('td', { style: TD }, eq.descripcion),
                            React.createElement('td', { style: TD }, eq.serial),
                            React.createElement('td', { style: TD }, eq.placa || '—'),
                            React.createElement('td', { style: TD }, React.createElement('button', { type: 'button', onClick: () => eliminarEquipoDesinstalado(idx), style: { color: 'red' } }, 'Eliminar'))
                        ))
                    )
                )
            ),
            // Sección 5: Pruebas de servicio (igual)
            React.createElement('div', { style: { ...CARD, padding: '1rem', marginBottom: '1rem' } },
                React.createElement('h3', null, 'Pruebas de servicio'),
                React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' } },
                    React.createElement('div', null, React.createElement('label', { style: LBL }, 'Ping a oficina principal'), React.createElement('input', { type: 'text', value: formData.pruebas_servicio.ping_central, onChange: e => handlePruebaChange('ping_central', e.target.value) })),
                    React.createElement('div', null, React.createElement('label', { style: LBL }, 'Traceroute'), React.createElement('input', { type: 'text', value: formData.pruebas_servicio.traceroute, onChange: e => handlePruebaChange('traceroute', e.target.value) })),
                    React.createElement('div', null, React.createElement('label', { style: LBL }, 'Firmware'), React.createElement('input', { type: 'text', value: formData.pruebas_servicio.firmware, onChange: e => handlePruebaChange('firmware', e.target.value) }))
                )
            ),
            // Sección 6: Observaciones (igual)
            React.createElement('div', { style: { ...CARD, padding: '1rem', marginBottom: '1rem' } },
                React.createElement('h3', null, 'Observaciones'),
                React.createElement('textarea', { name: 'observaciones', rows: 4, style: { width: '100%' }, value: formData.observaciones, onChange: handleChange })
            ),
            // Checkboxes
            React.createElement('div', { style: { display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' } },
                React.createElement('label', null, React.createElement('input', { type: 'checkbox', name: 'firma_acta', checked: formData.firma_acta, onChange: handleChange }), ' Firma acta'),
                React.createElement('label', null, React.createElement('input', { type: 'checkbox', name: 'caso_seguimiento', checked: formData.caso_seguimiento, onChange: handleChange }), ' Caso seguimiento'),
                React.createElement('label', null, React.createElement('input', { type: 'checkbox', name: 'problemas_instalacion', checked: formData.problemas_instalacion, onChange: handleChange }), ' Problemas instalación')
            ),
            // Botones
            React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' } },
                React.createElement(Btn, { secondary: true, onClick: onCancel, type: 'button' }, 'Cancelar'),
                React.createElement(Btn, { loading: loading, type: 'submit' }, 'Guardar y generar PDF')
            )
        )
    );
}