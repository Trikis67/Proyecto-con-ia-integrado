# Fuente de datos: Guatecompras (OCDS)

Investigación de la Fase 0, noviembre de 2026.

## Qué hay
- Guatecompras publica sus procesos en el **Estándar de Datos para las Contrataciones Abiertas (OCDS)** desde mayo de 2024: https://ocds.guatecompras.gt/
- Licencia **CC BY 4.0**: se pueden usar los datos, también comercialmente, siempre que se cite la fuente. Ya va en el pie de página.
- El Open Contracting Partnership mantiene una copia en https://data.open-contracting.org/en/publication/142 con descargas por año:
  - `YEAR.jsonl.gz`: un proceso por línea (2026: unos 377 MB comprimidos).
  - `YEAR.csv.tar.gz`: versión tabular.
  - Cobertura: enero de 2020 a la fecha.

## Qué trae cada proceso (lo que nos sirve)
| OCDS | Columna en `licitaciones` |
|---|---|
| `ocid` | `ocid` |
| `tender.id` (NOG) | `nog` |
| `tender.title` / `tender.description` | `titulo` / `descripcion` |
| `buyer.name` | `entidad` |
| `tender.procurementMethodDetails` | `modalidad` |
| `tender.status` | `estado` |
| `tender.value.amount` / `.currency` | `monto` / `moneda` |
| `tender.tenderPeriod.endDate` | `fecha_cierre` |
| `tender.documents[]` | PDFs de las bases (Fase 2) |

Hay buena cobertura de convocatorias (unos 1.8 millones de procesos) y adjudicaciones. Casi no hay datos de contratos ni de pagos, pero para el radar no hacen falta.

## Problemas de calidad conocidos
- Licitantes y contactos duplicados en `tender.tenderers` y `parties`.
- Fechas de `contracts.dateSigned` con años mal escritos o con espacios. Hay que normalizarlas y no confiar en ellas.

## Pendiente para la Fase 1
- **Frescura:** la copia del OCP se actualiza más o menos una vez al mes y el radar necesita datos diarios. El portal oficial `ocds.guatecompras.gt` respondió **403** a peticiones automáticas. Toca revisarlo desde un navegador normal para ver si tiene una API o descargas diarias y en qué condiciones se puede usar.
- Plan B: cargar el histórico desde la copia del OCP y sacar las novedades diarias del portal, respetando sus términos y consultando con poca frecuencia.
