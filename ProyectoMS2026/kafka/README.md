# kafka

Stack de Apache Kafka para los ambientes `dev` y `prod`.

Este modulo solo contiene infraestructura Kafka:

- `kafka`: broker Kafka con imagen `apache/kafka:4.2.0`
- `kafka-exporter`: metricas de Kafka para Prometheus
- `kafka-ui`: interfaz web de administracion

Prometheus y Grafana viven en `observability`, no en este modulo.

## Archivos

- `docker-compose-dev.yml`: Kafka para desarrollo
- `docker-compose.yml`: Kafka para produccion

## Puertos

| Servicio | DEV | PROD | Interno |
|---|---:|---:|---:|
| Kafka | 41092 | 29092 | 9092 |
| Kafka exporter | 41308 | 29308 | 9308 |
| Kafka UI | 41085 | 28085 | 8080 |

## Redes

En `dev`, Kafka crea y usa su propia red:

```text
kafka-ms-dev-net
```

Otros contenedores dev que necesiten hablar con Kafka deben unirse a esa red y usar:

```text
kafka:9092
```

En `prod`, `infra` crea la red compartida:

```text
ms-net
```

El broker `kafka` y `kafka-exporter` se conectan a `ms-net`. Los microservicios prod usan:

```text
kafka:9092
```

Kafka UI queda en la red interna `kafka-prod-net`.

## Levantar DEV

```powershell
cd C:\ms1\ProyectosMS2026\kafka
docker compose -f docker-compose-dev.yml up -d
docker compose -f docker-compose-dev.yml ps
```

Accesos:

- Kafka desde host: `localhost:41092`
- Kafka entre contenedores: `kafka:9092`
- Kafka UI: `http://localhost:41085`
- Exporter: `http://localhost:41308/metrics`

## Levantar PROD

Primero debe existir `ms-net`, creada por `infra`:

```powershell
cd C:\ms1\ProyectosMS2026\infra
docker compose up -d
```

Luego Kafka:

```powershell
cd C:\ms1\ProyectosMS2026\kafka
docker compose up -d
docker compose ps
```

Accesos:

- Kafka desde host: `localhost:29092`
- Kafka entre contenedores: `kafka:9092`
- Kafka UI: `http://localhost:28085`
- Exporter: `http://localhost:29308/metrics`

## Operacion basica

Entrar al broker:

```powershell
# dev
docker compose -f docker-compose-dev.yml exec kafka bash

# prod
docker compose exec kafka bash
```

Crear topic:

```bash
/opt/kafka/bin/kafka-topics.sh --create \
  --topic orden-eventos \
  --bootstrap-server kafka:9092 \
  --partitions 1 \
  --replication-factor 1
```

Listar topics:

```bash
/opt/kafka/bin/kafka-topics.sh --list \
  --bootstrap-server kafka:9092
```

Producer manual:

```bash
/opt/kafka/bin/kafka-console-producer.sh \
  --topic orden-eventos \
  --bootstrap-server kafka:9092
```

Consumer manual:

```bash
/opt/kafka/bin/kafka-console-consumer.sh \
  --topic orden-eventos \
  --bootstrap-server kafka:9092 \
  --from-beginning
```

## Observabilidad

Las metricas salen de `kafka-exporter`.

- En dev, Prometheus de `observability` scrapea `host.docker.internal:41308`
- En prod, Prometheus de `observability` scrapea `kafka-exporter:9308` por `ms-net`

## Detener

```powershell
# dev
docker compose -f docker-compose-dev.yml down

# prod
docker compose down
```

## Estado de avance

- [x] Stack Kafka dev con Apache Kafka
- [x] Stack Kafka prod con Apache Kafka
- [x] Kafka UI en dev/prod
- [x] Kafka Exporter para Prometheus
- [x] Red dev dedicada `kafka-ms-dev-net`
- [x] Red prod compartida `ms-net`
- [x] Puertos dev separados de BigData y BI/Debezium
- [x] Topics de practica `orden-eventos` y `pago-eventos`
- [ ] Hardening de seguridad Kafka
- [ ] Retencion y particiones avanzadas por ambiente

---

## Tag sugerido

```bash
git tag -a vs09-kafka -m "eda con vs09-kafka"
git push origin vs09-kafka
```

