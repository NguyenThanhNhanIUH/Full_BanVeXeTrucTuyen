# Từ thư mục gốc Full_BanVeXeTrucThuyen:
#   .\scripts\publish-firebase.ps1 -ApiBaseUrl "https://your-backend.up.railway.app"
#
# Yêu cầu: Node.js, firebase login, npm install trong frontend-reactjs.

param(
    [Parameter(Mandatory = $true, HelpMessage = "URL HTTPS backend công khai, không /api cuối path")]
    [string] $ApiBaseUrl
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$fe = Join-Path $root "frontend-reactjs"
if (-not (Test-Path (Join-Path $fe "package.json"))) {
    Write-Error "Không tìm thấy frontend-reactjs dưới: $root"
    exit 1
}

Set-Location $fe
& (Join-Path $fe "deploy-hosting.ps1") -ApiBaseUrl $ApiBaseUrl
exit $LASTEXITCODE
