-- Sistema de calificación por estrellas independiente del antiguo conteo de corazones.
-- Los votos históricos de game_votes se conservan sin convertirlos en estrellas.
create table if not exists public.game_ratings (
  id bigint generated always as identity primary key,
  game_id text not null,
  student_id uuid not null references public.tecnomath_voting_students(id) on delete restrict,
  grade_id uuid not null references public.tecnomath_voting_grades(id) on delete restrict,
  score smallint not null check (score between 1 and 5),
  created_at timestamptz not null default now(),
  constraint game_ratings_one_per_student_game unique (student_id, game_id)
);
create index if not exists game_ratings_game_id_idx on public.game_ratings(game_id);
create index if not exists game_ratings_grade_id_idx on public.game_ratings(grade_id);
alter table public.game_ratings enable row level security;
revoke all on public.game_ratings from anon, authenticated;
grant all on public.game_ratings to service_role;

create or replace function public.tecnomath_get_rating_stats()
returns table(game_id text, total_votes bigint, average_score numeric)
language sql security definer set search_path = '' stable
as $$
  select r.game_id, count(*)::bigint, round(avg(r.score)::numeric, 4)
  from public.game_ratings r
  group by r.game_id;
$$;
revoke execute on function public.tecnomath_get_rating_stats() from public;
grant execute on function public.tecnomath_get_rating_stats() to anon, authenticated;
