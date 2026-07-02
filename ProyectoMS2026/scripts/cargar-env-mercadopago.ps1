# Carga variables Mercado Pago en la sesión actual de PowerShell.
# Uso: . .\scripts\cargar-env-mercadopago.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root "infra\.env.mercadopago"

if (-not (Test-Path $envFile)) {
    Write-Host "No se encontró $envFile" -ForegroundColor Red
    Write-Host "Copia infra\.env.mercadopago.example a infra\.env.mercadopago y completa tus credenciales."
    return
}

Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $idx = $line.IndexOf("=")
    if ($idx -lt 1) { return }
    $name = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1).Trim()
    Set-Item -Path "Env:$name" -Value $value
}

Write-Host "Variables Mercado Pago cargadas en esta sesión." -ForegroundColor Green
Write-Host "Reinicia config-server y el microservicio pago si ya estaban corriendo."
