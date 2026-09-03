// =================================================================
// STORE CONFIGURATION & BRANDING (EXTENSIBLE ARCHITECTURE)
// Designed for Single-Tenant out of the box, with full abstraction
// to support dynamic multi-tenant / SaaS lookups in the future.
// =================================================================

const getDefaultConfig = () => ({
    brand: {
        nameAr: process.env.STORE_NAME_AR || 'لوميير باريس',
        nameEn: process.env.STORE_NAME_EN || 'LUMIÈRE Paris',
        taglineAr: process.env.STORE_TAGLINE_AR || 'مستحضرات عناية فائقة النقاء وطقوس إشراقة فرنسية',
        taglineEn: process.env.STORE_TAGLINE_EN || 'Ultra-pure botanical organic skincare & radiance rituals',
        logoText: process.env.STORE_LOGO_TEXT || 'LUMIÈRE',
        logoSub: process.env.STORE_LOGO_SUB || 'BOTANICS • PARIS',
        primaryColor: process.env.STORE_PRIMARY_COLOR || '#C5A059'
    },
    localization: {
        defaultCurrency: process.env.DEFAULT_CURRENCY || 'SAR',
        supportedCurrencies: ['SAR', 'AED', 'USD', 'EUR', 'KWD', 'DZD'],
        defaultLanguage: process.env.DEFAULT_LANGUAGE || 'ar'
    },
    contact: {
        supportEmail: process.env.SUPPORT_EMAIL || 'support@yourdomain.com',
        whatsappNumber: process.env.SUPPORT_WHATSAPP || '+966500000000',
        whatsappWelcomeMsgAr: process.env.WHATSAPP_MSG_AR || 'مرحباً، أود الاستفسار عن منتجات المتجر 🌸'
    },
    shipping: {
        freeShippingThresholdSar: parseInt(process.env.FREE_SHIPPING_THRESHOLD_SAR, 10) || 200,
        estimatedDeliveryGulfDays: process.env.ESTIMATED_DELIVERY_DAYS || '2-4'
    }
});

/**
 * Retrieves the store configuration.
 * Currently reads from environment variables.
 * Designed with a tenantId parameter to allow seamless migration
 * to a multi-tenant DB/cache lookup in future SaaS expansions.
 *
 * @param {string|null} tenantId - Optional identifier for future multi-tenant routing.
 * @returns {object} Store configuration object.
 */
const getStoreConfig = (tenantId = null) => {
    // If future SaaS multi-tenancy is active, lookup tenant-specific config here:
    // if (tenantId) return await fetchTenantConfigFromDb(tenantId);

    return getDefaultConfig();
};

module.exports = {
    getStoreConfig
};
