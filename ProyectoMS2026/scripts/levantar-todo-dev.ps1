# Levanta el stack local de TechStore (DEV) y verifica Mercado Pago.
# Uso: .\scripts\levantar-todo-dev.ps1

$ErrorActionPreference = "Continue"
$root = Split-Path $PSScriptRoot -Parent

function Test-PortListening([int]$Port) {
    return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1)
}

function Start-DockerDev([string]$RelativePath, [string]$Label) {
    $path = Join-Path $root $RelativePath
    if (-not (Test-Path (Join-Path $path "docker-compose-dev.yml"))) {
        Write-Host "  [skip] $Label (sin docker-compose-dev.yml)" -ForegroundColor DarkGray
        return
    }
    Push-Location $path
    try {
        docker compose -f docker-compose-dev.yml up -d 2>&1 | Out-Null
        Write-Host "  [ok] $Label" -ForegroundColor Green
    } catch {
        Write-Host "  [warn] $Label -> $_" -ForegroundColor Yellow
    } finally {
        Pop-Location
    }
}

function Start-SpringService([string]$RelativePath, [int]$Port, [string]$Label, [switch]$LoadMercadoPago) {
    if (Test-PortListening $Port) {
        Write-Host "  [ya activo] $Label (:$Port)" -ForegroundColor Cyan
        return
    }
    $path = Join-Path $root $RelativePath
    $cmd = if ($LoadMercadoPago) {
        ". `"$root\scripts\cargar-env-mercadopago.ps1`"; Set-Location `"$path`"; .\mvnw.cmd spring-boot:run"
    } else {
        "Set-Location `"$path`"; .\mvnw.cmd spring-boot:run"
    }
    Start-Process powershell -ArgumentList @("-NoExit", "-Command", $cmd) -WindowStyle Minimized | Out-Null
    Write-Host "  [iniciando] $Label (:$Port)" -ForegroundColor Yellow
}

function Start-Frontend() {
    if (Test-PortListening 4200) {
        Write-Host "  [ya activo] Angular (:4200)" -ForegroundColor Cyan
        return
    }
    $path = Join-Path $root "e-commerce"
    Start-Process powershell -ArgumentList @("-NoExit", "-Command", "Set-Location `"$path`"; npm start") -WindowStyle Minimized | Out-Null
    Write-Host "  [iniciando] Angular (:4200)" -ForegroundColor Yellow
}

function Wait-ForUrl([string]$Url, [int]$Seconds = 90) {
    $deadline = (Get-Date).AddSeconds($Seconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
            if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { return $true }
        } catch { Start-Sleep -Seconds 2 }
    }
    return $false
}

Write-Host ""
Write-Host "=== TechStore: levantar stack DEV ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "1) Bases de datos Docker..." -ForegroundColor White
Start-DockerDev "kafka" "Kafka"
Start-DockerDev "services\auth" "MySQL auth"
Start-DockerDev "services\catalogo" "MySQL catalogo"
Start-DockerDev "services\producto" "MySQL producto"
Start-DockerDev "services\pedido" "MySQL pedido"
Start-DockerDev "services\pago" "MySQL pago"
Start-DockerDev "services\carrito" "MySQL carrito"

Write-Host ""
Write-Host "2) Microservicios Spring Boot..." -ForegroundColor White
Start-SpringService "infra\config-server" 7071 "config-server"
Start-Sleep -Seconds 3
Start-SpringService "infra\registry-server" 7081 "registry-server"
Start-Sleep -Seconds 2
Start-SpringService "infra\gateway" 7091 "gateway"
Start-SpringService "services\auth" 8041 "auth"
Start-SpringService "services\catalogo" 9081 "catalogo"
Start-SpringService "services\producto" 9091 "producto"
Start-SpringService "services\pedido" 9101 "pedido"
Start-SpringService "services\pago" 9111 "pago" -LoadMercadoPago
Start-SpringService "services\carrito" 9121 "carrito"

Write-Host ""
Write-Host "3) Frontend Angular..." -ForegroundColor White
Start-Frontend

Write-Host ""
Write-Host "4) Esperando servicios clave..." -ForegroundColor White
$targets = @(
    @{ n = "gateway"; u = "http://localhost:7091/actuator/health" },
    @{ n = "pago"; u = "http://localhost:9111/actuator/health" },
    @{ n = "mp-config"; u = "http://localhost:7091/api/v1/pagos/mercadopago/config" },
    @{ n = "frontend"; u = "http://localhost:4200" }
)
foreach ($t in $targets) {
    $ok = Wait-ForUrl $t.u 120
    if ($ok) { Write-Host "  [ok] $($t.n)" -ForegroundColor Green }
    else { Write-Host "  [pendiente] $($t.n)" -ForegroundColor Red }
}

Write-Host ""
Write-Host "5) Verificacion Mercado Pago..." -ForegroundColor White
try {
    $mp = Invoke-RestMethod -Uri "http://localhost:4200/api/v1/pagos/mercadopago/config" -TimeoutSec 10
    if ($mp.enabled -and $mp.publicKey) {
        $mode = if ($mp.publicKey.StartsWith("APP_USR-")) { "PRODUCCION" } else { "PRUEBA" }
        Write-Host "  Mercado Pago: habilitado ($mode)" -ForegroundColor Green
    } else {
        Write-Host "  Mercado Pago: NO configurado. Ejecuta cargar-env-mercadopago.ps1 y reinicia pago." -ForegroundColor Red
    }
} catch {
    Write-Host "  No se pudo leer config MP: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Listo." -ForegroundColor Cyan
Write-Host "  Tienda:    http://localhost:4200"
Write-Host "  Gateway:   http://localhost:7091"
Write-Host "  Cliente:   user / user123"
Write-Host "  Cobro real: Yape y Tarjeta (Mercado Pago)"
Write-Host ""
