# GUIA DE GRAFANA — ProyectoMS2026

Todas las pruebas paso a paso para Grafana (métricas Prometheus + logs Loki + alertas + dashboards).

---

## 🌐 ACCESO

```text
URL:      http://localhost:13000
Usuario:  admin
Password: admin
```

Cuando te pida cambiar password → **Skip**.

---

## ✅ PRUEBA 0 — VERIFICAR DATASOURCES

📍 Menú izquierdo → **Connections** → **Data sources**

Deben aparecer 2:

| Datasource | URL | Estado |
|---|---|---|
| **Prometheus** (default) | http://prometheus:9090 | ✅ Working |
| **Loki** | http://loki:3100 | ✅ Working |

Click en cada uno → botón **Save & test** → debe decir "Successfully queried".

---

## 📊 PRUEBA 1 — MÉTRICAS BÁSICAS (Prometheus)

📍 Menú izquierdo → 🧭 **Explore** → datasource **Prometheus** → rango **Last 15 minutes**

### 1.1 — ¿Están vivos los servicios?

```text
up
```

✅ **Esperado**: tabla con todos los `job` en valor `1` (UP).  
Si alguno aparece en `0`, ese servicio NO está corriendo.

### 1.2 — Solo los servicios DEV

```text
up{job=~".*-dev"}
```

✅ **Esperado**: 6 líneas: auth-dev, gateway-dev, catalogo-dev, producto-dev, pedido-dev, pago-dev.

### 1.3 — Generar tráfico antes (en PowerShell)

```powershell
1..30 | ForEach-Object {
    Invoke-RestMethod -Uri "http://localhost:7091/api/v1/productos" | Out-Null
    Invoke-RestMethod -Uri "http://localhost:7091/api/v1/categorias" | Out-Null
    Invoke-RestMethod -Uri "http://localhost:7091/api/v1/pedidos"    | Out-Null
    Invoke-RestMethod -Uri "http://localhost:7091/api/v1/pagos"      | Out-Null
    Write-Host "Vuelta $_"
    Start-Sleep -Milliseconds 200
}
```

---

## 📊 PRUEBA 2 — TRÁFICO HTTP

### 2.1 — Peticiones por segundo por servicio

```text
sum by (job) (rate(http_server_requests_seconds_count[1m]))
```

✅ Vista **Graph** → una línea por servicio.

### 2.2 — Peticiones por endpoint

```text
sum by (uri) (rate(http_server_requests_seconds_count[1m]))
```

### 2.3 — Top 5 endpoints más llamados

```text
topk(5, sum by (uri, job) (rate(http_server_requests_seconds_count[5m])))
```

### 2.4 — Conteo total por método HTTP

```text
sum by (method) (http_server_requests_seconds_count)
```

---

## ⚠️ PRUEBA 3 — ERRORES HTTP

### 3.1 — Errores 4xx (auth fallos, sin token)

```text
sum by (job, status) (rate(http_server_requests_seconds_count{status=~"4.."}[5m]))
```

### 3.2 — Errores 5xx (errores del servidor)

```text
sum by (job, status) (rate(http_server_requests_seconds_count{status=~"5.."}[5m]))
```

✅ **Esperado**: 0 en estado normal.

### 3.3 — Provocar errores 401 (para verificar)

En PowerShell:
```powershell
# Sin token (genera 401 si productos requiere auth)
1..10 | ForEach-Object {
    try { Invoke-WebRequest -Uri "http://localhost:7091/api/v1/productos" } catch {}
}
```

Vuelve a ejecutar la query 3.1 → deben aparecer 401.

---

## ⏱️ PRUEBA 4 — LATENCIA

### 4.1 — Latencia promedio (ms) por servicio

```text
sum by (job) (rate(http_server_requests_seconds_sum[1m])) / sum by (job) (rate(http_server_requests_seconds_count[1m])) * 1000
```

### 4.2 — Percentil 95 (los más lentos)

