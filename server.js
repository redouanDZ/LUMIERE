require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { initSchema } = require('./src/database/db');
const apiRoutes = require('./src/routes/api');

const app = express();
const PORT = process.env.PORT || 4000;

// Security Middlewares
app.use(helmet({
    contentSecurityPolicy: false // Allows luxury external google fonts & assets
}));
app.use(cors({
    origin: true,
    credentials: true
}));

// Rate Limiter: 100 requests per 15 minutes
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 150,
    message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve Static Frontend files
app.use(express.static(path.join(__dirname)));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

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

// Initialize Database and Start Server
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
