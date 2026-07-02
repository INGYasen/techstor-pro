# GUIA DE PROMETHEUS — ProyectoMS2026

Todas las pruebas que puedes hacer directamente en la UI de Prometheus (sin Grafana).

---

## 🌐 ACCESO

```text
URL:  http://localhost:19090
```

En la barra superior tienes:
- **Consulta** → escribir queries PromQL
- **Alertas** → alertas configuradas en Prometheus
- **Estado** → ver targets, configuración, banderas

---

## ✅ PRUEBA 0 — TARGETS (lo primero que debes mirar)

📍 **Estado** → **Targets**

Aquí ves a quién está scrapeando Prometheus. Deben aparecer **TODOS en estado `UP` (verde)**:

| Job (trabajo) | Endpoint | Estado |
|---|---|---|
| `auth-dev` | `host.docker.internal:8041/actuator/prometheus` | UP |
| `gateway-dev` | `host.docker.internal:7091/actuator/prometheus` | UP |
| `catalogo-dev` | `host.docker.internal:8081/actuator/prometheus` | UP |
| `producto-dev` | `host.docker.internal:9091/actuator/prometheus` | UP |
| `pedido-dev` | `host.docker.internal:9101/actuator/prometheus` | UP |
| `pago-dev` | `host.docker.internal:9111/actuator/prometheus` | UP |
| `prometheus` | `localhost:9090/metrics` | UP |

⚠️ Si alguno aparece en **DOWN (rojo)** → ese servicio NO está corriendo o no expone `/actuator/prometheus`.

---

## ✅ PRUEBA 1 — DISPONIBILIDAD (la query más importante)

📍 **Consulta** → escribe:

```text
up
```

Click **Ejecutar** → vista **Mesa**.

✅ **Esperado**: tabla con todos los jobs en valor `1`.

### Variantes:

```text
up{job="auth-dev"}                  → ¿Auth vivo?
up == 0                             → solo los que están CAÍDOS
count(up == 1)                      → cuántos servicios están UP
sum(up)                             → total UP
```

---

## 📊 PRUEBA 2 — TRÁFICO HTTP

> 💡 Antes de medir tráfico, genera peticiones en PowerShell:
> ```powershell
> 1..50 | ForEach-Object {
>     Invoke-RestMethod -Uri "http://localhost:7091/api/v1/productos" | Out-Null
>     Invoke-RestMethod -Uri "http://localhost:7091/api/v1/categorias" | Out-Null
>     Start-Sleep -Milliseconds 100
> }
> ```

### 2.1 — Total de peticiones (acumulado)

```text
http_server_requests_seconds_count
```

✅ Cambia a vista **Gráfico** para ver cómo sube en el tiempo.

### 2.2 — Peticiones por segundo

```text
rate(http_server_requests_seconds_count[1m])
```

> ⚠️ En tu captura ya ejecutaste esto. La columna **resultado** muestra: ÉXITO, CLIENT_ERROR, SERVER_ERROR. Los `0,0666...` significa "ese endpoint recibió 4 peticiones en 1 minuto" (4/60 = 0.066).

### 2.3 — Agrupado por servicio (más legible)

```text
sum by (job) (rate(http_server_requests_seconds_count[1m]))
```

### 2.4 — Agrupado por endpoint

```text
sum by (uri) (rate(http_server_requests_seconds_count[1m]))
```

### 2.5 — Top 5 endpoints más usados

```text
topk(5, sum by (uri, job) (rate(http_server_requests_seconds_count[5m])))
```

### 2.6 — Solo peticiones exitosas (status 200)

```text
sum by (job) (rate(http_server_requests_seconds_count{status="200"}[1m]))
```

### 2.7 — Por método HTTP

```text
sum by (method) (rate(http_server_requests_seconds_count[1m]))
```

---

## ⚠️ PRUEBA 3 — ERRORES

### 3.1 — Errores 4xx (cliente: 401 sin token, 404 no existe)

```text
sum by (job, status) (rate(http_server_requests_seconds_count{status=~"4.."}[5m]))
```

### 3.2 — Errores 5xx (servidor)

```text
sum by (job, status) (rate(http_server_requests_seconds_count{status=~"5.."}[5m]))
```

### 3.3 — Tasa de error % (calidad del servicio)

```text
sum by (job) (rate(http_server_requests_seconds_count{status=~"5.."}[5m])) / sum by (job) (rate(http_server_requests_seconds_count[5m])) * 100
```

### 3.4 — Provocar 401 para verificar

En PowerShell:
```powershell
1..20 | ForEach-Object {
    try { Invoke-WebRequest -Uri "http://localhost:7091/api/v1/productos" -Method POST } catch {}
}
```

