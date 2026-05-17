# Build, push to ECR, and deploy fitness-centre to non-prod EKS.
# Usage:
#   $env:AWS_PROFILE = "nonprod"
#   .\deploy\scripts\deploy-to-eks.ps1

$ErrorActionPreference = "Stop"

$Account  = "956314528442"
$Region   = "ap-southeast-1"
$Registry = "$Account.dkr.ecr.$Region.amazonaws.com"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$K8sDir   = Join-Path $RepoRoot "deploy\k8s"

$BackendImage  = "$Registry/fitness-centre/backend:latest"
$FrontendImage = "$Registry/fitness-centre/frontend:latest"

Write-Host "ECR login..." -ForegroundColor Cyan
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $Registry

foreach ($name in @("fitness-centre/backend", "fitness-centre/frontend")) {
  aws ecr create-repository --repository-name $name --region $Region 2>$null
}

Write-Host "Building backend..." -ForegroundColor Cyan
docker build -t $BackendImage (Join-Path $RepoRoot "backend")
docker push $BackendImage

Write-Host "Building frontend..." -ForegroundColor Cyan
docker build -t $FrontendImage (Join-Path $RepoRoot "frontend")
docker push $FrontendImage

if (-not (Test-Path (Join-Path $K8sDir "secret.yaml"))) {
  throw "Create deploy/k8s/secret.yaml from secret.example.yaml first."
}

function Apply-K8sFile {
  param([string]$FileName)
  $path = Join-Path $K8sDir $FileName
  $content = Get-Content $path -Raw
  $content = $content.Replace("REPLACE_BACKEND_IMAGE", $BackendImage)
  $content = $content.Replace("REPLACE_FRONTEND_IMAGE", $FrontendImage)
  $content | kubectl apply -f -
}

Apply-K8sFile "namespace.yaml"
kubectl apply -f (Join-Path $K8sDir "secret.yaml")
Apply-K8sFile "mysql.yaml"

Write-Host "Waiting for MySQL..." -ForegroundColor Cyan
kubectl wait --for=condition=ready pod -l app=mysql -n fitness-centre --timeout=600s

Write-Host "Running migration job..." -ForegroundColor Cyan
kubectl delete job fitness-centre-migrate -n fitness-centre --ignore-not-found
$mj = Get-Content (Join-Path $K8sDir "migrate-job.yaml") -Raw
$mj = $mj.Replace("REPLACE_BACKEND_IMAGE", $BackendImage)
$mj | kubectl apply -f -
kubectl wait --for=condition=complete job/fitness-centre-migrate -n fitness-centre --timeout=600s

Apply-K8sFile "backend.yaml"
Apply-K8sFile "frontend.yaml"
Apply-K8sFile "ingress.yaml"

Write-Host "`n=== Status ===" -ForegroundColor Green
kubectl get pods,ingress -n fitness-centre
