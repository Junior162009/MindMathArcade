-- TecnoMath: progreso por juego, asociado 1:1 al usuario de Supabase Auth.
-- La columna progress permite conservar los datos específicos que cada juego ya produce.

create table if not exists public.tecnomath_game_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null,
  progress jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

create index if not exists tecnomath_game_progress_updated_idx
  on public.tecnomath_game_progress (user_id, updated_at desc);

alter table public.tecnomath_game_progress enable row level security;

drop policy if exists "game_progress_select_own" on public.tecnomath_game_progress;
create policy "game_progress_select_own" on public.tecnomath_game_progress
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "game_progress_insert_own" on public.tecnomath_game_progress;
create policy "game_progress_insert_own" on public.tecnomath_game_progress
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "game_progress_update_own" on public.tecnomath_game_progress;
create policy "game_progress_update_own" on public.tecnomath_game_progress
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.tecnomath_game_progress_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists tecnomath_game_progress_touch_updated_at on public.tecnomath_game_progress;
create trigger tecnomath_game_progress_touch_updated_at
before update on public.tecnomath_game_progress
for each row execute function public.tecnomath_game_progress_touch_updated_at();
