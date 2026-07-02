# GUIA DE KAFKA — ProyectoMS2026

## QUE VAS A DEMOSTRAR

```
PEDIDO  ────▶  KAFKA  ────▶  PAGO
(producer)    (topic:        (consumer
              orden-eventos)  @KafkaListener)
```

- Kafka funcionando
- Producer publica eventos (tu microservicio `pedido`)
- Consumer recibe eventos (tu microservicio `pago`)
- Comunicacion asincrona y desacoplada
- Microservicios reales (no scripts Python)

---

## EQUIVALENCIAS PROFE → TU PROYECTO

| Profe                                          | Tu proyecto                                       |
|------------------------------------------------|---------------------------------------------------|
| `orden-ms`                                     | `services/pedido`                                 |
| `pago-ms`                                      | `services/pago`                                   |
| `orden-py-del`                                 | **NO APLICA** — tu producer/consumer es Java      |
| `producer_ordenes.py`                          | clase `OrdenEventProducer.java` (en `pedido`)     |
| `consumer_ordenes.py`                          | clase `OrdenEventConsumer.java` (en `pago`)       |
| topic `orden-eventos`                          | topic `orden-eventos` (igual)                     |
| `POST /api/v1/ordenes`                         | `POST /api/v1/pedidos`                            |
| Puerto 19051                                   | Puerto 7091 (gateway) o 9101 (pedido directo)     |

---

## URLS QUE VAS A USAR

```text
Kafka desde host:       localhost:41092
Kafka entre contenedor: kafka:9092
Kafka UI (web):         http://localhost:41085
Kafka Exporter:         http://localhost:41308/metrics
Gateway (tu API):       http://localhost:7091
Login:                  http://localhost:7091/auth/login
Crear pedido:           http://localhost:7091/api/v1/pedidos
Ver pagos:              http://localhost:7091/api/v1/pagos
```

---

## 🟢 PASO 1 — LEVANTAR KAFKA

📁 **Ruta:** `D:\proyecto final ms\ProyectoMS2026\ProyectoMS2026\kafka`

```powershell
cd D:\proyecto final ms\ProyectoMS2026\ProyectoMS2026\kafka
docker compose -f docker-compose-dev.yml up -d
```

✅ **Verificar:**
```powershell

docker ps --filter "name=kafka"
```

Deben aparecer: `kafka`, `kafka-ui-dev`, `kafka-exporter-dev`.

---

## 🟢 PASO 2 — CREAR EL TOPIC (1 sola vez)

📁 **Ruta:** `D:\proyecto final ms\ProyectoMS2026\ProyectoMS2026\kafka`

```powershell
docker compose -f docker-compose-dev.yml exec kafka /opt/kafka/bin/kafka-topics.sh --create --topic orden-eventos --bootstrap-server kafka:9092 --partitions 1 --replication-factor 1
```

> Si dice "already exists", está bien — ya existía.

✅ **Verificar:**
```powershell
docker compose -f docker-compose-dev.yml exec kafka /opt/kafka/bin/kafka-topics.sh --list --bootstrap-server kafka:9092
```

Debe aparecer: `orden-eventos`

---

## 🟢 PASO 3 — PROBAR MENSAJE MANUAL "hola" (opcional, como el profe)

### Terminal A — CONSUMER (déjala abierta)

📁 **Ruta:** `D:\proyecto final ms\ProyectoMS2026\ProyectoMS2026\kafka`

```powershell
docker compose -f docker-compose-dev.yml exec kafka /opt/kafka/bin/kafka-console-consumer.sh --topic orden-eventos --bootstrap-server kafka:9092 --from-beginning
```

### Terminal B — PRODUCER (escribe a mano)

📁 **Ruta:** `D:\proyecto final ms\ProyectoMS2026\ProyectoMS2026\kafka`

```powershell
docker compose -f docker-compose-dev.yml exec -it kafka /opt/kafka/bin/kafka-console-producer.sh --topic orden-eventos --bootstrap-server kafka:9092
```

Cuando veas `>`, escribe:
```text
hola
```

➡️ Aparece en la Terminal A. ✅ Kafka funciona.

Para salir de cada terminal: `Ctrl + C`.

---

## 🟢 PASO 4 — LEVANTAR PEDIDO (producer real, equivale a `producer_ordenes.py`)

### Terminal C — MySQL de pedido

📁 **Ruta:** `D:\proyecto final ms\ProyectoMS2026\ProyectoMS2026\services\pedido`

```powershell
cd D:\proyecto final ms\ProyectoMS2026\ProyectoMS2026\services\pedido
docker compose -f docker-compose-dev.yml up -d
```


