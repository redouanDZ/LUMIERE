# LUMIÈRE V1.0.1 Release Checklist

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
