/**
 * LUMIÈRE BOTANICS — Flagship Skincare & Beauty Engine
 * 6 Products, Category Filters, Quick View Modal, Clinical Tabs, Coupon Engine, Social Proof Toasts
 */

const CURRENCIES = {
    SAR: { rate: 3.75, symbol: 'ر.س', prefix: false },
    AED: { rate: 3.67, symbol: 'د.إ', prefix: false },
    USD: { rate: 1.0, symbol: '$', prefix: true },
    EUR: { rate: 0.92, symbol: '€', prefix: true },
    KWD: { rate: 0.31, symbol: 'د.ك', prefix: false },
    DZD: { rate: 220, symbol: 'د.ج', prefix: false }
};

const PRODUCTS = [
    {
        id: 'serum',
        categoryKey: 'serums',
        title: {
            ar: 'سيروم إكسير النضارة الفائق',
            en: 'Radiance Elixir Vitamin C & HA Serum'
        },
        category: {
            ar: 'عناية مركزة وإشراقة',
            en: 'Radiance & Brightening'
        },
        desc: {
            ar: 'تركيبة نقية تجمع بين فيتامين C الثابت وحمض الهيالورونيك الثلاثي ومستخلصات الورد العضوي لإشراقة فورية وتوحيد لون البشرة.',
            en: 'Pure botanical formula combining stabilized Vitamin C, Triple Hyaluronic Acid, and organic rose extracts for immediate luminous radiance.'
        },
        benefits: {
            ar: '• يقلل التصبغات والبقع الداكنة بنسبة 45%\n• يعزز إشراقة ونضارة البشرة خلال 7 أيام\n• ترطيب مكثف يملأ الخطوط الدقيقة',
            en: '• Reduces dark spots and pigmentation by 45%\n• Restores radiant, healthy glow in 7 days\n• Plumps fine lines with multi-depth hydration'
        },
        usage: {
            ar: 'ضعي 3-4 قطرات صباحاً ومساءً على بشرة نظيفة قبل الكريم المرطب، مع تدليك لطيف بحركات تصاعدية.',
            en: 'Apply 3-4 drops morning and night to cleansed skin before moisturizing. Gently massage upward.'
        },
        ingredients: '15% Stabilized Vitamin C, Pure Triple Hyaluronic Acid, Organic Damask Rose Water, Ferulic Acid, Botanical Squalane.',
        basePriceUsd: 48,
        originalPriceUsd: 65,
        rating: '4.95',
        reviews: 342,
        image: 'images/serum.jpg',
        badge: { ar: 'الأكثر مبيعاً', en: 'Best Seller' }
    },
    {
        id: 'cream',
        categoryKey: 'creams',
        title: {
            ar: 'كريم الببتيدات لتجديد وترميم البشرة',
            en: 'Peptide Rejuvenating Night Cream'
        },
        category: {
            ar: 'ترميم ومقاومة علامات التقدم',
            en: 'Anti-Aging & Restoration'
        },
        desc: {
            ar: 'كريم ليلي مخملي غني بالببتيدات المعززة للكولاجين وزهر الياسمين لشد البشرة ومحاربة الخطوط الدقيقة أثناء النوم.',
            en: 'Velvety night cream powered by collagen-boosting peptides and jasmine essence to firm, plump, and smooth fine lines overnight.'
        },
        benefits: {
            ar: '• يحفز إنتاج الكولاجين الطبيعي بنسبة 60%\n• يمنح مرونة وملمساً حريرياً فائق النعومة\n• يرمم حاجز البشرة الواقي طوال الليل',
            en: '• Boosts natural collagen synthesis by up to 60%\n• Delivers supreme elasticity and velvet-soft texture\n• Restores the epidermal barrier overnight'
        },
        usage: {
            ar: 'يدلك بلطف على الوجه والرقبة كل ليلة كخطوة أخيرة في روتينك الليلي.',
            en: 'Gently massage onto face and neck every night as the final restorative step.'
        },
        ingredients: 'Hexapeptide Complex, Organic Jasmine Flower Extract, Shea Butter, Ceramides NP, Vegan Collagen.',
        basePriceUsd: 54,
        originalPriceUsd: 72,
        rating: '4.92',
        reviews: 284,
        image: 'images/cream.jpg',
        badge: { ar: 'جائزة النقاء 2026', en: 'Award Winner' }
    },
    {
        id: 'eye_cream',
        categoryKey: 'creams',
        title: {
            ar: 'كريم محيط العين بالببتيدات والكافيين',
            en: 'Eye Contour Peptide Firming Cream'
        },
        category: {
            ar: 'عناية فائقة بمحيط العين',
            en: 'Eye & Lip Care'
        },
        desc: {
            ar: 'تركيبة متقدمة تستهدف الهالات السوداء والانتفاخات وتشد الجفون العلوية بمزيج الكافيين المركز ومستخلص الشاي الأبيض.',
            en: 'Targeted luxury treatment designed to visibly diminish dark circles, deflate puffiness, and smooth delicate eye contours.'
        },
        benefits: {
            ar: '• تفتيح فوري لمنطقة تحت العين بنسبة 35%\n• إزالة الانتفاخ والإجهاد الصباحي بفضل الكافيين\n• حماية المنطقة الرقيقة من الجفاف والتجاعيد',
            en: '• Instantly brightens under-eye shadows by 35%\n• Depuffs morning tiredness with bio-caffeine\n• Protects fragile eye skin from micro-creasing'
        },
        usage: {
            ar: 'يطبق بلطف بطرف الإصبع بحركات نقر خفيفة حول عظم العين صباحاً ومساءً.',
            en: 'Pat gently around orbital bone morning and evening using your ring finger.'
        },
        ingredients: 'Green Tea Caffeine, Matrixyl 3000, Vitamin K, White Peony Extract, Hyaluronic Microspheres.',
        basePriceUsd: 42,
        originalPriceUsd: 58,
        rating: '4.89',
        reviews: 219,
        image: 'images/eye_cream.jpg',
        badge: { ar: 'مفضل الخبراء', en: 'Dermatologist Pick' }
    },
    {
        id: 'cleanser',
        categoryKey: 'cleansers',
        title: {
            ar: 'غسول الوجه النباتي المهدئ والمنقي',
            en: 'Gentle Botanical Purifying Cleanser'
        },
        category: {
            ar: 'تنظيف عميق وترطيب',
            en: 'Hydrating Cleanser'
        },
        desc: {
            ar: 'مستحضر رغوي لطيف بخلاصة الصبار الطبيعي والشاي الأخضر وزيت شجرة الشاي لإزالة الشوائب دون تجريد البشرة.',
            en: 'Gentle foaming cleanser with organic aloe vera, green tea, and calming chamomile that dissolves impurities effortlessly.'
        },
        benefits: {
            ar: '• يزيل 99% من الأوساخ وبقايا المكياج والملوثات\n• يحافظ على درجة حموضة متوازنة pH 5.5\n• يهدئ الاحمرار والتهيج بفضل خلاصة البابونج',
            en: '• Removes 99% of impurities, excess sebum, and makeup\n• Balances skin microbiome at optimal pH 5.5\n• Calms irritation and redness with organic chamomile'
        },
        usage: {
            ar: 'يدلك على بشرة مبللة بحركات دائرية لمدة 60 ثانية ثم يشطف بالماء الفاتر.',
            en: 'Massage onto damp skin for 60 seconds, then rinse with lukewarm water.'
        },
        ingredients: 'Aloe Barbadensis Leaf Juice, Camellia Sinensis (Green Tea), Chamomile Extract, Coconut Amino Acids.',
        basePriceUsd: 36,
        originalPriceUsd: 45,
        rating: '4.88',
        reviews: 194,
        image: 'images/cleanser.jpg',
        badge: { ar: 'طبيعي 100%', en: '100% Organic' }
    },
    {
        id: 'toner',
        categoryKey: 'cleansers',
        title: {
            ar: 'تونر ماء الورد والنياسيناميد لشد المسام',
            en: 'Rosewater & Niacinamide Hydrating Toner'
        },
        category: {
            ar: 'توحيد لون وشد المسام',
            en: 'Toner & Essence'
        },
        desc: {
            ar: 'إكسير منعش يجمع بين مقطر الورد الدمشقي العضوي و 5% نياسيناميد لتضييق المسام الواسعة واستعادة الإشراقة الفورية.',
            en: 'Refreshing clarifying essence mist infused with pure organic rose floral water and 5% Niacinamide to tighten pores and revive dull skin.'
        },
        benefits: {
            ar: '• يقلل مظهر المسام الواسعة بنسبة 50%\n• يوازن إفراز الدهون ويمنح انتعاشاً يدوم طوال اليوم\n• يعزز امتصاص السيرومات والكريمات بنسبة الضعف',
            en: '• Minimizes enlarged pores by 50%\n• Balances oiliness while quenching deep dehydration\n• Doubles the absorption efficiency of serums'
        },
        usage: {
            ar: 'يرش مباشرة على الوجه أو يوضع على قطنة ويمسح به الوجه بعد الغسول مباشرة.',
            en: 'Mist directly over face or sweep with a cotton pad immediately after cleansing.'
        },
        ingredients: '100% Organic Rosa Damascena Hydrosol, 5% Niacinamide (Vitamin B3), Glycerin, Witch Hazel, Rosehip Extract.',
        basePriceUsd: 34,
        originalPriceUsd: 46,
        rating: '4.91',
        reviews: 168,
        image: 'images/toner.jpg',
        badge: { ar: 'جديد ومميز', en: 'New Arrival' }
    },
    {
        id: 'mask',
        categoryKey: 'cleansers',
        title: {
            ar: 'قناع الطمي الوردي الفرنسي للتنقية والديتوكس',
            en: 'French Pink Clay Pore Detox Mask'
        },
        category: {
            ar: 'ديتوكس وتنقية عميقة',
            en: 'Detox & Spa Mask'
        },
        desc: {
            ar: 'قناع السبا الفاخر من الطمي الوردي الفرنسي واللافندر وزيت الورد لتنقية المسام من الأعماق وتقشير الخلايا الميتة بلطف.',
            en: 'Luxurious spa clay treatment crafted with authentic French pink montmorillonite clay to detoxify pores and unveil a glowing complexion.'
        },
        benefits: {
            ar: '• يسحب السموم والدهون الزائدة بدون أن يجفف البشرة\n• يمنح ملمساً حريرياً موحداً ولوناً وردياً جذاباً\n• كافي لـ 20 جلسة عناية منزلية فاخرة',
            en: '• Draws out micro-pollutants and impurities without stripping\n• Leaves skin radiant, ultra-soft and gently refined\n• 20+ luxurious Parisian home spa sessions'
        },
        usage: {
            ar: 'يوزع بطبقة متساوية بفرشاة أو ملعقة، يترك لمدة 10-12 دقيقة، ثم يشطف بالماء الفاتر.',
            en: 'Apply an even layer, relax for 10-12 minutes, then gently rinse with warm water.'
        },
        ingredients: 'French Pink Kaolin Clay, Organic Rose Petal Powder, Lavender Flower Oil, Witch Hazel, Jojoba Esters.',
        basePriceUsd: 39,
        originalPriceUsd: 52,
        rating: '4.94',
        reviews: 227,
        image: 'images/mask.jpg',
        badge: { ar: 'أعلى تقييم', en: 'Top Rated' }
    }
];