mvn spring-boot:run


## 🟢 PASO 5 — LEVANTAR PAGO (consumer real, equivale a `consumer_ordenes.py`)

### Terminal D — MySQL de pago

📁 **Ruta:** `D:\proyecto final ms\ProyectoMS2026\ProyectoMS2026\services\pago`

```powershell
cd D:\proyecto final ms\ProyectoMS2026\ProyectoMS2026\services\pago
docker compose -f docker-compose-dev.yml up -d
```

### Misma Terminal D — App Spring Boot

```powershell
mvn spring-boot:run
```

Espera ver:
```text
Started PagoApplication in X.XXX seconds
```

> 🔑 **CLAVE:** desde este momento, su `@KafkaListener` está escuchando el topic permanentemente. Es como tener `consumer_ordenes.py` corriendo siempre.

---

## 🟢 PASO 6 — DISPARAR EVENTOS (equivale a `producer_ordenes.py`)

### Terminal E — Login + crear pedidos en bucle

📁 **Ruta:** cualquier carpeta (no importa)

```powershell
# Login
$body  = @{ username = "admin"; password = "admin123" } | ConvertTo-Json
$token = (Invoke-RestMethod -Method Post -Uri "http://localhost:7091/auth/login" -ContentType "application/json" -Body $body).accessToken
$h     = @{ Authorization = "Bearer $token" }

# Bucle de 10 eventos (estilo producer_ordenes.py)
1..10 | ForEach-Object {
    $p = @{ cliente = "Cliente_$_"; estado = "NUEVO"; observacion = "evento $_" } | ConvertTo-Json
    Invoke-RestMethod -Method Post -Uri "http://localhost:7091/api/v1/pedidos" -ContentType "application/json" -Headers $h -Body $p | Out-Null
    Write-Host "[PRODUCER] Pedido $_ publicado a Kafka"
    Start-Sleep -Milliseconds 500
}
```

---

## 🟢 PASO 7 — VER QUE PAGO CONSUMIÓ (equivale a `consumer_ordenes.py`)

### 👀 Mira la Terminal D (donde corre pago)

Verás:
```text
[PAGO] Evento OrdenCreada recibido: ordenId=1, cliente=Cliente_1, estado=NUEVO
[PAGO] Registro de pago PENDIENTE creado para pedido 1
[PAGO] Evento OrdenCreada recibido: ordenId=2, cliente=Cliente_2, estado=NUEVO
[PAGO] Registro de pago PENDIENTE creado para pedido 2
...
```

### 👀 O verifica por API (Terminal E):

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:7091/api/v1/pagos"
```

Deben aparecer 10 pagos nuevos en estado `PENDIENTE`.

---

## 📋 RESUMEN DE EQUIVALENCIAS

| Profe (Python)                                                | Tu proyecto (Java)                                |
|---------------------------------------------------------------|---------------------------------------------------|
| `docker compose ... exec orden-py python producer_ordenes.py` | `Invoke-RestMethod ... POST /api/v1/pedidos`     |
| `docker compose ... exec orden-py python consumer_ordenes.py` | (Ya corre solo cuando arrancas pago — `@KafkaListener`) |

---

## 🎬 TERMINALES ABIERTAS (resumen)

| Terminal | Para qué |
|---|---|
| A | Consumer manual de Kafka (opcional) |
| B | Producer manual "hola" (opcional) |
| C | `pedido` (app) |
| D | `pago` (app) |
| E | Login + comandos PowerShell de prueba |

---

## 🌐 KAFKA UI (interfaz web — opcional)

Abre en el navegador:

```text
http://localhost:41085
```

Navega:
- **Topics** → `orden-eventos` → **Messages** → ver los JSON publicados
- **Topics** → `orden-eventos` → **Settings** → particiones, configs
- **Consumers** → ver lag, offset, asignación
- **Brokers** → salud del broker

---

## 🆘 TROUBLESHOOTING

| Problema | Solución |
|---|---|
| `Topic not exists` | Crea el topic con el comando del PASO 2 |
| `Connection refused localhost:7091` | El gateway no está arriba |
| `401 Unauthorized` | El token expiró (1h) — vuelve a hacer login |
| `403 Forbidden` | Estás usando `user` (necesitas `admin` para crear) |
| No aparece pago | Verifica que pago esté UP y mira la Terminal D |
| Logs de pago vacíos | Mira directamente la Terminal D (mvn spring-boot:run) |

---

## ⚡ DEMO EN 1 MINUTO (para sustentación)

Si tienes que mostrar todo rápido (asumiendo pedido y pago ya están arriba):

```powershell
# 1) Login y disparar producer
$body  = @{ username = "admin"; password = "admin123" } | ConvertTo-Json
$token = (Invoke-RestMethod -Method Post -Uri "http://localhost:7091/auth/login" -ContentType "application/json" -Body $body).accessToken
$h     = @{ Authorization = "Bearer $token" }

