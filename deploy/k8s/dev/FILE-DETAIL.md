# Dev Kubernetes overlay — file-by-file guide

**Folder:** `fitness-centre/deploy/k8s/dev`  
**Purpose:** Extra manifests for **dev-eks** only — secrets sync, safety limits, public URL (ALB + WAF).

**Not in this folder** (shared for all envs, parent `deploy/k8s/`):

| File | Role |
|------|------|
| `namespace.yaml` | Creates namespace `fitness-centre` |
| `backend.yaml` | API Deployment + Service |
| `frontend.yaml` | nginx Deployment + Service |
| `migrate-job.yaml` | DB tables + seed user |
| `backend-hpa.yaml` | Autoscale backend 1–3 pods |

CI workflow **Deploy dev** applies: namespace → **this folder** → base app files.

---

## How traffic flows

See platform diagram: `platform-infrastructure/environments/dev/docs/CURRENT-ARCHITECTURE.md` (sections 2–3).

```text
User browser
    → WAF (dev-fitness-alb)
    → ALB (created by Ingress)
    → /api  → Service backend:3000
    → /     → Service frontend:80
```

---

## Placeholders (CI replaces before apply)

| Placeholder | Set by | Example |
|-------------|--------|---------|
| `REPLACE_SECRET_MANAGER_NAME` | `external-secret.yaml` sed | `dev/fitness-centre/app` |
| `REPLACE_WAF_ACL_ARN` | `ingress.yaml` sed | `arn:aws:wafv2:...` |
| `REPLACE_ACM_CERT_ARN` | `ingress-https.yaml` only | ACM cert ARN |
| `REPLACE_BACKEND_IMAGE` | parent `backend.yaml` | ECR image tag |
| `REPLACE_FRONTEND_IMAGE` | parent `frontend.yaml` | ECR image tag |

---

## File details

### `cluster-secret-store.yaml`

**Kind:** `ClusterSecretStore` (cluster-wide, all namespaces can reference it)

**What it does:** Tells **External Secrets Operator (ESO)** how to talk to AWS.

| Field | Meaning |
|-------|---------|
| `name: aws-secrets-manager` | Name used by ExternalSecret below |
| `service: SecretsManager` | AWS Secrets Manager (not SSM) |
| `region: ap-southeast-1` | Same region as EKS/RDS |
| `serviceAccountRef: external-secrets` | ESO pod uses IRSA role `dev-external-secrets` |

**Does not contain secrets** — only connection settings.

---

### `external-secret.yaml`

**Kind:** `ExternalSecret` (in namespace `fitness-centre`)

**What it does:** Copies AWS secret → Kubernetes secret automatically.

| Field | Meaning |
|-------|---------|
| `refreshInterval: 1h` | Re-sync from AWS every hour |
| `secretStoreRef` | Uses `aws-secrets-manager` store above |
| `target.name: fitness-centre-app` | K8s Secret name pods use |
| `dataFrom.extract.key` | `REPLACE_SECRET_MANAGER_NAME` → e.g. `dev/fitness-centre/app` |

**Resulting K8s secret keys** (from Terraform JSON):

- `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`, `JWT_SECRET`, `RDS_MANAGED`

**Used by:** `backend.yaml` and `migrate-job.yaml` via `envFrom: secretRef: fitness-centre-app`.

**Wait for ready:** CI runs  
`kubectl wait externalsecret/fitness-centre-app --for=condition=Ready`

---

### `namespace-guardrails.yaml`

**Three resources in one file** — protect the namespace `fitness-centre`.

#### 1) `ResourceQuota` — `fitness-centre-quota`

Caps total usage in the namespace:

| Limit | Value |
|-------|-------|
| Max pods | 20 |
| CPU requests | 4 |
| Memory requests | 8 Gi |
| CPU limits | 8 |
| Memory limits | 16 Gi |

**Why:** Stops one misconfigured deploy from consuming the whole cluster.

#### 2) `LimitRange` — `fitness-centre-limits`

Default for containers that don't specify resources:

| | CPU | Memory |
|---|-----|--------|
| Default limit | 500m | 512Mi |
| Default request | 50m | 128Mi |

#### 3) `NetworkPolicy` — `fitness-centre-apps`

Firewall rules for pods with label `app.kubernetes.io/part-of: fitness-centre`.

**Ingress allowed:**

- TCP **3000** (backend)
- TCP **80** (frontend)

**Egress allowed:**

- **53** UDP/TCP (DNS)
- **3306** TCP (RDS MySQL)
- **443** TCP (HTTPS outbound, e.g. APIs)

**Why:** Pods cannot talk to random internal IPs; reduces lateral movement if compromised.

**Note:** Backend/frontend Deployments must have the matching label for policy to apply.

---

### `ingress.yaml` (default — HTTP)

**Kind:** `Ingress` → triggers **AWS Load Balancer Controller** to create an **ALB**.

| Annotation | Meaning |
|------------|---------|
| `scheme: internet-facing` | Public ALB |
| `target-type: ip` | Route directly to pod IPs |
| `healthcheck-path: /` | ALB health check hits frontend |
| `wafv2-acl-arn` | Attach WAF (replaced at deploy) |
| `listen-ports: HTTP 80` | No HTTPS in default demo |

| Path | Service | Port |
|------|---------|------|
| `/api` | backend | 3000 |
| `/` | frontend | 80 |

**ingressClassName: alb** — must match installed ALB controller.

**After apply:**  
`kubectl get ingress -n fitness-centre` → hostname like `k8s-fitnessc-....elb.amazonaws.com`

---

### `ingress-https.yaml` (optional)

**Same as `ingress.yaml` plus:**

| Extra | Meaning |
|-------|---------|
| `listen-ports` HTTPS 443 + HTTP 80 | TLS termination on ALB |
| `ssl-redirect: 443` | HTTP redirects to HTTPS |
| `certificate-arn` | `REPLACE_ACM_CERT_ARN` from ACM |

**When used:** GitHub variable `ACM_CERTIFICATE_ARN` is set; CI applies this file instead of `ingress.yaml`.

---

## Apply order (what CI does)

```text
1. namespace.yaml
2. namespace-guardrails.yaml     ← this folder
3. Install ESO (Helm)            ← not a file here
4. cluster-secret-store.yaml
5. external-secret.yaml          ← wait until Ready
6. migrate-job.yaml              ← parent folder
7. backend.yaml, frontend.yaml, backend-hpa.yaml
8. ingress.yaml (or ingress-https.yaml)
```

---

## Quick debug commands

```powershell
kubectl get externalsecret,secret -n fitness-centre
kubectl describe externalsecret fitness-centre-app -n fitness-centre
kubectl get ingress -n fitness-centre
kubectl get networkpolicy -n fitness-centre
```

---

## Link to Terraform (dev)

| K8s needs | From Terraform output |
|-----------|------------------------|
| Secret name in ExternalSecret | `fitness_app_secret_name` → `dev/fitness-centre/app` |
| WAF on Ingress | `waf_acl_arn` |
| ESO IAM role (Helm) | `external_secrets_role_arn` |
| Cluster | `dev-eks` |

Platform guide: `platform-infrastructure/environments/dev/docs/FILE-DETAIL.md`