const TRANSLATIONS = {
    ar: {
        announcement: '✨ عرض حصري: شحن سريع مجاني لجميع دول الخليج والعالم للطلبات فوق 200 ريال',
        navAll: 'جميع المستحضرات',
        navSerums: 'السيرومات',
        navCreams: 'الكريمات والترميم',
        navCleansers: 'التنظيف والأقنعة',
        navBundle: 'مجموعة النضارة',
        heroTag: 'العناية الباريسية الفاخرة',
        heroTitle: 'سر النضارة والإشراقة الخالدة لبشرتك',
        heroDesc: 'مستحضرات عناية طبيعية 100% مصممة بأعلى معايير النقاء السريري لتمنح بشرتك حيوية متجددة وملمساً ناعماً كالحرير.',
        btnDiscover: 'اكتشف المجموعة',
        btnBuyNow: 'تسوق الآن',
        trust1Title: 'عضوي ونباتي 100%',
        trust1Desc: 'مكونات نقية معتمدة دولياً',
        trust2Title: 'شحن خليجي سريع',
        trust2Desc: 'توصيل لباب المنزل خلال 48 ساعة',
        trust3Title: 'دفع آمن أو عند الاستلام',
        trust3Desc: 'Apple Pay، مدى، فيزا، و COD',
        trust4Title: 'مضمون طبياً وجلدياً',
        trust4Desc: 'مختبر سريرياً ومناسب للبشرة الحساسة',
        clinTitle: 'نتائج سريرية مثبتة تثق بها آلاف النساء',
        stat1Num: '96%',
        stat1Label: 'لاحظن نضارة وإشراقة فورية خلال 7 أيام',
        stat2Num: '91%',
        stat2Label: 'انخفاض في مظهر التجاعيد والخطوط الدقيقة',
        stat3Num: '98%',
        stat3Label: 'ترطيب عميق وحماية تدوم 24 ساعة',
        filterAll: 'الكل (6)',
        filterSerums: 'السيرومات الفعالة',
        filterCreams: 'الكريمات والترميم',
        filterCleansers: 'التنظيف والتونر',
        productsTag: 'المجموعة الحصرية',
        productsTitle: 'مستحضرات النضارة الأكثر طلباً',
        btnAddCart: 'أضف للسلة',
        btnFastBuy: 'شراء سريع',
        ritualTag: 'روتين العناية اليومي',
        ritualTitle: 'طقوس الإشراقة في 4 خطوات بسيطة',
        step1Title: '1. التنظيف العميق',
        step1Desc: 'غسول نباتي ينقي المسام بلطف دون تجريد الزيوت الطبيعية.',
        step2Title: '2. شد المسام والانتعاش',
        step2Desc: 'تونر الورد والنياسيناميد يوازن الإفرازات ويهيئ البشرة.',
        step3Title: '3. التغذية والإشراقة',
        step3Desc: 'سيروم فيتامين C الثابت لتفتيح وتوحيد لون البشرة.',
        step4Title: '4. الترميم والحماية',
        step4Desc: 'كريم الببتيدات الليلي لشد البشرة ومحاربة علامات التقدم.',
        bundleTag: 'عرض التوفير الأكبر',
        bundleTitle: 'مجموعة طقوس الإشراقة الكاملة (The Glow Ritual Set)',
        bundleDesc: 'احصلي على الثلاثي الذهبي الأكثر طلباً: الغسول + سيروم النضارة + كريم الببتيدات بخصم استثنائي 30% مع شحن مجاني وحقيبة هدايا فاخرة.',
        bundleFeat1: 'توفير 30% مقارنة بشراء كل منتج منفرداً',
        bundleFeat2: 'روتين صباحي ومسائي متكامل للوجه والعنق',
        bundleFeat3: 'نتائج ملحوظة ونضارة مضاعفة خلال 7 أيام',
        bundleBuy: 'اطلب المجموعة كاملة الآن بخصم 30%',
        revTitle: 'تجارب وآراء عميلاتنا في الخليج والعالم',
        rev1Text: '«استخدمت سيروم النضارة وكريم الببتيدات منذ شهر، النتيجة سحرية! خفت التصبغات ووجهي أصبح مشرقاً بدون مكياج. أفضل استثمار لبشرتي!»',
        rev1Author: 'سارة العتيبي — الرياض 🇸🇦',
        rev2Text: '«التوصيل كان سريعاً جداً لدبي (خلال 48 ساعة فقط)، والتغليف فخم وراقي جداً. غسول الوجه وقناع الطمي الوردي مذهلان للبشرة الحساسة.»',
        rev2Author: 'مريم الشامسي — دبي 🇦🇪',
        rev3Text: '«منتجات حقيقية بمستوى البراندات الباريسية العالمية ولكن بسعر ممتاز. كريم محيط العين خفف الهالات بشكل ملحوظ في أسبوعين فقط.»',
        rev3Author: 'د. ليلى المنصور — الكويت 🇰🇼',
        faqTag: 'الأسئلة الشائعة',
        faqTitle: 'كل ما تحتاجين معرفته عن LUMIÈRE',
        faq1Q: 'هل المنتجات مناسبة للحوامل وللبشرة الحساسة؟',
        faq1A: 'نعم بكل تأكيد! جميع مستحضراتنا نباتية 100%، خالية تماماً من البارابين والعطور الاصطناعية والكحول والمواد الكيميائية القاسية، ومختبرة سريرياً تحت إشراف أطباء الجلدية.',
        faq2Q: 'كم تستغرق مدة الشحن لدول الخليج؟',
        faq2A: 'يتم شحن الطلبات عبر خدمة الشحن السريع الجوي (Aramex / DHL) وتصل لباب منزلك خلال 24 إلى 48 ساعة في السعودية والإمارات والكويت وباقي دول الخليج.',
        faq3Q: 'ما هي سياسة الاسترجاع والضمان الذهبي؟',
        faq3A: 'نقدم ضمان الرضا الذهبي لمدة 30 يوماً. إذا لم تلاحظي فرقاً حقيقياً في نضارة ونعومة بشرتك، يمكنك استرجاع كامل المبلغ بكل سهولة.',
        cartTitle: 'حقيبة التسوق',
        cartEmpty: 'حقيبة التسوق فارغة حالياً.',
        cartTotal: 'المجموع الإجمالي:',
        btnCheckout: 'إتمام الطلب السريع ⚡',
        checkoutTitle: 'إتمام الطلب والشحن السريع',
        lblFullName: 'الاسم الكامل *',
        lblPhone: 'رقم الجوال (مع مفتاح الدولة) *',
        lblCountry: 'الدولة وموقع التوصيل *',
        lblCity: 'المدينة / المنطقة *',
        lblAddress: 'العنوان بالتفصيل *',
        lblPayment: 'طريقة الدفع المفضلة *',
        payCod: 'الدفع عند الاستلام (COD)',
        payCard: 'بطاقة بنكية / مدى / Apple Pay',
        btnConfirmOrder: 'تأكيد الطلب وشحن المنتجات فوراً 🛍️',
        btnWhatsAppOrder: 'تأكيد الطلب السريع عبر WhatsApp 💬',
        orderSuccess: 'تهانينا! تم استلام طلبك بنجاح وسيتواصل معك فريق الشحن خلال لحظات.'
    },
    en: {
        announcement: '✨ Exclusive: Free Express Shipping to Gulf & Worldwide on orders over $50',
        navAll: 'All Products',
        navSerums: 'Active Serums',
        navCreams: 'Creams & Eye',
        navCleansers: 'Cleansers & Masks',
        navBundle: 'The Ritual Set',
        heroTag: 'Parisian Clean Luxury',
        heroTitle: 'Timeless Radiance & Natural Skin Glow',
        heroDesc: 'Ultra-pure, dermatologist-backed botanical skincare formulated to deeply nourish, rejuvenate, and deliver glowing silk-soft skin.',
        btnDiscover: 'Explore Collection',
        btnBuyNow: 'Shop Now',
        trust1Title: '100% Vegan & Organic',
        trust1Desc: 'Certified pure botanical actives',
        trust2Title: 'Express 48h Delivery',
        trust2Desc: 'Direct to your doorstep',
        trust3Title: 'Cash on Delivery & Cards',
        trust3Desc: 'Apple Pay, Visa, Mastercard, COD',
        trust4Title: 'Dermatologist Approved',
        trust4Desc: 'Safe for sensitive skin types',
        clinTitle: 'Clinically Proven Results Trusted by Thousands',
        stat1Num: '96%',
        stat1Label: 'Observed visible luminous glow in 7 days',
        stat2Num: '91%',
        stat2Label: 'Reported smoothed fine lines and elasticity',
        stat3Num: '98%',
        stat3Label: 'Experienced deep 24-hour hydration barrier',
        filterAll: 'All Icons (6)',
        filterSerums: 'Active Serums',
        filterCreams: 'Creams & Eye Care',
        filterCleansers: 'Cleansers & Masks',
        productsTag: 'Curated Essentials',
        productsTitle: 'Our Signature Skincare Icons',
        btnAddCart: 'Add to Bag',
        btnFastBuy: 'Quick Buy',
        ritualTag: 'Daily Skincare Protocol',
        ritualTitle: 'The 4-Step Radiance Ritual',
        step1Title: '1. Purify & Cleanse',
        step1Desc: 'Gentle botanical foaming cleanser clears impurities while preserving pH 5.5.',
        step2Title: '2. Refine & Tone',
        step2Desc: 'Rosewater & Niacinamide mist tightens pores and primes for hydration.',
        step3Title: '3. Nourish & Illuminate',
        step3Desc: 'Pure Vitamin C & Hyaluronic serum delivers potent antioxidant brightness.',
        step4Title: '4. Restore & Lock',
        step4Desc: 'Peptide night cream rebuilds firmness and cellular repair overnight.',
        bundleTag: 'Signature Value Offer',
        bundleTitle: 'The Complete Glow Ritual Set',
        bundleDesc: 'Experience the ultimate transformation with our 3-step ritual: Purifying Cleanser + Radiance Elixir Serum + Rejuvenating Night Cream at an exclusive 30% OFF with complimentary gift bag.',
        bundleFeat1: 'Save 30% compared to purchasing individually',
        bundleFeat2: 'Complete morning & evening regenerative ritual',
        bundleFeat3: 'Clinically visible glow & hydration in 7 days',
        bundleBuy: 'Order The Complete Set at 30% OFF',
        revTitle: 'Verified Reviews from Women Across the World',
        rev1Text: '«I have been using the Radiance Serum and Peptide Cream for a month now. My hyperpigmentation has dramatically faded and my skin glows even without makeup!»',
        rev1Author: 'Sara Al-Otaibi — Riyadh 🇸🇦',
        rev2Text: '«Super fast 48h delivery to Dubai, and the packaging feels like pure Parisian royalty. The cleanser and pink clay mask are absolute holy grails for sensitive skin.»',
        rev2Author: 'Mariam Al-Shamsi — Dubai 🇦🇪',
        rev3Text: '«True luxury formulation on par with high-end Parisian cosmetic houses at an accessible price. The eye contour cream faded my dark circles within 2 weeks.»',
        rev3Author: 'Dr. Laila Al-Mansour — Kuwait 🇰🇼',
        faqTag: 'Frequently Asked Questions',
        faqTitle: 'Everything You Need to Know About LUMIÈRE',
        faq1Q: 'Are LUMIÈRE formulas safe during pregnancy and for sensitive skin?',
        faq1A: 'Yes, 100%! All our products are non-comedogenic, vegan, free of synthetic fragrances, parabens, sulfates, and harsh alcohols, clinically tested under dermatological control.',
        faq2Q: 'How long does express shipping take to Gulf countries?',
        faq2A: 'All orders are dispatched via express courier (Aramex/DHL) and arrive directly at your doorstep within 24 to 48 hours across KSA, UAE, Kuwait, and worldwide.',
        faq3Q: 'What is your 30-day Golden Satisfaction Guarantee?',
        faq3A: 'We proudly offer a risk-free 30-day trial. If your skin doesn’t look visibly more radiant, simply contact us for a full and prompt refund.',
        cartTitle: 'Your Shopping Bag',
        cartEmpty: 'Your shopping bag is currently empty.',
        cartTotal: 'Subtotal:',
        btnCheckout: 'Proceed to Fast Checkout ⚡',
        checkoutTitle: 'Express Checkout & Delivery',
        lblFullName: 'Full Name *',
        lblPhone: 'Mobile Phone Number *',
        lblCountry: 'Country / Delivery Region *',
        lblCity: 'City / Province *',
        lblAddress: 'Street Address *',
        lblPayment: 'Payment Method *',
        payCod: 'Cash on Delivery (COD)',
        payCard: 'Credit Card / Apple Pay / Mada',
        btnConfirmOrder: 'Confirm Order & Ship Now 🛍️',
        btnWhatsAppOrder: 'Quick Confirm via WhatsApp 💬',
        orderSuccess: 'Congratulations! Your order has been placed. Our concierge team will contact you shortly.'
    }
};

