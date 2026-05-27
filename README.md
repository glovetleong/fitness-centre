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

## Deploy to AWS (EKS dev)

CI: pull requests to `dev` run tests only; push to `dev` runs full deploy (see `deploy/README.md`).

| Doc | Contents |
|-----|----------|
| **[deploy/README.md](deploy/README.md)** | GitHub Actions, manual kubectl deploy, app verify |
| **[platform-infrastructure/environments/dev/docs/SETUP.md](../platform-infrastructure/environments/dev/docs/SETUP.md)** | Terraform, addons, destroy/rebuild, CloudWatch, troubleshooting |