Vuelve a ejecutar query 3.1 → verás aumentar los `401`.

---

## ⏱️ PRUEBA 4 — LATENCIA (tiempo de respuesta)

### 4.1 — Tiempo promedio (segundos)

```text
rate(http_server_requests_seconds_sum[1m]) / rate(http_server_requests_seconds_count[1m])
```

### 4.2 — Tiempo promedio en milisegundos por servicio

```text
sum by (job) (rate(http_server_requests_seconds_sum[1m])) / sum by (job) (rate(http_server_requests_seconds_count[1m])) * 1000
```

### 4.3 — Percentil 95 (el 95% de peticiones tarda menos que esto)

```text
histogram_quantile(0.95, sum by (le, job) (rate(http_server_requests_seconds_bucket[5m]))) * 1000
```

### 4.4 — Percentil 99 (los más lentos)

```text
histogram_quantile(0.99, sum by (le, job) (rate(http_server_requests_seconds_bucket[5m]))) * 1000
```

### 4.5 — Tiempo MÁXIMO registrado

```text
http_server_requests_seconds_max
```

---

## 💻 PRUEBA 5 — JVM (memoria, CPU, hilos)

### 5.1 — % CPU del sistema

```text
system_cpu_usage * 100
```

### 5.2 — % CPU del proceso Java

```text
process_cpu_usage * 100
```

### 5.3 — Núcleos disponibles

```text
system_cpu_count
```

### 5.4 — Memoria HEAP usada (MB)

```text
sum by (job) (jvm_memory_used_bytes{area="heap"}) / 1024 / 1024
```

### 5.5 — Memoria HEAP máxima (MB)

```text
sum by (job) (jvm_memory_max_bytes{area="heap"}) / 1024 / 1024
```

### 5.6 — % HEAP usado

```text
sum by (job) (jvm_memory_used_bytes{area="heap"}) / sum by (job) (jvm_memory_max_bytes{area="heap"}) * 100
```

### 5.7 — Threads vivos

```text
jvm_threads_live_threads
```

### 5.8 — Threads en cada estado

```text
jvm_threads_states_threads
```

### 5.9 — Garbage Collector (pausas)

```text
rate(jvm_gc_pause_seconds_sum[1m])
```

### 5.10 — Clases cargadas

```text
jvm_classes_loaded_classes
```

### 5.11 — Uptime de cada servicio (segundos)

```text
process_uptime_seconds
```

### 5.12 — Uptime en horas

```text
process_uptime_seconds / 3600
```

---

## 🗄️ PRUEBA 6 — BASE DE DATOS (HikariCP)

### 6.1 — Conexiones activas

```text
hikaricp_connections_active
```

### 6.2 — Conexiones disponibles

```text
hikaricp_connections_idle
```

### 6.3 — Total de conexiones

```text
hikaricp_connections
```

### 6.4 — Tiempo de uso de conexión

```text
hikaricp_connections_usage_seconds_max
```

---

## 🔍 PRUEBA 7 — MÉTRICAS PROPIAS DE SPRING

### 8.1 — Total de peticiones HTTP por servicio

```text
sum by (job) (http_server_requests_seconds_count)
```

### 8.2 — Tasa de logs por nivel

```text
rate(logback_events_total[1m])
```

### 8.3 — Logs de ERROR

```text
rate(logback_events_total{level="error"}[1m])
```

### 8.4 — Logs de WARN

```text
rate(logback_events_total{level="warn"}[1m])
```

---

## 🎯 PRUEBA 9 — FILTROS AVANZADOS

### 9.1 — Solo un servicio específico

```text
http_server_requests_seconds_count{job="producto-dev"}
```

### 9.2 — Varios servicios

```text
up{job=~"producto-dev|pedido-dev|pago-dev"}
```

### 9.3 — Excluir un endpoint

```text
http_server_requests_seconds_count{uri!="/actuator/prometheus"}
```

### 9.4 — Solo endpoints de API

```text
http_server_requests_seconds_count{uri=~"/api/v1/.*"}
```

### 9.5 — Solo errores

```text
http_server_requests_seconds_count{status!="200"}
```

---

## 🚨 PRUEBA 10 — ALERTAS (en Prometheus, no Grafana)

📍 **Alertas** (botón superior)

Aquí ves las reglas de alerta configuradas en `observability/prometheus/`.

Para verificar qué alertas hay:

📍 **Estado** → **Reglas**

Verás reglas como (si están configuradas):
- `ServiceDown` — algún servicio bajó
- `HighErrorRate` — muchos 5xx
- `HighMemoryUsage` — heap >80%

