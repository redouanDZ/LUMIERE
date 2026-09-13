const jwt = require('jsonwebtoken');
const { query } = require('../database/db');

if (!process.env.JWT_SECRET) {
    console.error('FATAL SECURITY ERROR: JWT_SECRET environment variable is missing. Server cannot start.');
    process.exit(1);
}

const getJwtSecret = () => process.env.JWT_SECRET;

const requireAdmin = async (req, res, next) => {
    try {
        const token = req.cookies?.lumiere_admin_token || req.headers['authorization']?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const decoded = jwt.verify(token, getJwtSecret());
        if (decoded.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied: Admin role required' });
        }

        const users = await query(
            "SELECT session_version FROM users WHERE id = ? AND role = 'admin'",
            [decoded.id]
        );
        if (users.length === 0 || Number(decoded.sessionVersion || 0) !== Number(users[0].session_version || 0)) {
            return res.status(403).json({ success: false, message: 'جلسة غير صالحة، يرجى تسجيل الدخول من جديد' });
        }

        req.user = decoded;
        return next();
    } catch (err) {
        return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
};

module.exports = { requireAdmin, getJwtSecret };
