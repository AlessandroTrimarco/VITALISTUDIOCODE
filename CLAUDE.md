# Vitali Studio

## Qué es
Plataforma central de Vitali Solutions — app de chat/asistente IA con autenticación.
Usuarios se loguean y son redirigidos a `/chat`. Deploy en Railway con Docker.

## Stack
- Next.js 15 (App Router) + TypeScript strict
- Tailwind CSS + shadcn/ui
- Auth custom en `src/lib/auth.ts`
- Deploy: Railway via Dockerfile

## Estructura
```
src/app/
  chat/       — interfaz principal de chat
  login/      — autenticación
  verify/     — verificación de email
  api/        — route handlers
src/components/
src/lib/
  auth.ts     — getSession() + lógica de auth
```

## Comandos
- `npm run dev` — dev server (puerto 3000)
- `npm run build` — build producción
- `npm run lint` — ESLint

## Deploy
- **Railway** via Dockerfile — NO Vercel
- Variables en Railway dashboard (no en `.env` local para prod)
- `railway.json` define: builder DOCKERFILE, restart ON_FAILURE

## Reglas
- Auth gate en root: `getSession()` → redirect a /chat o /login
- No hay Prisma ni BD local — verificar si usa API externa o BD Railway
- Antes de modificar auth, leer `src/lib/auth.ts` y `src/middleware.ts`