```text
histogram_quantile(0.95, sum by (le, job) (rate(http_server_requests_seconds_bucket[5m]))) * 1000
```

### 4.3 — Latencia por endpoint

```text
sum by (uri) (rate(http_server_requests_seconds_sum[1m])) / sum by (uri) (rate(http_server_requests_seconds_count[1m])) * 1000
```

---

## 💻 PRUEBA 5 — RECURSOS JVM

### 5.1 — % CPU usado por cada servicio

```text
avg by (job) (system_cpu_usage) * 100
```

### 5.2 — % CPU del proceso Java

```text
avg by (job) (process_cpu_usage) * 100
```

### 5.3 — Memoria HEAP (MB)

```text
sum by (job) (jvm_memory_used_bytes{area="heap"}) / 1024 / 1024
```

### 5.4 — % de heap usado

```text
sum by (job) (jvm_memory_used_bytes{area="heap"}) / sum by (job) (jvm_memory_max_bytes{area="heap"}) * 100
```

### 5.5 — Threads vivos

```text
avg by (job) (jvm_threads_live_threads)
```

### 5.6 — Garbage Collector (pausas)

```text
sum by (job) (rate(jvm_gc_pause_seconds_sum[1m]))
```

### 5.7 — Uptime de cada servicio (segundos)

```text
process_uptime_seconds
```

---

## 📋 PRUEBA 6 — LOGS (Loki)

📍 **Explore** → cambia datasource a **Loki** → rango **Last 15 minutes**

### 7.1 — Verificar que cada servicio tenga logs

Probar uno por uno:

```text
{service="auth"}
{service="gateway"}
{service="catalogo"}
{service="producto"}
{service="pedido"}
{service="pago"}
```

✅ Cada query debe devolver al menos 1 línea de log.

### 7.2 — Todos los logs juntos

```text
{job=~".+"}
```

### 7.3 — Solo errores

```text
{job=~".+"} |= "ERROR"
```

### 7.4 — Solo warnings

```text
{job=~".+"} |= "WARN"
```

### 7.5 — Filtros específicos del proyecto

```text
{service="auth"}     |= "login"
{service="producto"} |= "PRODUCTO"
{service="pedido"}   |= "Pago PENDIENTE registrado"
{service="pago"}     |= "Registro de pago"
{service="gateway"}  |= "GATEWAY"
```

### 7.6 — Cuando arrancan los servicios

```text
{job=~".+"} |= "Started"
```

### 6.7 — Flujo pedido -> pago (Feign)

```text
{service="pedido"} |= "Pago PENDIENTE registrado"
{service="pago"}   |= "Registro de pago"
```

---

## 🎨 PRUEBA 7 — IMPORTAR DASHBOARDS LISTOS

📍 Menú izquierdo → **Dashboards** → botón **New** → **Import**

| ID | Nombre | Descripción |
|---|---|---|
| **4701** | JVM (Micrometer) | CPU, memoria, threads, GC por servicio |
| **12900** | Spring Boot APM Dashboard | Latencia, throughput, errores |
| **14430** | Spring Boot Statistics | Alternativo |
| **7362** | MySQL Overview | Bases de datos (si las quieres ver) |

Pasos:
1. Click **New** → **Import**
2. En **Find and import dashboards** escribe: `4701`
3. Click **Load**
4. En **Prometheus** dropdown selecciona **Prometheus**
5. Click **Import**

✅ Verás un dashboard hermoso. Arriba derecha cambia entre los servicios con el selector.

---

## 🛠️ PRUEBA 9 — CREAR DASHBOARD PROPIO

📍 **Dashboards** → **New** → **New Dashboard** → **Add visualization** → selecciona **Prometheus**

### Panel 1 — Servicios vivos

| Campo | Valor |
|---|---|
| Tipo | **Stat** |
| Título | "Servicios UP" |
| Query | `up` |
| Legend | `{{job}}` |

### Panel 2 — Tráfico por servicio

