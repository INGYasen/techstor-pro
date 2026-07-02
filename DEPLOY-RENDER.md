# Despliegue del backend en Render — TechStore Pro

Guía para conectar el frontend en Vercel (`https://techstor-pro.vercel.app`) con el backend en Render.

---

## Arquitectura en la nube

```text
Vercel (Angular)  →  Render techstore-gateway  →  microservicios  →  MySQL
```

---

## Requisitos

- Cuenta en [Render](https://render.com)
- Repositorio GitHub: [INGYasen/techstor-pro](https://github.com/INGYasen/techstor-pro)
- **Importante:** el stack usa ~10 servicios. En Render suele requerirse plan **Starter** (~USD 7/mes por servicio) o desplegar por fases.

---

## Paso 1 — Crear el Blueprint en Render

1. Entra a [dashboard.render.com/blueprints](https://dashboard.render.com/blueprints)
2. **New Blueprint Instance**
3. Conecta el repo `INGYasen/techstor-pro`
4. Render detectará `render.yaml` en la raíz
5. Revisa los servicios y confirma **Apply**

El despliegue inicial puede tardar **20–40 minutos** (compila cada microservicio con Docker).

---

## Paso 2 — Variables que debes completar manualmente

En el servicio **`pago`** → Environment:

| Variable | Descripción |
|---|---|
| `MP_PUBLIC_KEY` | Public Key de Mercado Pago (producción o TEST) |
| `MP_ACCESS_TOKEN` | Access Token de Mercado Pago |
| `MP_PAYER_EMAIL` | Email del pagador de prueba (sandbox) o real |

`JWT_SECRET` se genera automáticamente en el grupo `techstore-secrets` (gateway, auth, producto).

---

## Paso 3 — Obtener la URL del Gateway

1. En Render, abre el servicio **`techstore-gateway`**
2. Copia la URL pública, por ejemplo:
   ```
   https://techstore-gateway.onrender.com
   ```
3. Verifica salud:
   ```
   https://techstore-gateway.onrender.com/actuator/health
   ```

---

## Paso 4 — Conectar Vercel con el backend

1. [vercel.com](https://vercel.com) → proyecto **techstor-pro**
2. **Settings** → **Environment Variables**
3. Agrega:

| Variable | Valor |
|---|---|
| `API_URL` | `https://techstore-gateway.onrender.com` (sin barra final) |

4. **Deployments** → **Redeploy** el último deploy de producción

---

## Paso 5 — Cargar datos de demo

Cuando el gateway esté **Live**, ejecuta desde PowerShell:

```powershell
cd ProyectoMS2026\scripts
$gateway = "https://techstore-gateway.onrender.com"

# Registrar admin
Invoke-RestMethod -Uri "$gateway/auth/register" -Method POST `
  -Body '{"username":"admin","password":"admin123"}' -ContentType "application/json"

# Login
$res = Invoke-RestMethod -Uri "$gateway/auth/login" -Method POST `
  -Body '{"username":"admin","password":"admin123"}' -ContentType "application/json"
$h = @{ Authorization = "Bearer $($res.accessToken)" }

# Categorías y productos (ajusta puertos si usas gateway — todo va por gateway)
Invoke-RestMethod -Uri "$gateway/api/v1/categorias" -Method POST -Headers $h `
  -Body '{"nombre":"Laptops","descripcion":"Equipos portatiles"}' -ContentType "application/json"
```

O adapta `crear-datos-demo.ps1` cambiando las URLs a tu gateway.

---

## Paso 6 — Mercado Pago (producción)

| Dónde | URL |
|---|---|
| Formulario MP — Sitio web | `https://techstor-pro.vercel.app` |
| Credenciales en Render (`pago`) | `MP_PUBLIC_KEY`, `MP_ACCESS_TOKEN` |

Nunca subas tokens a GitHub.

---

## Servicios creados por el Blueprint

| Servicio | Tipo | Rol |
|---|---|---|
| `techstore-mysql` | Private | Base de datos (6 schemas) |
| `config-server` | Private | Config centralizada |
| `registry-server` | Private | Eureka |
| `techstore-gateway` | **Web público** | API única (API_URL) |
| `auth`, `catalogo`, `producto`, `pedido`, `pago`, `carrito` | Private | Microservicios |

---

## Solución de problemas

### El gateway responde 503
- Espera a que `config-server` y `registry-server` estén **Live**
- Luego los microservicios (auth, catalogo, etc.)

### Vercel carga pero login falla
- Verifica `API_URL` en Vercel
- Redeploy del frontend después de cambiar la variable

### Servicios en sleep (plan gratuito)
- El primer request tras inactividad puede tardar ~1 minuto
- Considera plan Starter para evitar sleep

### CORS
- El gateway ya permite `https://*.vercel.app`

---

## Costos estimados

| Componente | Costo aprox. |
|---|---|
| Vercel (frontend) | Gratis |
| Render (10 servicios Starter) | ~USD 70/mes (stack completo) |
| Alternativa | Desplegar solo gateway + auth + catalogo + producto primero |

---

## Checklist final

- [ ] Blueprint aplicado en Render
- [ ] `techstore-gateway` en estado Live
- [ ] `/actuator/health` responde UP
- [ ] `API_URL` configurada en Vercel + redeploy
- [ ] Login en https://techstor-pro.vercel.app funciona
- [ ] Credenciales MP en servicio `pago`
- [ ] URL en formulario Mercado Pago
