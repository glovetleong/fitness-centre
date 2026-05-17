# Deploy fitness-centre to EKS (non-prod PRE)

Push to `master` → GitHub Actions builds images, deploys to `non-prod-eks`, syncs secrets from AWS Secrets Manager.

## Architecture

| Component | Implementation |
|-----------|----------------|
| Database | RDS MySQL (Terraform) |
| App secrets | Secrets Manager → External Secrets Operator → K8s Secret |
| Ingress | ALB + WAF (HTTP by default) |
| CI/CD | `.github/workflows/deploy-nonprod.yml` |

## One-time: Terraform

```powershell
$env:AWS_PROFILE = "nonprod"
cd "...\platform-infrastructure\environments\nonprod"
terraform init -backend-config=backend.hcl
terraform apply -var-file=nonprod.tfvars
```

Outputs needed for GitHub:

```powershell
terraform output -raw fitness_app_secret_name
terraform output -raw waf_acl_arn
terraform output -raw external_secrets_role_arn
```

## One-time: GitHub Actions

**Secret:** `AWS_ROLE_ARN` = `arn:aws:iam::956314528442:role/github-actions-fitness-centre`

**Variables** (Settings → Actions → Variables):

| Variable | Value |
|----------|--------|
| `USE_RDS` | `true` |
| `FITNESS_APP_SECRET_NAME` | `non-prod/fitness-centre/app` |
| `WAF_ACL_ARN` | full ARN from `terraform output -raw waf_acl_arn` |

Optional: `ACM_CERTIFICATE_ARN` (enables HTTPS ingress). Leave unset for **HTTP-only** demo.

OIDC setup: see `deploy/iam/` and create the IAM role if not done yet.

## Deploy

Push to `master` or run workflow **Deploy non-prod** manually.

ESO is installed by the workflow when `USE_RDS=true`. Manual install (optional):  
`platform-infrastructure/environments/nonprod/scripts/install-external-secrets.ps1`

## Verify

```powershell
kubectl get pods,ingress,externalsecret -n fitness-centre
```

App URL: `kubectl get ingress fitness-centre -n fitness-centre` → use **http://** ALB hostname.

**Login:** `admin@example.com` / `admin123`

## Layout

```text
deploy/
  README.md
  iam/                 GitHub OIDC trust + policy
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
