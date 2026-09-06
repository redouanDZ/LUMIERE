const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
    console.error('FATAL SECURITY ERROR: JWT_SECRET environment variable is missing. Server cannot start.');
    process.exit(1);
}

const getJwtSecret = () => process.env.JWT_SECRET;

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
