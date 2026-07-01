require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const { verifyToken } = require('./middleware/auth');

const app = express();

// ── DEBUG TEMPORAL ─────────────────────────────────
const routesToCheck = [
  ['./routes/bodegas',     'bodegas'],
  ['./routes/inventario',  'inventario'],
  ['./routes/movimientos', 'movimientos'],
  ['./routes/ot',          'ot'],
  ['./routes/usuarios',    'usuarios'],
  ['./routes/materiales',  'materiales'],
  ['./routes/auth',        'auth'],
  ['./routes/actas-qa',    'actas-qa'],
  ['./routes/salidas',     'salidas'],
];
routesToCheck.forEach(([path, name]) => {
  const mod = require(path);
  console.log(`[${name}] tipo: ${typeof mod}, esRouter: ${typeof mod === 'function'}`);
});
// ── FIN DEBUG ───────────────────────────────────────

const authRoutes = require('./routes/auth');
const actasQaRoutes = require('./routes/actas-qa');

// middlewares
app.use(cors());
app.use(express.json());

const salidasRouter = require('./routes/salidas');
app.use('/api/salidas', verifyToken, salidasRouter); // ✅ ahora verifyToken existe

const consumosRoutes = require('./routes/consumos');
app.use('/api/consumos', consumosRoutes);

// ── Rutas ────────────────────────────────────────────
app.use('/api/bodegas', require('./routes/bodegas'));
app.use('/api/inventario', require('./routes/inventario'));
app.use('/api/movimientos', require('./routes/movimientos'));
app.use('/api/ot', require('./routes/ot'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/materiales', require('./routes/materiales'));
app.use('/api/auth', authRoutes);
app.use('/api/actas-qa', actasQaRoutes);

// ── Health check ─────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// ── 404 ──────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// ── Error handler global ─────────────────────────────
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`🚀 API corriendo en http://localhost:${PORT}`);
});