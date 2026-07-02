# Observability Platform

Stack externo y compartido de observabilidad para la plataforma.

Incluye:

- Prometheus
- Loki
- Promtail
- Grafana

Este modulo no forma parte de `infra`.

Material de apoyo de esta fase:

- [SESION-07-OBSERVABILIDAD-CON-HERRAMIENTAS.md](C:/ms1/ProyectosMS2026/observability/SESION-07-OBSERVABILIDAD-CON-HERRAMIENTAS.md)

## Ubicacion en la secuencia 2026-2

Este modulo corresponde principalmente a:

- `S7` Observabilidad y trazabilidad

Se apoya sobre lo ya construido en:

- `S1-S4` infraestructura distribuida base
- `S6` interaccion entre servicios y resiliencia

La idea pedagogica es:

1. primero tener un sistema distribuido funcional
2. luego tener interaccion real y fallos controlados
3. finalmente observar ese comportamiento con Prometheus, Loki y Grafana

Relacion entre modulos:

```text
infra -> expone gateway y logs
services -> exponen metricas y logs
observability -> consume metricas y logs desde infra y services
```

Importante:

- `infra` no depende de `observability`
- `observability` si depende de que `infra` y los microservicios esten levantados
- habilitar `/actuator/prometheus` en los servicios no obliga a tener Prometheus encendido
- en `dev`, `observability` no usa `ms-net`; usa una red propia porque los servicios corren en el host con `mvn`
- en `prod`, `observability` si usa `ms-net` porque todo corre en Docker

## Archivos del modulo

- `docker-compose-dev.yml` -> observabilidad en `dev`
- `docker-compose.yml` -> observabilidad en `prod`
- `prometheus/prometheus-dev.yml` -> scraping de `dev` via `host.docker.internal`
- `prometheus/prometheus.yml` -> scraping de `prod` via nombres Docker
- `SESION-07-OBSERVABILIDAD-CON-HERRAMIENTAS.md` -> guia didactica de la sesion

## Arranque en DEV

Primero levanta infraestructura y microservicios en `dev`.

```bash
cd infra/config-server
./mvnw spring-boot:run
```

En otra terminal:

```bash
cd infra/registry-server
./mvnw spring-boot:run
```

En otra terminal:

```bash
cd infra/gateway
./mvnw spring-boot:run
```

Luego las bases de datos de desarrollo:

```bash
cd services/catalogo
docker compose -f docker-compose-dev.yml up -d

cd ../producto
docker compose -f docker-compose-dev.yml up -d
```

Luego las aplicaciones:

```bash
cd services/catalogo
./mvnw spring-boot:run

cd ../producto
./mvnw spring-boot:run
```

Finalmente la observabilidad:

```bash
cd observability
docker compose -f docker-compose-dev.yml up -d
```

En `dev`, Prometheus consulta:

- `host.docker.internal:7091`
- `host.docker.internal:8081`
- `host.docker.internal:9091`

## Arranque en PROD

Primero levanta infraestructura y microservicios en `prod`.

```bash
cd infra
docker compose up -d

cd ../services/catalogo
docker compose up -d

cd ../producto
docker compose up -d
```

Luego la observabilidad:

```bash
cd observability
docker compose up -d
```

## Fuentes consumidas

- metricas HTTP y JVM desde `/actuator/prometheus`
- logs de `infra/gateway/logs`
- logs de `services/catalogo/logs`
- logs de `services/producto/logs`

## Puertos

| Herramienta | DEV | PROD |
|---|---:|---:|
| Prometheus | 19090 | 29090 |
| Loki | 13100 | 23100 |
| Grafana | 13000 | 23000 |

Dashboard preconfigurado: **TechStore — Vista general** (carpeta TechStore).

Métricas de negocio expuestas por `pedido` y `pago`:

- `techstore_ventas_completadas`
- `techstore_unidades_vendidas`
- `techstore_ingresos_soles`
- `techstore_producto_unidades_vendidas{producto="..."}`

## Validaciones minimas en DEV

```text
http://localhost:7071/catalogo/dev
http://localhost:7081
http://localhost:7091/actuator/health
http://localhost:8081/actuator/prometheus
http://localhost:9091/actuator/prometheus
http://localhost:19090
http://localhost:13000
```

## Validaciones minimas en PROD

```text
http://localhost:7082
http://localhost:7092/actuator/health
http://localhost:8082/actuator/prometheus
http://localhost:9092/actuator/prometheus
http://localhost:29090
http://localhost:23000
```

## Nota importante

Que `gateway`, `catalogo` y `producto` tengan habilitado `/actuator/prometheus` no significa que Prometheus deba estar encendido.

Solo significa que el endpoint queda disponible para ser consultado cuando exista un colector externo.

## Tag sugerido

```bash
git tag -a vs07-obs-tools -m "Observability: Prometheus, Loki, Promtail y Grafana para dev y prod"
git push origin vs07-obs-tools
```