> ⚠️ Si no tienes reglas de alerta cargadas en Prometheus, las haces en **Grafana** (más fácil, ver `GRAFANA_GUIA.md` Prueba 10).

---

## 📋 PRUEBA 11 — CONFIGURACIÓN

📍 **Estado** → **Configuración**

Aquí ves el `prometheus.yml` completo cargado. Útil para verificar:
- Cada cuánto scrapea (`scrape_interval: 5s`)
- Qué jobs tiene configurados
- Qué etiquetas externas

📍 **Estado** → **Banderas en línea de comandos**

Aquí ves con qué parámetros arrancó Prometheus.

---

## 📊 PRUEBA 12 — VISTA GRÁFICA (built-in)

Para CUALQUIER query:

1. Escribe la query (ej. `up`)
2. Click **Ejecutar**
3. Click pestaña **Gráfico** (al lado de Mesa)
4. Ajusta rango: `15m`, `1h`, `6h`, `1d`
5. Verás la gráfica en el tiempo

✅ Esto es Prometheus puro, sin Grafana. Es feo pero funciona.

---

## ✅ CHECKLIST DE PRUEBAS EN PROMETHEUS

LO MÍNIMO:
- [ ] **PRUEBA 0**: Targets → todos UP (verde)
- [ ] **PRUEBA 1**: `up` → 6 servicios en 1
- [ ] **PRUEBA 2.3**: `sum by (job) (rate(http_server_requests_seconds_count[1m]))`
- [ ] **PRUEBA 5.4**: memoria heap por servicio

LO IDEAL (para tu nota):
- [ ] **PRUEBA 3.3**: tasa de error %
- [ ] **PRUEBA 4.3**: percentil 95 latencia
- [ ] **PRUEBA 5.7**: threads vivos por servicio
- [ ] **PRUEBA 6.1**: conexiones HikariCP
- [ ] Crear pedido y verificar pago PENDIENTE en logs de pago

---

## 🎯 SECUENCIA DEMO PARA SUSTENTAR (3 minutos)

```
1. Abrir http://localhost:19090                            (10s)
2. Estado → Targets → "Aquí veo que Prometheus está        (30s)
   scrapeando los microservicios y todos están UP"
3. Consulta → "up" → "Comprobamos que todos viven"         (20s)
4. Lanzar tráfico en PowerShell (script de PRUEBA 2)        (30s)
5. Consulta → "sum by (job) (rate(...))" → modo Gráfico    (40s)
   "Aquí veo el tráfico en vivo"
6. Crear un pedido → verificar pago PENDIENTE en pago      (30s)
```

---

## 🆘 TROUBLESHOOTING

| Problema | Solución |
|---|---|
| Targets en DOWN | Ese servicio no está corriendo. Levántalo con `mvn spring-boot:run` |
| `up` no muestra el servicio | El servicio no está en `prometheus-dev.yml`. Revisa el archivo |
| `http_server_requests_seconds_count` vacío | El servicio no ha recibido peticiones. Genera tráfico |
| Query da error de sintaxis | Revisa paréntesis y comillas dobles `"` (no simples) |

---

## 📚 CHEAT SHEET — TOP 10 QUERIES MÁS ÚTILES

```text
# 1. ¿Quién vive?
up

# 2. Tráfico por servicio
sum by (job) (rate(http_server_requests_seconds_count[1m]))

# 3. Errores 5xx
sum by (job) (rate(http_server_requests_seconds_count{status=~"5.."}[5m]))

# 4. Latencia P95 (ms)
histogram_quantile(0.95, sum by (le, job) (rate(http_server_requests_seconds_bucket[5m]))) * 1000

# 5. % CPU
system_cpu_usage * 100

# 6. Memoria heap (MB)
sum by (job) (jvm_memory_used_bytes{area="heap"}) / 1024 / 1024

# 7. Threads
jvm_threads_live_threads
```

---

## 🔗 ¿CUÁNDO USAR PROMETHEUS Y CUÁNDO GRAFANA?

| Usa Prometheus cuando... | Usa Grafana cuando... |
|---|---|
| Quieres ver targets y debug | Quieres dashboards bonitos |
| Necesitas probar queries rápido | Quieres mostrar al profe |
| Ver alertas activas | Crear paneles persistentes |
| Comprobar configuración | Ver logs (Loki) |

> En tu sustentación, abre **ambos**: Prometheus para mostrar Targets, Grafana para mostrar dashboards.

---

## FIN

Cubre lo mínimo (Prueba 0, 1, 2.3, 5.4, 7.1) y tienes Prometheus aprobado. Para el resto usa Grafana (mejor visual).
