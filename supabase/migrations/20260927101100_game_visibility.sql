-- TecnoMath · Fast game visibility layer
-- Non-destructive: does not delete games, users, profiles, votes, rankings, progress or catalog JSON.
create table if not exists public.game_visibility (
  game_id text primary key,
  status text not null default 'published' check (status in ('published','hidden')),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create index if not exists game_visibility_status_idx on public.game_visibility(status);
create index if not exists game_visibility_updated_at_idx on public.game_visibility(updated_at desc);

alter table public.game_visibility enable row level security;

drop policy if exists "game_visibility_public_read" on public.game_visibility;
create policy "game_visibility_public_read"
on public.game_visibility for select
to anon, authenticated
using (true);

revoke insert, update, delete on public.game_visibility from anon, authenticated;
grant select on public.game_visibility to anon, authenticated;
grant all on public.game_visibility to service_role;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='game_visibility'
  ) then
    alter publication supabase_realtime add table public.game_visibility;
  end if;
end $$;

alter table public.game_visibility replica identity full;
