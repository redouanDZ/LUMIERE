require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { initSchema } = require('./src/database/db');
const { apiLimiter } = require('./src/middleware/rateLimiter');
const { errorHandler } = require('./src/middleware/errorHandler');
const apiRoutes = require('./src/routes/api');

const app = express();
const PORT = process.env.PORT || 4000;

// Security Middlewares
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://accounts.google.com/gsi/client"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https://*.googleusercontent.com"],
            connectSrc: ["'self'", "https://accounts.google.com", "https://cdn.jsdelivr.net"],
            frameSrc: ["https://accounts.google.com"]
        }
    }
}));

// CORS Configuration: Restrict to explicit allowed origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
    : ['http://localhost:4000', 'http://127.0.0.1:4000'];

app.use(cors({
    origin: (origin, callback) => {
        const publicUrl = process.env.PUBLIC_URL ? process.env.PUBLIC_URL.replace(/\/$/, '') : null;
        // Allow requests with no origin, matched origins, Render domains, or PUBLIC_URL
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.onrender.com') || origin === publicUrl) {
            return callback(null, true);
        }
        const error = new Error('Blocked by CORS policy: Origin not allowed');
        error.status = 403; // Return 403 instead of throwing a generic 500 error
        return callback(error);
    },
    credentials: true
}));

// Trust reverse proxy for accurate IP determination in rate-limiting (Render, Nginx, Cloudflare)
app.set('trust proxy', 1);

// Rate Limiter: 100 requests per 15 minutes
// Apply general API rate limiter
app.use('/api/', apiLimiter);

// Specific parser for base64 mobile image uploads (10MB limit)
app.use('/api/admin/upload-image', express.json({ limit: '10mb' }));
app.use('/api/admin/upload-image', express.urlencoded({ extended: true, limit: '10mb' }));

// General Parsers (support up to 500kb for general endpoints)
app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ extended: true, limit: '500kb' }));
app.use(cookieParser());

// Block sensitive paths explicitly to prevent database or source code exposure
app.use(['/data', '/src', '/scripts', '/tests', '/package.json', '/package-lock.json', '/Dockerfile', '/docker-compose.yml', '/render.yaml', '/SECURITY_NOTES.md'], (req, res) => {
    res.status(403).json({ success: false, message: 'Access denied: Restricted resource' });
});

// Serve ONLY authorized public static assets
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.get('/manifest.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'manifest.json'));
});

// API Routes
app.use('/api', apiRoutes);
// Cloud Health Check Endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        service: 'LUMIÈRE Botanics Cloud Platform'
    });
});


// Root Fallback
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Central Error Handler
app.use(errorHandler);

// Initialize Database and Start Server (only when run directly)
if (require.main === module) {
    initSchema().then(() => {
        app.listen(PORT, () => {
            console.log(`
        =====================================================
        ✨ LUMIÈRE BOTANICS PARIS — Full-Stack Server Running!
        📍 URL: http://localhost:${PORT}
        📊 Admin Portal: http://localhost:${PORT}/admin/index.html
        🔐 API Endpoints: http://localhost:${PORT}/api/products
        =====================================================
        `);
        });
    }).catch(err => {
        console.error('Failed to initialize database schema:', err);
    });
}

module.exports = app;
