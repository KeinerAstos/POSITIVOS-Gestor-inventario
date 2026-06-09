// components/UIComponents.js
// Versión global - sin import/export

// Estilos globales compartidos
const TH = { padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', background: 'var(--bg-secondary)' };
const TD = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid var(--border)', verticalAlign: 'middle' };
const CARD = { background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' };
const LBL = { fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 };

const BADGE = {
    disponible: { bg: '#EAF3DE', tx: '#3B6D11', lbl: 'Disponible' },
    asignado: { bg: '#E6F1FB', tx: '#185FA5', lbl: 'Asignado' },
    instalado: { bg: '#E1F5EE', tx: '#0F6E56', lbl: 'Instalado' },
    mantenimiento: { bg: '#FAEEDA', tx: '#854F0B', lbl: 'Mantenimiento' },
    pendiente: { bg: '#FAEEDA', tx: '#854F0B', lbl: 'Pendiente' },
    en_progreso: { bg: '#E6F1FB', tx: '#185FA5', lbl: 'En progreso' },
    completado: { bg: '#EAF3DE', tx: '#3B6D11', lbl: 'Completado' },
    STOCK: { bg: '#EAF3DE', tx: '#3B6D11', lbl: 'Stock' },
    TERRENO: { bg: '#E6F1FB', tx: '#185FA5', lbl: 'En terreno' },
    CONSUMO: { bg: '#FAEEDA', tx: '#854F0B', lbl: 'Consumo' },
    DEVUELTO: { bg: '#E1F5EE', tx: '#0F6E56', lbl: 'Devuelto' },
    TRANSFERENCIA_BODEGA: { bg: '#FAEEDA', tx: '#854F0B', lbl: 'Transferencia' },
    ENTRADA: { bg: '#EAF3DE', tx: '#3B6D11', lbl: 'Entrada' },
    SALIDA: { bg: '#FCEBEB', tx: '#A32D2D', lbl: 'Salida' },
    ASIGNACION_OT: { bg: '#E6F1FB', tx: '#185FA5', lbl: 'Asig. OT' },
    activo: { bg: '#EAF3DE', tx: '#3B6D11', lbl: 'Activa' },
    inactivo: { bg: '#F1EFE8', tx: '#5F5E5A', lbl: 'Inactiva' },
};

function Bdg({ v }) {
    const s = BADGE[v] || { bg: '#F1EFE8', tx: '#5F5E5A', lbl: v };
    return React.createElement('span', { style: { background: s.bg, color: s.tx, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' } }, s.lbl);
}

function Btn({ children, onClick, small, secondary, disabled, loading }) {
    return React.createElement('button', {
        onClick, disabled: disabled || loading,
        style: {
            padding: small ? '5px 10px' : '7px 14px', fontSize: small ? 12 : 13, fontWeight: 500, borderRadius: 6,
            border: secondary ? '1px solid var(--border)' : '1px solid var(--amber-mid)',
            background: secondary ? 'transparent' : 'var(--amber-light)',
            color: secondary ? 'var(--text-primary)' : 'var(--amber-dark)',
            opacity: (disabled || loading) ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: 4
        }
    }, loading
        ? [React.createElement('i', { key: 'sp', className: 'ti ti-loader spin', style: { fontSize: small ? 12 : 14 } }), ' Guardando...']
        : children
    );
}

function Alert({ type, msg, onClose }) {
    const styles = {
        success: { bg: '#EAF3DE', bd: '#639922', tx: '#3B6D11', icon: 'ti-check' },
        error: { bg: '#FCEBEB', bd: '#A32D2D', tx: '#A32D2D', icon: 'ti-alert-circle' },
    };
    const s = styles[type] || styles.error;
    return React.createElement('div', { style: { padding: '10px 14px', borderRadius: 8, background: s.bg, border: '1px solid ' + s.bd, color: s.tx, marginBottom: '1rem', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 } },
        React.createElement('i', { className: 'ti ' + s.icon, style: { fontSize: 15 }, 'aria-hidden': 'true' }),
        React.createElement('span', { style: { flex: 1 } }, msg),
        onClose && React.createElement('button', { onClick: onClose, style: { background: 'none', border: 'none', cursor: 'pointer', color: s.tx, fontSize: 16, lineHeight: 1, padding: 0 } }, '×')
    );
}

const NAV = [
    { id: 'dashboard', icon: 'ti-dashboard', label: 'Dashboard' },
    { id: 'inventario', icon: 'ti-package', label: 'Inventario' },
    { id: 'ot-dashboard', icon: 'ti-file-invoice', label: 'Dashboard OT' },
    { id: 'asignacion', icon: 'ti-truck-delivery', label: 'Entrega a Técnico' },
    { id: 'devolucion', icon: 'ti-rotate-clockwise-2', label: 'Devolución' },
    { id: 'reasignacion-ot', icon: 'ti-switch-horizontal', label: 'Reasignar OT' },
    { id: 'movimientos', icon: 'ti-history', label: 'Movimientos' },
    { id: 'bodegas', icon: 'ti-building-warehouse', label: 'Bodegas' },
    { id: 'ot', icon: 'ti-file-invoice', label: 'Órdenes de Trabajo' },
    { id: 'carga-masiva', icon: 'ti-upload', label: 'Carga Masiva' }
];

function Sidebar({ view, setView }) {
    return React.createElement('aside', { style: { width: 220, flexShrink: 0, background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 } },
        React.createElement('div', { style: { padding: '1.25rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 } },
            React.createElement('div', { style: { width: 32, height: 32, borderRadius: 8, background: 'var(--amber-light)', border: '1px solid var(--amber-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } },
                React.createElement('i', { className: 'ti ti-home', style: { fontSize: 18, color: 'var(--amber)' }, 'aria-hidden': 'true' })
            ),
            React.createElement('div', null,
                React.createElement('p', { style: { margin: 0, fontWeight: 500, fontSize: 14 } }, 'BodegaOps'),
                React.createElement('p', { style: { margin: 0, fontSize: 11, color: 'var(--text-secondary)' } }, 'Multi-bodega')
            )
        ),
        React.createElement('nav', { style: { padding: '0.75rem', flex: 1 } },
            NAV.map(item => React.createElement('button', {
                key: item.id, onClick: () => setView(item.id),
                style: {
                    width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                    background: view === item.id ? 'var(--amber-light)' : 'transparent',
                    color: view === item.id ? 'var(--amber)' : 'var(--text-secondary)',
                    fontWeight: view === item.id ? 500 : 400, fontSize: 13, marginBottom: 2
                }
            },
                React.createElement('i', { className: 'ti ' + item.icon, style: { fontSize: 17 }, 'aria-hidden': 'true' }),
                item.label
            ))
        ),
        React.createElement('div', { style: { padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 } },
            React.createElement('i', { className: 'ti ti-circle-check', style: { fontSize: 13, color: '#3B6D11' }, 'aria-hidden': 'true' }),
            'Conectado · ', React.createElement('code', { style: { fontSize: 10 } }, 'localhost:3000')
        )
    );
}

function ErrorConexion({ onRetry }) {
    const apiBase = typeof API_BASE !== 'undefined' ? API_BASE : 'http://localhost:3001';
    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16, padding: '2rem', textAlign: 'center' } },
        React.createElement('i', { className: 'ti ti-wifi-off', style: { fontSize: 48, color: 'var(--text-secondary)' }, 'aria-hidden': 'true' }),
        React.createElement('p', { style: { fontWeight: 500, fontSize: 16 } }, 'No se pudo conectar al servidor'),
        React.createElement('p', { style: { color: 'var(--text-secondary)', fontSize: 13, maxWidth: 440, lineHeight: 1.6 } },
            'Verifica que el API esté corriendo en ',
            React.createElement('code', { style: { background: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: 4 } }, apiBase),
            ' y que tenga CORS habilitado.'
        ),
        React.createElement('div', { style: { background: '#1e1e1e', color: '#d4d4d4', padding: '12px 18px', borderRadius: 8, fontSize: 12, textAlign: 'left', fontFamily: 'monospace', lineHeight: 1.8 } },
            React.createElement('div', null, '# Agrega esto a tu index.js:'),
            React.createElement('div', { style: { color: '#9cdcfe' } }, "npm install cors"),
            React.createElement('div', null, React.createElement('span', { style: { color: '#c586c0' } }, 'const '), 'cors = require(', React.createElement('span', { style: { color: '#ce9178' } }, "'cors'"), ');'),
            React.createElement('div', null, 'app.use(cors());')
        ),
        React.createElement('button', { onClick: onRetry, style: { padding: '8px 20px', borderRadius: 6, border: '1px solid var(--amber-mid)', background: 'var(--amber-light)', color: 'var(--amber-dark)', cursor: 'pointer', fontSize: 13, fontWeight: 500 } },
            'Reintentar'
        )
    );
}