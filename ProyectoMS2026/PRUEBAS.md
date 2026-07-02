D:\ms1\ProyectoMS2026\PRUEBAS.md

INFRA 
mvn spring-boot:run

CONF SERVE
http://localhost:7071/producto/dev
http://localhost:7071/catalogo/dev
http://localhost:7071/gateway/dev
http://localhost:7071/auth/dev
http://localhost:7071/pedido/dev
http://localhost:7071/pago/dev

EUREKA
http://localhost:7081/

GATEWAY
http://localhost:7091/actuator/health

MICROSERVICIOS
 docker compose -f docker-compose-dev.yml up 
mvn spring-boot:run
http://localhost:8041/swagger-ui/index.html
http://localhost:8081/swagger-ui/index.html
http://localhost:9091/swagger-ui/index.html
http://localhost:9101/swagger-ui/index.html
http://localhost:9111/swagger-ui/index.html

Cómo probar en dev:EN CUAL QUIER LUGAR POR SEPARADO

$body = @{
  username = "user"
  password = "user123"
} | ConvertTo-Json


$response = Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:7091/auth/login" `
  -ContentType "application/json" `
  -Body $body

$token = $response.accessToken


$response


Write-Host "TOKEN: $token"


-*

============================================================
SESION OBSERVABILIDAD (PROMETHEUS + LOKI + GRAFANA)
PROYECTO COMPLETO: gateway + auth + catalogo + producto + pedido + pago
============================================================

Herramientas:
  Prometheus -> metricas
  Loki       -> logs centralizados
  Promtail   -> envio de logs a Loki
  Grafana    -> dashboards, exploracion y alertas


Flujo del proyecto:
  Cliente -> Gateway -> Auth (login)
                    -> Catalogo
                    -> Producto -> Catalogo (Feign)
                    -> Pedido   -> Pago (Feign)
                       |          |        |
                       +-- logs y metricas de TODOS --+
                                  |
                        Prometheus + Loki + Grafana


============================================================
PASO 0. PREPARACION
============================================================

# Levantar observability
cd D:\ms1\ProyectoMS2026\observability
docker compose -f docker-compose-dev.yml up -d

# Verificar que esten arriba los 4
docker ps --filter "name=prometheus" --filter "name=grafana" --filter "name=loki" --filter "name=promtail" --format "table {{.Names}}\t{{.Status}}"

# URLs
Prometheus: http://localhost:19090
Grafana:    http://localhost:13000   (admin / admin)
Loki:       http://localhost:13100   (se consulta via Grafana, no por navegador)


============================================================
CASO 1. METRICAS ESENCIALES
"que esta pasando en el sistema?"
============================================================

# 1.1 — Validar servicios vivos en Prometheus
http://localhost:19090/targets

  Se espera UP en:
    - gateway-dev
    - auth-dev          (si aun no esta, agregar al prometheus-dev.yml)
    - catalogo-dev
    - producto-dev
    - pedido-dev
    - pago-dev

Consulta PromQL:
  up

  Lectura: "Prometheus, dime si cada target esta disponible"
  1 = puede leer metricas
  0 = no puede leer metricas


# 1.2 — Generar trafico

# Login (necesario para POST pedidos)
$body  = @{ username = "admin"; password = "admin123" } | ConvertTo-Json
$res   = Invoke-RestMethod -Method Post -Uri "http://localhost:7091/auth/login" -ContentType "application/json" -Body $body
$token = $res.accessToken
$h     = @{ Authorization = "Bearer $token" }

# Ráfaga de trafico (lectura GETs publicos)
1..30 | ForEach-Object {
    Invoke-RestMethod -Method Get -Uri "http://localhost:7091/api/v1/categorias"            | Out-Null
    Invoke-RestMethod -Method Get -Uri "http://localhost:7091/api/v1/productos"             | Out-Null
    Invoke-RestMethod -Method Get -Uri "http://localhost:7091/api/v1/productos/detalle/1"   | Out-Null
    Invoke-RestMethod -Method Get -Uri "http://localhost:7091/api/v1/pedidos"               | Out-Null
    Invoke-RestMethod -Method Get -Uri "http://localhost:7091/api/v1/pagos"                 | Out-Null
    Invoke-RestMethod -Method Get -Uri "http://localhost:7091/api/v1/catalogo/instancia"    | Out-Null
    Invoke-RestMethod -Method Get -Uri "http://localhost:7091/api/v1/producto/instancia"    | Out-Null
    Invoke-RestMethod -Method Get -Uri "http://localhost:7091/api/v1/pedido/instancia"      | Out-Null
    Invoke-RestMethod -Method Get -Uri "http://localhost:7091/api/v1/pago/instancia"        | Out-Null
    Write-Host "Vuelta $_"
    Start-Sleep -Milliseconds 150
}

# Crear 5 pedidos (escritura — usa Auth; registra pago via Feign)
1..5 | ForEach-Object {
    $p = @{ userId = 1; cliente = "admin"; estado = "PENDIENTE"; direccionEnvio = "Lima"; items = @(@{ productoId = 1; cantidad = 1 }) } | ConvertTo-Json -Depth 5
    Invoke-RestMethod -Method Post -Uri "http://localhost:7091/api/v1/pedidos" -ContentType "application/json" -Headers $h -Body $p | Out-Null
    Write-Host "Pedido $_ creado"
    Start-Sleep -Milliseconds 300
}


# 1.3 — Requests por segundo por servicio

Consulta PromQL:
  sum by (job) (rate(http_server_requests_seconds_count[1m]))

  Panel sugerido:
    tipo:      Time series
    titulo:    Requests por segundo
    leyenda:   {{job}}

  Lectura: "cuantas requests/seg recibe cada servicio en el ultimo minuto"
  Esperado al lanzar la rafaga:
    gateway-dev sube primero
    producto-dev sube (por GET productos)
    catalogo-dev sube (Feign desde producto)
    pedido-dev y pago-dev suben cuando creas pedidos


# 1.4 — Errores HTTP 5xx

Consulta PromQL:

  sum by (job, status) (rate(http_server_requests_seconds_count{status=~"5.."}[1m]))

  Esperado: cero en condiciones normales.
  Si sube en producto-dev al apagar catalogo, ahi se ve la utilidad.


# 1.5 — Errores HTTP 4xx

Consulta PromQL:

  sum by (job, status) (rate(http_server_requests_seconds_count{status=~"4.."}[1m]))

  Sirve para detectar 401 (sin token) o 403 (rol insuficiente).
  Sube cuando intentas crear/borrar productos con un user sin rol ADMIN.


# 1.6 — Latencia promedio (ms)

Consulta PromQL:

  sum by (job) (rate(http_server_requests_seconds_sum[1m])) / sum by (job) (rate(http_server_requests_seconds_count[1m])) * 1000

  Lectura: tiempo promedio (en ms) que tarda cada servicio en responder.


# 1.7 — CPU del proceso

Consulta PromQL:

  avg by (job) (process_cpu_usage) * 100

  Esperado: <5% en reposo. Sube cuando lanzas la rafaga.


# 1.8 — Memoria heap (MB)

Consulta PromQL:
  sum by (job) (jvm_memory_used_bytes{area="heap"}) / 1024 / 1024


# 1.9 — Threads vivos

Consulta PromQL:
  avg by (job) (jvm_threads_live_threads)





  *****

 LOKI LOKI *LOKI* LOKI LOKI 
============================================================
CASO 2. LOGS EN LOKI
"que paso dentro de los servicios?"
============================================================

# Ir a Grafana
http://localhost:13000
  Menu izquierdo -> Explore
  Datasource: Loki
  Range: Last 15 minutes

# 2.1 — Confirmar que Loki recibe logs de TODOS los servicios

Consultas LogQL (probar una por una):

  {service="gateway"}
  {service="auth"}
  {service="catalogo"}
  {service="producto"}
  {service="pedido"}
  {service="pago"}

Si una no devuelve resultados:
  - revisa que el servicio este corriendo
  - revisa que escriba a services/<nombre>/logs/*.log
  - revisa promtail/config.yml


# 2.2 — Ver flujo completo de una peticion

Consulta LogQL:

  {service=~"gateway|auth|catalogo|producto|pedido|pago"}

  Sirve para ver TODOS los logs juntos y seguir el flujo:
    gateway recibe peticion
    auth valida JWT
    producto procesa
    catalogo responde (Feign)
    pedido registra pago via Feign
    pago guarda pago PENDIENTE


# 2.3 — Filtrar por texto (reducir ruido)

  {service="gateway"}  |= "GATEWAY"
  {service="auth"}     |= "login"
  {service="auth"}     |= "AUTH"
  {service="catalogo"} |= "CATALOGO"
  {service="producto"} |= "PRODUCTO"
  {service="pedido"}   |= "PEDIDO"
  {service="pago"}     |= "PAGO"

  Solo errores:
  {service=~".+"} |= "ERROR"

  Cuando arranca un servicio:
  {service=~".+"} |= "Started"


# 2.4 — Logs del flujo pedido -> pago (Feign)

  {service="pedido"} |= "Pago PENDIENTE registrado"
  {service="pago"}   |= "Registro de pago"


# 2.5 — Seguir un traceId (correlacion entre servicios)

  # Primero ejecuta una peticion y copia el x-trace-id del response header
  Invoke-WebRequest -Uri "http://localhost:7091/api/v1/productos/detalle/1" |
    Select-Object -ExpandProperty Headers

  # Toma el valor de "x-trace-id" y busca en Loki:
  {service=~".+"} |= "TU_TRACE_ID_AQUI"

  Vas a ver el camino completo: gateway -> producto -> catalogo con el mismo ID.


============================================================
CASO 3. FALLAS CONTROLADAS (combinar metricas + logs)
============================================================

# 3.1 — Apagar CATALOGO (impacta a producto vía Feign)

  Ctrl + C en la terminal de catalogo
  
  Probar:
    Invoke-RestMethod -Uri "http://localhost:7091/api/v1/productos/detalle/1"

  En Prometheus:
    up{job="catalogo-dev"}                         -> debe ser 0
    rate(http_server_requests_seconds_count{status=~"5.."}[1m])
    # Si tienes Circuit Breaker bien configurado, el detalle retorna producto
    # con categoria = null (fallback). Si NO esta bien, ves 5xx en producto.

  En Loki:
    {service="producto"} |= "ERROR"
    {service="producto"} |= "Feign"
    {service="producto"} |= "CircuitBreaker"

  Volver a levantar:
    cd D:\ms1\ProyectoMS2026\services\catalogo
    mvn spring-boot:run


# 3.2 — Apagar AUTH (impacta a TODO el sistema con JWT)

  Ctrl + C en la terminal de auth
  
  Probar:
    $body = @{ username = "admin"; password = "admin123" } | ConvertTo-Json
    Invoke-RestMethod -Method Post -Uri "http://localhost:7091/auth/login" -ContentType "application/json" -Body $body
    # Debe fallar (timeout o 503)

  En Prometheus:
    up{job="auth-dev"}                             -> 0

  En Loki:
    {service="gateway"} |= "auth"
    {service="gateway"} |= "ERROR"


# 3.3 — Apagar PAGO (impacta al registro automatico del pago)

  Ctrl + C en la terminal de pago

  Crear pedido:
    El pedido se crea OK, pero en logs de pedido veras error al llamar a pago via Feign.

  En Loki:
    {service="pedido"} |= "No se pudo registrar el pago"

  Volver a levantar:
    cd services\pago
    mvn spring-boot:run


# 3.4 — Apagar PEDIDO

  Ctrl + C en la terminal de pedido

  En Prometheus:
    up{job="pedido-dev"}                           -> 0

  En el navegador (debe fallar):
    http://localhost:7091/api/v1/pedidos


============================================================
CASO 4. ALERTAS EN GRAFANA
============================================================

Crear alertas para los servicios criticos:

# 4.1 — Alerta: AUTH caido
Grafana -> Alerting -> Alert rules -> New alert rule
  Nombre:     Auth caido
  Datasource: Prometheus
  Consulta:   up{job="auth-dev"}
  Condicion:  IS BELOW 1
  Evaluacion: Every 30s for 1m
  Mensaje:    "Auth no responde. Ningun login JWT funcionara."

# 4.2 — Alerta: GATEWAY caido
  Consulta:   up{job="gateway-dev"}
  Mensaje:    "Gateway caido. Todo el trafico publico esta interrumpido."

# 4.3 — Alerta: CATALOGO caido
  Consulta:   up{job="catalogo-dev"}
  Mensaje:    "Catalogo caido. Producto/detalle perdera la categoria."

# 4.4 — Alerta: PRODUCTO caido
  Consulta:   up{job="producto-dev"}

# 4.5 — Alerta: PEDIDO caido
  Consulta:   up{job="pedido-dev"}

# 4.6 — Alerta: PAGO caido
  Consulta:   up{job="pago-dev"}

# 4.7 — Alerta: Errores 5xx altos
  Consulta:   sum by (job) (rate(http_server_requests_seconds_count{status=~"5.."}[1m]))
  Condicion:  IS ABOVE 0.1
  Evaluacion: Every 30s for 2m
  Mensaje:    "Algun servicio esta devolviendo mas de 0.1 errores 5xx por segundo"

# 4.8 — Alerta: Memoria heap alta
  Consulta:   max by (job) (jvm_memory_used_bytes{area="heap"} / jvm_memory_max_bytes{area="heap"}) * 100
  Condicion:  IS ABOVE 80
  Mensaje:    "Heap por encima de 80% — posible fuga de memoria"


============================================================
DASHBOARDS LISTOS PARA IMPORTAR
============================================================

Grafana -> Dashboards -> New -> Import -> escribir ID -> Load -> datasource Prometheus -> Import

  4701    JVM Micrometer            (CPU, memoria, threads, GC por servicio)
  12900   Spring Boot APM Dashboard (latencia, throughput, errores)
  14430   Spring Boot Statistics    (alternativo)
  7362    MySQL Overview            (si quieres ver tus 5 BDs)


============================================================
============================================================
FLUJO PEDIDO -> PAGO (Feign, sin Kafka)
============================================================

Al crear un pedido, pedido llama a pago via Feign y registra un pago PENDIENTE.

Logs esperados en Loki:
  {service="pedido"} |= "Pago PENDIENTE registrado"
  {service="pago"}   |= "Registro de pago"

============================================================
CHECKLIST FINAL
============================================================

FLUJO NEGOCIO
  [ ] Crear pedido -> aparece pago PENDIENTE automaticamente
  [ ] GET /api/v1/pagos/pedido/{id} devuelve el pago

============================================================
CIERRE CONCEPTUAL
============================================================

  "Las metricas me dicen QUE algo paso."
  "Los logs me ayudan a entender POR QUE paso."
  "Las alertas me avisan CUANDO debo mirar."
  "Feign permite que pedido y pago se comuniquen de forma sincrona y simple."

============================================================
ATAJOS UTILES
============================================================

# Ver todos los contenedores
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Apagar observability
cd D:\ms1\ProyectoMS2026\observability
docker compose -f docker-compose-dev.yml down

docker compose -f docker-compose-dev.yml down

# Limpiar variables PowerShell
Remove-Variable body, res, response, token, h, pedido, nuevo, p -ErrorAction SilentlyContinue
Clear-Host




