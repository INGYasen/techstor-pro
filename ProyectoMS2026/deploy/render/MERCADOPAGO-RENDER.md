# Mercado Pago en Render

Configura estas variables en **Render Dashboard → servicio `pago` → Environment**:

| Variable | Valor |
|---|---|
| `MERCADOPAGO_ENABLED` | `true` |
| `MP_PUBLIC_KEY` | Tu Public Key de producción (`APP_USR-...`) |
| `MP_ACCESS_TOKEN` | Tu Access Token de producción (`APP_USR-...`) |
| `MP_PAYER_EMAIL` | Email válido del comprador (respaldo si el frontend no envía uno) |

Los valores reales están en `mercadopago-render.env` (gitignored). **No los subas a GitHub.**

Después de guardar, Render redeploya `pago` automáticamente.

## Verificar

```text
GET https://<tu-gateway>/api/v1/pagos/mercadopago/config
```

Respuesta esperada:

```json
{ "enabled": true, "publicKey": "APP_USR-..." }
```

## Vercel

En **Vercel → Settings → Environment Variables**:

| Variable | Valor |
|---|---|
| `API_URL` | URL del gateway Render (sin barra final) |

Redeploy el frontend después de cambiar `API_URL`.
