# LUMIÈRE Botanics — High-End Clean Skincare & Beauty E-Commerce Platform 🌸💎

Production-ready, ultra-luxury Clean Skincare & Beauty e-commerce full-stack platform. Built for global and Gulf markets with multi-currency support (SAR, AED, USD, EUR, KWD, DZD), bilingual experience (Arabic RTL / English LTR), 1-click checkout, express delivery, customer accounts, and an administrative operations hub.

---

## 🚀 Key Features

### 🌟 Customer Experience & Storefront
- **Parisian Clean Luxury Design:** Minimalist aesthetics, warm beige palette, polished gold accents, and fluid animations.
- **Mobile-First & PWA:** Optimized for iOS & Android with a floating bottom navigation bar, slide-out drawer, and home-screen installability.
- **Multi-Currency Engine:** Live automatic conversion across SAR, AED, USD, EUR, KWD, and DZD.
- **Instant Bilingual Switcher:** Arabic (RTL) and English (LTR) with seamless typography.
- **Customer Portal & Privilege Club:** Registration, login, order tracking history, and 100 welcome reward points.
- **Interactive Quick View Modal:** Clinical benefits, daily ritual protocol, and ingredient transparency tabs.
- **Slide-out Cart Drawer:** Dynamic quantity adjustments, 10% coupon engine (`GLOW10`), and subtotal calculation.
- **Gulf & International Express Checkout:** Address autocomplete for KSA, UAE, Kuwait, Qatar, Bahrain, Oman, and global destinations.

### 🛡️ Backend & Operations Hub
- **Node.js & Express Architecture:** Clean RESTful API with structured routes and controllers.
- **Embedded Database:** Zero-config SQLite3 with automated schema creation and initial seeding.
- **Input Sanitization & Protection:** Parameterized queries (SQL Injection immunity), HTML tag stripping (XSS prevention).
- **Hardened Authentication:** Bcrypt password hashing and JWT delivered via secure httpOnly cookies.
- **Rate Limiting & DDoS Shield:** Anti-brute-force and spam order protection.
- **Admin Operations Hub (`/admin`):** Real-time analytics, revenue calculation, order status dispatching, customer CRM, product management, and coupon CRUD.

---

## 🛠️ Installation & Setup Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 2. Clone Repository
```bash
git clone https://github.com/redouanDZ/LUMIERE.git
cd LUMIERE
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Administrator Provisioning & Environment Setup

> 🔒 **SECURITY POLICY:** This repository contains **zero default or hardcoded administrator credentials**. The platform enforces dynamic credential provisioning before initial deployment via either of the following two methods:

#### Method A: Interactive Onboarding Wizard (Recommended)
Run the automated white-label onboarding script to interactively configure your store branding, currency, and create custom administrator credentials:
```bash
npm run setup
```
The wizard will:
1. Prompt interactively for your store name, administrator email, and strong password.
2. Automatically generate a cryptographically secure 64-character `JWT_SECRET`.
3. Create your production `.env` file with secure permissions.

#### Method B: Manual Configuration via `.env`
Alternatively, you can configure your environment manually:
1. Copy the example configuration template:
   ```bash
   cp .env.example .env
   ```
2. Generate a cryptographically secure 64-character hex secret for `JWT_SECRET`:
   ```bash
   # Using Node.js:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

   # OR using OpenSSL:
   openssl rand -hex 32
   ```
3. Edit `.env` and define your administrator credentials:
   ```env
   JWT_SECRET=your_generated_64_character_hex_key
   ADMIN_EMAIL=admin@yourcompany.com
   ADMIN_PASSWORD=your_strong_custom_password_min_12_chars
   ```

> ⚠️ **CRITICAL SECURITY NOTE:**
> - Never commit the `.env` file to version control. It is strictly excluded by `.gitignore`.
> - The database seeds the administrator account upon the very first server launch (`npm start`). If you change credentials later, update them directly through the Admin Hub or via database migration.

### 5. Start the Server
```bash
npm start
```

### 6. Access Platform
- **Storefront:** `http://localhost:4000`
- **Admin Operations Hub:** `http://localhost:4000/admin/index.html`
- **Health Check Endpoint:** `http://localhost:4000/health`

Log in to the Admin Operations Hub using the administrator credentials created during Step 4 (`npm run setup` or configured in your `.env` file).

---

## 🐳 Running with Docker

```bash
# 1. Ensure your .env file is configured as described above
# 2. Build and launch container
docker compose up -d
```

The platform will be accessible at `http://localhost:4000`.

---

## 📡 Core API Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/health` | Cloud health check & uptime status | Public |
| `GET` | `/api/products` | Fetch active products with category filter | Public |
| `GET` | `/api/products/:id` | Fetch single product details | Public |
| `POST` | `/api/orders` | Submit validated order | Public |
| `POST` | `/api/coupons/validate` | Validate coupon code | Public |
| `POST` | `/api/customer/register` | Register new customer account | Public |
| `POST` | `/api/customer/login` | Customer login & session | Public |
| `GET` | `/api/customer/me` | Customer profile & order history | Customer JWT |
| `POST` | `/api/auth/login` | Admin login & httpOnly cookie issuance | Public |
| `GET` | `/api/admin/stats` | Dashboard revenue and analytics | Admin JWT |
| `GET` | `/api/admin/coupons` | List all coupons | Admin JWT |
| `POST` | `/api/admin/coupons` | Create new coupon code | Admin JWT |
| `DELETE` | `/api/admin/coupons/:id` | Delete coupon permanently | Admin JWT |
| `PATCH` | `/api/admin/orders/:id/status` | Update fulfillment status | Admin JWT |

---
© 2026 LUMIÈRE Botanics Paris. All rights reserved.
