const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'mi_secreto_super_seguro';

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: 'Sesión no iniciada. Token no proporcionado.'
    });
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      error: 'Formato de token inválido.'
    });
  }

  const token = parts[1];

  try {
    const verified = jwt.verify(token, SECRET_KEY);
    req.user = verified;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Sesión vencida o token inválido. Inicia sesión nuevamente.'
    });
  }
};

module.exports = { verifyToken, SECRET_KEY };