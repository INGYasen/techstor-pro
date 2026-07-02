﻿# Sesion U2 S9 P2: Observabilidad de pipelines

## 1. Titulo

Observabilidad de pipelines de datos con Kafka, Spark Structured Streaming, Prometheus y Grafana.

## 2. Objetivo

Instrumentar y evaluar un pipeline de datos en tiempo real basado en Kafka y Spark Structured Streaming, incorporando metricas, latencia, throughput, logging estructurado y alertas minimas para verificar el estado operativo del flujo de eventos desde su produccion hasta su consumo.

Esta practica pertenece al curso de Big Data. Por eso el foco no es la observabilidad completa de microservicios, sino la observabilidad del pipeline de datos:

```text
Producer -> Kafka -> Spark Structured Streaming -> metricas/evidencias
```

Los microservicios como `orden-ms` o scripts como `orden-py` pueden usarse como productores de eventos, pero solo como fuentes del pipeline.

## 3. Resultado esperado

Al finalizar la practica, el estudiante debe entregar un pipeline observable donde pueda demostrar:

- Kafka esta disponible y recibiendo eventos.
- El producer genera eventos con informacion minima para trazabilidad.
- Spark consume y procesa eventos desde Kafka.
- Se puede medir latencia entre produccion y consumo.
- Se puede estimar throughput por intervalo o micro-batch.
- Existen logs estructurados basicos del producer y/o consumer.
- Prometheus recolecta metricas relevantes.
- Grafana muestra un tablero minimo de operacion.
- Se han definido alertas operativas basicas.

En el notebook `08_observabilidad_pipeline_kafka_spark.ipynb`, los puntos nuevos se evidencian asi:

| Resultado | Evidencia en el notebook | Interpretacion |
|---|---|---|
| Latencia entre produccion y consumo | columnas `timestamp`, `processedAt`, `latencyMs` | `timestamp` viene del producer; `processedAt` lo genera Spark; `latencyMs` muestra cuanto demoro el evento en llegar/procesarse |
| Throughput por micro-batch | `query_console.lastProgress` | `numInputRows`, `inputRowsPerSecond` y `processedRowsPerSecond` indican cuantos eventos proceso Spark en el ultimo micro-batch |
| Logs estructurados | salida JSON del Paso 7 y logs del producer | permite registrar `service`, `component`, `topic`, `batchId`, filas procesadas y estado del procesamiento |

## 4. Herramientas utilizadas

- Apache Kafka
- Kafka Exporter
- Prometheus
- Grafana
- Spark Structured Streaming
- Jupyter Notebook
- Docker Compose
- Producer de eventos: `orden-py` o `orden-ms`
- Navegador web

## 5. Entorno de trabajo

Trabaja sobre el entorno `dev` del proyecto `kafka` usando:

- Kafka desde el host: `localhost:41092`
- Kafka entre contenedores: `kafka:9092`
- Kafka exporter: `http://localhost:41308/metrics`
- Prometheus: `http://localhost:19090`
- Grafana: `http://localhost:13000`
- Topic sugerido: `orden-eventos`

Kafka se levanta desde `kafka/docker-compose-dev.yml`. Prometheus y Grafana se levantan desde `observability/docker-compose-dev.yml`.

Para esta practica se usa un notebook nuevo, empezando desde cero:

```text
bigdata-lab/notebooks/08_observabilidad_pipeline_kafka_spark.ipynb
```

El notebook `07_spark_streaming_consumer_ordenes.ipynb` queda como base de Spark Structured Streaming de la sesion anterior.

## 6. Flujo observado

El pipeline observado es:

```text
Producer de eventos -> Kafka -> Spark Structured Streaming
```

La capa de observabilidad minima es:

```text
Kafka -> kafka-exporter -> Prometheus -> Grafana
```

La interpretacion de cada componente es:

- `Producer`: genera eventos de negocio, por ejemplo ordenes.
- `Kafka`: recibe y almacena temporalmente los eventos.
- `Spark Structured Streaming`: consume, valida y procesa los eventos por micro-batches.
- `kafka-exporter`: consulta Kafka y expone metricas para Prometheus.
- `Prometheus`: recolecta periodicamente metricas.
- `Grafana`: visualiza metricas y permite construir un tablero de operacion.

## 7. Casos de uso de la practica

### 7.1 Monitoreo de disponibilidad del pipeline

Verifica que los componentes minimos esten activos:

```text
Kafka -> Kafka Exporter -> Prometheus -> Grafana
```

Evidencias esperadas:

- `kafka_brokers = 1`
- `up{job="kafka-exporter-dev"} = 1`
- target `kafka-exporter-dev` en estado `UP`

### 7.2 Medicion de throughput de eventos