let currentLang = 'ar';
let currentCurrency = 'SAR';
let currentCategory = 'all';
let discountPercent = 0;
let appliedCouponCode = '';
let storeConfig = null;
let cart = [];

document.addEventListener('DOMContentLoaded', () => {
    initCart();
    renderProducts();
    updateTranslations();
    setupEventListeners();
    initSocialProof();
    loadStoreConfig();
    loadDynamicProducts();
});

async function loadStoreConfig() {
    try {
        const res = await fetch('/api/config');
        const data = await res.json();
        if (data.success && data.data) {
            storeConfig = data.data;
            updateFooterWhatsapp();
        }
    } catch (e) {
        console.warn('Config load fallback');
    }
}

function updateFooterWhatsapp() {
    const waNumber = storeConfig?.contact?.whatsappNumber || '+966500000000';
    const cleanNumber = waNumber.replace(/[^0-9]/g, '');
    const links = document.querySelectorAll('a[href*="wa.me"]');
    links.forEach(a => {
        if (!a.id || a.id !== 'btnWhatsAppCheckout') {
            a.href = `https://wa.me/${cleanNumber}`;
        }
    });
}

async function loadDynamicProducts() {
    try {
        const res = await fetch('/api/products');
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            const dbMap = {};
            data.data.forEach(dbP => {
                dbMap[dbP.id] = dbP;
            });
            PRODUCTS.forEach(p => {
                if (dbMap[p.id]) {
                    p.basePriceUsd = dbMap[p.id].price_usd;
                    p.originalPriceUsd = dbMap[p.id].original_price_usd || (dbMap[p.id].price_usd * 1.3);
                    p.stock = dbMap[p.id].stock;
                    if (dbMap[p.id].title_ar) p.title.ar = dbMap[p.id].title_ar;
                    if (dbMap[p.id].title_en) p.title.en = dbMap[p.id].title_en;
                    delete dbMap[p.id];
                }
            });
            Object.values(dbMap).forEach(newP => {
                PRODUCTS.push({
                    id: newP.id,
                    categoryKey: newP.category_key,
                    title: { ar: newP.title_ar, en: newP.title_en || newP.title_ar },
                    category: { ar: newP.category_ar || 'عناية فاخرة', en: newP.category_en || 'Luxury Care' },
                    desc: { ar: newP.desc_ar || '', en: newP.desc_en || newP.desc_ar || '' },
                    benefits: { ar: newP.benefits_ar || '', en: newP.benefits_en || '' },
                    usage: { ar: newP.usage_ar || '', en: newP.usage_en || '' },
                    ingredients: newP.ingredients || '',
                    basePriceUsd: newP.price_usd,
                    originalPriceUsd: newP.original_price_usd || (newP.price_usd * 1.3),
                    rating: newP.rating || '5.0',
                    reviews: newP.reviews_count || 0,
                    stock: newP.stock || 50,
                    image: newP.image || 'images/serum.jpg',
                    badge: { ar: newP.badge_ar || 'جديد', en: newP.badge_en || 'New' }
                });
            });
            renderProducts();
        }
    } catch (e) {
        console.warn('Dynamic products load fallback:', e);
    }
}

