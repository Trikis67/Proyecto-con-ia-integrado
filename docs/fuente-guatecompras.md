# Fuente de datos: Guatecompras (OCDS)

Investigación de las fases 0 y 1, noviembre de 2026.

## De dónde salen los datos
- Portal de datos abiertos: https://ocds.guatecompras.gt/descarga-datos
- Hay un archivo **por mes** desde 2020 en CSV, XLSX y JSON. **Se regeneran cada día**: el 6 de noviembre todos los meses de 2026 tenían fecha de actualización de ese mismo día.
- El JSON se descarga de `https://ocds.guatecompras.gt/file/json/{año}/{mes}`. Es un ZIP de unos 4 MB con un JSON de 30 MB adentro. No acepta `HEAD` (devuelve 405) ni descargas por rangos.
- Formato: un paquete de *records* OCDS, un registro por proceso, con `compiledRelease` (el estado actual del proceso) y la lista de *releases*.
- Licencia **CC BY 4.0**: se pueden usar los datos citando la fuente. La cita va en el pie de página.

## Reglas del sitio (robots.txt)
- `User-agent: *` con `Allow: /` y `Content-Signal: search=yes, ai-train=no, use=reference`.
- **No se pueden usar estos datos para entrenar modelos de IA.** Triki Radar solo los muestra y los analiza para cada usuario (y en la Fase 2 la IA los lee para resumirlos), nunca los usa para entrenar.
- El recolector se identifica como `TrikiRadar/0.1 (+https://trikis.nl)` y baja solo 2 archivos dos veces al día.

## Qué trae (noviembre de 2026: 5,215 procesos)
| Dato | Cobertura | Columna |
|---|---|---|
| Título, entidad compradora y unidad | 100% | `titulo`, `entidad`, `datos.comprador` |
| Departamento y municipio del comprador | ~100% | `departamento` |
| Modalidad (Compra directa: 91%, Licitación pública, Cotización…) | 100% | `modalidad` |
| Estado (Vigente 67%, Evaluación 27%, Adjudicado 4%…) | 100% | `estado_detalle` |
| Ítems con cantidad, unidad, código UNSPSC y características | 100% | `datos.items`, `texto_items` |
| Documentos (bases, convocatoria, pedido) en PDF | 100% | `datos.documentos` |
| Ofertas recibidas (quién ofertó) | 50% | `num_ofertas`, `datos.ofertas` |
| Adjudicación con proveedor y monto | 4.5% | `monto_adjudicado`, `proveedores_adjudicados` |
| **Monto estimado** | **0%** | `monto` (lo llenará la IA) |
| **Fecha de cierre** | **6%** | `fecha_cierre` (lo llenará la IA) |

Conclusión: el monto estimado y la fecha límite para ofertar **solo están en los PDFs**. Extraerlos es el trabajo principal de la IA en la Fase 2.

## Riesgos
- **Verificación del navegador en www.guatecompras.gt.** La ficha del concurso (`/concursos/consultaConcurso.aspx?nog=…`) muestra una pantalla de "Revisaremos tu navegador" que no pasa sola. Para la persona usuaria no es problema, porque abre el enlace en su navegador. Pero los PDFs viven en ese mismo dominio (`/concursos/files/…`), así que en la Fase 2 hay que probar si se pueden descargar automáticamente. **Nunca se resuelve ni se salta un captcha.** Si los PDFs quedan bloqueados, el plan B es que la persona suba el PDF o pedir a la DGAE un acceso oficial.
- Los licitantes vienen duplicados: el recolector los deja únicos.
- La copia del Open Contracting Partnership (https://data.open-contracting.org/en/publication/142) sirve para el histórico desde 2020 si algún día hace falta.
