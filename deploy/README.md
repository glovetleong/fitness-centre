# Deploy fitness-centre to EKS (non-prod PRE)

Push to `master` → GitHub Actions builds images, deploys to `non-prod-eks`, syncs secrets from AWS Secrets Manager.

**Full platform setup (Terraform, destroy/rebuild, addons):**  
`platform-infrastructure/environments/nonprod/SETUP.md`

---

## Architecture

| Component | Implementation |
|-----------|----------------|
| Database | RDS MySQL (Terraform) |
| App secrets | Secrets Manager → External Secrets Operator → K8s Secret |
| Ingress | ALB + WAF (HTTP by default) |
| CI/CD | `.github/workflows/deploy-nonprod.yml` |
| Observability | CloudWatch dashboard `non-prod-fitness-platform` + SNS alarms |

---

## Quick start (already have infrastructure)

### 1. GitHub configuration

**Secret**

| Name | Value |
|------|--------|
| `AWS_ROLE_ARN` | `arn:aws:iam::956314528442:role/github-actions-fitness-centre` |

**Variables** (Settings → Actions → Variables)

| Variable | Value |
|----------|--------|
| `USE_RDS` | `true` |
| `FITNESS_APP_SECRET_NAME` | `non-prod/fitness-centre/app` |
| `WAF_ACL_ARN` | From `terraform output -raw waf_acl_arn` in nonprod |

Optional: `ACM_CERTIFICATE_ARN` — HTTPS only. Leave empty for **http://** ALB access.

OIDC IAM setup: `deploy/iam/`

### 2. Deploy

Push to `master` or run workflow **Deploy non-prod** (Actions tab → Run workflow).

The workflow:

1. Test + Trivy scan  
2. Build/push images to ECR  
3. Install External Secrets Operator (if needed)  
4. Sync `ClusterSecretStore` + `ExternalSecret` → K8s secret `fitness-centre-app`  
5. Run migrate job (schema + seed user)  
6. Deploy backend, frontend, HPA  
7. Apply ingress (HTTP + WAF, or HTTPS if ACM set)

### 3. Verify

```powershell
$env:AWS_PROFILE = "nonprod"
aws eks update-kubeconfig --region ap-southeast-1 --name non-prod-eks
kubectl get pods,ingress,externalsecret -n fitness-centre
kubectl get ingress fitness-centre -n fitness-centre
```

Open **http://**`<ALB hostname>` from ingress (wait 2–5 min after first deploy).

| Field | Value |
|-------|--------|
| Email | `admin@example.com` |
| Password | `admin123` |

---

## Manual deploy (without GitHub Actions)

Use when CI is unavailable or for debugging. Requires ECR images already pushed.

```powershell
$env:AWS_PROFILE = "nonprod"
$Account = "956314528442"
$Region = "ap-southeast-1"
$Tag = "<git-sha-or-latest-ecr-tag>"
$Backend = "$Account.dkr.ecr.$Region.amazonaws.com/fitness-centre/backend:$Tag"
$Frontend = "$Account.dkr.ecr.$Region.amazonaws.com/fitness-centre/frontend:$Tag"
$Waf = "<terraform output -raw waf_acl_arn>"
$Secret = "non-prod/fitness-centre/app"

aws eks update-kubeconfig --region $Region --name non-prod-eks
cd "...\fitness-centre"

kubectl apply -f deploy/k8s/namespace.yaml
kubectl apply -f deploy/k8s/pre/namespace-guardrails.yaml
kubectl apply -f deploy/k8s/pre/cluster-secret-store.yaml
(Get-Content deploy/k8s/pre/external-secret.yaml) -replace 'REPLACE_SECRET_MANAGER_NAME',$Secret | kubectl apply -f -
kubectl wait --for=condition=Ready externalsecret/fitness-centre-app -n fitness-centre --timeout=300s

kubectl delete job fitness-centre-migrate -n fitness-centre --ignore-not-found
(Get-Content deploy/k8s/migrate-job.yaml) -replace 'REPLACE_BACKEND_IMAGE',$Backend | kubectl apply -f -
kubectl wait --for=condition=complete job/fitness-centre-migrate -n fitness-centre --timeout=600s

(Get-Content deploy/k8s/backend.yaml) -replace 'REPLACE_BACKEND_IMAGE',$Backend | kubectl apply -f -
(Get-Content deploy/k8s/frontend.yaml) -replace 'REPLACE_FRONTEND_IMAGE',$Frontend | kubectl apply -f -
kubectl apply -f deploy/k8s/backend-hpa.yaml
kubectl rollout status deployment/backend -n fitness-centre --timeout=300s
kubectl rollout status deployment/frontend -n fitness-centre --timeout=300s

(Get-Content deploy/k8s/pre/ingress.yaml) -replace 'REPLACE_WAF_ACL_ARN',$Waf | kubectl apply -f -
```

Latest ECR tag:

```powershell
aws ecr describe-images --repository-name fitness-centre/backend --region ap-southeast-1 --query "sort_by(imageDetails,& imagePushedAt)[-1].imageTags[0]" --output text
```

Cluster addons must be installed first: `platform-infrastructure/environments/nonprod/scripts/install-platform-addons.ps1`

---

## Destroy and rebuild

After `terraform destroy` + `terraform apply`:

1. Update **`WAF_ACL_ARN`** in GitHub (new ARN every rebuild).  
2. Run `install-platform-addons.ps1` on the new cluster.  
3. Re-run deploy (CI or manual).  
4. Confirm SNS subscription email if using alarms.  
5. Use new ALB URL.

Full checklist: `platform-infrastructure/environments/nonprod/SETUP.md` → **Part 6**.

---

## Observability

Terraform creates:

- Dashboard: `non-prod-fitness-platform`  
- Alarms: `non-prod-rds-*`, `non-prod-eks-*`  
- SNS topic: `non-prod-platform-alarms`

Optional email in `nonprod.tfvars`:

```hcl
alarm_notification_email = "you@example.com"
```

Test alarm email without downtime:

```powershell
aws cloudwatch set-alarm-state --alarm-name "non-prod-eks-nodes-unhealthy" --state-value ALARM --state-reason "Manual SNS test" --region ap-southeast-1
```

---

## Repository layout

```text
.github/workflows/deploy-nonprod.yml
backend/Dockerfile
frontend/Dockerfile
deploy/
  README.md
  iam/                    GitHub OIDC trust + policy JSON
  k8s/
    namespace.yaml
    backend.yaml
    frontend.yaml
    migrate-job.yaml
    backend-hpa.yaml
    pre/
      cluster-secret-store.yaml
      external-secret.yaml
      namespace-guardrails.yaml
      ingress.yaml          # HTTP + WAF (default)
      ingress-https.yaml    # optional ACM
```

---

## Common issues

| Symptom | Cause / fix |
|---------|-------------|
| Ingress forces HTTPS | Remove `ACM_CERTIFICATE_ARN`; use `ingress.yaml` not `ingress-https.yaml` |
| ESO `v1beta1` not found | Use API `external-secrets.io/v1`; workflow installs ESO 0.19+ |
| Backend `CreateContainerConfigError` | Image `USER 1000` + pod `runAsUser: 1000` |
| Login fails after rebuild | Migrate job re-runs; DB is fresh — use default credentials |
| Trivy fails on image | Bookworm/nginx base + `apt-get upgrade` in Dockerfiles |