El producer genera eventos de ordenes hacia Kafka.

Ejemplo:

```text
100 eventos en 20 segundos = 5 eventos/segundo
```

En Spark se registra cuantos eventos entran por micro-batch:

```text
batchId = 4
numInputRows = 120
throughput aproximado = 120 eventos / intervalo del batch
```

### 7.3 Medicion de latencia

Cada evento debe incluir un timestamp de creacion.

Ejemplo:

```json
{
  "ordenId": 101,
  "tipoEvento": "orden.creada",
  "total": 150.0,
  "estado": "PENDIENTE",
  "timestamp": 1710000000000,
  "origen": "orden-ms"
}
```

Spark calcula:

```text
latenciaMs = timestampProcesamientoMs - timestamp
```

### 7.4 Logging estructurado del producer

El producer debe registrar eventos publicados en un formato consistente.

Ejemplo:

```json
{
  "service": "orden-ms",
  "component": "producer",
  "topic": "orden-eventos",
  "eventType": "orden.creada",
  "ordenId": 101,
  "status": "published",
  "timestamp": 1710000000000
}
```

### 7.5 Logging estructurado del consumer Spark

Spark debe registrar informacion del procesamiento.

Ejemplo:

```json
{
  "service": "spark-streaming",
  "component": "consumer",
  "topic": "orden-eventos",
  "batchId": 3,
  "numInputRows": 80,
  "validRows": 78,
  "invalidRows": 2,
  "avgLatencyMs": 420
}
```

### 7.6 Alertas minimas

Define alertas como propuesta operativa:

```text
Kafka caido:
kafka_brokers < 1

Exporter caido:
up{job="kafka-exporter-dev"} == 0

Lag alto:
kafka_consumergroup_lag > 100

Latencia alta:
avgLatencyMs > 1000

Latencia sensible para laboratorio (opcional, calculada en Spark):
latencyMs > 100

Eventos invalidos:
invalidRows > 0
```

## 8. Desarrollo de la practica

### 8.1 Verifica el endpoint de metricas

Abre:

```text
http://localhost:41308/metrics
```

Verifica que aparezcan metricas en texto plano, incluyendo:

- metricas internas del exporter: `go_*`, `process_*`
- metricas de Kafka: `kafka_brokers`, `kafka_broker_info`

Busca especificamente:

```text
kafka_brokers 1
kafka_broker_info{address="kafka:9092",id="1"} 1
```

Interpretacion esperada:

- el exporter esta arriba
- el exporter si esta viendo el broker Kafka

### 8.2 Verifica Prometheus

Abre:

```text
http://localhost:19090
```

Luego entra a:

- `Status`
- `Targets`

Verifica que el target del exporter este en estado:

```text
UP
```

Targets esperados:

- `prometheus`: Prometheus scrapeandose a si mismo.
- `kafka-exporter-dev`: Prometheus recolectando metricas de Kafka.

Eso confirma que Prometheus esta funcionando y scrapea correctamente el exporter.

### 8.3 Explora metricas en Grafana

Abre:

```text
http://localhost:13000
```

Ingresa con:

```text
usuario: admin
password: admin
```

Entra a `Explore`, usa el datasource `Prometheus` y ejecuta:

```text
kafka_brokers
kafka_broker_info
up{job="kafka-exporter-dev"}
kafka_consumergroup_lag
```

Si `kafka_consumergroup_lag` no muestra datos, genera eventos y ejecuta un consumer con grupo activo.

Ejemplo de resultados en Prometheus:

```text
kafka_broker_info{address="kafka:9092", id="1", job="kafka-exporter-dev"} 1
up{job="kafka-exporter-dev"} 1
kafka_consumergroup_lag{consumergroup="orden-py-group", topic="orden-eventos", partition="0"} 0
kafka_consumergroup_lag{consumergroup="pago-ms-group", topic="orden-eventos", partition="0"} 0
```

Interpretacion:

- `kafka_broker_info = 1`: Prometheus, mediante Kafka Exporter, detecta el broker Kafka.
- `up{job="kafka-exporter-dev"} = 1`: Prometheus pudo consultar correctamente el exporter.
- `up = 0`: el exporter no esta disponible o Prometheus no puede consultarlo.
- `kafka_consumergroup_lag = 0`: el consumer group esta al dia; no tiene eventos pendientes.
- `kafka_consumergroup_lag > 0`: hay eventos pendientes de consumo.

Para clase:

```text
1 en metricas tipo info/up = disponible o detectado
0 en lag = sin atraso
mayor que 0 en lag = mensajes pendientes
```

### 8.4 Genera eventos desde un producer

Usa `orden-py` o `orden-ms` para publicar eventos en el topic:

