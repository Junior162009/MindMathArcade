-- TecnoMath: operaciones atómicas para monedas, XP y estadísticas.
-- La identidad oficial es Supabase Auth; estas funciones solo modifican el perfil
-- del usuario autenticado mediante auth.uid().

create or replace function public.tecnomath_change_coins(delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare new_coins integer;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  update public.tecnomath_profiles
     set coins = greatest(0, coalesce(coins,0) + coalesce(delta,0)), updated_at = now()
   where id = auth.uid()
   returning coins into new_coins;
  if new_coins is null then raise exception 'profile_not_found'; end if;
  return new_coins;
end;
$$;

create or replace function public.tecnomath_change_xp(delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare new_xp integer;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  update public.tecnomath_profiles
     set xp = greatest(0, coalesce(xp,0) + coalesce(delta,0)), updated_at = now()
   where id = auth.uid()
   returning xp into new_xp;
  if new_xp is null then raise exception 'profile_not_found'; end if;
  return new_xp;
end;
$$;

create or replace function public.tecnomath_record_game(game_score integer default 0, xp_delta integer default 0, coins_delta integer default 0)
returns public.tecnomath_profiles
language plpgsql
security definer
set search_path = public
as $$
declare result public.tecnomath_profiles;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  update public.tecnomath_profiles
     set games_played = coalesce(games_played,0) + 1,
         xp = greatest(0, coalesce(xp,0) + coalesce(xp_delta,0)),
         coins = greatest(0, coalesce(coins,0) + coalesce(coins_delta,0)),
         high_score = greatest(coalesce(high_score,0), coalesce(game_score,0)),
         updated_at = now()
   where id = auth.uid()
   returning * into result;
  if result.id is null then raise exception 'profile_not_found'; end if;
  return result;
end;
$$;

revoke all on function public.tecnomath_change_coins(integer) from public;
grant execute on function public.tecnomath_change_coins(integer) to authenticated;
revoke all on function public.tecnomath_change_xp(integer) from public;
grant execute on function public.tecnomath_change_xp(integer) to authenticated;
revoke all on function public.tecnomath_record_game(integer,integer,integer) from public;
grant execute on function public.tecnomath_record_game(integer,integer,integer) to authenticated;
