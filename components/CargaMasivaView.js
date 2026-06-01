// components/CargaMasivaView.js
function CargaMasivaView({ bodegas, materiales, refresh }) {
    const [file, setFile] = React.useState(null);
    const [preview, setPreview] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [alert, setAlert] = React.useState(null);
    const [config, setConfig] = React.useState({
        bodega_id: '',
        columna_material: 'Material',
        columna_serial: 'NºSerieFab',
        columna_ot: 'OTP',
        columna_oth: 'OTH',
        columna_cliente: 'CLIENTE',
        columna_destino: 'Destino',
        columna_cantidad: 'Ctd.en UM entrada',
        columna_documento: 'Doc.mat.',
        columna_lote: 'LOTE'
    });

    const listaBodegas = Array.isArray(bodegas) ? bodegas : [];
    const listaMateriales = Array.isArray(materiales) ? materiales : [];

    const procesarArchivo = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setFile(file);
        setAlert(null);

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const lines = text.split(/\r\n|\n/);
            const headers = lines[0].split(',').map(h => h.replace(/["']/g, '').trim());

            const data = [];
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                const values = lines[i].split(',').map(v => v.replace(/["']/g, '').trim());
                const row = {};
                headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
                data.push(row);
            }
            setPreview(data.slice(0, 10));
            setAlert({ type: 'success', msg: `Archivo cargado: ${data.length} registros. Vista previa de los primeros 10.` });
        };
        reader.readAsText(file, 'UTF-8');
    };

    const handleConfigChange = (campo, valor) => {
        setConfig(prev => ({ ...prev, [campo]: valor }));
    };

    const enviarCarga = async () => {
        console.log('🚀 enviarCarga ejecutado');
        console.log('file:', file);
        console.log('preview length:', preview.length);
        console.log('config.bodega_id:', config.bodega_id);

        if (!config.bodega_id) {
            console.log('❌ No hay bodega seleccionada');
            setAlert({ type: 'error', msg: 'Selecciona una bodega destino.' });
            return;
        }
        if (!preview.length) {
            console.log('❌ No hay datos preview');
            setAlert({ type: 'error', msg: 'No hay datos para enviar. Carga un archivo primero.' });
            return;
        }

        setLoading(true);
        setAlert(null);

        // Leer el archivo completo nuevamente
        const reader = new FileReader();
        reader.onload = async (e) => {
            console.log('📄 Archivo leído correctamente');
            const text = e.target.result;
            const lines = text.split(/\r\n|\n/);
            const headers = lines[0].split(',').map(h => h.replace(/["']/g, '').trim());

            const datos = [];
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                const values = lines[i].split(',').map(v => v.replace(/["']/g, '').trim());
                const row = {};
                headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
                datos.push(row);
            }

            console.log('📊 Datos procesados:', datos.length);

            try {
                console.log('📤 Enviando petición a /api/inventario/carga-masiva');
                const response = await http.post('/inventario/carga-masiva', {
                    datos: datos,        // ← usar la variable local 'datos'
                    config,
                    bodega_id: parseInt(config.bodega_id)
                });
                console.log('✅ Respuesta:', response);
                if (response.success) {
                    let msg = `Carga completada. ${response.procesados} equipos ingresados, ${response.errores} errores.`;
                    if (response.detalles && response.detalles.length > 0) {
                        msg += `\nDetalles: ${response.detalles.join('; ')}`;
                    }
                    setAlert({ type: response.errores > 0 ? 'warning' : 'success', msg });
                    if (response.procesados > 0) {
                        await refresh();
                        setFile(null);
                        setPreview([]);
                    }
                } else {
                    setAlert({ type: 'error', msg: response.error || 'Error en la carga masiva' });
                }
            } catch (err) {
                console.error('❌ Error en petición:', err);
                setAlert({ type: 'error', msg: err.message || 'Error al procesar la carga' });
            } finally {
                setLoading(false);
            }
        };
        reader.onerror = (err) => {
            console.error('❌ Error leyendo archivo:', err);
            setAlert({ type: 'error', msg: 'Error al leer el archivo' });
            setLoading(false);
        };
        reader.readAsText(file, 'UTF-8');
    };

    return React.createElement('div', null,
        React.createElement('h2', { style: { margin: '0 0 1.25rem', fontWeight: 500, fontSize: 18 } }, 'Carga Masiva de Inventario'),
        alert && React.createElement(Alert, { type: alert.type, msg: alert.msg, onClose: () => setAlert(null) }),

        React.createElement('div', { style: { ...CARD, padding: '1.25rem', marginBottom: '1rem' } },
            React.createElement('p', { style: { margin: '0 0 1rem', fontWeight: 500, fontSize: 14 } }, '1. Selecciona el archivo CSV'),
            React.createElement('input', { type: 'file', accept: '.csv', onChange: procesarArchivo }),
            React.createElement('p', { style: { fontSize: 12, color: '#666', marginTop: 8 } }, 'El archivo debe tener encabezados. Puedes mapear las columnas abajo.')
        ),

        preview.length > 0 && React.createElement('div', { style: { ...CARD, padding: '1.25rem', marginBottom: '1rem' } },
            React.createElement('p', { style: { margin: '0 0 1rem', fontWeight: 500, fontSize: 14 } }, '2. Mapeo de columnas'),
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 16 } },
                React.createElement('div', null,
                    React.createElement('label', { style: LBL }, 'Columna para Código de Material'),
                    React.createElement('select', { value: config.columna_material, onChange: e => handleConfigChange('columna_material', e.target.value) },
                        Object.keys(preview[0] || {}).map(col => React.createElement('option', { key: col, value: col }, col))
                    )
                ),
                React.createElement('div', null,
                    React.createElement('label', { style: LBL }, 'Columna para Número de Serie'),
                    React.createElement('select', { value: config.columna_serial, onChange: e => handleConfigChange('columna_serial', e.target.value) },
                        React.createElement('option', { value: '' }, 'Ninguna'),
                        Object.keys(preview[0] || {}).map(col => React.createElement('option', { key: col, value: col }, col))
                    )
                ),
                React.createElement('div', null,
                    React.createElement('label', { style: LBL }, 'Columna para OT'),
                    React.createElement('select', { value: config.columna_ot, onChange: e => handleConfigChange('columna_ot', e.target.value) },
                        React.createElement('option', { value: '' }, 'Ninguna'),
                        Object.keys(preview[0] || {}).map(col => React.createElement('option', { key: col, value: col }, col))
                    )
                ),
                React.createElement('div', null,
                    React.createElement('label', { style: LBL }, 'Columna para OTH'),
                    React.createElement('select', { value: config.columna_oth, onChange: e => handleConfigChange('columna_oth', e.target.value) },
                        React.createElement('option', { value: '' }, 'Ninguna'),
                        Object.keys(preview[0] || {}).map(col => React.createElement('option', { key: col, value: col }, col))
                    )
                ),
                React.createElement('div', null,
                    React.createElement('label', { style: LBL }, 'Columna para Cliente (si se crea OT)'),
                    React.createElement('select', { value: config.columna_cliente, onChange: e => handleConfigChange('columna_cliente', e.target.value) },
                        React.createElement('option', { value: '' }, 'Ninguna'),
                        Object.keys(preview[0] || {}).map(col => React.createElement('option', { key: col, value: col }, col))
                    )
                ),
                React.createElement('div', null,
                    React.createElement('label', { style: LBL }, 'Columna para Destino (si se crea OT)'),
                    React.createElement('select', { value: config.columna_destino, onChange: e => handleConfigChange('columna_destino', e.target.value) },
                        React.createElement('option', { value: '' }, 'Ninguna'),
                        Object.keys(preview[0] || {}).map(col => React.createElement('option', { key: col, value: col }, col))
                    )
                ),
                React.createElement('div', null,
                    React.createElement('label', { style: LBL }, 'Columna para Cantidad'),
                    React.createElement('select', { value: config.columna_cantidad, onChange: e => handleConfigChange('columna_cantidad', e.target.value) },
                        Object.keys(preview[0] || {}).map(col => React.createElement('option', { key: col, value: col }, col))
                    )
                ),
                React.createElement('div', null,
                    React.createElement('label', { style: LBL }, 'Columna para Documento Material'),
                    React.createElement('select', { value: config.columna_documento, onChange: e => handleConfigChange('columna_documento', e.target.value) },
                        React.createElement('option', { value: '' }, 'Ninguna'),
                        Object.keys(preview[0] || {}).map(col => React.createElement('option', { key: col, value: col }, col))
                    )
                ),
                React.createElement('div', null,
                    React.createElement('label', { style: LBL }, 'Columna para Lote'),
                    React.createElement('select', { value: config.columna_lote, onChange: e => handleConfigChange('columna_lote', e.target.value) },
                        React.createElement('option', { value: '' }, 'Ninguna'),
                        React.createElement('option', { value: 'VALORADO' }, 'VALORADO (fijo)'),
                        React.createElement('option', { value: 'NO VALORADO' }, 'NO VALORADO (fijo)'),
                        Object.keys(preview[0] || {}).map(col => React.createElement('option', { key: col, value: col }, col))
                    )
                )
            ),
            React.createElement('div', null,
                React.createElement('label', { style: LBL }, 'Bodega destino *'),
                React.createElement('select', { value: config.bodega_id, onChange: e => handleConfigChange('bodega_id', e.target.value) },
                    React.createElement('option', { value: '' }, 'Seleccionar...'),
                    listaBodegas.map(b => React.createElement('option', { key: b.id, value: b.id }, b.nombre))
                )
            )
        ),

        preview.length > 0 && React.createElement('div', { style: { ...CARD, padding: '1.25rem', marginBottom: '1rem' } },
            React.createElement('p', { style: { margin: '0 0 1rem', fontWeight: 500, fontSize: 14 } }, '3. Vista previa (primeros 10 registros)'),
            React.createElement('div', { style: { overflowX: 'auto' } },
                React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse' } },
                    React.createElement('thead', null,
                        React.createElement('tr', null,
                            Object.keys(preview[0] || {}).slice(0, 8).map(h => React.createElement('th', { key: h, style: TH }, h))
                        )
                    ),
                    React.createElement('tbody', null,
                        preview.map((row, i) => React.createElement('tr', { key: i },
                            Object.values(row).slice(0, 8).map((val, j) => React.createElement('td', { key: j, style: TD }, val))
                        ))
                    )
                )
            )
        ),

        preview.length > 0 && React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 8 } },
            React.createElement(Btn, { onClick: enviarCarga, loading: loading }, 'Procesar Carga Masiva')
        )
    );
}