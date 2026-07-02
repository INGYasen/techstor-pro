# Configura credenciales Mercado Pago en pago-dev.yml (sin usar la app movil)
# Uso: .\scripts\configurar-mercadopago.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$configFile = Join-Path $root "infra\config-repo\pago-dev.yml"

$publicKeyDefault = "TEST-a33e02fc-0cdc-4e8f-aa7f-928042999764"

Write-Host ""
Write-Host "=== Configurar Mercado Pago (TechStore) ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Si la app de MP se congela, abre en el PC (Chrome):"
Write-Host "  https://www.mercadopago.com.pe/developers/panel/app" -ForegroundColor Yellow
Write-Host "  -> TechStoreOnline -> Credenciales de prueba -> Access Token (ojo + copiar)"
Write-Host ""

$publicKey = Read-Host "Public Key [Enter = ya configurada]"
if ([string]::IsNullOrWhiteSpace($publicKey)) {
    $publicKey = $publicKeyDefault
}

Write-Host ""
Write-Host "Pega el Access Token completo (empieza con TEST-)." -ForegroundColor Gray
Write-Host "Tip: clic derecho en PowerShell para pegar." -ForegroundColor Gray
$accessToken = Read-Host "Access Token"

if ([string]::IsNullOrWhiteSpace($accessToken)) {
    Write-Host "Error: Access Token vacio." -ForegroundColor Red
    exit 1
}

$accessToken = $accessToken.Trim()
if (-not $accessToken.StartsWith("TEST-")) {
    Write-Host "Advertencia: el token de prueba suele empezar con TEST-" -ForegroundColor Yellow
}

$email = Read-Host "Email pagador [Enter = test@test.com]"
if ([string]::IsNullOrWhiteSpace($email)) {
    $email = "test@test.com"
}

if (-not (Test-Path $configFile)) {
    Write-Host "No se encontro: $configFile" -ForegroundColor Red
    exit 1
}

$content = Get-Content $configFile -Raw
$content = $content -replace '(?ms)^mercadopago:\s*\r?\n(?:  .+\r?\n)+', ''

$block = @"
mercadopago:
  enabled: true
  public-key: $publicKey
  access-token: $accessToken
  payer-email: $email
"@

if (-not $content.EndsWith("`n")) {
    $content += "`n"
}
$content += "`n$block`n"

Set-Content -Path $configFile -Value $content.TrimEnd() -Encoding UTF8

Write-Host ""
Write-Host "Listo. Credenciales guardadas en pago-dev.yml" -ForegroundColor Green
Write-Host ""
Write-Host "Ahora reinicia:" -ForegroundColor Cyan
Write-Host "  1. config-server (7071)"
Write-Host "  2. microservicio pago (9111)"
Write-Host ""
Write-Host "Verifica: http://localhost:7091/api/v1/pagos/mercadopago/config"
Write-Host "Prueba Yape: celular 111111111 / codigo 123456"
Write-Host ""