```text
orden-eventos
```

Cada evento debe incluir, como minimo:

- `tipoEvento`
- `ordenId`
- `total`
- `estado`
- `timestamp`
- `origen`

Registra evidencia de logs estructurados del producer.

### 8.5 Consume eventos con Spark Structured Streaming

Usa el notebook:

```text
bigdata-lab/notebooks/08_observabilidad_pipeline_kafka_spark.ipynb
```

Verifica que Spark lea desde:

```text
orden-eventos
```

Y que procese columnas como:

- `topic`
- `partition`
- `offset`
- `timestamp`
- `value`

En el notebook `08` ejecuta, en orden:

1. crear `SparkSession`
2. leer Kafka desde `kafka:9092`
3. parsear el JSON del evento
4. construir `df_observable`
5. arrancar la salida a consola
6. arrancar la salida a Parquet
7. producir eventos
8. revisar `query_console.lastProgress`
9. leer la evidencia guardada

### 8.6 Calcula latencia

Usa el campo `timestamp` del evento y comparalo con el timestamp de procesamiento.

En este proyecto, `timestamp` representa el momento en que el producer genero/publico el evento, expresado en milisegundos Unix. Se mantiene ese nombre para no cambiar el contrato usado por `orden-ms`, `orden-py` y el notebook de Spark.

Formula:

```text
latenciaMs = timestampProcesamientoMs - timestamp
```

Registra al menos:

- latencia minima
- latencia promedio
- latencia maxima

### 8.7 Estima throughput

Registra cuantos eventos procesa Spark por micro-batch.

En el notebook `08`, el Paso 7 usa `query_console.lastProgress`.

Terminos clave:

| Campo | Significado |
|---|---|
| `lastProgress` | rendimiento del ultimo progreso o ultimo micro-batch |
| `numInputRows` | numero de filas/eventos de entrada en ese micro-batch |
| `inputRowsPerSecond` | filas de entrada por segundo |
| `processedRowsPerSecond` | filas procesadas por segundo |
| micro-batch procesado | micro-lote procesado por Spark |

Ejemplo de salida:

```json
{
  "service": "spark-streaming",
  "component": "consumer",
  "topic": "orden-eventos",
  "batchId": 2,
  "numInputRows": 0,
  "inputRowsPerSecond": 0.0,
  "processedRowsPerSecond": 0.0,
  "avgOffsetsBehindLatest": "0.0",
  "maxOffsetsBehindLatest": "0",
  "status": "idle"
}
```

Interpretacion:

- `batchId = 2`: Spark ya ejecuto el micro-batch numero 2.
- `numInputRows = 0`: en ese micro-batch no llegaron eventos nuevos.
- `inputRowsPerSecond = 0.0`: no hubo ingreso de eventos durante ese intervalo.
- `processedRowsPerSecond = 0.0`: Spark no proceso filas porque no habia datos nuevos.
- `avgOffsetsBehindLatest = 0.0` y `maxOffsetsBehindLatest = 0`: el consumer no esta atrasado respecto al ultimo offset disponible.
- `status = idle`: no hubo eventos nuevos en ese micro-batch.
- `status = processed`: Spark si proceso eventos en ese micro-batch.

Tambien puedes usar Spark UI como evidencia:

```text
http://localhost:4040
```

Entra a:

```text
Structured Streaming -> Streaming Query Statistics
```

Resultados visibles:

| Seccion Spark UI | Que indica |
|---|---|
| `Input Rate` | velocidad de entrada de eventos hacia Spark |
| `Process Rate` | velocidad con la que Spark procesa eventos |
| `Input Rows` | cantidad de filas/eventos por micro-batch |
| `Batch Duration` | tiempo que tarda cada micro-batch |
| `Operation Duration` | desglose del tiempo usado por las operaciones internas |

Interpretacion rapida:

- `Input Rows = 0`: no llegaron eventos en ese micro-batch.
- `Input Rows > 0`: Spark recibio eventos.
- `Process Rate` mayor que `Input Rate`: Spark procesa mas rapido de lo que entran eventos.
- `Batch Duration` alto: el micro-batch esta tardando mas; puede indicar carga, operaciones lentas o recursos limitados.
- Si la query aparece en estado `Running`, el stream sigue activo.

Ejemplo de tabla:

| Batch | Eventos procesados | Intervalo seg | Throughput eventos/s |
|---:|---:|---:|---:|
| 1 | 50 | 10 | 5 |
| 2 | 80 | 10 | 8 |
| 3 | 120 | 10 | 12 |

### 8.8 Construye un dashboard basico

Crea un dashboard en Grafana con paneles minimos:

1. `Kafka Brokers`
   Consulta: `kafka_brokers`
   Visualizacion: `Stat`

