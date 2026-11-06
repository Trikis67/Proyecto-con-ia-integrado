-- Triki Radar · escala del puntaje estimado (corrige el orden de «Para mi empresa»)
-- Pégalo en Supabase > SQL Editor y ejecútalo una vez (se puede repetir sin problema).
--
-- Antes el puntaje estimado (solo palabras y zona) llegaba a 100, y la IA sin las bases
-- rara vez pasa de 83: las licitaciones aún sin evaluar quedaban ARRIBA de las que la IA
-- ya recomendó. Ahora el estimado tiene techo de 70: lo que la IA marca como «Te conviene»
-- (80+) va primero, las estimadas en medio y lo que la IA descarta (<50) al final.

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
         -- 30 por coincidir + hasta 20 por relevancia + 20 si está en su zona = máximo 70
         (30 + round(b.relevancia * 20)::int + case when b.en_su_zona then 20 else 0 end) as puntaje_base,
         b.en_su_zona,
         c.puntaje as puntaje_ia, c.veredicto, c.razones, c.estado as seguimiento,
         count(*) over () as total
  from base b
  left join public.coincidencias c on c.licitacion_id = b.id and c.empresa_id = p_empresa
  where coalesce(c.estado, 'nueva') <> 'descartada'
  order by coalesce(c.puntaje, (30 + round(b.relevancia * 20)::int + case when b.en_su_zona then 20 else 0 end)) desc,
           b.fecha_publicacion desc nulls last
  limit p_limite offset p_desde;
$$;

grant execute on function public.candidatas(uuid, int, int) to authenticated;
