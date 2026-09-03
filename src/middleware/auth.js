const jwt = require('jsonwebtoken');

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('FATAL SECURITY ERROR: JWT_SECRET must be defined in production environment variables.');
        }
        return 'dev_fallback_insecure_key_do_not_use_in_prod';
    }
    return secret;
};

const requireAdmin = (req, res, next) => {
    const token = req.cookies?.lumiere_admin_token || req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, getJwtSecret());
        if (decoded.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied: Admin role required' });
        }
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
};

module.exports = { requireAdmin, getJwtSecret };
