# LUMIÈRE V1.0.9 Release Checklist

## Local
```bash
npm ci
npm test
npm start
```

Open:
- Store: http://localhost:4000
- Admin: http://localhost:4000/admin/index.html
- Health: http://localhost:4000/health

## Production environment
Required:
- NODE_ENV=production
- JWT_SECRET=<unique random >= 32 chars>
- ADMIN_EMAIL=<real admin email>
- ADMIN_PASSWORD=<strong password>
- DATABASE_FILE=/app/data/lumiere.db
- PUBLIC_URL=https://your-domain.example
- ALLOWED_ORIGINS=https://your-domain.example

For password reset:
- SMTP_HOST
- SMTP_PORT
- SMTP_USER
- SMTP_PASS
- SMTP_FROM

For card payments:
- MOYASAR_SECRET_KEY
- MOYASAR_WEBHOOK_SECRET

## Moyasar
Configure a webhook at:
`https://your-domain.example/api/webhooks/moyasar`

Use the same secret configured as `MOYASAR_WEBHOOK_SECRET` and enable the payment events required by the store.

## Important
Do not commit or upload:
- `.env`
- `data/*.db*`
- customer/order exports
- production secrets


## Responsive acceptance checks
- 993px: compact header remains balanced; no horizontal overflow.
- 1024px: hero, benefits and three-column products remain aligned.
- 1100px: compact header and storefront content remain visually coherent.
- 1200px: full desktop navigation and three-column products remain balanced.
- 375px: single-column product cards, readable typography, touch-friendly actions.
- 320–360px: no compressed product grid or toast/bottom-navigation collision.
