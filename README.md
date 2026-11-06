# Triki Radar

Radar de licitaciones públicas con IA. Vigila Guatecompras, lee las bases y avisa solo de las convocatorias que tu empresa puede ganar. El plan completo está en [`docs/PLAN.md`](docs/PLAN.md).

**Stack:** Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind 4 · Supabase (Postgres + pgvector + Auth) · API de Claude (desde la Fase 2).

## Arrancar en local

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Crea un proyecto gratis en [supabase.com](https://supabase.com).
3. En Supabase, abre **SQL Editor**, pega el contenido de [`supabase/migrations/0001_esquema_inicial.sql`](supabase/migrations/0001_esquema_inicial.sql) y ejecútalo.
4. En **Authentication → URL Configuration**, pon `http://localhost:3000` como *Site URL* y agrega `http://localhost:3000/auth/callback` a *Redirect URLs*.
5. Copia `.env.example` como `.env.local` y llena `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Project Settings → API Keys).
6. Arranca:
   ```bash
   npm run dev
   ```
   Abre http://localhost:3000, entra con tu correo y te llega el enlace.

## Estructura

| Ruta | Qué hace |
|---|---|
| `src/app/page.tsx` | Portada |
| `src/app/login/` | Entrada con enlace mágico por correo (sin contraseñas) |
| `src/app/auth/callback/route.ts` | Cambia el código del correo por una sesión |
| `src/app/panel/` | Panel privado |
| `src/proxy.ts` | Refresca la sesión y protege `/panel` |
| `src/lib/supabase/` | Clientes de Supabase para navegador, servidor y proxy |
| `supabase/migrations/` | Esquema de la base y reglas de seguridad (RLS) |
| `docs/fuente-guatecompras.md` | De dónde salen los datos y cómo leerlos |

## Datos

Licitaciones de [Guatecompras](https://ocds.guatecompras.gt/), Ministerio de Finanzas Públicas de Guatemala, publicadas en el estándar OCDS bajo licencia CC BY 4.0.
