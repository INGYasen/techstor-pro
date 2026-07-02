# Crea datos de demo apuntando al API Gateway en Render (o local).
# Uso:
#   .\crear-datos-demo-render.ps1
#   .\crear-datos-demo-render.ps1 -GatewayUrl "https://techstore-gateway.onrender.com"

param(
  [string]$GatewayUrl = "https://techstore-gateway.onrender.com"
)

$GatewayUrl = $GatewayUrl.TrimEnd('/')

Write-Host "`nGateway: $GatewayUrl`n" -ForegroundColor Cyan

try {
  Invoke-RestMethod -Uri "$GatewayUrl/auth/register" -Method POST `
    -Body '{"username":"admin","password":"admin123"}' -ContentType "application/json" | Out-Null
  Write-Host "Usuario admin registrado (o ya existia)" -ForegroundColor Gray
} catch {
  Write-Host "Registro: $_" -ForegroundColor Gray
}

try {
  $res = Invoke-RestMethod -Uri "$GatewayUrl/auth/login" -Method POST `
    -Body '{"username":"admin","password":"admin123"}' -ContentType "application/json"
  $h = @{ Authorization = "Bearer $($res.accessToken)" }
  Write-Host "Login OK`n" -ForegroundColor Green
} catch {
  Write-Host "ERROR: Gateway no responde. Verifica que techstore-gateway este Live en Render." -ForegroundColor Red
  exit 1
}

$categorias = @(
  '{"nombre":"Laptops","descripcion":"Equipos portatiles"}',
  '{"nombre":"Smartphones","descripcion":"Telefonos inteligentes"}',
  '{"nombre":"Accesorios","descripcion":"Cables y adaptadores"}'
)
foreach ($cat in $categorias) {
  $r = Invoke-RestMethod -Uri "$GatewayUrl/api/v1/categorias" -Method POST -Headers $h -Body $cat -ContentType "application/json"
  Write-Host "Categoria: $($r.nombre)" -ForegroundColor Cyan
}

$productos = @(
  '{"nombre":"Laptop HP Pavilion","descripcion":"15.6 pulgadas","idCategoria":1,"precio":2500,"stock":20,"activo":true,"sku":"LAP-001"}',
  '{"nombre":"Redmi Note 13","descripcion":"Celular Xiaomi","idCategoria":2,"precio":899.99,"stock":30,"activo":true,"sku":"CEL-001"}'
)
foreach ($prod in $productos) {
  $r = Invoke-RestMethod -Uri "$GatewayUrl/api/v1/productos" -Method POST -Headers $h -Body $prod -ContentType "application/json"
  Write-Host "Producto: $($r.nombre)" -ForegroundColor Yellow
}

Write-Host "`nDatos de demo creados via gateway." -ForegroundColor Green
