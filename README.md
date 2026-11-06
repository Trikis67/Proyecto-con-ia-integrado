# Triki Radar

Radar de licitaciones públicas con IA. Vigila Guatecompras, detecta cada cambio en las convocatorias y avisa solo de las que tu empresa puede ganar. El plan completo está en [`docs/PLAN.md`](docs/PLAN.md).

**Stack:** Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind 4 · Supabase (Postgres + pgvector + Auth) · API de Claude (desde la Fase 2).

## Análisis con IA (Fase 2)
- En cada licitación, la persona sube las bases en PDF (Guatecompras no permite bajarlas automáticamente) o analiza solo con los datos.
- **Claude Haiku 5.5** con salida estructurada devuelve resumen, título claro, rubros, monto estimado, fecha de cierre, visita técnica, requisitos por tipo, garantías, documentos a presentar, criterios de evaluación y alertas, **cada dato con la página del PDF** donde aparece.
- Lo que no está en el documento queda vacío: el modelo tiene prohibido inventar, y el texto del PDF se trata como contenido, nunca como instrucciones.
- Cada llamada queda en `uso_ia` con tokens y costo (≈ $0.0006 solo con datos), con un límite de 25 análisis por persona al día.

## Qué hace hoy (Fase 1)
- Baja a diario los datos abiertos de Guatecompras (unos 37 mil procesos entre el mes actual y el anterior).
- Compara cada licitación con la versión guardada mediante una huella SHA-256 y, si cambió, guarda qué cambió y lo explica en español: «Pasó de «Vigente» a «Adjudicado». Se adjudicó a X por Q 324,500.00.».
- Panel con búsqueda en español (título, entidad e ítems), filtros por estado y departamento, detalle con ítems, documentos, ofertas, adjudicación e historial de cambios.

## Arrancar en local

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Crea un proyecto gratis en [supabase.com](https://supabase.com).
3. En Supabase, abre **SQL Editor** y ejecuta, en orden, los archivos de [`supabase/migrations/`](supabase/migrations/).
4. En **Authentication → URL Configuration**, pon `http://localhost:3000` como *Site URL* y agrega `http://localhost:3000/auth/callback` a *Redirect URLs*.
5. Copia `.env.example` como `.env.local` y llena la URL, la *publishable key* y la *secret key* de Supabase (Project Settings → API Keys), y `ANTHROPIC_API_KEY` (platform.claude.com → API Keys).
6. Trae las licitaciones y arranca:
   ```bash
   npm run recolectar
   npm run dev
   ```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en http://localhost:3000 |
| `npm run recolectar` | Trae el mes actual y el anterior de Guatecompras y registra los cambios |
| `npm run recolectar -- 2026-09` | Un mes concreto |
| `npm run recolectar -- --seco` | Muestra qué traería, sin escribir en la base |
| `npm run recolectar -- --reprocesar` | Cuando cambia el código del mapeo: actualiza sin crear versiones ni corridas |
| `npm run enlace-dev -- tu@correo.com` | Solo en local: genera un enlace para entrar sin esperar el correo |
| `npm test` | Pruebas del detector de cambios y del formato de textos |

En producción, [`.github/workflows/recolectar.yml`](.github/workflows/recolectar.yml) corre el recolector dos veces al día (necesita los secretos `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SECRET_KEY` en GitHub).

## Estructura

| Ruta | Qué hace |
|---|---|
| `src/lib/guatecompras/ocds.ts` | Convierte el OCDS de Guatecompras a nuestras columnas y calcula la huella |
| `src/lib/guatecompras/cambios.ts` | Compara dos versiones y explica qué cambió |
| `src/lib/guatecompras/recolector.ts` | Descarga, compara con la base y guarda por lotes |
| `scripts/recolectar.ts` | El recolector por línea de comandos |
| `src/lib/formato.ts` | Textos legibles: siglas, departamentos, fechas, montos |
| `src/app/panel/` | Lista con búsqueda y filtros, y detalle de cada licitación |
| `src/app/login/`, `src/app/auth/` | Entrada con enlace mágico (sin contraseñas) |
| `src/proxy.ts` | Refresca la sesión y protege `/panel` |
| `supabase/migrations/` | Esquema, búsqueda en español y reglas de seguridad (RLS) |
| `docs/fuente-guatecompras.md` | Qué trae Guatecompras, qué falta y los riesgos |

## Datos

Licitaciones de [Guatecompras](https://ocds.guatecompras.gt/), Ministerio de Finanzas Públicas de Guatemala, publicadas en el estándar OCDS bajo licencia CC BY 4.0. Por las reglas del sitio, los datos no se usan para entrenar modelos de IA.
