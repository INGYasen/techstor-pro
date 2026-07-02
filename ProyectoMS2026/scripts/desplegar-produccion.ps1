# Despliega TechStore en produccion: Render (backend) + Vercel (frontend) + Mercado Pago.
# Requisitos: render login, vercel login, git push a main.
#
# Uso:
#   .\scripts\desplegar-produccion.ps1
#   .\scripts\desplegar-produccion.ps1 -GatewayUrl "https://techstore-gateway.onrender.com"

param(
    [string]$GatewayUrl = "https://techstore-gateway.onrender.com",
    [string]$VercelProject = "techstor-pro",
    [switch]$SkipRenderWait
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$repoRoot = Split-Path $root -Parent
$renderCli = "$env:TEMP\render-cli\cli_v1.1.0.exe"
$gateway = $GatewayUrl.TrimEnd('/')

function Write-Step([string]$msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok([string]$msg) { Write-Host "  [ok] $msg" -ForegroundColor Green }
function Write-Warn([string]$msg) { Write-Host "  [warn] $msg" -ForegroundColor Yellow }
function Write-Fail([string]$msg) { Write-Host "  [fail] $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "TechStore — despliegue produccion" -ForegroundColor Cyan
Write-Host "Gateway esperado: $gateway"
Write-Host ""

# 1) Render login
Write-Step "Render CLI"
if (Test-Path $renderCli) {
    try {
        & $renderCli whoami -o text 2>$null | Out-Null
        Write-Ok "Render CLI autenticado"
    } catch {
        Write-Warn "Ejecuta: render login"
        Write-Host "  Luego crea el Blueprint en:"
        Write-Host "  https://dashboard.render.com/blueprints" -ForegroundColor Yellow
        Write-Host "  Repo: https://github.com/INGYasen/techstor-pro"
        Write-Host "  Archivo: render.yaml"
        if (-not $SkipRenderWait) {
            & $renderCli login
        }
    }
} else {
    Write-Warn "Instala Render CLI desde https://render.com/docs/cli"
}

# 2) Esperar gateway Live
if (-not $SkipRenderWait) {
    Write-Step "Esperando gateway en Render"
    $deadline = (Get-Date).AddMinutes(45)
    $live = $false
    while ((Get-Date) -lt $deadline) {
        try {
            $health = Invoke-RestMethod -Uri "$gateway/actuator/health" -TimeoutSec 15
            if ($health.status -eq "UP") { $live = $true; break }
        } catch { }
        Write-Host "  Esperando $gateway ..." -ForegroundColor DarkGray
        Start-Sleep -Seconds 20
    }
    if (-not $live) {
        Write-Fail "Gateway no responde. Crea el Blueprint en Render y vuelve a ejecutar este script."
        exit 1
    }
    Write-Ok "Gateway Live"
}

# 3) Mercado Pago en Render (pago)
Write-Step "Mercado Pago en Render"
$mpEnv = Join-Path $root "deploy\render\mercadopago-render.env"
if (Test-Path $mpEnv) {
    Write-Ok "Variables en deploy/render/mercadopago-render.env"
    Write-Warn "Pegalas manualmente en Render -> servicio pago -> Environment (si aun no lo hiciste)"
} else {
    Write-Warn "Crea deploy/render/mercadopago-render.env con MP_PUBLIC_KEY, MP_ACCESS_TOKEN, MP_PAYER_EMAIL"
}

try {
    $mp = Invoke-RestMethod -Uri "$gateway/api/v1/pagos/mercadopago/config" -TimeoutSec 15
    if ($mp.enabled -and $mp.publicKey) {
        Write-Ok "Mercado Pago habilitado en gateway"
    } else {
        Write-Warn "Mercado Pago no configurado en el servicio pago de Render"
    }
} catch {
    Write-Warn "No se pudo leer config MP: $_"
}

# 4) Vercel API_URL + redeploy
Write-Step "Vercel — API_URL y redeploy"
Push-Location (Join-Path $root "e-commerce")
try {
    echo $gateway | npx vercel env add API_URL production --force 2>&1 | Out-Null
    Write-Ok "API_URL=$gateway en Vercel (production)"
    npx vercel deploy --prod --yes 2>&1
    Write-Ok "Frontend desplegado en produccion"
} catch {
    Write-Fail "Error en Vercel: $_"
    exit 1
} finally {
    Pop-Location
}

# 5) Datos demo
Write-Step "Datos de demo en produccion"
& (Join-Path $PSScriptRoot "crear-datos-demo-render.ps1") -GatewayUrl $gateway

Write-Host ""
Write-Host "Listo." -ForegroundColor Green
Write-Host "  Tienda:  https://techstor-pro.vercel.app"
Write-Host "  API:     $gateway"
Write-Host "  Cliente: user / user123 (crear con crear-datos-demo-render si no existe)"
Write-Host ""
