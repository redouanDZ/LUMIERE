const sanitizeString = (str) => {
    if (typeof str !== 'string') return '';
    return str.trim().replace(/<[^>]*>?/gm, ''); // strip HTML tags
};

const validateOrderInput = (req, res, next) => {
    let { name, phone, country, city, address, paymentMethod, currency, items } = req.body;

    name = sanitizeString(name);
    phone = sanitizeString(phone);
    country = sanitizeString(country);
    city = sanitizeString(city);
    address = sanitizeString(address);
    paymentMethod = sanitizeString(paymentMethod);
    currency = sanitizeString(currency) || 'SAR';

    if (!name || name.length < 3) {
        return res.status(400).json({ success: false, message: 'Name must be at least 3 characters' });
    }

    // Phone validation: matches Gulf (+966, +971, +965, etc.) and international numbers
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (cleanPhone.length < 8 || cleanPhone.length > 16) {
        return res.status(400).json({ success: false, message: 'Invalid phone number format' });
    }

    if (!country || !city || !address) {
        return res.status(400).json({ success: false, message: 'Complete delivery address is required' });
    }

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Cart items cannot be empty' });
    }

    req.sanitizedOrder = {
        name,
        phone: cleanPhone,
        country,
        city,
        address,
        paymentMethod: paymentMethod || 'cod',
        currency,
        items
    };

    next();
};

module.exports = { validateOrderInput, sanitizeString };
