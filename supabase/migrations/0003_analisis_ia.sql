-- Triki Radar · análisis con IA (Fase 2)
-- Pégalo en Supabase > SQL Editor y ejecútalo una vez.
--
-- Lo que saca la IA va en columnas propias (sufijo _ia): el recolector reescribe
-- las columnas que vienen de Guatecompras en cada corrida y no debe borrar el análisis.

alter table public.licitaciones
  add column if not exists titulo_ia          text,
  add column if not exists analisis_ia        jsonb,       -- requisitos, garantías, documentos, alertas…
  add column if not exists monto_estimado_ia  numeric,
  add column if not exists fecha_cierre_ia    timestamptz,
  add column if not exists ia_documento       text,        -- nombre del PDF analizado (null = solo datos)
  add column if not exists ia_analizado_en    timestamptz;

-- Cada llamada a la IA: para saber cuánto cuesta y poner un límite diario por persona
create table if not exists public.uso_ia (
  id               uuid primary key default gen_random_uuid(),
  usuario_id       uuid not null references auth.users on delete cascade,
  licitacion_id    uuid references public.licitaciones on delete set null,
  modelo           text not null,
  con_pdf          boolean not null default false,
  tokens_entrada   integer,
  tokens_salida    integer,
  costo_usd        numeric(10, 5),
  error            text,
  creado_en        timestamptz not null default now()
);

create index if not exists uso_ia_usuario_idx on public.uso_ia (usuario_id, creado_en desc);

alter table public.uso_ia enable row level security;
create policy "ver mi uso de IA" on public.uso_ia
  for select to authenticated using (usuario_id = (select auth.uid()));
