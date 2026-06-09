require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { verifyToken } = require('./middleware/auth');

const app = express();


const authRoutes = require('./routes/auth');
const actasQaRoutes = require('./routes/actas-qa');

// middlewares
app.use(cors());
app.use(express.json());

const salidasRouter = require('./routes/salidas');
app.use('/api/salidas', verifyToken, salidasRouter);

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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 API corriendo en http://localhost:${PORT}`);
});