# Deploy — MediFlow

Arquitectura de producción:

| Pieza        | Plataforma  | Notas                                              |
|--------------|-------------|----------------------------------------------------|
| PostgreSQL   | **Neon**    | 0.5 GB gratis. SSL obligatorio.                    |
| API (NestJS) | **Railway** o **Render** | WebSocket persistente, server full-time. |
| Web (Next)   | **Vercel**  | Estáticos + SSR. Cero config.                      |

> El repo ya trae `apps/api/railway.json` y `render.yaml` con build/start configurados. Tú solo das clic en "Deploy" y pegas variables de entorno.

---

## 1. Base de datos en Neon

1. https://console.neon.tech/ — crear proyecto `mediflow` (región más cercana, ej. US East).
2. Copia el **Connection string** desde el dashboard (`postgresql://...?sslmode=require`).
3. Guárdalo — lo pegas en Railway/Render.

---

## 2. API en Railway (recomendado)

1. https://railway.com → Login con GitHub.
2. **+ New Project → Deploy from GitHub repo → `MedSistem`**.
3. Railway lee `apps/api/railway.json` automáticamente. Ve a:
   - **Settings → Root Directory**: `apps/api`
   - **Networking → Generate Domain** (te da una URL `*.up.railway.app`)
4. **Variables → Raw Editor** → pega:
   ```
   DATABASE_URL=<el de Neon>
   JWT_ACCESS_SECRET=<de MediFlow-PROD-SECRETS.txt>
   JWT_REFRESH_SECRET=<de MediFlow-PROD-SECRETS.txt>
   CSRF_SECRET=<de MediFlow-PROD-SECRETS.txt>
   NODE_ENV=production
   API_PORT=4000
   API_PREFIX=/api/v1
   CORS_ORIGIN=https://placeholder-cambiar-despues.vercel.app
   HELMET_ENABLED=true
   BCRYPT_SALT_ROUNDS=12
   LOG_LEVEL=info
   LOG_FORMAT=json
   JWT_ACCESS_EXPIRY=15m
   JWT_REFRESH_EXPIRY=7d
   THROTTLE_TTL=60
   THROTTLE_LIMIT=100
   LOGIN_THROTTLE_TTL=300
   LOGIN_THROTTLE_LIMIT=5
   CORS_ENABLED=true
   ```
5. Espera el deploy (~5 min). En **Deploy logs** debes ver `MediFlow API running on port 4000`.
6. Prueba: `curl https://TU-URL.up.railway.app/api/v1/auth/csrf-token` → `{"token":"..."}`.

### Sembrar la DB de producción (una sola vez)

Desde tu máquina local apuntando al Neon de producción:

```bash
cd apps/api
DATABASE_URL='<el de Neon>' npm run db:seed:fresh
```

Eso crea los 7 roles, 24 permisos, 8 usuarios demo y las 8 zonas hospitalarias — sin datos ficticios.

---

## 2-bis. Alternativa gratis: Render

1. https://render.com → Login con GitHub.
2. **+ New → Blueprint** → selecciona el repo. Render detecta `render.yaml` y crea el servicio.
3. En el dashboard del servicio → **Environment → Add Environment Variable**:
   - `DATABASE_URL` (de Neon)
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CSRF_SECRET` (del archivo de secretos)
   - `CORS_ORIGIN` (URL de Vercel — cuando la tengas)
4. Deploy automático. La URL es `https://medsistem-api.onrender.com`.

> Free plan: el server se duerme tras 15 min sin tráfico. La primera petición tras dormir tarda ~30 s.

---

## 3. Web en Vercel

1. https://vercel.com → Import `MedSistem`.
2. **Root Directory**: `apps/web`. (Vercel detecta Next.js automáticamente.)
3. **Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL=https://TU-URL-DE-RAILWAY.up.railway.app/api/v1
   NEXT_PUBLIC_WS_URL=https://TU-URL-DE-RAILWAY.up.railway.app
   ```
4. Click **Deploy**.

---

## 4. Cerrar el círculo CORS

Una vez que tengas la URL de Vercel:

1. Railway → Variables → **`CORS_ORIGIN`** → cambia el placeholder por `https://<tu-app>.vercel.app`.
2. Railway redeploya solo (~30 s).
3. Entra a tu URL de Vercel → login con `admin@mediflow.com / MediFlow2024!`.
4. Desde **Empleados** crea tu cuenta real y elimina los usuarios demo.

---

## Troubleshooting

- **401 al hacer login**: revisa que `DATABASE_URL` apunte a Neon y que las migraciones corrieron (`prisma migrate deploy` corre en cada deploy).
- **403 "invalid csrf token"**: el dominio del cookie no coincide con la URL del API. Confirma que `NODE_ENV=production` está seteado (activa `sameSite=none`).
- **CORS error en el navegador**: `CORS_ORIGIN` no incluye la URL exacta de Vercel (con `https://`, sin slash final).
- **API "Application failed to respond"** en Railway: revisa los **Deploy logs**, lo más común es `DATABASE_URL` mal formado.
