# Deploy fitness-centre to EKS (dev)

Push to `master` → GitHub Actions builds images, deploys to `dev-eks`, syncs secrets from AWS Secrets Manager.

Platform setup (Terraform, addons, destroy/rebuild):  
`platform-infrastructure/environments/dev/SETUP.md`

Per-file guide: `deploy/k8s/dev/FILE-DETAIL.md`

---

## Architecture (dev)

| Layer | What |
|-------|------|
| Cluster | `dev-eks` (ap-southeast-1) |
| Data | RDS MySQL + Secrets Manager `dev/fitness-centre/app` |
| Secrets in K8s | External Secrets Operator → `fitness-centre-app` |
| Ingress | ALB + WAF (`deploy/k8s/dev/ingress.yaml`) |
| CI/CD | `.github/workflows/deploy-dev.yml` |
| Observability | CloudWatch dashboard `dev-fitness-platform` + SNS alarms |

---

## GitHub configuration

**Secret**

| Name | Value |
|------|--------|
| `AWS_ROLE_ARN` | `arn:aws:iam::956314528442:role/github-actions-fitness-centre` |

**Environment `dev`** (Settings → Environments → dev → Variables)

| Name | Example |
|------|---------|
| `USE_RDS` | `true` |
| `FITNESS_APP_SECRET_NAME` | `dev/fitness-centre/app` |
| `WAF_ACL_ARN` | From `terraform output -raw waf_acl_arn` in `environments/dev` |
| `ACM_CERTIFICATE_ARN` | Omit for HTTP-only ingress |

Optional: `EXTERNAL_SECRETS_ROLE_ARN` — defaults to `arn:aws:iam::956314528442:role/dev-external-secrets`

After each `terraform apply`, refresh **`WAF_ACL_ARN`** (new ARN every rebuild).

---

## Deploy via CI

Push to `master` / `main`, or run workflow **Deploy dev** (uses GitHub Environment `dev`).

---

## Manual deploy (PowerShell)

```powershell
$env:AWS_PROFILE = "nonprod"   # or your SSO profile name
$Region = "ap-southeast-1"
$Tag = "manual-$(Get-Date -Format 'yyyyMMddHHmm')"

aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin 956314528442.dkr.ecr.$Region.amazonaws.com

docker build -t 956314528442.dkr.ecr.$Region.amazonaws.com/fitness-centre/backend:$Tag ./backend
docker push 956314528442.dkr.ecr.$Region.amazonaws.com/fitness-centre/backend:$Tag

docker build -t 956314528442.dkr.ecr.$Region.amazonaws.com/fitness-centre/frontend:$Tag ./frontend
docker push 956314528442.dkr.ecr.$Region.amazonaws.com/fitness-centre/frontend:$Tag

$Backend = "956314528442.dkr.ecr.$Region.amazonaws.com/fitness-centre/backend:$Tag"
$Frontend = "956314528442.dkr.ecr.$Region.amazonaws.com/fitness-centre/frontend:$Tag"
$Secret = "dev/fitness-centre/app"
$Waf = "<terraform output -raw waf_acl_arn>"

aws eks update-kubeconfig --region $Region --name dev-eks
cd deploy

kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/dev/namespace-guardrails.yaml
kubectl apply -f k8s/dev/cluster-secret-store.yaml
(Get-Content k8s/dev/external-secret.yaml) -replace 'REPLACE_SECRET_MANAGER_NAME',$Secret | kubectl apply -f -
kubectl wait --for=condition=Ready externalsecret/fitness-centre-app -n fitness-centre --timeout=300s

kubectl delete job fitness-centre-migrate -n fitness-centre --ignore-not-found
(Get-Content k8s/migrate-job.yaml) -replace 'REPLACE_BACKEND_IMAGE',$Backend | kubectl apply -f -
kubectl wait --for=condition=complete job/fitness-centre-migrate -n fitness-centre --timeout=600s

(Get-Content k8s/backend.yaml) -replace 'REPLACE_BACKEND_IMAGE',$Backend | kubectl apply -f -
(Get-Content k8s/frontend.yaml) -replace 'REPLACE_FRONTEND_IMAGE',$Frontend | kubectl apply -f -
kubectl apply -f k8s/backend-hpa.yaml

(Get-Content k8s/dev/ingress.yaml) -replace 'REPLACE_WAF_ACL_ARN',$Waf | kubectl apply -f -
kubectl get ingress -n fitness-centre
```

Cluster addons: `platform-infrastructure/environments/dev/scripts/install-platform-addons.ps1`

**Login (after migrate):** `admin@example.com` / `admin123`

---

## Destroy / rebuild

`platform-infrastructure/environments/dev/SETUP.md` → Part 6.

---

## Observability

- Dashboard: `dev-fitness-platform`  
- Alarms: `dev-rds-*`, `dev-eks-*`  
- SNS: `dev-platform-alarms`

---

## File map

```
.github/workflows/deploy-dev.yml
deploy/
  iam/
  k8s/
    namespace.yaml, backend.yaml, frontend.yaml, migrate-job.yaml, backend-hpa.yaml
    dev/
```

See `deploy/FILE-GUIDE.md`.
