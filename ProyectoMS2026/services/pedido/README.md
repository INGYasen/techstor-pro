# pedido

Microservicio de pedidos del e-commerce. Al crear un pedido, registra automáticamente un pago PENDIENTE en el microservicio `pago` mediante **Feign** (llamada REST síncrona).

---

## ¿Qué hace?

```
Cliente ──POST──▶  /api/v1/pedidos
                         │
                         ▼
                   [Guardar pedido + items en MySQL]
                         │
                         ▼
              [PagoClient.crearPago() via Feign]
                         │
                         ▼
                   Microservicio PAGO
                   (pago PENDIENTE)
```

- Recibe peticiones REST `POST /api/v1/pedidos` con `userId`, `items[]`, `direccionEnvio`
- Valida productos y stock vía Feign → `producto`
- Guarda el pedido en `db_pedido` (MySQL)
- Descuenta stock en `producto`
- Registra un pago PENDIENTE en `pago` vía Feign

---

## Puertos

| Ambiente | Puerto |
|---|---|
| DEV | **9101** |
| PROD (docker) | 9102 |
| MySQL DEV | 3401 |

---

## Clases clave

| Clase | Rol |
|---|---|
| `PedidoServiceImpl` | Lógica de negocio del pedido |
| `ProductoClient` | Feign → validar productos y descontar stock |
| `PagoClient` | Feign → crear pago PENDIENTE |

---

## Cómo levantarlo

```powershell
cd services\pedido

docker compose -f docker-compose-dev.yml up -d
mvn spring-boot:run
```

---

## Ejemplo crear pedido

```powershell
$body = @{
  userId = 1
  cliente = "admin"
  estado = "PENDIENTE"
  direccionEnvio = "Lima, Perú"
  items = @(@{ productoId = 1; cantidad = 2 })
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Method Post -Uri "http://localhost:9101/api/v1/pedidos" `
  -ContentType "application/json" -Body $body
```

---

## Endpoints

| Método | URL | Descripción |
|---|---|---|
| GET | `/api/v1/pedidos` | Lista todos los pedidos |
| GET | `/api/v1/pedidos/{id}` | Pedido por id |
| POST | `/api/v1/pedidos` | Crea pedido + registra pago |
| PUT | `/api/v1/pedidos/{id}` | Actualiza pedido |
| DELETE | `/api/v1/pedidos/{id}` | Elimina pedido |
| GET | `/actuator/health` | Salud del servicio |
| GET | `/swagger-ui/index.html` | Documentación Swagger |