function formatPrice(usdPrice) {
    const cur = CURRENCIES[currentCurrency];
    const discountedUsd = usdPrice * (1 - (discountPercent / 100));
    const converted = Math.round(discountedUsd * cur.rate);
    if (cur.prefix) {
        return cur.symbol + converted;
    }
    return converted + ' ' + cur.symbol;
}

function renderProducts() {
    const container = document.getElementById('lumiereProductsGrid');
    if (!container) return;

    const filtered = currentCategory === 'all' 
        ? PRODUCTS 
        : PRODUCTS.filter(p => p.categoryKey === currentCategory);

    container.innerHTML = filtered.map(p => `
        <article class="product-card">
            <span class="badge-pill">${p.badge[currentLang]}</span>
            <div class="product-image-box" onclick="openQuickView('${p.id}')">
                <img src="${p.image}" alt="${p.title[currentLang]}" loading="lazy">
            </div>
            <span class="product-category">${p.category[currentLang]}</span>
            <h3 class="product-title" onclick="openQuickView('${p.id}')">${p.title[currentLang]}</h3>
            <div class="product-rating">
                ★★★★★ <span>${p.rating}</span>
                <span class="review-count">(${p.reviews})</span>
            </div>
            <p class="product-desc">${p.desc[currentLang]}</p>
            <div class="product-price-row">
                <div>
                    <span class="price-current">${formatPrice(p.basePriceUsd)}</span>
                    <span class="price-original">${formatPrice(p.originalPriceUsd)}</span>
                </div>
            </div>
            <div class="product-actions">
                <button class="btn-add-cart" onclick="addToCart('${p.id}')">
                    ${TRANSLATIONS[currentLang].btnAddCart}
                </button>
                <button class="btn-buy-fast" onclick="quickBuy('${p.id}')">
                    ${TRANSLATIONS[currentLang].btnFastBuy}
                </button>
            </div>
        </article>
    `).join('');

    const bundleCurrent = document.getElementById('bundlePriceCurrent');
    const bundleOriginal = document.getElementById('bundlePriceOriginal');
    if (bundleCurrent && bundleOriginal) {
        bundleCurrent.textContent = formatPrice(98);
        bundleOriginal.textContent = formatPrice(138);
    }
}

