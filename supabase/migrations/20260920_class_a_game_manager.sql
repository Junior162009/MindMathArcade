alter table public.tecnomath_profiles add column if not exists admin_class text check (admin_class is null or admin_class in ('A','B'));

create table if not exists public.tecnomath_catalog_jobs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 action text not null check (action in ('publish','hide','delete','reorder','draft')), game_id text,
 payload jsonb not null default '{}'::jsonb, status text not null default 'pending' check (status in ('draft','pending','processing','done','error')),
 error_message text, created_at timestamptz not null default now(), processed_at timestamptz, processed_commit text);
create index if not exists tecnomath_catalog_jobs_status_idx on public.tecnomath_catalog_jobs(status,created_at);

create table if not exists public.tecnomath_catalog_logs (
 id bigint generated always as identity primary key, user_id uuid references auth.users(id) on delete set null,
 action text not null, game_id text, game_name text, changes jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create index if not exists tecnomath_catalog_logs_created_idx on public.tecnomath_catalog_logs(created_at desc);

alter table public.tecnomath_catalog_jobs enable row level security;
alter table public.tecnomath_catalog_logs enable row level security;
drop policy if exists "class_a_catalog_jobs_select" on public.tecnomath_catalog_jobs;
drop policy if exists "class_a_catalog_jobs_insert" on public.tecnomath_catalog_jobs;
drop policy if exists "class_a_catalog_jobs_update" on public.tecnomath_catalog_jobs;
drop policy if exists "class_a_catalog_logs_select" on public.tecnomath_catalog_logs;

create policy "class_a_catalog_jobs_select" on public.tecnomath_catalog_jobs for select to authenticated using (exists(select 1 from public.tecnomath_profiles p where p.id=auth.uid() and p.role='admin' and p.admin_class='A'));
create policy "class_a_catalog_jobs_insert" on public.tecnomath_catalog_jobs for insert to authenticated with check (user_id=auth.uid() and exists(select 1 from public.tecnomath_profiles p where p.id=auth.uid() and p.role='admin' and p.admin_class='A'));
create policy "class_a_catalog_jobs_update" on public.tecnomath_catalog_jobs for update to authenticated using (exists(select 1 from public.tecnomath_profiles p where p.id=auth.uid() and p.role='admin' and p.admin_class='A')) with check (exists(select 1 from public.tecnomath_profiles p where p.id=auth.uid() and p.role='admin' and p.admin_class='A'));
create policy "class_a_catalog_logs_select" on public.tecnomath_catalog_logs for select to authenticated using (exists(select 1 from public.tecnomath_profiles p where p.id=auth.uid() and p.role='admin' and p.admin_class='A'));