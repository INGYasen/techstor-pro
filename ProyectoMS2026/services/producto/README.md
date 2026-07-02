# Microservicio Producto

Este proyecto implementa el microservicio `producto`, responsable de gestionar productos dentro de una arquitectura de microservicios basada en Spring Boot y Spring Cloud.

---

## Estado del proyecto

Actualmente incluye:

- API REST funcional para productos
- Persistencia con MySQL
- Configuracion por perfiles (`dev`, `prod`)
- Migraciones versionadas con Flyway en `prod`
- Contenerizacion con Docker
- Documentacion OpenAPI/Swagger en `dev`
- Integracion operativa con Config Server
- Integracion operativa con Registry Server (Eureka)
- Integracion operativa con API Gateway
- Enrutamiento dinamico con `lb://producto`
- Comunicacion con `catalogo` mediante OpenFeign
- Resiliencia con Circuit Breaker sobre la consulta a `catalogo`

---

## Arquitectura

```text
Client -> Gateway -> Microservicios -> Eureka -> Config Server
```

Este repositorio implementa unicamente el microservicio `producto`.

Estructura recomendada del entorno integrado:

```text
ProyectosMS2026/
  infra/
    config-server/
    registry-server/
    gateway/
  services/
    catalogo/
    producto/
```

---

## Stack tecnologico

- Java 17
- Spring Boot 3.5.12
- Maven 3.9+
- MySQL 8.4
- Docker
- Docker Compose
- Flyway
- SpringDoc OpenAPI

Comandos utiles:

```bash
java -version
mvn -v
docker -v
docker compose version
```

## Dependencias

- Spring Web
- Spring Data JPA
- Spring Validation
- Lombok
- MySQL Driver
- Flyway
- Spring Boot Actuator
- Spring Boot DevTools
- SpringDoc OpenAPI WebMVC UI
- Eureka Client
- OpenFeign
- Spring Cloud Circuit Breaker Resilience4j

---

## Dominio gestionado

La entidad principal es `Producto` y actualmente contiene:

- `id`
- `nombre`
- `descripcion`
- `idCategoria`

Tabla actual:

```sql
productos
```

Migracion base:

```text
src/main/resources/db/migration/V1__create_productos_table.sql
```

---

## Puertos utilizados

| Servicio | Puerto |
|---|---:|
| Aplicacion dev | 9091 |
| Aplicacion prod | 9092 |
| MySQL dev | 3391 |
| MySQL prod | 3392 |

---

## Diferencia entre DEV y PROD

| Modo | Ejecucion | Base de datos | Puerto app | Swagger | Flyway |
|---|---|---|---:|---|---|
| DEV | Maven | MySQL local o Docker | 9091 | habilitado | deshabilitado |
| PROD | Docker Compose | Docker | 9092 | deshabilitado | habilitado |

---

## Ubicacion en la secuencia 2026-2

`producto` es el modulo que concentra con mayor fuerza la transicion entre la base distribuida y la robustez del sistema:

- `S1-S4` como microservicio registrable y enrutable
- `S6` como consumidor de `catalogo` via Feign y como punto de aplicacion de Circuit Breaker
- `S7` como fuente principal para observar trafico, fallos, fallback y trazabilidad end-to-end

Por eso `producto` suele ser el mejor punto de demostracion para:

- interaccion entre servicios
- resiliencia
- observabilidad de errores y fallback

---

## Endpoints principales

Base path:

```text
/api/v1/productos
```

Operaciones disponibles:

- `POST /api/v1/productos`
- `GET /api/v1/productos`
- `GET /api/v1/productos/{id}`
- `GET /api/v1/productos/detalle/{id}`
- `PUT /api/v1/productos/{id}`
- `DELETE /api/v1/productos/{id}`

Ejemplo de payload:

```json
{
  "nombre": "Laptop Lenovo",
  "descripcion": "Equipo para laboratorio",
  "idCategoria": 1
}
```

Endpoint auxiliar para pruebas de gateway y balanceo:

- `GET /api/v1/producto/instancia`

Ejemplo de respuesta:

```json
{
  "servicio": "producto",
  "instancia": "9092",
  "host": "nombre-del-host",
  "traceId": "uuid-o-correlacion-actual"
}
```

Endpoint enriquecido con categoria:

- `GET /api/v1/productos/detalle/{id}`

Ejemplo de respuesta cuando `catalogo` responde:

```json
{
  "id": 1,
  "nombre": "Laptop Lenovo",
  "descripcion": "Equipo para laboratorio",
  "idCategoria": 1,
  "categoria": {
    "id": 1,
    "nombre": "Tecnologia",
    "descripcion": "Productos tecnologicos"
  }
}
```