function filterCategory(cat) {
    currentCategory = cat;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-cat') === cat);
    });
    renderProducts();
}

function openQuickView(productId) {
    const p = PRODUCTS.find(prod => prod.id === productId);
    if (!p) return;

    const modal = document.getElementById('quickViewModal');
    if (!modal) return;

    document.getElementById('qvImage').src = p.image;
    document.getElementById('qvCategory').textContent = p.category[currentLang];
    document.getElementById('qvTitle').textContent = p.title[currentLang];
    document.getElementById('qvPrice').textContent = formatPrice(p.basePriceUsd);
    document.getElementById('qvRating').textContent = p.rating + ' ★ (' + p.reviews + ' reviews)';
    document.getElementById('qvDesc').textContent = p.desc[currentLang];
    document.getElementById('qvBenefits').innerText = p.benefits[currentLang];
    document.getElementById('qvUsage').textContent = p.usage[currentLang];
    document.getElementById('qvIngredients').textContent = p.ingredients;

    document.getElementById('qvAddBtn').onclick = () => {
        addToCart(p.id);
        closeQuickView();
    };

    document.getElementById('quickViewOverlay').classList.add('active');
}

function closeQuickView() {
    document.getElementById('quickViewOverlay')?.classList.remove('active');
}

function switchTab(tabName) {
    document.querySelectorAll('.qv-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.qv-tab-content').forEach(c => c.style.display = 'none');

    document.getElementById('tabBtn_' + tabName)?.classList.add('active');
    document.getElementById('tabContent_' + tabName).style.display = 'block';
}

function addToCart(productId) {
    const prod = PRODUCTS.find(p => p.id === productId);
    if (!prod) return;

    const existing = cart.find(item => item.id === productId);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ ...prod, qty: 1 });
    }
    saveCart();
    renderCart();
    openCartDrawer();
}