| Campo | Valor |
|---|---|
| Tipo | **Time series** |
| Título | "Requests/seg por servicio" |
| Query | `sum by (job) (rate(http_server_requests_seconds_count[1m]))` |
| Legend | `{{job}}` |

### Panel 3 — Errores 5xx

| Campo | Valor |
|---|---|
| Tipo | **Time series** |
| Título | "Errores 5xx" |
| Query | `sum by (job) (rate(http_server_requests_seconds_count{status=~"5.."}[5m]))` |

### Panel 4 — Memoria heap por servicio

| Campo | Valor |
|---|---|
| Tipo | **Time series** |
| Título | "Memoria heap (MB)" |
| Query | `sum by (job) (jvm_memory_used_bytes{area="heap"}) / 1024 / 1024` |

### Panel 5 — Latencia promedio

| Campo | Valor |
|---|---|
| Tipo | **Time series** |
| Título | "Latencia promedio (ms)" |
| Query | `sum by (job) (rate(http_server_requests_seconds_sum[1m])) / sum by (job) (rate(http_server_requests_seconds_count[1m])) * 1000` |

### Panel 6 — Logs en vivo (datasource Loki)

| Campo | Valor |
|---|---|
| Tipo | **Logs** |
| Título | "Logs en vivo" |
| Datasource | **Loki** |
| Query | `{job=~".+"} \|= "ERROR"` |

Guarda dashboard como: **"MS2026 — Resumen"**

---

## 🚨 PRUEBA 10 — ALERTAS

📍 Menú izquierdo → **Alerting** → **Alert rules** → **+ New alert rule**

### Alerta 1 — Auth caído

| Campo | Valor |
|---|---|
| Nombre | "Auth caido" |
| Datasource | Prometheus |
| Query A | `up{job="auth-dev"}` |
| Reduce B | Last |
| Threshold C | `IS BELOW 1` |
| Evaluate | Every `30s` for `1m` |
| Folder | General |
| Annotations | "Auth no responde. Login JWT no funciona." |

### Alerta 2 — Gateway caído

```text
up{job="gateway-dev"}    →    IS BELOW 1
```

### Alerta 3 — Errores 5xx altos

```text
sum by (job) (rate(http_server_requests_seconds_count{status=~"5.."}[1m]))   →   IS ABOVE 0.1
```

### Alerta 4 — Memoria heap alta (>80%)

```text
max by (job) (jvm_memory_used_bytes{area="heap"} / jvm_memory_max_bytes{area="heap"}) * 100   →   IS ABOVE 80
```

### Cómo probar alertas

1. Asegura que el servicio está UP.
2. Apaga el servicio (Ctrl+C).
3. Espera la evaluación (1 min).
4. Menú **Alerting** → **Alert rules** → la alerta cambia de estado a **Firing**.

---

## 🎛️ PRUEBA 11 — VARIABLES DEL DASHBOARD (avanzado)

📍 Dashboard → ⚙️ **Settings** → **Variables** → **New variable**

### Variable `servicio`

| Campo | Valor |
|---|---|
| Name | `servicio` |
| Type | Query |
| Datasource | Prometheus |
| Query | `label_values(up, job)` |
| Multi-value | ✅ |
| Include All option | ✅ |

Aplicar en queries usando `$servicio`:

```text
sum by (job) (rate(http_server_requests_seconds_count{job=~"$servicio"}[1m]))
```

Arriba del dashboard aparecerá un selector para elegir qué servicio mirar.

---

## 📂 PRUEBA 12 — EXPORTAR / IMPORTAR DASHBOARD

### Exportar (compartir con tu profe)

1. Abre tu dashboard
2. ⚙️ **Settings** → **JSON Model**
3. Copia todo el JSON

### Importar de un JSON

1. **Dashboards** → **New** → **Import**
2. Pega el JSON en **Import via panel json**
3. **Load** → **Import**

---

## ✅ CHECKLIST DE SUSTENTACIÓN (para mostrar al profe)

