-- Adaptación del sistema de votaciones para computadores compartidos.
-- Los votantes ya no necesitan cuenta de TecnoMath.
-- Cada voto recibe un ID BIGINT autoincremental generado por PostgreSQL.

drop trigger if exists game_votes_realtime_broadcast on public.game_votes;
drop function if exists public.tecnomath_broadcast_game_vote();
drop function if exists public.tecnomath_get_my_votes();

drop table if exists public.game_votes cascade;

create table public.game_votes (
  id bigint generated always as identity primary key,
  game_id text not null,
  voter_name text not null,
  grade text not null,
  created_at timestamptz not null default now(),
  constraint game_votes_voter_name_chk check (char_length(btrim(voter_name)) between 2 and 80),
  constraint game_votes_grade_chk check (char_length(btrim(grade)) between 1 and 40)
);

alter table public.game_votes enable row level security;
revoke all on table public.game_votes from anon, authenticated;
grant all on table public.game_votes to service_role;

create index game_votes_game_id_idx on public.game_votes(game_id);
create index game_votes_created_at_idx on public.game_votes(created_at desc);
create index game_votes_grade_idx on public.game_votes(grade);

-- Un estudiante identificado por nombre + grado puede votar una vez por juego.
create unique index game_votes_one_per_student_per_game_idx
  on public.game_votes (lower(btrim(voter_name)), lower(btrim(grade)), game_id);

create table if not exists public.game_vote_counts(
  game_id text primary key,
  votes bigint not null default 0 check(votes>=0)
);

alter table public.game_vote_counts enable row level security;
revoke all on table public.game_vote_counts from anon, authenticated;
grant select on table public.game_vote_counts to anon, authenticated;
grant all on table public.game_vote_counts to service_role;

insert into public.game_vote_counts(game_id,votes)
select game_id,count(*)::bigint from public.game_votes group by game_id
on conflict(game_id) do update set votes=excluded.votes;

create or replace function public.tecnomath_broadcast_game_vote()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  insert into public.game_vote_counts(game_id,votes)
  values(NEW.game_id,1)
  on conflict(game_id) do update set votes=public.game_vote_counts.votes+1;

  perform realtime.send(
    jsonb_build_object(
      'vote_id', NEW.id,
      'game_id', NEW.game_id,
      'created_at', NEW.created_at
    ),
    'VOTE',
    'tecnomath-voting',
    false
  );
  return NEW;
end;
$$;

revoke execute on function public.tecnomath_broadcast_game_vote() from public, anon, authenticated;

create trigger game_votes_realtime_broadcast
after insert on public.game_votes
for each row execute function public.tecnomath_broadcast_game_vote();

drop policy if exists "Authenticated users can receive voting broadcasts" on realtime.messages;


drop policy if exists "Public can read vote counts" on public.game_vote_counts;
create policy "Public can read vote counts"
  on public.game_vote_counts
  for select
  to anon, authenticated
  using (true);