function quickBuy(productId) {
    addToCart(productId);
    closeCartDrawer();
    openCheckoutModal();
}

function quickBuyBundle() {
    cart = [
        { ...PRODUCTS[0], qty: 1, basePriceUsd: 34 },
        { ...PRODUCTS[1], qty: 1, basePriceUsd: 38 },
        { ...PRODUCTS[3], qty: 1, basePriceUsd: 26 }
    ];
    saveCart();
    renderCart();
    openCheckoutModal();
}

function renderCart() {
    const countEl = document.getElementById('cartBadgeCount');
    const itemsContainer = document.getElementById('cartDrawerItems');
    const totalEl = document.getElementById('cartDrawerTotal');

    const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
    if (countEl) countEl.textContent = totalCount;
    const mobileBadge = document.getElementById('mobileCartBadge');
    if (mobileBadge) mobileBadge.textContent = totalCount;

    if (!itemsContainer) return;

    if (cart.length === 0) {
        itemsContainer.innerHTML = '<div style="text-align:center; padding: 40px 10px; color: var(--text-muted);">' + TRANSLATIONS[currentLang].cartEmpty + '</div>';
        if (totalEl) totalEl.textContent = formatPrice(0);
        return;
    }

    const subtotalUsd = cart.reduce((sum, item) => sum + (item.basePriceUsd * item.qty), 0);
    if (totalEl) totalEl.textContent = formatPrice(subtotalUsd);

    itemsContainer.innerHTML = cart.map((item, idx) => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.title[currentLang]}">
            <div class="cart-item-info" style="flex-grow: 1;">
                <h4>${item.title[currentLang]}</h4>
                <div class="cart-item-price">${formatPrice(item.basePriceUsd)} × ${item.qty}</div>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
                <button onclick="changeQty(${idx}, -1)" style="border: 1px solid #ddd; background: #fff; width: 26px; height: 26px; border-radius: 50%; cursor: pointer;">-</button>
                <span style="font-weight: 600;">${item.qty}</span>
                <button onclick="changeQty(${idx}, 1)" style="border: 1px solid #ddd; background: #fff; width: 26px; height: 26px; border-radius: 50%; cursor: pointer;">+</button>
                <button onclick="removeFromCart(${idx})" style="border: none; background: transparent; color: #ef4444; font-size: 1.1rem; cursor: pointer; margin-inline-start: 6px;">✕</button>
            </div>
        </div>
    `).join('');
}

async function applyCoupon() {
    const input = document.getElementById('couponCodeInput');
    const code = input ? input.value.trim().toUpperCase() : '';
    const msg = document.getElementById('couponNotice');

    if (!code) {
        discountPercent = 0;
        appliedCouponCode = '';
        if (msg) msg.textContent = '';
        renderCart();
        renderProducts();
        return;
    }

    try {
        const res = await fetch('/api/coupons/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        const data = await res.json();
        if (data.success) {
            discountPercent = data.discountPercent;
            appliedCouponCode = data.code;
            if (msg) {
                msg.textContent = currentLang === 'ar' ? `✓ تم تطبيق خصم ${discountPercent}% بنجاح!` : `✓ ${discountPercent}% discount applied!`;
                msg.style.color = '#10B981';
            }
        } else {
            discountPercent = 0;
            appliedCouponCode = '';
            if (msg) {
                msg.textContent = data.message || (currentLang === 'ar' ? 'رمز غير صالح أو منتهي' : 'Invalid or expired code');
                msg.style.color = '#EF4444';
            }
        }
    } catch (e) {
        discountPercent = 0;
        appliedCouponCode = '';
        if (msg) {
            msg.textContent = currentLang === 'ar' ? 'تعذر التحقق من الكوبون' : 'Could not validate coupon';
            msg.style.color = '#EF4444';
        }
    }
    renderCart();
    renderProducts();
}

function changeQty(idx, delta) {
    if (!cart[idx]) return;
    cart[idx].qty += delta;
    if (cart[idx].qty <= 0) cart.splice(idx, 1);
    saveCart();
    renderCart();
}

function removeFromCart(idx) {
    cart.splice(idx, 1);
    saveCart();
    renderCart();
}

function saveCart() {
    try {
        localStorage.setItem('lumiere_cart', JSON.stringify(cart));
    } catch (e) {
        console.warn(e);
    }
}

function initCart() {
    try {
        const saved = localStorage.getItem('lumiere_cart');
        if (saved) cart = JSON.parse(saved);
    } catch (e) {
        cart = [];
    }
    renderCart();
}

function openCartDrawer() {
    document.getElementById('cartDrawerOverlay')?.classList.add('active');
    document.getElementById('cartDrawer')?.classList.add('active');
}

function closeCartDrawer() {
    document.getElementById('cartDrawerOverlay')?.classList.remove('active');
    document.getElementById('cartDrawer')?.classList.remove('active');
}

function openCheckoutModal() {
    document.getElementById('checkoutModalOverlay')?.classList.add('active');
}

function closeCheckoutModal() {
    document.getElementById('checkoutModalOverlay')?.classList.remove('active');
}

function switchLanguage(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    updateTranslations();
    renderProducts();
    renderCart();
}

function switchCurrency(cur) {
    if (CURRENCIES[cur]) {
        currentCurrency = cur;
        renderProducts();
        renderCart();
    }
}

function updateTranslations() {
    const t = TRANSLATIONS[currentLang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) {
            el.textContent = t[key];
        }
    });
}

function toggleFaq(btn) {
    const item = btn.parentElement;
    item.classList.toggle('active');
}

// Live Social Proof Toast Simulation
function initSocialProof() {
    const toast = document.getElementById('socialProofToast');
    if (!toast) return;

    const customers = [
        { name: 'نورة العتيبي', city: 'الرياض 🇸🇦', product: 'سيروم إكسير النضارة', time: 'قبل دقيقتين' },
        { name: 'فاطمة الكعبي', city: 'أبوظبي 🇦🇪', product: 'مجموعة طقوس الإشراقة كاملة', time: 'قبل 4 دقائق' },
        { name: 'ريم المطيري', city: 'الكويت 🇰🇼', product: 'كريم الببتيدات لتجديد البشرة', time: 'قبل 6 دقائق' },
        { name: 'دانة الدوسري', city: 'الدمام 🇸🇦', product: 'قناع الطمي الوردي الفرنسي', time: 'قبل 9 دقائق' },
        { name: 'شهد المنصوري', city: 'دبي 🇦🇪', product: 'كريم محيط العين بالببتيدات', time: 'قبل 11 دقيقة' }
    ];

    let idx = 0;
    setInterval(() => {
        const c = customers[idx % customers.length];
        idx++;

        const custEl = document.getElementById('toastCustomer');
        const prodEl = document.getElementById('toastProduct');
        const timeEl = document.getElementById('toastTime');
        if (custEl && prodEl && timeEl) {
            custEl.textContent = c.name + ' (' + c.city + ')';
            prodEl.textContent = 'اشترت: ' + c.product;
            timeEl.textContent = c.time;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 5000);
        }
    }, 24000);
}

function setupEventListeners() {
    const currencySelect = document.getElementById('currencySelector');
    if (currencySelect) {
        currencySelect.value = currentCurrency;
        currencySelect.addEventListener('change', (e) => switchCurrency(e.target.value));
    }

    const langSelect = document.getElementById('langSelector');
    if (langSelect) {
        langSelect.value = currentLang;
        langSelect.addEventListener('change', (e) => switchLanguage(e.target.value));
    }

    const form = document.getElementById('lumiereCheckoutForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (cart.length === 0) {
                alert(currentLang === 'ar' ? 'سلة المشتريات فارغة!' : 'Your cart is empty!');
                return;
            }

            const name = document.getElementById('customerName')?.value || '';
            const phone = document.getElementById('customerPhone')?.value || '';
            const country = document.getElementById('customerCountry')?.value || '';
            const city = document.getElementById('customerCity')?.value || '';
            const address = document.getElementById('customerAddress')?.value || '';

            const subtotal = cart.reduce((sum, item) => sum + (item.basePriceUsd * item.qty), 0);
            const formattedTotal = formatPrice(subtotal);
            const msgBox = document.getElementById('orderConfirmationNotice');

            // Construct payload for POST /api/orders
            const orderPayload = {
                name,
                phone,
                country,
                city,
                address,
                paymentMethod: 'cod',
                currency: currentCurrency,
                couponCode: appliedCouponCode || '',
                items: cart.map(item => ({ id: item.id, qty: item.qty }))
            };

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = currentLang === 'ar' ? 'جاري تأكيد الطلب وحجز المخزون...' : 'Processing order...';
            }

            try {
                const res = await fetch('/api/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderPayload)
                });
                const data = await res.json();

                if (data.success) {
                    const orderNum = data.orderNumber;
                    if (msgBox) {
                        msgBox.style.display = 'block';
                        msgBox.innerHTML = `
                            <div style="background: #ECFDF5; border: 1px solid #10B981; color: #065F46; padding: 18px; border-radius: 12px; margin-top: 16px; text-align: center;">
                                <div style="font-size: 1.5rem; margin-bottom: 4px;">🎉</div>
                                <h4 style="font-size: 1.15rem; margin-bottom: 6px; font-weight: 700;">${TRANSLATIONS[currentLang].orderSuccess}</h4>
                                <p style="font-size: 0.95rem; margin-bottom: 4px;">رقم الطلب الرسمي: <strong style="color: var(--accent-gold);">${orderNum}</strong></p>
                                <p style="font-size: 0.85rem; color: #047857;">${name} | ${phone} | ${country} (${city})</p>
                                <p style="font-weight: 700; margin-top: 8px; font-size: 1.05rem;">${TRANSLATIONS[currentLang].cartTotal} ${data.totalLocal} ${data.currency}</p>
                            </div>
                        `;
                    }

                    const itemsSummary = cart.map(i => i.title[currentLang] + ' (×' + i.qty + ')').join(', ');
                    const waPhone = (storeConfig?.contact?.whatsappNumber || '+966500000000').replace(/[^0-9]/g, '');
                    const waText = encodeURIComponent(`مرحباً LUMIÈRE 🌸، تم تأكيد طلبي بنجاح:\nرقم الطلب: ${orderNum}\nالاسم: ${name}\nالهاتف: ${phone}\nالموقع: ${country} - ${city}\nالعنوان: ${address}\nالمنتجات: ${itemsSummary}\nالمجموع: ${data.totalLocal} ${data.currency}`);

                    const waBtn = document.getElementById('btnWhatsAppCheckout');
                    if (waBtn) {
                        waBtn.href = `https://wa.me/${waPhone}?text=${waText}`;
                        waBtn.style.display = 'inline-flex';
                    }

                    // Refresh customer profile orders if customer is logged in
                    if (currentCustomer) {
                        checkCustomerSession();
                    }

                    cart = [];
                    saveCart();
                    renderCart();
                } else {
                    if (msgBox) {
                        msgBox.style.display = 'block';
                        msgBox.innerHTML = `
                            <div style="background: #FEF2F2; border: 1px solid #EF4444; color: #991B1B; padding: 14px; border-radius: 12px; margin-top: 16px; text-align: center; font-size: 0.9rem;">
                                ⚠️ ${data.message || 'فشل تسجيل الطلب. يرجى مراجعة البيانات.'}
                            </div>
                        `;
                    }
                }
            } catch (err) {
                if (msgBox) {
                    msgBox.style.display = 'block';
                    msgBox.innerHTML = `
                        <div style="background: #FEF2F2; border: 1px solid #EF4444; color: #991B1B; padding: 14px; border-radius: 12px; margin-top: 16px; text-align: center; font-size: 0.9rem;">
                            ⚠️ تعذر الاتصال بالخادم لإتمام الطلب. يرجى المحاولة لاحقاً.
                        </div>
                    `;
                }
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                }
            }
        });
    }
}


