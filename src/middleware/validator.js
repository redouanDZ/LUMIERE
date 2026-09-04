// Robust HTML character escaping to prevent XSS
const escapeHtml = (str) => {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

// Strips HTML tags and trims whitespace safely
const sanitizeString = (str) => {
    if (typeof str !== 'string') return '';
    return escapeHtml(str.trim().replace(/<[^>]*>?/gm, ''));
};

const validateOrderInput = (req, res, next) => {
    let { name, phone, country, city, address, paymentMethod, currency, items } = req.body;

    name = sanitizeString(name);
    phone = typeof phone === 'string' ? phone.trim() : '';
    country = sanitizeString(country);
    city = sanitizeString(city);
    address = sanitizeString(address);
    paymentMethod = sanitizeString(paymentMethod);
    currency = sanitizeString(currency) || 'SAR';

    if (!name || name.length < 2 || name.length > 100) {
        return res.status(400).json({ success: false, message: 'الاسم يجب أن يتراوح بين حرفين و 100 حرف' });
    }

    // Phone validation: allows digits, +, spaces, hyphens; must contain 8-16 digits
    const digitsOnly = phone.replace(/[^0-9]/g, '');
    if (digitsOnly.length < 8 || digitsOnly.length > 16) {
        return res.status(400).json({ success: false, message: 'صيغة رقم الهاتف غير صالحة' });
    }
    const cleanPhone = phone.startsWith('+') ? '+' + digitsOnly : digitsOnly;

    if (!country || country.length > 60) {
        return res.status(400).json({ success: false, message: 'الدولة مطلوبة' });
    }
    if (!city || city.length > 60) {
        return res.status(400).json({ success: false, message: 'المدينة مطلوبة' });
    }
    if (!address || address.length < 3 || address.length > 255) {
        return res.status(400).json({ success: false, message: 'العنوان التفصيلي مطلوب' });
    }

    // Supported currencies
    const allowedCurrencies = ['SAR', 'AED', 'USD', 'EUR', 'KWD', 'DZD'];
    if (!allowedCurrencies.includes(currency)) {
        currency = 'SAR';
    }

    // Validate Items array
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'سلة المشتريات فارغة' });
    }
    if (items.length > 50) {
        return res.status(400).json({ success: false, message: 'عدد المنتجات في السلة يتجاوز الحد المسموح' });
    }

    const validatedItems = [];
    for (const item of items) {
        if (!item || typeof item !== 'object' || typeof item.id !== 'string') {
            return res.status(400).json({ success: false, message: 'بيانات المنتج في السلة غير صالحة' });
        }
        const cleanId = sanitizeString(item.id);
        const qty = parseInt(item.qty, 10);
        if (isNaN(qty) || qty < 1 || qty > 20) {
            return res.status(400).json({ success: false, message: 'كمية المنتج يجب أن تتراوح بين 1 و 20 قطعة' });
        }
        validatedItems.push({ id: cleanId, qty });
    }

    req.sanitizedOrder = {
        name,
        phone: cleanPhone,
        country,
        city,
        address,
        paymentMethod: paymentMethod || 'cod',
        currency,
        items: validatedItems
    };

    next();
};

module.exports = { validateOrderInput, sanitizeString, escapeHtml };