2. `Kafka Exporter Up`
   Consulta: `up{job="kafka-exporter-dev"}`
   Visualizacion: `Stat`

3. `Kafka Broker Info`
   Consulta: `kafka_broker_info`
   Visualizacion: `Table`

4. `Consumer Lag`
   Consulta: `kafka_consumergroup_lag`
   Visualizacion: `Time series` o `Table`

Si la metrica de lag no esta disponible, documenta la razon y usa logs/resultados de Spark como evidencia alternativa.

### 8.9 Define alertas propuestas

Las alertas pueden entregarse como propuesta documentada. No es obligatorio configurarlas en Grafana Alerting para esta practica.

Tabla minima:

| Situacion | Regla propuesta | Accion |
|---|---|---|
| Kafka no visible | `kafka_brokers < 1` | Revisar contenedor Kafka |
| Exporter caido | `up{job="kafka-exporter-dev"} == 0` | Revisar exporter y red Docker |
| Lag alto | `kafka_consumergroup_lag > 100` | Revisar consumer, particiones y carga |
| Eventos invalidos | `invalidRows > 0` | Revisar contrato del evento |

Si se desea crear una alerta real en Grafana:

1. Entra a Grafana: `http://localhost:13000`.
2. Ve a `Alerting -> Alert rules`.
3. Selecciona `New alert rule`.
4. Asigna un nombre, por ejemplo `Lag alto en Kafka`.
5. Selecciona el datasource `Prometheus`.
6. Usa esta consulta:

```promql
kafka_consumergroup_lag > 100
```

7. Configura `Evaluate every` en `1m`.
8. Configura `For` en `2m` para evitar alertas por picos breves.
9. Guarda la regla.

Otra alerta recomendada:

```promql
up{job="kafka-exporter-dev"} == 0
```

Interpretacion:

- si `kafka_consumergroup_lag > 100`, el consumer esta acumulando mensajes pendientes.
- si `up{job="kafka-exporter-dev"} == 0`, Prometheus no puede consultar el exporter.

Ejemplo 2 opcional: latencia calculada en Spark

`latencyMs` no esta en Prometheus por defecto. En esta practica se calcula en el notebook de Spark y se valida desde la evidencia Parquet.

Umbrales propuestos:

| Situacion | Regla operativa | Donde se evalua |
|---|---|---|
| Latencia alta sensible | `latencyMs > 100` | Notebook Spark / Parquet |
| Latencia alta critica | `latencyMs > 1000` | Notebook Spark / Parquet |

Ejemplo en Spark:

```python
df_final.filter("latencyMs > 100").show()
```

Resumen:

```text
Grafana/Prometheus: up, kafka_brokers, kafka_consumergroup_lag
Spark/Parquet: latencyMs, eventos invalidos, throughput del micro-batch
```

## 9. Metricas minimas a interpretar

Trabaja al menos con estas metricas:

- `kafka_brokers`: cantidad de brokers visibles.
- `kafka_broker_info`: informacion del broker.
- `up{job="kafka-exporter-dev"}`: estado del target scrapeado.
- `kafka_consumergroup_lag`: atraso del consumidor, si existe consumer group activo.
- `numInputRows`: eventos procesados por micro-batch en Spark.
- `latenciaMs`: diferencia entre creacion del evento y procesamiento.
- `throughput`: eventos procesados por segundo o por intervalo.

## 10. Evidencias a entregar

Adjunta como evidencia:

- captura del endpoint `/metrics`
- captura de Prometheus con target `UP`
- captura de consultas ejecutadas en Grafana Explore
- captura del dashboard creado
- captura de Spark UI en `Structured Streaming -> Streaming Query Statistics`
- muestra de eventos generados por el producer
- muestra de logs estructurados del producer
- salida o captura de Spark consumiendo eventos
- tabla de latencia minima, promedio y maxima
- tabla de throughput por micro-batch o intervalo
- propuesta de alertas con umbrales

## 11. Actividad de aprendizaje autonomo

Propone un tablero minimo de operacion y documenta:

- que metricas observar
- que umbrales usar
- con que frecuencia revisarlas
- que evidencia adjuntar
- que accion tomar si aumenta el lag
- que accion tomar si aumenta la latencia
- que accion tomar si aparecen eventos invalidos

## 12. Cierre

Si la practica salio correctamente, debes haber validado el flujo observable del pipeline:

```text
Producer -> Kafka -> Spark Structured Streaming
```

y contar con evidencias de:

- disponibilidad
- latencia
- throughput
- logging estructurado
- alertas minimas

Esta practica prepara la base para la P2, donde se estimaran costos y estrategias de escalado del mismo pipeline.



