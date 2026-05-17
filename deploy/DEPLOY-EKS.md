# Deploy fitness-centre to EKS (non-prod)

Repo: [glovetleong/fitness-centre](https://github.com/glovetleong/fitness-centre)

## Architecture on EKS

```text
Internet → ALB (Ingress) → /     → frontend (nginx + Vue)
                        → /api → backend (Express)
                                    → mysql (Service)
```

**PoC:** MySQL runs inside the cluster (PVC). **Production:** use Amazon RDS instead of `mysql.yaml`.

## Prerequisites

- EKS `non-prod-eks` with platform add-ons (`install-platform-addons.ps1` done)
- Docker, AWS CLI profile `nonprod`, `kubectl`, `helm`
- ECR repositories for backend and frontend images

## 1. Build and push images

```powershell
$env:AWS_PROFILE = "nonprod"
$Account = "956314528442"
$Region  = "ap-southeast-1"
$Registry = "$Account.dkr.ecr.$Region.amazonaws.com"

aws ecr create-repository --repository-name fitness-centre/backend --region $Region 2>$null
aws ecr create-repository --repository-name fitness-centre/frontend --region $Region 2>$null
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $Registry

cd "C:\Users\Glovetloxad\Desktop\AHAM Assesment\fitness-centre"

docker build -t fitness-centre-backend:latest ./backend
docker tag fitness-centre-backend:latest "$Registry/fitness-centre/backend:latest"
docker push "$Registry/fitness-centre/backend:latest"

docker build -t fitness-centre-frontend:latest ./frontend
docker tag fitness-centre-frontend:latest "$Registry/fitness-centre/frontend:latest"
docker push "$Registry/fitness-centre/frontend:latest"
```

## 2. Configure secrets

```powershell
cd deploy\k8s
copy secret.example.yaml secret.yaml
# Edit secret.yaml — set strong DB_PASS, MYSQL_ROOT_PASSWORD, JWT_SECRET
kubectl apply -f secret.yaml
```

## 3. Deploy manifests

Replace image URIs in `migrate-job.yaml`, `backend.yaml`, `frontend.yaml`:

```text
REPLACE_BACKEND_IMAGE  → 956314528442.dkr.ecr.ap-southeast-1.amazonaws.com/fitness-centre/backend:latest
REPLACE_FRONTEND_IMAGE → 956314528442.dkr.ecr.ap-southeast-1.amazonaws.com/fitness-centre/frontend:latest
```

Apply in order:

```powershell
kubectl apply -f namespace.yaml
kubectl apply -f mysql.yaml
kubectl wait --for=condition=ready pod -l app=mysql -n fitness-centre --timeout=300s
kubectl apply -f migrate-job.yaml
kubectl wait --for=condition=complete job/fitness-centre-migrate -n fitness-centre --timeout=300s
kubectl apply -f backend.yaml
kubectl apply -f frontend.yaml
kubectl apply -f ingress.yaml
```

## 4. Get URL

```powershell
kubectl get ingress -n fitness-centre
```

Open the **ADDRESS** (ALB DNS name) in a browser.

Login: `admin@example.com` / `admin123`

## 5. Verify

```powershell
kubectl get pods -n fitness-centre
kubectl logs -n fitness-centre deploy/backend --tail=20
```

## Production differences

| PoC (this guide) | Production |
|----------------|------------|
| MySQL in cluster | RDS Aurora |
| HTTP only | HTTPS + ACM cert on ALB |
| Secrets in YAML | AWS Secrets Manager + External Secrets |
| `CORS_ORIGIN: *` | Exact app URL |
| Images `:latest` | Immutable tags from CI/CD |
