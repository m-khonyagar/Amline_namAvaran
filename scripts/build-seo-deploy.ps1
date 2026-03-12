# ساخت tarball دیپلوی داشبورد سئو
# قبل از اجرای deploy_amline.py این اسکریپت را اجرا کن
# برای agent.amline.ir: basePath خالی (روت). برای admin/seo: $env:BASE_PATH='/seo'

$ErrorActionPreference = "Stop"
$base = Split-Path -Parent $PSScriptRoot   # e:\CTO
$seoDir = Join-Path $base "seo-dashboard"
$tarball = Join-Path $base "seo-dashboard-deploy.tar.gz"

Set-Location $seoDir

# agent.amline.ir = روت. admin.amline.ir/seo = /seo
$basePath = if ($env:BASE_PATH) { $env:BASE_PATH } else { "" }
$env:NEXT_PUBLIC_BASE_PATH = $basePath

Write-Host "1. Building Next.js (basePath='$basePath')..."
npm run build 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Build failed" }

$standalone = Join-Path $seoDir ".next\standalone"
$static = Join-Path $seoDir ".next\static"
$public = Join-Path $seoDir "public"
$deployTemp = Join-Path $seoDir "deploy-temp"

Write-Host "2. Preparing deploy package..."
if (Test-Path $deployTemp) { Remove-Item $deployTemp -Recurse -Force }
New-Item -ItemType Directory -Path $deployTemp | Out-Null
Copy-Item -Path "$standalone\*" -Destination $deployTemp -Recurse -Force
Copy-Item -Path $static -Destination (Join-Path $deployTemp ".next\static") -Recurse -Force
if (Test-Path $public) {
    Copy-Item -Path $public -Destination (Join-Path $deployTemp "public") -Recurse -Force
}
New-Item -ItemType Directory -Path (Join-Path $deployTemp "data\gsc") -Force | Out-Null
# کانفیگ Nginx برای agent.amline.ir
$nginxConf = Join-Path $seoDir "nginx-agent.conf"
if (Test-Path $nginxConf) {
    Copy-Item -Path $nginxConf -Destination (Join-Path $deployTemp "nginx-agent.conf") -Force
}

Write-Host "3. Creating tarball..."
tar -czf $tarball -C $deployTemp .
Remove-Item $deployTemp -Recurse -Force

$size = (Get-Item $tarball).Length / 1MB
Write-Host "Done. Tarball: $tarball ($([math]::Round($size, 2)) MB)"
Write-Host "Run: `$env:DEPLOY_PASSWORD='...'; `$env:OPENAI_API_KEY='...'; python deploy_amline.py"
