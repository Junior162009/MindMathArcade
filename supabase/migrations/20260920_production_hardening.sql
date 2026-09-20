-- TecnoMath production hardening — 2026-09-20
-- Non-destructive: no tables, users, profiles, votes or progress are deleted/recreated.

create or replace function public.tecnomath_is_class_a()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.tecnomath_profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
      and p.admin_class = 'A'
  );
$$;

revoke all on function public.tecnomath_is_class_a() from public, anon;
grant execute on function public.tecnomath_is_class_a() to authenticated;

create or replace function public.tecnomath_is_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.tecnomath_profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  );
$$;

revoke all on function public.tecnomath_is_admin() from public, anon;
grant execute on function public.tecnomath_is_admin() to authenticated;

create or replace function private.admin_allowed()
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1
    from public.tecnomath_profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  );
$$;

create or replace function private.admin_management_info()
returns table(admin_class text, can_remove_admins boolean)
language plpgsql
stable
security definer
set search_path to ''
as $$
declare actor_is_class_a boolean;
begin
  if not private.admin_allowed() then raise exception 'No autorizado'; end if;
  actor_is_class_a := exists (
    select 1 from public.tecnomath_profiles p
    where p.id = (select auth.uid()) and p.role = 'admin' and p.admin_class = 'A'
  );
  return query select case when actor_is_class_a then 'A' else 'B' end, actor_is_class_a;
end;
$$;

create or replace function private.admin_update_profile(
  p_user_id uuid,
  p_username text,
  p_display_name text,
  p_phone text,
  p_role text
)
returns public.tecnomath_profiles
language plpgsql
security definer
set search_path to ''
as $$
declare result public.tecnomath_profiles; actor_is_class_a boolean; target_is_admin boolean;
begin
  if not private.admin_allowed() then raise exception 'No autorizado'; end if;
  if p_role not in ('user','admin') then raise exception 'Rol inválido'; end if;
  actor_is_class_a := exists (
    select 1 from public.tecnomath_profiles p
    where p.id = (select auth.uid()) and p.role='admin' and p.admin_class='A'
  );
  select p.role='admin' into target_is_admin from public.tecnomath_profiles p where p.id=p_user_id;
  if target_is_admin is null then raise exception 'Usuario no encontrado'; end if;
  if p_role='user' and target_is_admin and not actor_is_class_a then
    raise exception 'Los administradores Clase B no pueden quitar privilegios de otros administradores. Solo un administrador Clase A puede hacerlo.';
  end if;
  perform set_config('tecnomath.allow_role_change','1',true);
  update public.tecnomath_profiles
     set username=nullif(trim(p_username),''),
         display_name=nullif(trim(p_display_name),''),
         phone=nullif(trim(p_phone),''),
         role=p_role,
         updated_at=now()
   where id=p_user_id
   returning * into result;
  insert into public.tecnomath_admin_logs(admin_id,action,target_id,details)
  values ((select auth.uid()),'update_profile',p_user_id,
          jsonb_build_object('role',p_role,'actor_class',case when actor_is_class_a then 'A' else 'B' end));
  return result;
end;
$$;

create or replace function public.tecnomath_update_game_catalog_order(p_orders jsonb)
returns void
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $$
declare item jsonb; v_key text; v_order integer;
begin
  if not public.tecnomath_is_class_a() then raise exception 'not_class_a'; end if;
  create temporary table if not exists _tm_order_keys(game_key text primary key) on commit drop;
  truncate _tm_order_keys;
  for item in select * from jsonb_array_elements(coalesce(p_orders,'[]'::jsonb)) loop
    v_key:=nullif(trim(item->>'game_key'),'');
    v_order:=(item->>'sort_order')::integer;
    if v_key is null or v_order is null or v_order<1 then raise exception 'invalid_order_item'; end if;
    insert into _tm_order_keys(game_key) values(v_key) on conflict do nothing;
  end loop;
  delete from public.tecnomath_game_catalog_order o
   where not exists (select 1 from _tm_order_keys k where k.game_key=o.game_key);
  for item in select * from jsonb_array_elements(coalesce(p_orders,'[]'::jsonb)) loop
    v_key:=nullif(trim(item->>'game_key'),'');
    v_order:=(item->>'sort_order')::integer;
    insert into public.tecnomath_game_catalog_order(game_key,sort_order,updated_at,updated_by)
    values(v_key,v_order,now(),(select auth.uid()))
    on conflict(game_key) do update set
      sort_order=excluded.sort_order,updated_at=now(),updated_by=(select auth.uid());
  end loop;
