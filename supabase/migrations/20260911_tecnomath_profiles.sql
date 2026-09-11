-- TecnoMath: perfil único asociado 1:1 con Supabase Auth.
-- Ejecutar en Supabase SQL Editor si la tabla aún no existe.

create table if not exists public.tecnomath_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  display_name text,
  phone text,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tecnomath_profiles_username_unique
  on public.tecnomath_profiles (lower(username));

alter table public.tecnomath_profiles enable row level security;

drop policy if exists "profiles_select_own" on public.tecnomath_profiles;
create policy "profiles_select_own"
  on public.tecnomath_profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.tecnomath_profiles;
create policy "profiles_insert_own"
  on public.tecnomath_profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.tecnomath_profiles;
create policy "profiles_update_own"
  on public.tecnomath_profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.tecnomath_profiles_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tecnomath_profiles_touch_updated_at on public.tecnomath_profiles;
create trigger tecnomath_profiles_touch_updated_at
before update on public.tecnomath_profiles
for each row execute function public.tecnomath_profiles_touch_updated_at();

-- El perfil se crea desde js/tecnomath-auth.js después de un login/registro.
-- No se asignan privilegios de administrador desde el cliente.
