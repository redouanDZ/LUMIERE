const jwt = require('jsonwebtoken');

const requireAdmin = (req, res, next) => {
    const token = req.cookies?.lumiere_admin_token || req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'lumiere_super_secret_jwt_key_2026_paris_luxury');
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
};

module.exports = { requireAdmin };
