# LUMIÈRE Botanics Paris — High-End Skincare E-Commerce Platform 🌸💎

Production-ready, ultra-luxury Clean Skincare & Beauty e-commerce full-stack platform. Built for global and Gulf markets with multi-currency (SAR, AED, USD, EUR, KWD, DZD), bilingual support (Arabic RTL / English LTR), 1-click checkout, express delivery, and a complete administrative operations hub.

---

## 🚀 Key Features

### 🌟 Frontend Experience
- **Parisian Clean Luxury Design:** Minimalist aesthetics, warm beige palette, polished gold accents, and fluid animations.
- **Multi-Currency Engine:** Live automatic conversion across SAR, AED, USD, EUR, KWD, and DZD.
- **Instant Bilingual Switcher:** Arabic (RTL) and English (LTR) with seamless typography.
- **6 Flagship Botanical Icons:** Curated catalog with high-resolution studio photography.
- **Interactive Quick View Modal:** Clinical benefits, daily usage protocol, and ingredient transparency tabs.
- **Slide-out Cart Drawer:** Dynamic quantity adjustments, 10% coupon engine (`GLOW10`), and subtotal calculation.
- **Gulf & International Express Checkout:** Address autocomplete for KSA, UAE, Kuwait, Qatar, Bahrain, Oman, and global destinations.
- **1-Click WhatsApp Concierge Confirmation:** Instant order transmission directly to WhatsApp.
- **Live Social Proof Toasts:** Authentic buyer notifications to maximize conversion rate.

### 🛡️ Backend & Security
- **Node.js & Express Architecture:** RESTful API with structured routes and controllers.
- **Embedded Zero-Config Database:** SQLite3 with automated schema creation and initial seeding.
- **Input Sanitization & Protection:** Parameterized queries (SQL Injection immunity), HTML tag stripping (XSS prevention).
- **Hardened Authentication:** Password hashing using bcrypt and JWT delivered via secure httpOnly cookies.
- **Rate Limiting & DDoS Shield:** Prevents brute force and fake order flooding.
- **Admin Operations Hub (`/admin`):** Real-time analytics, revenue calculation, order status dispatching.

---

## 🛠️ Installation & Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run Server:**
   ```bash
   npm start
   ```

3. **Access Platform:**
   - **Storefront:** `http://localhost:4000`
   - **Admin Operations Hub:** `http://localhost:4000/admin/index.html`
     - **Email:** `admin@lumiere-botanics.com`
     - **Password:** `lumiere2026!`

---

## 📡 Core API Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/products` | Fetch active products with category filter | Public |
| `GET` | `/api/products/:id` | Fetch single product details | Public |
| `POST` | `/api/orders` | Submit validated order | Public |
| `POST` | `/api/coupons/validate` | Validate coupon code | Public |
| `POST` | `/api/auth/login` | Admin login & httpOnly cookie issuance | Public |
| `GET` | `/api/admin/stats` | Dashboard revenue and orders stream | Admin |
| `PATCH` | `/api/admin/orders/:id/status` | Update fulfillment status | Admin |

---
© 2026 LUMIÈRE Botanics Paris. All rights reserved.
