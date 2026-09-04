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
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"]
        }
    }
}));

// CORS Configuration: Restrict to explicit allowed origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
    : ['http://localhost:4000', 'http://127.0.0.1:4000'];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, server-to-server, curl) or matched origins
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Blocked by CORS policy: Origin not allowed'));
    },
    credentials: true
}));

// Trust reverse proxy for accurate IP determination in rate-limiting (Render, Nginx, Cloudflare)
app.set('trust proxy', 1);

// Rate Limiter: 100 requests per 15 minutes
// Apply general API rate limiter
app.use('/api/', apiLimiter);

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
