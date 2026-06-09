import React, { useState } from 'react';
import { http } from '../api.js';
import { Card, CardHeader, Btn, Alert, Label, PageHeader } from './UI.jsx';
import '../styles/CargaMasivaView.css';

const MAPEOS = [
  { key: 'columna_material', label: 'Código de Material' },
  { key: 'columna_serial',   label: 'Número de Serie' },
  { key: 'columna_ot',       label: 'OT' },
  { key: 'columna_oth',      label: 'OTH' },
  { key: 'columna_cliente',  label: 'Cliente' },
  { key: 'columna_destino',  label: 'Destino' },
  { key: 'columna_cantidad', label: 'Cantidad' },
  { key: 'columna_documento',label: 'Documento Material' },
  { key: 'columna_lote',     label: 'Lote' },
];

export default function CargaMasivaView({ bodegas = [], refresh }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [config, setConfig] = useState({
    bodega_id: '', columna_material: 'Material', columna_serial: 'NºSerieFab', columna_ot: 'OTP',
    columna_oth: 'OTH', columna_cliente: 'CLIENTE', columna_destino: 'Destino',
    columna_cantidad: 'Ctd.en UM entrada', columna_documento: 'Doc.mat.', columna_lote: 'LOTE'
  });

  const procesarArchivo = (e) => {
    const f = e.target.files[0]; if (!f) return;
    setFile(f); setAlert(null);
    const reader = new FileReader();
    reader.onload = ev => {
      const lines = ev.target.result.split(/\r\n|\n/);
      const headers = lines[0].split(',').map(h => h.replace(/["']/g,'').trim());
      const data = lines.slice(1).filter(l => l.trim()).map(l => {
        const vals = l.split(',').map(v => v.replace(/["']/g,'').trim());
        const row = {}; headers.forEach((h,i) => { row[h] = vals[i]||''; }); return row;
      });
      setPreview(data.slice(0, 10));
      setAlert({ type: 'success', msg: `Archivo cargado: ${data.length} registros. Primeros 10 en vista previa.` });
    };
    reader.readAsText(f, 'UTF-8');
  };

  const enviar = async () => {
    if (!config.bodega_id) { setAlert({ type: 'error', msg: 'Selecciona una bodega destino.' }); return; }
    if (!preview.length) { setAlert({ type: 'error', msg: 'Carga un archivo primero.' }); return; }
    setLoading(true); setAlert(null);
    const reader = new FileReader();
    reader.onload = async ev => {
      const lines = ev.target.result.split(/\r\n|\n/);
      const headers = lines[0].split(',').map(h => h.replace(/["']/g,'').trim());
      const datos = lines.slice(1).filter(l => l.trim()).map(l => {
        const vals = l.split(',').map(v => v.replace(/["']/g,'').trim());
        const row = {}; headers.forEach((h,i) => { row[h] = vals[i]||''; }); return row;
      });
      try {
        const res = await http.post('/inventario/carga-masiva', { datos, config, bodega_id: parseInt(config.bodega_id) });
        if (res.success) {
          setAlert({ type: res.errores > 0 ? 'warning' : 'success', msg: `Carga completada. ${res.procesados} equipos ingresados, ${res.errores} errores.` });
          if (res.procesados > 0) { await refresh(); setFile(null); setPreview([]); }
        } else setAlert({ type: 'error', msg: res.error || 'Error en la carga' });
      } catch (err) { setAlert({ type: 'error', msg: err.message }); }
      finally { setLoading(false); }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const cols = Object.keys(preview[0] || {});
  const colOpts = cols.map(c => <option key={c} value={c}>{c}</option>);

  return (
    <div className="carga-fade-in">
      <PageHeader title="Carga Masiva" icon="ti-upload" subtitle="Importa inventario desde archivo CSV" />
      {alert && <Alert type={alert.type} msg={alert.msg} onClose={() => setAlert(null)} />}

      <div className="carga-container">
        {/* Step 1 */}
        <Card>
          <CardHeader title="1. Seleccionar archivo CSV" icon="ti-file-upload" />
          <div className="carga-card-body">
            <div className="carga-dropzone">
              <i className="ti ti-cloud-upload carga-dropzone-icon" />
              <p className="carga-dropzone-text">Arrastra un archivo CSV o haz clic para seleccionar</p>
              <input type="file" accept=".csv" onChange={procesarArchivo} className="carga-file-input" />
              <p className="carga-dropzone-hint">El archivo debe tener encabezados en la primera fila</p>
            </div>
          </div>
        </Card>

        {/* Step 2: mapeo */}
        {preview.length > 0 && (
          <Card className="fade-in">
            <CardHeader title="2. Mapeo de columnas" icon="ti-columns" />
            <div className="carga-card-body">
              <div className="carga-mapeo-grid">
                {MAPEOS.map(({ key, label }) => (
                  <div key={key}>
                    <Label>{label}</Label>
                    <select className="carga-select" value={config[key]} onChange={e => setConfig(p => ({ ...p, [key]: e.target.value }))}>
                      <option value="">Ninguna</option>
                      {key === 'columna_lote' && (
                        <>
                          <option value="VALORADO">VALORADO (fijo)</option>
                          <option value="NO VALORADO">NO VALORADO (fijo)</option>
                        </>
                      )}
                      {colOpts}
                    </select>
                  </div>
                ))}
                <div>
                  <Label required>Bodega destino</Label>
                  <select className="carga-select" value={config.bodega_id} onChange={e => setConfig(p => ({ ...p, bodega_id: e.target.value }))}>
                    <option value="">Seleccionar...</option>
                    {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Step 3: preview */}
        {preview.length > 0 && (
          <Card className="fade-in">
            <CardHeader title="3. Vista previa (primeros 10 registros)" icon="ti-table" />
            <div className="carga-preview-container">
              <table className="carga-preview-table">
                <thead>
                  <tr>{cols.slice(0, 8).map(h => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).slice(0, 8).map((v, j) => <td key={j} className="carga-preview-cell">{v}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {preview.length > 0 && (
          <div className="carga-submit">
            <Btn onClick={enviar} loading={loading} icon="ti-cloud-upload" size="lg">Procesar Carga Masiva</Btn>
          </div>
        )}
      </div>
    </div>
  );
}