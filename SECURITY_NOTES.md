# Security Architecture Notes & Technical Debt

## 1. Content Security Policy (CSP) & `unsafe-inline` Tradeoff

### Architectural Decision
In `server.js`, the Content Security Policy configured via `helmet` currently includes `'unsafe-inline'` in `scriptSrc` and `styleSrc`:

```javascript
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"]
        }
    }
}));
```

### Justification & Root Cause
- Both `index.html` and `admin/index.html` currently utilize 56+ inline event attributes (`onclick`, `onsubmit`, `onchange`) for interactive UI controls (e.g., cart operations, category filtering, quick view tabs, modal toggling).
- In the W3C CSP specification, the `nonce="..."` mechanism only applies to `<script nonce="...">` elements and does **not** permit inline HTML event attributes.
- Eliminating `'unsafe-inline'` immediately without refactoring would break core storefront navigation and administrative workflows.
- As the primary line of defense, input sanitization and output escaping are enforced across all input vectors via `sanitizeString()` and `escapeHtml()` in `src/middleware/validator.js` and parameterized SQLite queries.

### Residual Risk
- If a stored Cross-Site Scripting (XSS) payload bypasses server sanitization, the browser will execute it because `'unsafe-inline'` does not prevent inline script execution.
- The CSP still provides defense-in-depth against external unauthorized script injection by restricting `scriptSrc` domains to `'self'` and `https://cdn.jsdelivr.net`.

### Complete Remediation Roadmap (Strict CSP / Zero-Inline)
When refactoring to a 100% Strict CSP:
1. **Event Listener Migration:** Remove all 56+ inline `onclick`/`onsubmit` attributes from `index.html` and `admin/index.html`. Migrate them to `addEventListener` bindings inside `js/lumiere.js` and `admin/js/admin.js` utilizing `id` or `data-*` attributes.
2. **Dynamic Nonce Injection:** Replace static file delivery with an Express middleware that generates a cryptographically secure random nonce per request (`crypto.randomBytes(16).toString('base64')`), injecting it into both the CSP HTTP header and inline script blocks.

### Risk & Priority Assessment
- **Current Priority:** Low (Single-tenant dedicated e-commerce deployment with strict parameterized SQL queries and input sanitization).
- **Target Priority:** High (Must be executed prior to any multi-tenant SaaS expansion, white-label client hosting, or third-party plugin integration).