Invoke-RestMethod -Method Post -Uri "http://localhost:7091/api/v1/pedidos" `
    -ContentType "application/json" -Headers $h `
    -Body '{"cliente":"Juan","estado":"NUEVO","observacion":"DEMO"}'

# 2) Esperar 3 segundos (Kafka procesa)
Start-Sleep 3

# 3) Mostrar el pago creado automaticamente
Invoke-RestMethod -Method Get -Uri "http://localhost:7091/api/v1/pagos"
```

Y mientras corre, **mira la terminal D (pago)** para que el profe vea el log en vivo.

---

## 💬 EXPLICACIÓN CONCEPTUAL (para hablar frente al profe)

> "Mi profe usa scripts Python (`producer_ordenes.py` y `consumer_ordenes.py`) sueltos para enviar y recibir mensajes de Kafka.
>
> En MI proyecto la misma lógica está **integrada en microservicios Java**:
>
> - **PEDIDO** es el PRODUCER: cada vez que llega un POST `/api/v1/pedidos`, la clase `OrdenEventProducer` usa `KafkaTemplate` para publicar un evento `OrdenCreadaEvent` al topic `orden-eventos`.
>
> - **PAGO** es el CONSUMER: la clase `OrdenEventConsumer` tiene la anotación `@KafkaListener` que automáticamente recibe cualquier mensaje del topic y crea un pago en estado PENDIENTE.
>
> Así demuestro el mismo flujo asíncrono y desacoplado que la guía del profe, pero usando microservicios reales production-ready, no scripts."

---

## ✅ CHECKLIST DE SUSTENTACIÓN

- [ ] PASO 1: Kafka levantado (docker ps muestra kafka)
- [ ] PASO 2: Topic `orden-eventos` creado
- [ ] PASO 3 (opcional): Mensaje manual "hola" probado
- [ ] PASO 4: `pedido` arrancado (Started PedidoApplication)
- [ ] PASO 5: `pago` arrancado (Started PagoApplication)
- [ ] PASO 6: 10 pedidos creados (PowerShell muestra "Pedido X publicado")
- [ ] PASO 7: Logs de pago muestran "Evento OrdenCreada recibido"
- [ ] BONUS: Kafka UI (http://localhost:41085) muestra mensajes
- [ ] BONUS: GET /api/v1/pagos devuelve los pagos PENDIENTE

---

## 📚 COMANDOS RÁPIDOS DE REFERENCIA

```powershell
# Levantar Kafka
cd D:\proyecto final ms\ProyectoMS2026\ProyectoMS2026\kafka
docker compose -f docker-compose-dev.yml up -d

# Apagar Kafka
docker compose -f docker-compose-dev.yml down

# Ver topics
docker compose -f docker-compose-dev.yml exec kafka /opt/kafka/bin/kafka-topics.sh --list --bootstrap-server kafka:9092

# Ver consumer groups
docker compose -f docker-compose-dev.yml exec kafka /opt/kafka/bin/kafka-consumer-groups.sh --list --bootstrap-server kafka:9092

# Detalle del consumer group (lag, offset)
docker compose -f docker-compose-dev.yml exec kafka /opt/kafka/bin/kafka-consumer-groups.sh --describe --group pago-consumer --bootstrap-server kafka:9092

# Consumer en vivo
docker compose -f docker-compose-dev.yml exec kafka /opt/kafka/bin/kafka-console-consumer.sh --topic orden-eventos --bootstrap-server kafka:9092 --from-beginning

# Producer manual
docker compose -f docker-compose-dev.yml exec -it kafka /opt/kafka/bin/kafka-console-producer.sh --topic orden-eventos --bootstrap-server kafka:9092
```

---

## 🎬 RESUMEN VISUAL FINAL

```
PROFE (Python):                          TU PROYECTO (Java):
─────────────────                        ────────────────────
producer_ordenes.py        ≡             POST /api/v1/pedidos
                                         (dispara OrdenEventProducer)

consumer_ordenes.py        ≡             OrdenEventConsumer
                                         (@KafkaListener — siempre activo)

docker exec orden-py       ≡             mvn spring-boot:run
python ...                               en services/pedido y services/pago
```

**Hacen lo MISMO** — solo cambia el lenguaje (Python → Java) y el lugar (script suelto → microservicio integrado).