end;
$$;

drop policy if exists "Admins can manage game catalog order" on public.tecnomath_game_catalog_order;

drop policy if exists "Class A can insert game catalog order" on public.tecnomath_game_catalog_order;
create policy "Class A can insert game catalog order"
on public.tecnomath_game_catalog_order for insert to authenticated
with check ((select public.tecnomath_is_class_a()));

drop policy if exists "Class A can update game catalog order" on public.tecnomath_game_catalog_order;
create policy "Class A can update game catalog order"
on public.tecnomath_game_catalog_order for update to authenticated
using ((select public.tecnomath_is_class_a()))
with check ((select public.tecnomath_is_class_a()));

drop policy if exists "Class A can delete game catalog order" on public.tecnomath_game_catalog_order;
create policy "Class A can delete game catalog order"
on public.tecnomath_game_catalog_order for delete to authenticated
using ((select public.tecnomath_is_class_a()));

drop policy if exists "class_a_catalog_jobs_insert" on public.tecnomath_catalog_jobs;
create policy "class_a_catalog_jobs_insert"
on public.tecnomath_catalog_jobs for insert to authenticated
with check (
  user_id=(select auth.uid()) and exists (
    select 1 from public.tecnomath_profiles p
    where p.id=(select auth.uid()) and p.role='admin' and p.admin_class='A'
  )
);

drop policy if exists "class_a_catalog_jobs_select" on public.tecnomath_catalog_jobs;
create policy "class_a_catalog_jobs_select"
on public.tecnomath_catalog_jobs for select to authenticated
using (exists (
  select 1 from public.tecnomath_profiles p
  where p.id=(select auth.uid()) and p.role='admin' and p.admin_class='A'
));

drop policy if exists "class_a_catalog_jobs_update" on public.tecnomath_catalog_jobs;
create policy "class_a_catalog_jobs_update"
on public.tecnomath_catalog_jobs for update to authenticated
using (exists (
  select 1 from public.tecnomath_profiles p
  where p.id=(select auth.uid()) and p.role='admin' and p.admin_class='A'
))
with check (exists (
  select 1 from public.tecnomath_profiles p
  where p.id=(select auth.uid()) and p.role='admin' and p.admin_class='A'
));

drop policy if exists "class_a_catalog_logs_select" on public.tecnomath_catalog_logs;
create policy "class_a_catalog_logs_select"
on public.tecnomath_catalog_logs for select to authenticated
using (exists (
  select 1 from public.tecnomath_profiles p
  where p.id=(select auth.uid()) and p.role='admin' and p.admin_class='A'
));

drop index if exists public.game_votes_student_game_unique;

 
-- Storage: logos subidos desde el Gestor de Juegos Clase A.
-- Usa el bucket público existente game-downloads; no se crea ni recrea ningún bucket.
drop policy if exists "class_a_upload_game_logos" on storage.objects;
create policy "class_a_upload_game_logos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'game-downloads'
  and (storage.foldername(name))[1] = 'logos'
  and exists (
    select 1 from public.tecnomath_profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
      and p.admin_class = 'A'
  )
);

drop policy if exists "public_read_game_logos" on storage.objects;
create policy "public_read_game_logos"
on storage.objects
for select
to public
using (
  bucket_id = 'game-downloads'
  and (storage.foldername(name))[1] = 'logos'
);


-- Storage: paquetes ZIP privados subidos desde el Gestor de Juegos Clase A.
-- El publicador de GitHub los lee con la service key; no se expone el ZIP públicamente.
drop policy if exists "class_a_upload_game_packages" on storage.objects;
create policy "class_a_upload_game_packages"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'game-submissions'
  and (storage.foldername(name))[1] = 'class-a-packages'
  and exists (
    select 1 from public.tecnomath_profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
      and p.admin_class = 'A'
  )
);
