# 📮 Postman Collection — Proyecto E-Commerce MS 2026

Colección completa para probar todos los endpoints de los 5 microservicios del proyecto.

## 📂 Archivos

| Archivo | Descripción |
|---|---|
| `MS2026-Collection.postman_collection.json` | Collection con todos los requests organizados por microservicio |
| `MS2026-Local.postman_environment.json` | Environment con las URLs y variable `token` |

## 🚀 Cómo usar

### 1. Importar en Postman

1. Abre Postman
2. Click en **Import** (arriba a la izquierda)
3. Arrastra los **dos** archivos `.json` o selecciónalos
4. Confirma la importación

### 2. Activar el Environment

Arriba a la derecha de Postman, en el dropdown de Environment, selecciona **`MS2026-Local`**.

### 3. Hacer login (auto-guarda el token)

1. Abre la carpeta **🔐 AUTH**
2. Ejecuta **Register (admin)** (solo la primera vez)
3. Ejecuta **Login (auto-guarda token)**
4. ✅ El token JWT se guarda automáticamente en la variable `{{token}}` del environment

### 4. Usar cualquier otro request

Todos los requests usan automáticamente el token (gracias al Authorization Bearer global de la collection). Solo abre la carpeta del microservicio que quieras y ejecuta.

## 📋 Estructura de la Collection

```
Proyecto E-Commerce MS 2026
├── 🔐 AUTH
│   ├── Register (admin)
│   └── Login (auto-guarda token)
├── 📚 CATÁLOGO
│   ├── Listar / Obtener / Crear / Actualizar / Eliminar categorías
│   └── Instancia (load balancing)
├── 📦 PRODUCTO
│   ├── Listar / Obtener / Crear / Actualizar / Eliminar productos
│   ├── 🌟 Detalle producto (Feign + Circuit Breaker)
│   └── Instancia (load balancing)
├── 🛒 PEDIDO
│   ├── Listar / Obtener / Crear (registra pago) / Actualizar / Eliminar
│   └── Instancia (load balancing)
├── 💳 PAGO
│   ├── Listar / Obtener / Crear / Actualizar / Eliminar pagos
│   └── Instancia (load balancing)
├── 📊 ACTUATOR (Health/Metrics)
│   └── Health de los 6 servicios
└── 🌐 VÍA GATEWAY (puerto 7091)
    └── Endpoints accedidos a través del Gateway
```

## 🔑 Variables del Environment

| Variable | Valor por defecto |
|---|---|
| `auth_url` | http://localhost:8041 |
| `catalogo_url` | http://localhost:8081 |
| `producto_url` | http://localhost:9091 |
| `pedido_url` | http://localhost:9101 |
| `pago_url` | http://localhost:9111 |
| `gateway_url` | http://localhost:7091 |
| `token` | (se llena al hacer login) |

## 🎯 Flujo de demo recomendado

1. `🔐 AUTH > Register` — crear usuario admin
2. `🔐 AUTH > Login` — obtener token
3. `📚 CATÁLOGO > Crear categoría` — crear varias categorías
4. `📦 PRODUCTO > Crear producto` — crear productos asociados a categorías
5. `📦 PRODUCTO > Detalle producto` — probar Feign + Circuit Breaker
6. `🛒 PEDIDO > Crear pedido` — crea pedido y registra pago PENDIENTE via Feign
7. Verificar en `💳 PAGO > Listar pagos` que el pago fue creado automaticamente
