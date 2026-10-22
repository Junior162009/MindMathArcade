-- Adds secure, persistent controls for the existing game_visibility table.
-- Existing rows are never overwritten: their current visibility is preserved.
insert into public.game_visibility (game_id, status)
values
  ('word-bridge','published'),
  ('mathverse','published'),
  ('tecnomath-ia','hidden'),
  ('animalandia','published'),
  ('banderquiz','published'),
  ('bit-rush','published'),
  ('eco-recolector','published'),
  ('fixtext','published'),
  ('horror-school','published'),
  ('mentex','published'),
  ('mindmath-arcade','published'),
  ('pequementes','published'),
  ('quizzer','published'),
  ('saberix','published'),
  ('sapiens','published'),
  ('space-mission-final-10','published'),
  ('study','published'),
  ('tecnobrainmath','published'),
  ('matemia','published')
on conflict (game_id) do nothing;

create or replace function public.tecnomath_admin_sync_game_visibility(p_games jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  item jsonb;
  game_key text;
  inserted_count integer := 0;
  affected integer;
begin
  if auth.uid() is null or not public.tecnomath_is_admin() then
    raise exception 'Solo un administrador autorizado puede sincronizar la visibilidad.';
  end if;
  if jsonb_typeof(p_games) <> 'array' then
    raise exception 'El catálogo debe ser una lista.';
  end if;
  for item in select value from jsonb_array_elements(p_games)
  loop
    game_key := left(trim(coalesce(item->>'id', item->>'url', '')), 500);
    if game_key <> '' and coalesce(item->>'name','') <> '' and coalesce(item->>'url','') <> '' then
      insert into public.game_visibility(game_id,status,updated_by)
      values (game_key,'hidden',auth.uid())
      on conflict (game_id) do nothing;
      get diagnostics affected = row_count;
      inserted_count := inserted_count + affected;
    end if;
  end loop;
  return inserted_count;
end;
$$;

create or replace function public.tecnomath_admin_set_game_visibility(p_game_id text, p_visible boolean)
returns public.game_visibility
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result public.game_visibility;
  game_key text := left(trim(coalesce(p_game_id,'')),500);
begin
  if auth.uid() is null or not public.tecnomath_is_admin() then
    raise exception 'Solo un administrador autorizado puede cambiar la visibilidad.';
  end if;
  if game_key = '' or p_visible is null then
    raise exception 'Identificador y estado de visibilidad son obligatorios.';
  end if;
  insert into public.game_visibility(game_id,status,updated_by,updated_at)
  values (game_key, case when p_visible then 'published' else 'hidden' end, auth.uid(), now())
  on conflict (game_id) do update
    set status = excluded.status, updated_by = excluded.updated_by, updated_at = now()
  returning * into result;
  return result;
end;
$$;

alter table public.game_visibility enable row level security;
revoke insert, update, delete, truncate, references, trigger on public.game_visibility from anon, authenticated;
grant select on public.game_visibility to anon, authenticated;
revoke all on function public.tecnomath_admin_sync_game_visibility(jsonb) from public, anon;
revoke all on function public.tecnomath_admin_set_game_visibility(text, boolean) from public, anon;
grant execute on function public.tecnomath_admin_sync_game_visibility(jsonb) to authenticated;
grant execute on function public.tecnomath_admin_set_game_visibility(text, boolean) to authenticated;
