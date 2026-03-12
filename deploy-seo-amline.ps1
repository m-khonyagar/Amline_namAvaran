# Deploy SEO Dashboard to seo.amline.ir (Parmin 212.80.24.109)
# Prerequisites: .env with DEPLOY_PASSWORD and OPENAI_API_KEY
# Or: $env:DEPLOY_PASSWORD='...'; $env:OPENAI_API_KEY='...'

$ErrorActionPreference = "Stop"
$base = "E:\CTO"

# Load .env
$envFile = Join-Path $base ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $val = $matches[2].Trim().Trim('"').Trim("'")
            [Environment]::SetEnvironmentVariable($key, $val, "Process")
        }
    }
}

if (-not $env:DEPLOY_PASSWORD) {
    Write-Host "DEPLOY_PASSWORD not set. Create $envFile with:" -ForegroundColor Yellow
    Write-Host "  DEPLOY_PASSWORD=your_server_root_password"
    Write-Host "  OPENAI_API_KEY=sk-proj-..."
    Write-Host ""
    Write-Host "Or run: `$env:DEPLOY_PASSWORD='pass'; `$env:OPENAI_API_KEY='key'; .\deploy-seo-amline.ps1"
    exit 1
}

Write-Host "1. Copying GSC data..."
$gscSrc = Join-Path $base "seo-dashboard\data\gsc\gsc_full_export.json"
$gscDst = Join-Path $base "docs\gsc_data\gsc_full_export.json"
New-Item -ItemType Directory -Path (Split-Path $gscDst) -Force | Out-Null
Copy-Item $gscSrc $gscDst -Force

Write-Host "2. Building tarball (basePath=/seo)..."
$env:BASE_PATH = "/seo"
& (Join-Path $base "scripts\build-seo-deploy.ps1")

Write-Host "3. Deploying to 212.80.24.109..."
$env:DEPLOY_TARGET = "parmin"
$env:DEPLOY_HOST = "212.80.24.109"
python (Join-Path $base "deploy_amline.py")

Write-Host ""
Write-Host "4. For HTTPS, run on server: certbot --nginx -d seo.amline.ir"
Write-Host "   ssh root@212.80.24.109"
