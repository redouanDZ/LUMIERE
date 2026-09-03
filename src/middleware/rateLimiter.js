const rateLimit = require('express-rate-limit');

// Strict limiter for authentication (Brute-force protection)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per 15 min per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'تم تجاوز الحد المسموح به لمحاولات الدخول. يرجى المحاولة بعد 15 دقيقة.'
    }
});

// Order submission limiter (Anti-spam / Anti-fraud)
const orderLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15, // 15 orders per 15 min per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'تم تجاوز الحد المسموح لإنشاء الطلبات. يرجى الانتظار قليلاً.'
    }
});

// General public API limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests, please try again later.'
    }
});

module.exports = {
    authLimiter,
    orderLimiter,
    apiLimiter
};
