# Build production + deploy Firebase Hosting.
# Chạy trong thư mục frontend-reactjs. Cần: npm i, firebase login, .firebaserc đúng project.
# Ví dụ:
#   .\deploy-hosting.ps1 -ApiBaseUrl "https://banvexe-backend-xxxx.onrender.com"

param(
    [Parameter(Mandatory = $true, HelpMessage = "URL backend HTTPS, không có / ở cuối, không thêm /api")]
    [string] $ApiBaseUrl
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$base = $ApiBaseUrl.Trim().TrimEnd("/")
if ($base -match "/api`$") {
    Write-Warning "Nên bỏ /api ở cuối. Đang dùng: $base"
}

$env:VITE_API_BASE_URL = $base
Write-Host "VITE_API_BASE_URL=$($env:VITE_API_BASE_URL)" -ForegroundColor Cyan

npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npx --yes firebase-tools deploy --only hosting
exit $LASTEXITCODE