---

## Base de datos y migraciones

- Los cambios de esquema deben quedar en SQL versionado.
- Flyway ejecuta scripts en `src/main/resources/db/migration` cuando arranca `prod`.
- En `prod`, Hibernate no crea tablas; valida el esquema existente.
- En `dev`, Hibernate usa `ddl-auto: update` y Flyway esta deshabilitado.

Flujo recomendado:

1. Ajustar el esquema en SQL.
2. Probar en `dev`.
3. Crear nueva migracion (`V2`, `V3`, etc.).
4. Aplicar en `prod`.
5. Arrancar y validar.

---

## Ejecucion en desarrollo

### 1. Clonar repositorio

```bash
git clone https://github.com/261dist/producto.git
cd producto
```

### 2. Levantar base de datos dev

```bash
docker compose -f docker-compose-dev.yml up -d
```

Esto levanta MySQL dev en el puerto `3391` con la base `db_producto`.

### 3. Ejecutar aplicacion

```bash
mvn spring-boot:run
```

Perfil activo por defecto:

```text
dev
```

### Accesos DEV

```text
http://localhost:9091/api/v1/productos
http://localhost:9091/swagger-ui/index.html
http://localhost:9091/actuator/health
http://localhost:9091/api/v1/producto/instancia
http://localhost:7091/api/v1/producto/instancia
```

---

## Ejecucion en produccion

### 1. Crear archivo `.env`

```env
PRODUCTO_MYSQL_ROOT_PASSWORD=root
PRODUCTO_MYSQL_DATABASE=db_producto

SPRING_PROFILES_ACTIVE=prod
CONFIG_SERVER_URL=http://config-server:7071

PRODUCTO_DB_HOST=mysql-producto
PRODUCTO_DB_PORT=3306
PRODUCTO_DB_NAME=db_producto
PRODUCTO_DB_USERNAME=root
PRODUCTO_DB_PASSWORD=root
```

### 2. Levantar servicios

```bash
docker compose -f docker-compose.yml up -d
```

Esto levanta:

- MySQL prod en `3392`
- la aplicacion `producto` en `9092`

### Accesos PROD

```text
http://localhost:9092/api/v1/productos
http://localhost:9092/actuator/health
http://localhost:9092/api/v1/producto/instancia
http://localhost:7092/api/v1/producto/instancia
```

Swagger:

```text
deshabilitado en prod
```

---

## Escalado de la aplicacion

Ejemplo rapido sin detener el entorno previo:

```bash
docker create --name producto22 --network ms-net --env-file .env -p 9099:9092 producto-prod-producto
docker network connect producto-int producto22
docker start producto22
```

Verificacion:

```bash
docker ps
```

Prueba por gateway:

```text
http://localhost:7092/api/v1/producto/instancia
```

Limpieza:

```bash
docker stop producto22
docker rm producto22
docker rmi producto-prod-producto
```

O limpiar el entorno:

```bash
docker rm -f producto22 producto33
docker compose -f docker-compose.yml down
```

---

## Integracion actual

### Config Server dev

```properties
SPRING_CONFIG_IMPORT=optional:configserver:http://localhost:7071
```

### Eureka dev

```properties
EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://localhost:7081/eureka
```

### Gateway

```yaml
uri: lb://producto
```

Rutas de verificacion:

```text
http://localhost:7091/api/v1/producto/instancia
http://localhost:7092/api/v1/producto/instancia
```

### Feign

La comunicacion entre microservicios esta operativa desde `producto` hacia `catalogo`:

- `producto` habilita clientes Feign con `@EnableFeignClients`
- `CatalogoClient` consume `GET /api/v1/categorias/{id}`
- `findDetalleById` arma una respuesta enriquecida con los datos de categoria
- el cliente Feign resuelve el servicio por nombre usando Eureka: `@FeignClient(name = "catalogo")`

Rutas de prueba:

```text
http://localhost:9091/api/v1/productos/detalle/{id}
http://localhost:9092/api/v1/productos/detalle/{id}
http://localhost:7091/api/v1/productos/detalle/{id}
http://localhost:7092/api/v1/productos/detalle/{id}
```

### Circuit Breaker

La operacion `GET /api/v1/productos/detalle/{id}` esta protegida con Resilience4j.

