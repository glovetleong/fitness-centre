# PRE-style demo setup (RDS + Secrets Manager + WAF)

Moves the live PoC closer to **PRE** without a second AWS account.

## What changes

| PoC (before) | PRE demo (after) |
|--------------|------------------|
| MySQL pod + PVC | **RDS MySQL** (encrypted, backups) |
| GitHub Secrets → K8s Secret | **Secrets Manager** + **External Secrets** |
| HTTP ALB | **WAF** + optional **HTTPS** (ACM) |
| Push → deploy | **CI** (test + Trivy) → **Deploy** workflow |
| Single replica | **HPA** on backend (1–3) |
| No namespace policies | **ResourceQuota**, **LimitRange**, **NetworkPolicy** |
| — | EKS **control plane audit logs** → CloudWatch |

## 1. Terraform (platform-infrastructure)

```powershell
$env:AWS_PROFILE = "nonprod"
cd "...\platform-infrastructure\environments\nonprod"

terraform init -backend-config=backend.hcl
terraform plan -var-file=nonprod.tfvars
terraform apply -var-file=nonprod.tfvars
```

`nonprod.tfvars` includes `enable_rds = true` and `enable_waf = true`.

**Cost note:** RDS `db.t4g.micro` + storage is roughly **~USD 15–25/month** on top of EKS/NAT.

Capture outputs:

```powershell
terraform output rds_endpoint
terraform output fitness_app_secret_name
terraform output waf_acl_arn
terraform output external_secrets_role_arn
```

Optional HTTPS — create/validate an **ACM certificate** in `ap-southeast-1`, then set in `nonprod.tfvars`:

```hcl
acm_certificate_arn = "arn:aws:acm:ap-southeast-1:956314528442:certificate/..."
```

## 2. Install External Secrets (once per cluster)

```powershell
$env:AWS_PROFILE = "nonprod"
aws eks update-kubeconfig --region ap-southeast-1 --name non-prod-eks
cd "...\platform-infrastructure\environments\nonprod"
.\scripts\install-platform-addons.ps1
```

Or only ESO: `.\scripts\install-external-secrets.ps1`

## 3. GitHub repository configuration

**Secrets** (still required):

| Secret | Purpose |
|--------|---------|
| `AWS_ROLE_ARN` | OIDC deploy role |

**Variables** (Settings → Secrets and variables → Actions → Variables):

| Variable | Example | Required when `USE_RDS=true` |
|----------|---------|------------------------------|
| `USE_RDS` | `true` | Yes |
| `FITNESS_APP_SECRET_NAME` | `non-prod/fitness-centre/app` | Yes (from `terraform output fitness_app_secret_name`) |
| `WAF_ACL_ARN` | `arn:aws:wafv2:...` | Yes |
| `ACM_CERTIFICATE_ARN` | ACM cert ARN or leave empty for HTTP+WAF only | No |

You can remove `DB_PASS`, `MYSQL_ROOT_PASSWORD`, and `JWT_SECRET` from GitHub Secrets when using RDS mode (values live in Secrets Manager).

## 4. Deploy

1. Push code → **CI** workflow runs tests + Trivy.
2. On success → **Deploy non-prod** runs automatically (or run manually via **workflow_dispatch**).
3. Workflow deletes in-cluster MySQL, syncs ExternalSecret, migrates to RDS, deploys app + WAF ingress.

## 5. Verify

```powershell
kubectl get externalsecret,secret -n fitness-centre
kubectl get pods,hpa,ingress -n fitness-centre
```

Login: `admin@example.com` / `admin123`

## Roll back to PoC MySQL

1. Set GitHub variable `USE_RDS` = `false`
2. Re-add GitHub Secrets for DB/JWT
3. Run deploy workflow
4. Optionally `terraform apply` with `enable_rds = false` to destroy RDS (data loss)

## Still not full PROD/PRE account

For the assessment, document in SUBMISSION-04 that this demo proves the **technical pattern**; full PRE adds a **dedicated account**, **blue-green**, **GitOps repo**, **Aurora**, **Datadog**, and **approval gates**.
