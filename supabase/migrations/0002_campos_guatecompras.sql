-- Triki Radar · campos reales de Guatecompras (Fase 1)
-- Pégalo en Supabase > SQL Editor y ejecútalo una vez.
--
-- El archivo OCDS de Guatecompras no trae monto estimado y casi nunca trae
-- fecha de cierre: esos datos viven en los PDFs y los sacará la IA (Fase 2).
-- Lo que sí trae: modalidad, categoría, ítems, ofertas recibidas y adjudicaciones.

alter table public.licitaciones
  add column if not exists nog_numero        bigint,
  add column if not exists estado_detalle    text,     -- "Vigente", "Evaluación", "Adjudicado"...
  add column if not exists categoria         text,     -- goods / services / works
  add column if not exists departamento      text,     -- región del comprador
  add column if not exists num_items         integer not null default 0,
  add column if not exists num_documentos    integer not null default 0,
  add column if not exists num_ofertas       integer,
  add column if not exists monto_adjudicado  numeric,
  add column if not exists proveedores_adjudicados text[],
  add column if not exists fecha_fuente      timestamptz, -- última modificación según Guatecompras
  add column if not exists texto_items       text;

-- Búsqueda en español sobre título, entidad e ítems
alter table public.licitaciones
  add column if not exists busqueda tsvector generated always as (
    setweight(to_tsvector('spanish', coalesce(titulo, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(entidad, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(texto_items, '')), 'C')
  ) stored;

drop index if exists public.licitaciones_texto_idx;
create index if not exists licitaciones_busqueda_idx on public.licitaciones using gin (busqueda);
create index if not exists licitaciones_estado_idx on public.licitaciones (estado_detalle);
create index if not exists licitaciones_fuente_fecha_idx on public.licitaciones (fecha_fuente desc);

-- Registro de cada corrida del recolector (para el panel y para depurar)
create table if not exists public.corridas_recolector (
  id            uuid primary key default gen_random_uuid(),
  fuente        text not null default 'guatecompras',
  periodo       text not null,             -- "2026-11"
  iniciada_en   timestamptz not null default now(),
  terminada_en  timestamptz,
  procesadas    integer not null default 0,
  nuevas        integer not null default 0,
  cambiadas     integer not null default 0,
  error         text
);

alter table public.corridas_recolector enable row level security;
create policy "leer corridas" on public.corridas_recolector
  for select to authenticated using (true);
