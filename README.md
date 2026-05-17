# Fitness Centre

Vue 3 frontend + Express API + MySQL.

## Local development

```bash
# Backend
cd backend && cp .env.example .env && npm install && node migrate.js && npm start

# Frontend (separate terminal)
cd frontend && cp .env.example .env && npm install && npm run dev
```

Open http://localhost:5173 — login `admin@example.com` / `admin123`

## Deploy to AWS (EKS non-prod)

See **[deploy/README.md](deploy/README.md)** for Terraform, GitHub Actions variables, and verification.
