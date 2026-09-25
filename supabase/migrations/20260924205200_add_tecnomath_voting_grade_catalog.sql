create table if not exists public.tecnomath_voting_grades (
  id uuid primary key default gen_random_uuid(),
  grade text not null,
  group_name text not null,
  label text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tecnomath_voting_grades_grade_group_uq unique (grade, group_name),
  constraint tecnomath_voting_grades_label_uq unique (label),
  constraint tecnomath_voting_grades_grade_chk check (char_length(btrim(grade)) between 1 and 10),
  constraint tecnomath_voting_grades_group_chk check (char_length(btrim(group_name)) between 1 and 20),
  constraint tecnomath_voting_grades_label_chk check (char_length(btrim(label)) between 1 and 40)
);

alter table public.tecnomath_voting_grades enable row level security;
grant select on public.tecnomath_voting_grades to anon, authenticated;

drop policy if exists "Public can read active voting grades" on public.tecnomath_voting_grades;
create policy "Public can read active voting grades"
on public.tecnomath_voting_grades
for select to anon, authenticated
using (active = true);

insert into public.tecnomath_voting_grades (grade, group_name, label)
values
('6','A','6A'),
('7','A','7A'),
('8','A','8A'),
('9','A','9A'),
('10','A','10A'),
('11','A','11A')
on conflict (grade, group_name) do update
set label=excluded.label, active=true, updated_at=now();

alter table public.game_votes add column if not exists grade_id uuid;
create index if not exists game_votes_grade_id_idx on public.game_votes(grade_id);
alter table public.game_votes drop constraint if exists game_votes_grade_id_fkey;
alter table public.game_votes
  add constraint game_votes_grade_id_fkey
  foreign key (grade_id) references public.tecnomath_voting_grades(id)
  on delete restrict;