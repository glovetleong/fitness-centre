# fitness-centre `deploy/` — file guide (study)

Everything under `deploy/` supports running the app on EKS **dev** (`dev-eks`): RDS, External Secrets, ALB + WAF, CI/CD.

Related files **outside** `deploy/`:

| Path | Role |
|------|------|
| `.github/workflows/deploy-dev.yml` | Automates build, scan, push ECR, `kubectl apply` |
| `backend/Dockerfile` | API image (`USER 1000`, bookworm runtime) |
| `frontend/Dockerfile` | nginx + static Vue build |
| `backend/migrate-k8s.js` | DB schema + seed (migrate Job) |

**Per-file detail:** `deploy/k8s/dev/FILE-DETAIL.md`

---

## Folder map

```text
deploy/
├── README.md
├── FILE-GUIDE.md
├── iam/
└── k8s/
    ├── namespace.yaml
    ├── backend.yaml
    ├── frontend.yaml
    ├── migrate-job.yaml
    ├── backend-hpa.yaml
    └── dev/               # dev-eks overlay
```

---

## `deploy/iam/`

| File | Purpose |
|------|---------|
| **github-oidc-trust-policy.json** | GitHub OIDC → assume `github-actions-fitness-centre`. |
| **github-actions-policy.json** | ECR push; `eks:DescribeCluster` on `dev-eks`. |

---

## `deploy/k8s/` — shared manifests

| File | Purpose |
|------|---------|
| **namespace.yaml** | Namespace `fitness-centre`. |
| **backend.yaml** | API Deployment/Service; env from secret; `runAsUser: 1000`; `Recreate` strategy (not blue-green — see platform `docs/CURRENT-ARCHITECTURE.md` §10). |
| **frontend.yaml** | nginx frontend; image placeholder replaced by CI. |
| **migrate-job.yaml** | One-shot schema + seed (`admin@example.com` / `admin123`). |
| **backend-hpa.yaml** | HPA 1–3 replicas on CPU. |

---

## `deploy/k8s/dev/`

See **`deploy/k8s/dev/FILE-DETAIL.md`** for:

- `cluster-secret-store.yaml`
- `external-secret.yaml`
- `namespace-guardrails.yaml`
- `ingress.yaml` / `ingress-https.yaml`

---

## How CI uses these (`deploy-dev.yml`)

| Step | Files |
|------|--------|
| Guardrails | `namespace.yaml`, `dev/namespace-guardrails.yaml` |
| ESO + secrets | `dev/cluster-secret-store.yaml`, `dev/external-secret.yaml` |
| Migrate / app | `migrate-job.yaml`, `backend.yaml`, `frontend.yaml`, `backend-hpa.yaml` |
| Ingress | `dev/ingress.yaml` or `dev/ingress-https.yaml` |

GitHub **Environment:** `dev`

---

## Data flow

```text
Terraform → Secrets Manager: dev/fitness-centre/app
       → ExternalSecret → K8s Secret → backend + migrate-job → RDS
Browser → ALB (dev/ingress.yaml) → frontend / backend (+ WAF)
```