// ==========================================
// LUXURY CUSTOMER ACCOUNT & PORTAL ENGINE
// ==========================================
let currentCustomer = null;

async function checkCustomerSession() {
    try {
        const res = await fetch('/api/customer/me');
        const data = await res.json();
        if (data.success && data.customer) {
            setLoggedInCustomer(data.customer);
            renderCustomerOrders(data.orders || []);
        } else {
            setLoggedOutCustomer();
        }
    } catch (e) {
        setLoggedOutCustomer();
    }
}

function setLoggedInCustomer(cust) {
    currentCustomer = cust;
    const btn = document.getElementById('customerAuthBtn');
    if (btn) {
        document.getElementById('customerAuthIcon').textContent = '✨';
        document.getElementById('customerAuthLabel').textContent = cust.name.split(' ')[0];
    }
    // Autofill checkout fields if empty
    const nameInput = document.getElementById('customerName');
    const phoneInput = document.getElementById('customerPhone');
    const cityInput = document.getElementById('customerCity');
    const addressInput = document.getElementById('customerAddress');
    if (nameInput && !nameInput.value) nameInput.value = cust.name;
    if (phoneInput && !phoneInput.value) phoneInput.value = cust.phone;
    if (cityInput && !cityInput.value) cityInput.value = cust.city;
    if (addressInput && !addressInput.value) addressInput.value = cust.address || '';
}

