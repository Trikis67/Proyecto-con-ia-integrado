-- Triki Radar · encaje empresa ↔ licitación (Fase 2)
-- Pégalo en Supabase > SQL Editor y ejecútalo una vez.
--
-- Dos niveles:
--   1. candidatas(): gratis e instantáneo. Busca vigentes que coinciden con las palabras
--      clave de la empresa y les da un puntaje base explicable (palabras + departamento).
--   2. La IA evalúa las mejores y guarda su puntaje y razones en `coincidencias`.

alter table public.coincidencias
  add column if not exists veredicto text check (veredicto in ('conviene', 'revisar', 'no_conviene')),
  add column if not exists evaluado_en timestamptz;

create or replace function public.candidatas(p_empresa uuid, p_limite int default 25, p_desde int default 0)
returns table (
  id uuid,
  nog text,
  titulo text,
  titulo_ia text,
  entidad text,
  departamento text,
  modalidad text,
  estado_detalle text,
  fecha_publicacion timestamptz,
  num_documentos int,
  num_ofertas int,
  puntaje_base int,
  en_su_zona boolean,
  puntaje_ia smallint,
  veredicto text,
  razones jsonb,
  seguimiento text,
  total bigint
)
language sql stable security invoker set search_path = '' as $$
  with e as (
    -- security invoker + es_miembro: solo funciona para tu propia empresa
    select * from public.empresas where empresas.id = p_empresa and public.es_miembro(empresas.id)
  ),
  q as (
    select websearch_to_tsquery('spanish', array_to_string(e.palabras_clave, ' or ')) as consulta,
           e.departamentos
    from e
    where cardinality(e.palabras_clave) > 0
  ),
  base as (
    select l.*,
           -- departamentos guardados en mayúsculas y sin tildes, igual que en Guatecompras
           (cardinality(q.departamentos) = 0 or l.departamento = any (q.departamentos)) as en_su_zona,
           ts_rank_cd(l.busqueda, q.consulta, 32) as relevancia
    from public.licitaciones l, q
    where l.estado_detalle = 'Vigente'
      and l.busqueda @@ q.consulta
  )
  select b.id, b.nog, b.titulo, b.titulo_ia, b.entidad, b.departamento, b.modalidad, b.estado_detalle,
         b.fecha_publicacion, b.num_documentos, b.num_ofertas,
         -- 40 por coincidir + hasta 35 por relevancia del texto + 25 si está en su zona
         least(100, 40 + round(b.relevancia * 35)::int + case when b.en_su_zona then 25 else 0 end) as puntaje_base,
         b.en_su_zona,
         c.puntaje as puntaje_ia, c.veredicto, c.razones, c.estado as seguimiento,
         count(*) over () as total
  from base b
  left join public.coincidencias c on c.licitacion_id = b.id and c.empresa_id = p_empresa
  where coalesce(c.estado, 'nueva') <> 'descartada'
  order by coalesce(c.puntaje, least(100, 40 + round(b.relevancia * 35)::int + case when b.en_su_zona then 25 else 0 end)) desc,
           b.fecha_publicacion desc nulls last
  limit p_limite offset p_desde;
$$;

grant execute on function public.candidatas(uuid, int, int) to authenticated;

-- Dejar que la persona cree su empresa y vea a sus compañeros de equipo
-- (drop + create para que la migración se pueda ejecutar más de una vez)
drop policy if exists "ver miembros de mi empresa" on public.miembros;
create policy "ver miembros de mi empresa" on public.miembros
  for select to authenticated using (public.es_miembro(empresa_id));
