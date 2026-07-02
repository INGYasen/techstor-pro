# Configura credenciales Mercado Pago en infra/.env.mercadopago (no se sube a Git)
# Uso:
#   .\scripts\configurar-mercadopago.ps1
#   .\scripts\configurar-mercadopago.ps1 -PublicKey "APP_USR-..." -AccessToken "APP_USR-..." -Email "tu@email.com"

param(
    [string]$PublicKey = "",
    [string]$AccessToken = "",
    [string]$Email = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root "infra\.env.mercadopago"
$exampleFile = Join-Path $root "infra\.env.mercadopago.example"

Write-Host ""
Write-Host "=== Configurar Mercado Pago (TechStore) ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Panel de desarrolladores (PC):"
Write-Host "  https://www.mercadopago.com.pe/developers/panel/app" -ForegroundColor Yellow
Write-Host ""

if ([string]::IsNullOrWhiteSpace($PublicKey)) {
    $PublicKey = Read-Host "Public Key (APP_USR-... o TEST-...)"
}
if ([string]::IsNullOrWhiteSpace($AccessToken)) {
    Write-Host "Pega el Access Token completo." -ForegroundColor Gray
    $AccessToken = Read-Host "Access Token"
}
if ([string]::IsNullOrWhiteSpace($Email)) {
    $Email = Read-Host "Email pagador [Enter = comprador@techstore.pe]"
}

$PublicKey = $PublicKey.Trim()
$AccessToken = $AccessToken.Trim()
$Email = if ([string]::IsNullOrWhiteSpace($Email)) { "comprador@techstore.pe" } else { $Email.Trim() }

if ([string]::IsNullOrWhiteSpace($PublicKey) -or [string]::IsNullOrWhiteSpace($AccessToken)) {
    Write-Host "Error: Public Key y Access Token son obligatorios." -ForegroundColor Red
    exit 1
}

if ($PublicKey.StartsWith("APP_USR-")) {
    Write-Host "Modo: PRODUCCION (cobros reales)." -ForegroundColor Yellow
} elseif ($PublicKey.StartsWith("TEST-")) {
    Write-Host "Modo: PRUEBA (sandbox)." -ForegroundColor Cyan
} else {
    Write-Host "Advertencia: la clave no parece de Mercado Pago." -ForegroundColor Yellow
}

$content = @"
# Credenciales Mercado Pago — NO subir a Git
MERCADOPAGO_ENABLED=true
MP_PUBLIC_KEY=$PublicKey
MP_ACCESS_TOKEN=$AccessToken
MP_PAYER_EMAIL=$Email
"@

Set-Content -Path $envFile -Value $content.TrimEnd() -Encoding UTF8

if (-not (Test-Path $exampleFile)) {
    Copy-Item $envFile $exampleFile
    (Get-Content $exampleFile) `
        -replace 'APP_USR-[^`r`n]+', 'APP_USR-tu-public-key' `
        -replace 'MP_ACCESS_TOKEN=.*', 'MP_ACCESS_TOKEN=APP_USR-tu-access-token' `
        -replace 'MP_PAYER_EMAIL=.*', 'MP_PAYER_EMAIL=email-del-comprador@ejemplo.com' |
        Set-Content $exampleFile -Encoding UTF8
}

Write-Host ""
Write-Host "Listo. Credenciales guardadas en infra\.env.mercadopago" -ForegroundColor Green
Write-Host ""
Write-Host "Siguiente paso:" -ForegroundColor Cyan
Write-Host "  1. . .\scripts\cargar-env-mercadopago.ps1"
Write-Host "  2. Reinicia config-server (7071) y pago (9111)"
Write-Host "  3. Verifica: http://localhost:7091/api/v1/pagos/mercadopago/config"
Write-Host ""
