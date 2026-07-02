# ====================================================
# Script: crear-datos-demo.ps1
# Descripcion: Crea automaticamente datos de prueba
#              en los 5 microservicios del proyecto.
# Uso: Ejecutar desde PowerShell.
#      cd D:\proyecto final ms\ProyectoMS2026\ProyectoMS2026\scripts
#      .\crear-datos-demo.ps1
# ====================================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Crear datos de demo - Proyecto MS2026" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. REGISTRO + LOGIN
try {
  Invoke-RestMethod -Uri "http://localhost:8041/auth/register" -Method POST `
    -Body '{"username":"admin","password":"admin123"}' `
    -ContentType "application/json" | Out-Null
  Write-Host "Usuario admin registrado" -ForegroundColor Gray
} catch {
  Write-Host "Usuario admin ya existia" -ForegroundColor Gray
}

try {
  $res = Invoke-RestMethod -Uri "http://localhost:8041/auth/login" -Method POST `
    -Body '{"username":"admin","password":"admin123"}' `
    -ContentType "application/json"
  $token = $res.accessToken
  $h = @{ Authorization = "Bearer $token" }
  Write-Host "Login exitoso. Token obtenido.`n" -ForegroundColor Green
} catch {
  Write-Host "ERROR: No se pudo hacer login. Verifica que auth (puerto 8041) este corriendo." -ForegroundColor Red
  exit 1
}

# 2. CATEGORIAS
Write-Host "Creando categorias..." -ForegroundColor White
$categorias = @(
  '{"nombre":"Laptops","descripcion":"Equipos portatiles"}',
  '{"nombre":"Smartphones","descripcion":"Telefonos inteligentes"}',
  '{"nombre":"Accesorios","descripcion":"Cables y adaptadores"}',
  '{"nombre":"Audio","descripcion":"Audifonos y parlantes"}',
  '{"nombre":"Gaming","descripcion":"Consolas y accesorios para gamers"}'
)
foreach ($cat in $categorias) {
  try {
    $r = Invoke-RestMethod -Uri "http://localhost:9081/api/v1/categorias" -Method POST `
      -Headers $h -Body $cat -ContentType "application/json"
    Write-Host "  Categoria creada: ID=$($r.id) - $($r.nombre)" -ForegroundColor Cyan
  } catch {
    Write-Host "  Error creando categoria: $_" -ForegroundColor Red
  }
}

# 3. PRODUCTOS
Write-Host "`nCreando productos..." -ForegroundColor White
$productos = @(
  '{"nombre":"Laptop HP Pavilion","descripcion":"15.6 pulgadas 16GB RAM","idCategoria":1,"precio":2500.00,"stock":20,"activo":true,"sku":"LAP-HP-001"}',
  '{"nombre":"MacBook Air M2","descripcion":"13 pulgadas 8GB RAM","idCategoria":1,"precio":4999.00,"stock":10,"activo":true,"sku":"LAP-MBA-002"}',
  '{"nombre":"Redmi Note 13","descripcion":"Celular Xiaomi 8GB RAM","idCategoria":2,"precio":899.99,"stock":30,"activo":true,"sku":"CEL-RDM-003"}',
  '{"nombre":"iPhone 15 Pro","descripcion":"256GB titanio","idCategoria":2,"precio":4599.00,"stock":15,"activo":true,"sku":"CEL-IPH-004"}',
  '{"nombre":"Cable USB-C","descripcion":"2 metros carga rapida","idCategoria":3,"precio":29.90,"stock":100,"activo":true,"sku":"ACC-USB-005"}',
  '{"nombre":"AirPods Pro","descripcion":"Cancelacion activa de ruido","idCategoria":4,"precio":899.00,"stock":25,"activo":true,"sku":"AUD-APP-006"}',
  '{"nombre":"PlayStation 5","descripcion":"Consola Sony","idCategoria":5,"precio":2199.00,"stock":8,"activo":true,"sku":"GAM-PS5-007"}'
)
foreach ($prod in $productos) {
  try {
    $r = Invoke-RestMethod -Uri "http://localhost:9091/api/v1/productos" -Method POST `
      -Headers $h -Body $prod -ContentType "application/json"
    Write-Host "  Producto creado: ID=$($r.id) - $($r.nombre) - S/$($r.precio)" -ForegroundColor Yellow
  } catch {
    Write-Host "  Error creando producto: $_" -ForegroundColor Red
  }
}

# 4. PEDIDOS (crea pagos automaticos via Feign)
Write-Host "`nCreando pedidos (registra pagos automaticos)..." -ForegroundColor White
$pedidos = @(
  '{"userId":1,"cliente":"admin","estado":"PENDIENTE","observacion":"Pedido de demo","direccionEnvio":"Av. Universitaria 123, Lima","items":[{"productoId":1,"cantidad":1}]}',
  '{"userId":1,"cliente":"admin","estado":"PENDIENTE","observacion":"Cliente VIP","direccionEnvio":"Jr. Lima 456","items":[{"productoId":3,"cantidad":2}]}',
  '{"userId":1,"cliente":"admin","estado":"PAGADO","observacion":"Pago con tarjeta","direccionEnvio":"Calle Real 789","items":[{"productoId":5,"cantidad":3}]}',
  '{"userId":1,"cliente":"admin","estado":"ENTREGADO","observacion":"Entregado el 04/06","direccionEnvio":"Av. Sol 321","items":[{"productoId":7,"cantidad":1}]}'
)
$pedidoIds = @()
foreach ($ped in $pedidos) {
  try {
    $r = Invoke-RestMethod -Uri "http://localhost:9101/api/v1/pedidos" -Method POST `
      -Headers $h -Body $ped -ContentType "application/json"
    $pedidoIds += $r.id
    Write-Host "  Pedido creado: ID=$($r.id) - Total=S/$($r.total) - $($r.estado)" -ForegroundColor Magenta
  } catch {
    Write-Host "  Error creando pedido: $_" -ForegroundColor Red
  }
}

Start-Sleep -Seconds 1

# 5. APROBAR PAGOS (creados automaticamente al registrar el pedido)
Write-Host "`nAprobando pagos generados automaticamente..." -ForegroundColor White
foreach ($pedidoId in $pedidoIds) {
  try {
    $pago = Invoke-RestMethod -Uri "http://localhost:9111/api/v1/pagos/pedido/$pedidoId" -Method GET
    $body = @{
      idPedido = $pago.idPedido
      monto = $pago.monto
      metodo = "TARJETA"
      estado = "APROBADO"
      referenciaTransaccion = "TXN-DEMO-$pedidoId"
    } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "http://localhost:9111/api/v1/pagos/$($pago.id)" -Method PUT `
      -Headers $h -Body $body -ContentType "application/json"
    Write-Host "  Pago aprobado: ID=$($r.id) - Pedido=$($r.idPedido) - S/$($r.monto)" -ForegroundColor Green
  } catch {
    Write-Host "  Error aprobando pago del pedido $pedidoId : $_" -ForegroundColor Red
  }
}

# RESUMEN
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  TODO LISTO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Verifica los datos en el navegador:" -ForegroundColor White
Write-Host "  Categorias: http://localhost:9081/api/v1/categorias"
Write-Host "  Productos:  http://localhost:9091/api/v1/productos"
Write-Host "  Pedidos:    http://localhost:9101/api/v1/pedidos"
Write-Host "  Pagos:      http://localhost:9111/api/v1/pagos"
Write-Host ""
