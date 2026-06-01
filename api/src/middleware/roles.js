const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const bearer = req.headers.authorization;

    if (!bearer) {
        return res.status(401).json({ error: 'Token requerido' });
    }

    const token = bearer.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded; // <- importante
        next();

    } catch (err) {
        return res.status(403).json({ error: 'Token inválido' });
    }
};

module.exports = verifyToken;