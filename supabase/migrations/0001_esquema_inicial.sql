-- Triki Radar · esquema inicial
-- Pégalo en Supabase > SQL Editor y ejecútalo una vez.

create extension if not exists vector;

-- ─────────────────────────────────────────────
-- Empresas y quién pertenece a cada una
-- ─────────────────────────────────────────────
create table public.empresas (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,
  descripcion     text,                       -- qué vende / a qué se dedica (lo lee la IA)
  rubros          text[] not null default '{}',
  palabras_clave  text[] not null default '{}',
  departamentos   text[] not null default '{}', -- dónde puede operar
  monto_minimo    numeric,
  monto_maximo    numeric,
  embedding       vector(1024),               -- perfil para búsqueda semántica (Fase 2)
  creado_en       timestamptz not null default now()
);

create table public.miembros (
  empresa_id  uuid not null references public.empresas on delete cascade,
  usuario_id  uuid not null references auth.users on delete cascade,
  rol         text not null default 'miembro' check (rol in ('admin', 'miembro')),
  primary key (empresa_id, usuario_id)
);

create or replace function public.es_miembro(e uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.miembros
    where empresa_id = e and usuario_id = (select auth.uid())
  );
$$;

-- ─────────────────────────────────────────────
-- Licitaciones (datos públicos, formato OCDS de Guatecompras)
-- ─────────────────────────────────────────────
create table public.licitaciones (
  id                 uuid primary key default gen_random_uuid(),
  fuente             text not null default 'guatecompras',
  ocid               text not null,          -- id OCDS del proceso
  nog                text,                   -- Número de Operación Guatecompras
  titulo             text not null,
  descripcion        text,
  entidad            text,                   -- comprador
  modalidad          text,
  estado             text,
  monto              numeric,
  moneda             text default 'GTQ',
  fecha_publicacion  timestamptz,
  fecha_cierre       timestamptz,
  url                text,
  datos              jsonb not null,         -- release OCDS completo
  huella             text not null,          -- hash de `datos`: si cambia, hay versión nueva
  -- Campos que llena la IA (Fase 2)
  resumen_ia         text,
  requisitos_ia      jsonb,
  embedding          vector(1024),
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),
  unique (fuente, ocid)
);

create index licitaciones_cierre_idx on public.licitaciones (fecha_cierre);
create index licitaciones_publicacion_idx on public.licitaciones (fecha_publicacion desc);
create index licitaciones_texto_idx on public.licitaciones
  using gin (to_tsvector('spanish', coalesce(titulo, '') || ' ' || coalesce(descripcion, '')));

-- Cada cambio detectado en una licitación
create table public.versiones_licitacion (
  id              uuid primary key default gen_random_uuid(),
  licitacion_id   uuid not null references public.licitaciones on delete cascade,
  huella          text not null,
  datos           jsonb not null,
  cambios         jsonb,                    -- diff campo por campo
  resumen_cambio  text,                     -- explicación en español hecha por IA
  detectado_en    timestamptz not null default now()
);

create index versiones_licitacion_idx on public.versiones_licitacion (licitacion_id, detectado_en desc);

-- ─────────────────────────────────────────────
-- Lo que es de cada empresa
-- ─────────────────────────────────────────────
create table public.coincidencias (
  empresa_id     uuid not null references public.empresas on delete cascade,
  licitacion_id  uuid not null references public.licitaciones on delete cascade,
  puntaje        smallint check (puntaje between 0 and 100),
  razones        jsonb,                    -- por qué encaja / por qué no (IA)
  estado         text not null default 'nueva'
                 check (estado in ('nueva', 'revisando', 'postulando', 'ganada', 'perdida', 'descartada')),
  notas          text,
  actualizado_en timestamptz not null default now(),
  primary key (empresa_id, licitacion_id)
);

create table public.documentos_empresa (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas on delete cascade,
  tipo        text not null check (tipo in ('certificado', 'cv', 'propuesta', 'otro')),
  nombre      text not null,
  ruta        text not null,               -- ruta en Supabase Storage
  contenido   text,
  embedding   vector(1024),
  creado_en   timestamptz not null default now()
);

create table public.alertas (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references public.empresas on delete cascade,
  licitacion_id  uuid references public.licitaciones on delete cascade,
  canal          text not null check (canal in ('correo', 'telegram')),
  motivo         text not null,
  enviada_en     timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Seguridad (RLS)
-- Las licitaciones son públicas para usuarios con sesión; solo el recolector
-- (con la clave secreta, que salta RLS) puede escribirlas.
-- Todo lo demás solo lo ven los miembros de la empresa.
-- ─────────────────────────────────────────────
alter table public.empresas             enable row level security;
alter table public.miembros             enable row level security;
alter table public.licitaciones         enable row level security;
alter table public.versiones_licitacion enable row level security;
alter table public.coincidencias        enable row level security;
alter table public.documentos_empresa   enable row level security;
alter table public.alertas              enable row level security;

create policy "leer licitaciones" on public.licitaciones
  for select to authenticated using (true);
create policy "leer versiones" on public.versiones_licitacion
  for select to authenticated using (true);

create policy "ver mi empresa" on public.empresas
  for select to authenticated using (public.es_miembro(id));
create policy "editar mi empresa" on public.empresas
  for update to authenticated using (public.es_miembro(id));

create policy "ver mis membresías" on public.miembros
  for select to authenticated using (usuario_id = (select auth.uid()));

create policy "coincidencias de mi empresa" on public.coincidencias
  for all to authenticated using (public.es_miembro(empresa_id)) with check (public.es_miembro(empresa_id));
create policy "documentos de mi empresa" on public.documentos_empresa
  for all to authenticated using (public.es_miembro(empresa_id)) with check (public.es_miembro(empresa_id));
create policy "alertas de mi empresa" on public.alertas
  for select to authenticated using (public.es_miembro(empresa_id));

-- Crear empresa: la crea y deja al usuario como admin en un solo paso.
create or replace function public.crear_empresa(nombre text, descripcion text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare nueva uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Necesitas iniciar sesión';
  end if;
  insert into public.empresas (nombre, descripcion) values (nombre, descripcion) returning id into nueva;
  insert into public.miembros (empresa_id, usuario_id, rol) values (nueva, (select auth.uid()), 'admin');
  return nueva;
end;
$$;

revoke execute on function public.crear_empresa(text, text) from anon, public;
grant execute on function public.crear_empresa(text, text) to authenticated;
