# LUMIÈRE Security Notes — V1.0.5

## Completed hardening

- Removed shipped `.env` and local SQLite/customer data from the distributable project.
- Production startup rejects missing/weak JWT secrets.
- Tests use an isolated in-memory SQLite database through `scripts/run-tests.js`.
- Canonical database configuration is `DATABASE_FILE`; `DB_PATH` is reserved for test/runtime overrides.
- Admin sessions use a database-backed `session_version`, so password changes/reset invalidate existing admin JWTs.
- Customer sessions carry a `sessionVersion`; profile/order authentication checks it.
- Order creation atomically reserves stock and calculates all prices from server-side product data.
- Coupon reservations prevent concurrent checkout attempts from exceeding `max_uses`.
- Failed card-invoice initialization releases stock and coupon reservations.
- Moyasar invoice callbacks are configured as server notifications; browser redirection uses `success_url`.
- Verified Moyasar webhooks re-fetch the invoice and verify order amount/currency before marking an order paid.
- Failed/expired/voided card payments release reserved stock exactly once.
- Product deletion is an archive operation (`is_active=0`) to preserve historical order integrity.
- Admin cannot ship/deliver unpaid card orders or cancel paid orders without a refund workflow.
- Uploads use an admin-only limiter, a 6 MB cap, and JPEG/PNG/WebP magic-byte validation.
- Uploaded images are stored under `/app/data/uploads`, which is the persistent Render/Docker data volume.
- Public single-product API returns only active products.
- Product IDs, prices, and stock have strict server-side validation.
- CSRF defense includes Origin validation for browser state-changing requests plus strict same-site auth cookies.
- Inline HTML event attributes were migrated to delegated, allow-listed event handlers; `script-src` no longer permits `'unsafe-inline'`.
- Chart.js is pinned to a specific version and protected with SRI.
- Password-reset tokens are never logged in production and reset creation is refused when production SMTP is unavailable.

## Remaining operational requirements

1. Configure `PUBLIC_URL`, `ALLOWED_ORIGINS`, SMTP, and Moyasar secrets in the hosting provider.
2. Configure a Moyasar webhook endpoint at `/api/webhooks/moyasar` with the same shared secret and the required payment events.
3. Use a WAF/CDN for DDoS mitigation; Express rate limiting is application-level abuse protection.
4. Back up the persistent SQLite volume and test restoration before accepting real orders.
5. Run `npm ci` followed by `npm test` in CI/CD before each production deployment.
6. For high-volume or multi-instance deployments, migrate the transactional order/inventory layer to PostgreSQL.

## Important architecture note

SQLite is suitable for a single persistent application instance at modest traffic. It is not a good foundation for horizontal multi-instance scaling. The order reservation code is transactional for the current single-instance SQLite architecture, but production scale-out should use a server database with row-level locking/transactions.
