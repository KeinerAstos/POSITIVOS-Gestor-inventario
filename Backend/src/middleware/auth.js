const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET || 'mi_secreto_super_seguro';

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
  try {
    const verified = jwt.verify(token, SECRET_KEY);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Token inválido' });
  }
};

module.exports = { verifyToken, SECRET_KEY };