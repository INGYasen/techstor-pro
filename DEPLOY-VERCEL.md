# Despliegue en Vercel — TechStore Pro

Frontend Angular en `ProyectoMS2026/e-commerce`.

## 1. Configurar Vercel

En [vercel.com](https://vercel.com) → proyecto **techstor-pro**:

| Campo | Valor |
|---|---|
| **Root Directory** | `ProyectoMS2026/e-commerce` |
| **Framework Preset** | Other |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist/e-commerce/browser` |

## 2. Variable de entorno (cuando tengas el backend en la nube)

| Variable | Descripción |
|---|---|
| `API_URL` | URL del API Gateway **sin** barra final. Ej: `https://tu-gateway.onrender.com` |

Sin `API_URL`, el sitio se despliega y sirve la UI, pero las llamadas a `/api` y `/auth` no llegarán al backend hasta que configures esta variable.

## 3. Subir a GitHub

Desde la raíz del repositorio (`d:\ProyectoMS2026pro`):

```powershell
git init
git add .
git commit -m "chore: preparar frontend para despliegue en Vercel"
git branch -M main
git remote add origin https://github.com/INGYasen/techstor-pro.git
git push -u origin main
```

Vercel desplegará automáticamente al detectar el push en `main`.

## 4. URL para Mercado Pago

Tras el primer deploy exitoso, usa:

`https://techstor-pro.vercel.app`

en el campo **Sitio web** de las credenciales de producción de Mercado Pago.

## Desarrollo local

```bash
cd ProyectoMS2026/e-commerce
npm install
npm start
```

El proxy (`proxy.conf.json`) envía `/api` y `/auth` a `http://localhost:7091`.
