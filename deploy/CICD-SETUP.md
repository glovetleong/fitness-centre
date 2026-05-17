# Step-by-step: GitHub Actions → ECR → EKS (assessment-style CI/CD)

Deploy [fitness-centre](https://github.com/glovetleong/fitness-centre) automatically on every push to `main` / `master`.

```text
git push → GitHub Actions → build Docker → push ECR → kubectl → EKS → ALB URL
```

**Secrets:** stored in **GitHub Repository Secrets** (not in code). AWS access uses **OIDC** (no long-lived access keys in the repo).

---

## Overview

| Layer | Tool |
|-------|------|
| Source | GitHub `glovetleong/fitness-centre` |
| CI/CD | `.github/workflows/deploy-nonprod.yml` |
| Images | Amazon ECR |
| Runtime | EKS `non-prod-eks` (account `956314528442`) |
| Ingress | AWS Load Balancer Controller (already installed) |
| App secrets | GitHub Secrets → Kubernetes Secret |

---

## Part A — Push code to GitHub

### Step 1: Copy deploy files into your repo

If you only have the app on GitHub, copy from this assessment folder into your clone:

```text
fitness-centre/
  .github/workflows/deploy-nonprod.yml
  backend/Dockerfile
  backend/migrate-k8s.js
  backend/.dockerignore
  frontend/Dockerfile
  frontend/nginx.conf
  frontend/.dockerignore
  deploy/k8s/
  deploy/iam/
  deploy/CICD-SETUP.md
```

### Step 2: Commit and push

```powershell
cd "C:\Users\Glovetloxad\Desktop\AHAM Assesment\fitness-centre"
git add .
git commit -m "Add EKS deploy workflow and Kubernetes manifests"
git push origin master
```

Use `main` if that is your default branch (workflow triggers on both).

---

## Part B — AWS: GitHub OIDC role (one-time)

### Step 3: Create GitHub OIDC provider (if not already in account)

AWS Console → **IAM** → **Identity providers** → **Add provider**

| Field | Value |
|-------|--------|
| Provider type | OpenID Connect |
| Provider URL | `https://token.actions.githubusercontent.com` |
| Audience | `sts.amazonaws.com` |

Or CLI:

```powershell
$env:AWS_PROFILE = "nonprod"
aws iam create-open-id-connect-provider `
  --url https://token.actions.githubusercontent.com `
  --client-id-list sts.amazonaws.com `
  --thumbprint-list 6938fd4d98bab03fa02197a5d679ff6a949cfd9c
```

If you get “already exists”, skip.

### Step 4: Create IAM role for GitHub Actions

**Role name:** `github-actions-fitness-centre`

1. IAM → **Roles** → **Create role**
2. Trusted entity: **Web identity**
3. Identity provider: `token.actions.githubusercontent.com`
4. Audience: `sts.amazonaws.com`
5. Edit trust policy — use `deploy/iam/github-oidc-trust-policy.json` (restricts to your repo).

Or CLI (after editing trust policy file if your GitHub user/repo differs):

```powershell
aws iam create-role `
  --role-name github-actions-fitness-centre `
  --assume-role-policy-document file://deploy/iam/github-oidc-trust-policy.json `
  --profile nonprod

aws iam put-role-policy `
  --role-name github-actions-fitness-centre `
  --policy-name fitness-centre-deploy `
  --policy-document file://deploy/iam/github-actions-policy.json `
  --profile nonprod
```

Copy the role ARN:

```text
arn:aws:iam::956314528442:role/github-actions-fitness-centre
```

### Step 5: Allow the role to use EKS (required for kubectl)

The CI role must have an **EKS access entry** on `non-prod-eks`:

```powershell
$env:AWS_PROFILE = "nonprod"
$ROLE_ARN = "arn:aws:iam::956314528442:role/github-actions-fitness-centre"

aws eks create-access-entry `
  --cluster-name non-prod-eks `
  --principal-arn $ROLE_ARN `
  --type STANDARD `
  --region ap-southeast-1

aws eks associate-access-policy `
  --cluster-name non-prod-eks `
  --principal-arn $ROLE_ARN `
  --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy `
  --access-scope type=cluster `
  --region ap-southeast-1
```

If `create-access-entry` says it already exists, run only `associate-access-policy`.

---

## Part C — GitHub repository secrets

### Step 6: Open GitHub secret settings

1. Go to `https://github.com/glovetleong/fitness-centre`
2. **Settings** → **Secrets and variables** → **Actions**
3. **New repository secret** for each row below

### Step 7: Add these secrets

| Secret name | Value | Notes |
|-------------|-------|--------|
| `AWS_ROLE_ARN` | `arn:aws:iam::956314528442:role/github-actions-fitness-centre` | From Step 4 |
| `DB_PASS` | Strong password, e.g. 20+ random chars | MySQL user `fitness` |
| `MYSQL_ROOT_PASSWORD` | Different strong password | MySQL root |
| `JWT_SECRET` | Long random string | e.g. `openssl rand -hex 32` |

**Do not** commit these values to Git. GitHub encrypts secrets at rest.

Generate passwords (PowerShell):

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

Run three times for `DB_PASS`, `MYSQL_ROOT_PASSWORD`, `JWT_SECRET`.

---

## Part D — Platform must be running

### Step 8: Confirm EKS and add-ons

On your laptop:

```powershell
$env:AWS_PROFILE = "nonprod"
aws eks describe-cluster --name non-prod-eks --region ap-southeast-1 --query cluster.status
kubectl get pods -n kube-system
helm list -n kube-system
```

You need:

- Cluster **ACTIVE**
- **aws-load-balancer-controller** deployed
- **metrics-server** (optional but installed)

If not:

```powershell
cd "...\platform-infrastructure\environments\nonprod"
terraform apply -auto-approve "-var-file=nonprod.tfvars"
.\scripts\install-platform-addons.ps1
```

---

## Part E — Run the pipeline

### Step 9: Trigger GitHub Actions

- Push to `master` / `main`, **or**
- GitHub → **Actions** → **Deploy non-prod** → **Run workflow**

### Step 10: Watch the workflow

1. **Actions** tab → latest run
2. Green check = success
3. Open **Summary** at the bottom for image tags and Ingress hint

### Step 11: Get the app URL

```powershell
$env:AWS_PROFILE = "nonprod"
kubectl get ingress -n fitness-centre
```

Open the **ADDRESS** (ALB hostname) in a browser.

| Field | Value |
|-------|--------|
| Login | `admin@example.com` |
| Password | `admin123` |

Wait 2–3 minutes after first deploy for ALB to become healthy.

---

## Part F — Verify

```powershell
kubectl get pods -n fitness-centre
kubectl get ingress -n fitness-centre
aws ecr describe-images --repository-name fitness-centre/backend --region ap-southeast-1 --query "imageDetails[0].imageTags"
```

Expected pods: `mysql`, `backend`, `frontend` — all **Running**.

---

## What the workflow does (for assessment write-up)

```text
1. Checkout code
2. Assume AWS role via OIDC (no keys in YAML)
3. Build backend + frontend Docker images
4. Push to ECR with tag = git commit SHA
5. kubeconfig for non-prod-eks
6. Create K8s Secret from GitHub Secrets
7. Deploy MySQL (PVC), migration Job, backend, frontend, Ingress
8. ALB created by AWS Load Balancer Controller
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Could not assume role` | Check OIDC provider, trust policy repo name, `AWS_ROLE_ARN` secret |
| `Unauthorized` on kubectl | Run Step 5 (EKS access entry) |
| Workflow fails on MySQL wait | Cluster low on memory; scale node or wait for PVC |
| ALB empty address | Wait 2–5 min; check `kubectl describe ingress -n fitness-centre` |
| 502 from ALB | `kubectl logs -n fitness-centre deploy/backend` |
| Migration job failed | `kubectl logs -n fitness-centre job/fitness-centre-migrate` |

---

## Production vs this PoC

| This setup | Production |
|------------|------------|
| GitHub → deploy on push | PR + manual approval for prod |
| Secrets in GitHub | AWS Secrets Manager + External Secrets Operator |
| MySQL in EKS | RDS Aurora |
| `AmazonEKSClusterAdminPolicy` for CI | Narrower IAM + dedicated deploy role |
| HTTP ALB | HTTPS + WAF |

---

## Tear down app only (keep EKS)

```powershell
kubectl delete namespace fitness-centre
```

## Assessment evidence checklist

- [ ] Screenshot: GitHub Actions successful run
- [ ] Screenshot: ECR images with commit SHA tag
- [ ] Screenshot: `kubectl get pods -n fitness-centre`
- [ ] Screenshot: Browser on ALB URL logged in
- [ ] Note: secrets only in GitHub, not in repository
