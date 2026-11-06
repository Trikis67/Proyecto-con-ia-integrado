# Triki Radar · Plan del proyecto

> Radar de licitaciones públicas con IA. Encuentra las convocatorias que le sirven a tu empresa, te explica por qué y te ayuda a postular.
> Marca: **Triki** · Dominio sugerido: `radar.trikis.nl`

## El problema
Las empresas que le venden al gobierno revisan a mano, todos los días, cientos de convocatorias (muchas en PDF). Si se les pasa una, o leen mal un requisito, pierden el contrato.

## La solución
1. **Vigila** el portal cada pocas horas y detecta licitaciones nuevas **y cambios** (fechas, aclaraciones, anexos).
2. **Lee** las bases con IA y extrae los datos clave: monto, fechas, requisitos, garantías y documentos.
3. **Compara** cada licitación con el perfil de la empresa (lo que vende, sus certificados, su experiencia) y le da una calificación de qué tanto encaja, con el porqué.
4. **Avisa** solo de lo relevante (correo o Telegram) y lleva un pipeline: Nueva → Revisando → Postulando → Ganada/Perdida.
5. **Ayuda a postular:** checklist de requisitos contra los documentos de la empresa y borrador de la propuesta basado en propuestas pasadas.
6. **Aprende:** con las licitaciones ganadas o descartadas ajusta sus recomendaciones.

## Portal inicial
**Guatecompras (Guatemala)** detrás de una capa de *adaptadores*, para poder agregar después CompraNet (MX), SECOP (CO), ChileCompra, etc. sin tocar el resto del sistema.
- Primero se revisa si el portal tiene **datos abiertos o una API** (formato OCDS); solo si no la hay, se hace scraping con Playwright.
- Siempre se respetan los términos y el `robots.txt` del portal, y se consulta con poca frecuencia.

## Stack
| Pieza | Tecnología | Por qué |
|---|---|---|
| Web y API | Next.js (App Router) + TypeScript | Un solo proyecto, deploy gratis en Vercel |
| Base de datos | Supabase (Postgres + pgvector) | Datos, login, almacenamiento de PDFs y búsqueda semántica en un solo lugar |
| Recolección | Worker en Node + Playwright, ejecutado por cron | Revisa el portal cada pocas horas |
| IA | API de Claude | Extraer datos de PDFs, calificar el encaje, redactar borradores |
| Embeddings | pgvector | Búsqueda semántica: "licitaciones de mantenimiento de aire acondicionado" |
| Alertas | Resend (correo) + bot de Telegram | |
| Diseño | Skills del portafolio (impeccable, design-taste-frontend, animate) | Que se vea como producto real |

## Modelo de datos (resumen)
- `empresas`: perfil, rubros, palabras clave, ubicación, montos de interés.
- `documentos_empresa`: certificados, CVs y propuestas pasadas (con embeddings).
- `licitaciones`: datos del portal + campos extraídos por IA + embedding.
- `versiones_licitacion`: cada cambio detectado, con el diff y su resumen hecho por IA.
- `coincidencias`: empresa × licitación → calificación, razones, estado del pipeline.
- `alertas`: qué se notificó, a quién y cuándo.

## Fases

### Fase 0: Base (1 semana)
- Proyecto Next.js + Supabase, login, diseño base con la marca Triki.
- Investigar los datos de Guatecompras (API o datos abiertos vs scraping).

### Fase 1: Radar (2 semanas) → *ya es demostrable*
- Worker que trae licitaciones nuevas y guarda las versiones.
- Detección de cambios + diff + resumen con IA ("cambió la fecha de cierre del 10 al 20 de diciembre").
- Listado con filtros y detalle de cada licitación.

### Fase 2: IA que entiende (2 semanas)
- Lectura de PDFs: extracción estructurada de monto, fechas, requisitos y garantías.
- Perfil de empresa + calificación de encaje con explicación.
- Búsqueda semántica.

### Fase 3: Flujo de trabajo (1-2 semanas)
- Pipeline tipo kanban, alertas por correo y Telegram, resumen diario.

### Fase 4: Asistente de postulación (2 semanas)
- Subir documentos de la empresa, checklist automático de requisitos (cumple / falta).
- Borrador de propuesta a partir de propuestas pasadas.
- Chat por licitación: "¿piden experiencia mínima?", con citas a la página del PDF.

### Fase 5: Pulido de portafolio
- Landing pública con demo (empresa ficticia con datos reales del portal).
- Métricas: "X oportunidades encontradas, Q X millones en licitaciones relevantes".
- README, video corto del demo y despliegue en `radar.trikis.nl`.

## El momento "wow" del demo
Abres el dashboard, aparece una licitación nueva con **92% de encaje**: la IA explica por qué, marca que falta un documento y en un clic genera el borrador de la propuesta.
