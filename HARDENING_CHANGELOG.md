## 1.0.9 — Admin Order Status Fix
- Fixed delegated event argument parsing for `this.value` / `this.checked`, restoring admin order status updates.

# LUMIÈRE Hardening & Release Changelog

## 1.0.9 — Cart & Express Checkout Reliability

- Fixed delegated cart quantity parsing for negative values so the decrease button works reliably.
- Fixed delegated argument parsing order for `this.value` / `this.checked`.
- Reworked cart quantity controls with dedicated classes and 40px touch targets.
- Improved cart item wrapping and quantity-control layout on narrow phones.
- Preserved the validated 993–1200px responsive header behavior.
- Preserved existing cart, coupon, stock-reservation, checkout, authentication, and payment hardening.


## 1.0.5 — Internal Storefront UX Polish

- Improved customer account/login/register modal behavior on tablets and phones.
- Increased account-flow form and action touch targets for mobile usability.
- Improved customer profile/order-history wrapping on narrow screens.
- Improved quick-view image sizing and product-detail tabs on small screens.
- Preserved the validated 993–1200px storefront header/content behavior.
- Improved checkout form control sizing and spacing on narrow screens.
- Added admin table minimum widths and stronger horizontal-scroll behavior for mobile data tables.
- Improved admin section-card spacing and login-panel behavior on narrow screens.

# LUMIÈRE — Hardening Changelog

## 1.0.4 — Picalica Mobile Final Polish

- Locked the storefront product grid to a single readable column at `480px` and below.
- Added narrow-phone spacing and image sizing refinements for `360px` and below.
- Kept filter pills horizontally scrollable without compressing labels.
- Increased separation between the social-proof toast and the mobile bottom navigation, including safe-area spacing.
- Preserved the validated `993–1200px` header/content behavior from 1.0.3.

## Security
- Removed secrets and local customer/order database artifacts from the release package.
- Added production JWT secret validation.
- Added session-version invalidation for admin/customer password changes and resets.
- Added browser Origin CSRF defense and strict auth cookies.
- Removed inline HTML event-handler execution and added an allow-listed delegated event bridge.
- Added upload rate limiting and image signature validation.
- Removed production password-reset token logging.

## Commerce integrity
- Atomic stock reservation during checkout.
- Coupon reservation ledger with concurrency protection.
- Card payment initialization rollback for stock/coupon reservations.
- Verified Moyasar invoice amount and currency before payment confirmation.
- Corrected Moyasar `callback_url`/`success_url` semantics.
- Card payment failures release reserved stock exactly once.
- Prevented shipment/delivery of unpaid card orders.
- COD cancellation restores stock and releases coupon usage.
- Product deletion is now archival rather than physical deletion.

## Deployment
- Unified database path configuration around `DATABASE_FILE`.
- Render/Docker environment configuration expanded.
- Uploaded images now live on the persistent data volume.
- Added isolated test runner (`npm test`).
- Updated documentation to avoid unsupported “DDoS shield” / “live currency” claims.

## Validation
- JavaScript syntax check passes for all project `.js` files.
- Full Jest execution was not possible in this environment because dependency installation timed out; run `npm ci` and `npm test` locally/CI before production deployment.

## 1.0.3 — Picalica Responsive & Release Polish

- Reworked the primary storefront header breakpoint from `1350px` to `1120px` so the desktop navigation remains available on compact desktop widths while switching cleanly before tablet/landscape widths can create crowding.
- Removed a redundant `769–1100px` header rule that was unreachable after the previous `1350px` mobile-header breakpoint.
- Synchronized runtime/package documentation around Node.js `22.x`.
- Updated the Docker runtime and builder images to Node.js `22-alpine` to match the declared engine.
- Synchronized release metadata to version `1.0.3`.
- Prepared the release specifically around Picalica's responsive, compatibility, documentation, and final pre-submission quality requirements.

## 1.0.2 — Premium Responsive UX Polish

- Improved mobile/tablet touch targets and keyboard focus visibility.
- Added safer mobile viewport handling with `viewport-fit=cover`.
- Improved mobile cart drawer, checkout modal, quick-view modal and bottom navigation behavior.
- Added sticky checkout confirmation action on small screens.
- Added mobile-friendly form autocomplete/input modes.
- Improved responsive product cards, filters, hero imagery and social-proof placement.
- Added reduced-motion support.
- Improved admin modal/table/form behavior on phones.