- `ProductoServiceImpl.findDetalleById(...)` usa `@CircuitBreaker(name = "catalogo", fallbackMethod = "fallbackCategoria")`
- el circuito protege la llamada Feign hacia `catalogo`
- si `catalogo` falla o no esta disponible, se activa `fallbackCategoria(...)`
- el fallback devuelve el producto y deja `categoria` en `null`

Configuracion actual en `infra/config-repo/producto-dev.yml`:

```yaml
resilience4j:
  circuitbreaker:
    instances:
      catalogo:
        slidingWindowSize: 5
        minimumNumberOfCalls: 3
        failureRateThreshold: 50
        waitDurationInOpenState: 5s
        permittedNumberOfCallsInHalfOpenState: 2
        automaticTransitionFromOpenToHalfOpenEnabled: true
```

Comportamiento esperado:

- si `catalogo` responde bien, `detalle/{id}` retorna categoria
- si `catalogo` esta caido, `detalle/{id}` sigue respondiendo con `categoria: null`
- despues de varios fallos, el circuito se abre temporalmente para evitar llamadas repetidas al servicio remoto

### Observabilidad basica manual

`producto` expone capacidades basicas de observabilidad para operacion e integracion:

- `GET /actuator/health`
- `GET /actuator/metrics`
- `GET /actuator/prometheus`
- `GET /actuator/circuitbreakers`
- `GET /actuator/circuitbreakerevents`
- `GET /api/v1/producto/instancia`
- logs con `traceId` en consola y archivo local

Ubicaciones de log en desarrollo:

- `services/producto/logs/producto.log`
- `infra/gateway/logs/gateway.log`
- `services/catalogo/logs/catalogo.log`

La guia didactica paso a paso de esta fase no se repite en este `README`. Se mantiene en:

- [SESION-06.P2-OBSERVABILIDAD.md](C:/ms1/ProyectosMS2026/infra/SESION-06.P2-OBSERVABILIDAD.md)
- [SESION-07-OBSERVABILIDAD-CON-HERRAMIENTAS.md](C:/ms1/ProyectosMS2026/observability/SESION-07-OBSERVABILIDAD-CON-HERRAMIENTAS.md)

En modo `dev` y `prod`, `producto` queda listo para integrarse con observabilidad externa:

- Prometheus consume metricas desde `/actuator/prometheus`
- Promtail recoge `services/producto/logs/*.log`
- Loki centraliza los logs
- Grafana consulta metricas y logs desde una sola interfaz

Verificacion operativa rapida:

1. Levantar `infra`, `catalogo` y `producto`.
2. Consultar `GET /api/v1/productos/detalle/{id}`.
3. Detener `catalogo`.
4. Repetir la consulta varias veces.
5. Verificar respuesta exitosa del producto con `categoria: null` y logs de fallback.

---

## Estado de avance

- [x] Config Server
- [x] Registry Server (Eureka)
- [x] API Gateway
- [x] Enrutamiento `lb://producto`
- [x] Feign
- [x] Circuit Breaker + Observabilidad basica manual
- [x] Observabilidad con herramientas
- [ ] Seguridad
- [ ] Gestion del trafico (filtros, politicas y control de peticiones)
- [ ] Integracion con frontend

---

## Siguiente paso

Continuar con atributos de calidad sobre la base actual:

- consolidar `S7` con dashboards, consultas y trazabilidad guiada
- integrar seguridad con autenticacion y autorizacion
- aplicar gestion del trafico en Gateway
- habilitar integracion con frontend

---

## Alcance actual

Este proyecto no incluye aun:

- Seguridad
- Gestion del trafico en Gateway
- Integracion con frontend

---

## Flujo Git

Importante:

- este repositorio (`producto`) puede avanzar y versionarse en momentos distintos a `infra` y `catalogo`
- el tag sugerido de este README aplica solo al avance funcional de `producto`

### Actualizar repositorio

```bash
git branch
git pull origin main
```

### Crear rama de trabajo

```bash
git checkout -b tarea/avance
```

### Registrar cambios

```bash
git add .
git commit -m "feat: avance"
git push -u origin tarea/avance
```

### Volver a `main` y limpiar rama

```bash
git checkout main
git pull origin main
git branch -d tarea/avance
git push origin --delete tarea/avance
```

### Crear tag

```bash
git tag -a vs07-obs-tools -m "Producto listo para observabilidad externa con Prometheus, Loki y Grafana"
git push origin vs07-obs-tools
```

### Eliminar tag

```bash
git tag -d vs07-obs-tools
git push origin --delete vs07-obs-tools
```

---

## Documentacion adicional

https://upeuoficial.github.io/carrera-sistemas-docs-operativos/