OBSERVABILIDAD MÍNIMA:
- [ ] **PRUEBA 0**: Datasources Prometheus y Loki ambos working
- [ ] **PRUEBA 1.1**: query `up` muestra todos los servicios en 1
- [ ] **PRUEBA 2.1**: tráfico por servicio se mueve cuando lanzo peticiones
- [ ] **PRUEBA 3.2**: errores 5xx en 0 (estado sano)
- [ ] **PRUEBA 4.1**: latencia promedio visible
- [ ] **PRUEBA 5.3**: memoria heap por servicio
- [ ] **PRUEBA 7.1**: logs de los 6 servicios visibles en Loki

OBSERVABILIDAD AVANZADA (para nota extra):
- [ ] **PRUEBA 7**: Dashboard 4701 importado y funcionando
- [ ] **PRUEBA 8**: Dashboard propio "MS2026 — Resumen" creado
- [ ] **PRUEBA 9**: Alerta "Auth caido" creada y probada

DEMOSTRACIÓN EN VIVO:
- [ ] Apagar catalogo → ver query 1.1 cambiar (catalogo-dev = 0)
- [ ] Apagar catalogo → ver alerta cambiar a Firing
- [ ] Crear pedido → ver log en Loki `{service="pago"} |= "Registro de pago"`
- [ ] Provocar 401 → ver errores 4xx subir en query 3.1

---

## 🎯 SECUENCIA RECOMENDADA PARA SUSTENTACIÓN (5 minutos)

```
1. Abrir Grafana                                       (10s)
2. Ir a Explore → Prometheus → query "up"              (30s)
   "Aquí veo que todos mis 6 microservicios están UP"
3. Lanzar tráfico desde PowerShell                     (30s)
4. Query "rate(http_server_requests_seconds_count..."  (1min)
   "Aquí veo el tráfico en vivo de cada microservicio"
5. Ir a Explore → Loki → {service="pago"}              (30s)
   "Aquí veo los logs centralizados de mis servicios"
6. Mostrar dashboard 4701 importado                    (1min)
   "Importé este dashboard para JVM"
7. Ir a Alerting → mostrar alertas creadas             (1min)
   "Tengo alertas configuradas: auth caido, errores 5xx, heap alto"
```

---

## 🆘 TROUBLESHOOTING

| Problema | Solución |
|---|---|
| Datasource Prometheus no funciona | Verifica que prometheus esté UP: `docker ps` |
| Loki sin logs | Verifica que promtail esté UP y que `services/*/logs/*.log` existan |
| Query no devuelve datos | Genera tráfico primero, espera 30s, baja el rango a 5 min |
| Dashboard 4701 vacío | Cambia el filtro de "Application" arriba a un servicio que SÍ exista |
| Alerta no se dispara | Verifica que la condición sea correcta y espera el tiempo `for` |

---

## 📚 CHEAT SHEET DE QUERIES (lo más usado)

```text
# DISPONIBILIDAD
up                                              → ¿servicios vivos?
up{job="auth-dev"}                              → ¿auth vivo?

# TRÁFICO
sum by (job) (rate(http_server_requests_seconds_count[1m]))
topk(5, sum by (uri) (rate(http_server_requests_seconds_count[5m])))

# ERRORES
sum by (job) (rate(http_server_requests_seconds_count{status=~"5.."}[5m]))

# LATENCIA
sum by (job) (rate(http_server_requests_seconds_sum[1m])) / sum by (job) (rate(http_server_requests_seconds_count[1m])) * 1000

# RECURSOS
avg by (job) (system_cpu_usage) * 100
sum by (job) (jvm_memory_used_bytes{area="heap"}) / 1024 / 1024
avg by (job) (jvm_threads_live_threads)

# LOKI
{service="auth"} |= "login"
{job=~".+"} |= "ERROR"
{service="pago"} |= "Registro de pago"
```

---

## FIN

Esta guía cubre **todo lo que necesitas mostrar de Grafana** en tu sustentación. Cubre métricas, logs y alertas — los 3 pilares de observabilidad.