function setLoggedOutCustomer() {
    currentCustomer = null;
    const btn = document.getElementById('customerAuthBtn');
    if (btn) {
        document.getElementById('customerAuthIcon').textContent = '👤';
        document.getElementById('customerAuthLabel').textContent = 'تسجيل الدخول';
    }
}

function openCustomerAuthModal() {
    const modal = document.getElementById('customerModal');
    if (!modal) return;
    modal.classList.add('active');

    if (currentCustomer) {
        document.getElementById('customerAuthView').style.display = 'none';
        document.getElementById('customerProfileView').style.display = 'block';
        document.getElementById('portalCustName').textContent = 'مرحباً ' + currentCustomer.name + ' 🌸';
        document.getElementById('portalCustEmail').textContent = currentCustomer.email;
        document.getElementById('portalCustPoints').textContent = (currentCustomer.reward_points || 100) + ' نقطة';
        loadCustomerOrders();
    } else {
        document.getElementById('customerAuthView').style.display = 'block';
        document.getElementById('customerProfileView').style.display = 'none';
        switchAuthMode('login');
    }
}

function closeCustomerModal() {
    const modal = document.getElementById('customerModal');
    if (modal) modal.classList.remove('active');
}

function switchAuthMode(mode) {
    const loginTab = document.getElementById('tabLoginBtn');
    const regTab = document.getElementById('tabRegisterBtn');
    const loginForm = document.getElementById('customerLoginForm');
    const regForm = document.getElementById('customerRegisterForm');
    const msg = document.getElementById('custAuthMsg');
    if (msg) msg.textContent = '';

    if (mode === 'login') {
        loginTab.style.borderBottom = '2px solid var(--accent-gold)';
        loginTab.style.fontWeight = '700';
        regTab.style.borderBottom = '2px solid transparent';
        regTab.style.fontWeight = '400';
        loginForm.style.display = 'block';
        regForm.style.display = 'none';
    } else {
        regTab.style.borderBottom = '2px solid var(--accent-gold)';
        regTab.style.fontWeight = '700';
        loginTab.style.borderBottom = '2px solid transparent';
        loginTab.style.fontWeight = '400';
        regForm.style.display = 'block';
        loginForm.style.display = 'none';
    }
}

// Handle Customer Login
document.getElementById('customerLoginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('custLoginEmail').value;
    const password = document.getElementById('custLoginPassword').value;
    const msg = document.getElementById('custAuthMsg');

    try {
        const res = await fetch('/api/customer/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.success) {
            e.target.reset();
            setLoggedInCustomer(data.customer);
            openCustomerAuthModal();
        } else {
            msg.style.color = '#DC2626';
            msg.textContent = data.message;
        }
    } catch (err) {
        msg.style.color = '#DC2626';
        msg.textContent = 'حدث خطأ أثناء الاتصال بالخادم';
    }
});

// Handle Customer Register
document.getElementById('customerRegisterForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('custRegName').value;
    const email = document.getElementById('custRegEmail').value;
    const phone = document.getElementById('custRegPhone').value;
    const city = document.getElementById('custRegCity').value;
    const password = document.getElementById('custRegPassword').value;
    const msg = document.getElementById('custAuthMsg');

    try {
        const res = await fetch('/api/customer/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, city, password })
        });
        const data = await res.json();
        if (data.success) {
            e.target.reset();
            setLoggedInCustomer(data.customer);
            openCustomerAuthModal();
        } else {
            msg.style.color = '#DC2626';
            msg.textContent = data.message;
        }
    } catch (err) {
        msg.style.color = '#DC2626';
        msg.textContent = 'حدث خطأ أثناء إنشاء الحساب';
    }
});

async function loadCustomerOrders() {
    try {
        const res = await fetch('/api/customer/me');
        const data = await res.json();
        if (data.success) {
            renderCustomerOrders(data.orders || []);
        }
    } catch (e) {
        console.error(e);
    }
}

function renderCustomerOrders(orders) {
    const container = document.getElementById('customerOrdersList');
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #888; font-size: 0.85rem; padding: 20px;">لم تقومي بأي طلب بعد. اختاري مستحضراتك المفضلة وسجلي طلبك الأول 🌸</div>';
        return;
    }

    container.innerHTML = orders.map(o => `
        <div style="border-bottom: 1px solid #F5F5F4; padding: 10px 0; display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
            <div>
                <div style="font-weight: 700; color: #1C1917;">طلب رقم: <span style="color: var(--accent-gold);">${o.order_number}</span></div>
                <div style="color: #78716C; font-size: 0.78rem;">${new Date(o.created_at).toLocaleDateString('ar-SA')}</div>
            </div>
            <div style="text-align: start;">
                <div style="font-weight: 700; color: #1C1917;">${o.total_local} ${o.currency}</div>
                <span class="badge" style="background:#DBEAFE; color:#1E40AF; padding: 2px 8px; border-radius: 10px; font-size: 0.72rem;">${o.status}</span>
            </div>
        </div>
    `).join('');
}

async function logoutCustomer() {
    await fetch('/api/customer/logout', { method: 'POST' });
    setLoggedOutCustomer();
    closeCustomerModal();
}

// Run check on page load
checkCustomerSession();


// Mobile Drawer Handler
function toggleMobileNav() {
    const drawer = document.getElementById('mobileDrawer');
    const overlay = document.getElementById('mobileDrawerOverlay');
    if (!drawer || !overlay) return;

    drawer.classList.toggle('active');
    overlay.classList.toggle('active');
}

// Provide updateCartUI alias for backward compatibility
window.updateCartUI = renderCart;
