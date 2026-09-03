// Safe error handler that hides database internals in production
const errorHandler = (err, req, res, next) => {
    console.error('[API Error]:', err);

    const isProduction = process.env.NODE_ENV === 'production';
    const statusCode = err.status || err.statusCode || 500;

    res.status(statusCode).json({
        success: false,
        message: isProduction && statusCode === 500
            ? 'حدث خطأ داخلي في الخادم. يرجى المحاولة لاحقاً.'
            : err.message || 'Internal server error'
    });
};

module.exports = { errorHandler };
