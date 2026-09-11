create table if not exists public.tecnomath_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.tecnomath_settings(key,value) values
('theme','"normal"'::jsonb),
('event','{}'::jsonb)
on conflict(key) do nothing;

create or replace function public.tecnomath_get_settings()
returns jsonb language sql security definer set search_path=public as $$
  select jsonb_build_object(
    'event', coalesce((select value from public.tecnomath_settings where key='event'), '{}'::jsonb),
    'theme', coalesce((select value from public.tecnomath_settings where key='theme'), '"normal"'::jsonb)
  );
$$;

create or replace function public.tecnomath_set_setting(p_key text,p_value jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_role text;
begin
  select role into v_role from public.tecnomath_profiles where id=auth.uid();
  if v_role <> 'admin' then raise exception 'Solo administradores'; end if;
  if p_key not in ('event','theme') then raise exception 'Configuración no permitida'; end if;
  insert into public.tecnomath_settings(key,value,updated_at) values(p_key,p_value,now())
  on conflict(key) do update set value=excluded.value,updated_at=now();
  return p_value;
end;
$$;

revoke all on function public.tecnomath_get_settings() from public;
grant execute on function public.tecnomath_get_settings() to anon,authenticated;
revoke all on function public.tecnomath_set_setting(text,jsonb) from public;
grant execute on function public.tecnomath_set_setting(text,jsonb) to authenticated;
