-- ============================================================================
-- Basketball Program Stat Tracker — Supabase schema
-- Run this whole file once in your Supabase project's SQL Editor.
-- Safe to re-run: uses "create table if not exists" / "drop ... if exists" guards.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- ROSTER  (this is the single source of truth — every dropdown in the app
-- reads from here, so adding/editing a player here updates everything else
-- automatically, just like the DataInfo roster did in the spreadsheet)
-- ----------------------------------------------------------------------------
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  first_name text,
  last_name text not null,
  position text not null default 'Wing' check (position in ('PG','Wing','BIG')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- PRACTICE / GAME STATS
-- One "practice_sessions" row per date+type, many "practice_stats" rows
-- (one per player who played) hanging off it. New practice day = new rows,
-- not a new tab — so every rollup below updates itself automatically.
-- ----------------------------------------------------------------------------
create table if not exists practice_sessions (
  id uuid primary key default gen_random_uuid(),
  practice_date date not null,
  session_type text not null default 'Practice' check (session_type in ('Practice','Game')),
  notes text,
  created_at timestamptz not null default now(),
  unique (practice_date, session_type)
);

create table if not exists practice_stats (
  id uuid primary key default gen_random_uuid(),
  practice_session_id uuid not null references practice_sessions(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  win int not null default 0,
  loss int not null default 0,
  fgm2 int not null default 0,
  fga2 int not null default 0,
  fgm3 int not null default 0,
  fga3 int not null default 0,
  ftm int not null default 0,
  fta int not null default 0,
  oreb int not null default 0,
  dreb int not null default 0,
  ast int not null default 0,
  stl int not null default 0,
  blk int not null default 0,
  fouls_taken int not null default 0,
  turnovers int not null default 0,
  missed_reb int not null default 0,
  paint_allowed int not null default 0,
  eye_ball int not null default 0,
  dlapse int not null default 0,
  crashes int not null default 0,
  paint_touch int not null default 0,
  force_missed int not null default 0,
  screen_assist int not null default 0,
  plus_minus int not null default 0,
  created_at timestamptz not null default now(),
  unique (practice_session_id, player_id)
);

-- Convenience view: every per-player-per-practice row with the same derived
-- columns the old "Practice Stats" tab computed (FG%, 3%, eFG%, FT%, PTS,
-- REB, Power 5). The app reads this view for dashboards/leaderboards.
create or replace view v_practice_stats as
select
  ps.*,
  p.last_name,
  p.position,
  s.practice_date,
  s.session_type,
  (ps.fga2 + ps.fga3) as fga,
  (ps.fgm2 + ps.fgm3) as fgm,
  case when (ps.fga2+ps.fga3) = 0 then 0
       else round((ps.fgm2+ps.fgm3)::numeric / (ps.fga2+ps.fga3), 4) end as fg_pct,
  case when ps.fga3 = 0 then 0
       else round(ps.fgm3::numeric / ps.fga3, 4) end as three_pct,
  case when (ps.fga2+ps.fga3) = 0 then 0
       else round(((ps.fgm2+ps.fgm3) + 0.5*ps.fgm3)::numeric / (ps.fga2+ps.fga3), 4) end as efg_pct,
  case when ps.fta = 0 then 0
       else round(ps.ftm::numeric / ps.fta, 4) end as ft_pct,
  (ps.fgm2*2 + ps.fgm3*3 + ps.ftm) as pts,
  (ps.oreb + ps.dreb) as reb,
  (ps.oreb + ps.dreb + ps.ast + ps.stl + ps.blk + ps.fouls_taken) as power5
from practice_stats ps
join players p on p.id = ps.player_id
join practice_sessions s on s.id = ps.practice_session_id;

-- ----------------------------------------------------------------------------
-- INDIVIDUAL SHOOTING DRILLS  (the "DataInfo" drill catalog)
-- ----------------------------------------------------------------------------
create table if not exists shooting_drills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  total_shots text,
  time_limit text,
  standard numeric,
  great numeric,
  program_high numeric,
  record_holder_id uuid references players(id),
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists shooting_attempts (
  id uuid primary key default gen_random_uuid(),
  drill_id uuid not null references shooting_drills(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  attempt_date date not null,
  session_number int not null default 1,
  makes numeric not null,
  created_at timestamptz not null default now()
);

-- Auto-updates the drill's program_high + record_holder the instant someone
-- logs a new all-time best. This is what makes the "PR" highlight possible.
create or replace function fn_update_drill_record() returns trigger as $$
begin
  update shooting_drills
    set program_high = new.makes, record_holder_id = new.player_id
    where id = new.drill_id
      and (program_high is null or new.makes > program_high);
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_update_drill_record on shooting_attempts;
create trigger trg_update_drill_record
  after insert on shooting_attempts
  for each row execute function fn_update_drill_record();

-- ----------------------------------------------------------------------------
-- FREE THROW LADDER  (out of 20; multiple sessions per practice day allowed)
-- ----------------------------------------------------------------------------
create table if not exists ft_sessions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  session_date date not null,
  session_number int not null default 1,
  makes int not null check (makes >= 0 and makes <= 20),
  created_at timestamptz not null default now(),
  unique (player_id, session_date, session_number)
);

-- ----------------------------------------------------------------------------
-- CONDITIONING  (first-day test: 3min / 2min / 1min, tracked across years)
-- ----------------------------------------------------------------------------
create table if not exists conditioning_results (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  test_date date not null,
  season_label text not null,
  three_min numeric default 0,
  two_min numeric default 0,
  one_min numeric default 0,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- TEAM SHOOTING DRILLS
-- Same idea as the individual drill catalog, but scored as one team-wide
-- number per attempt (no player_id) -- e.g. "make 40 as a team in 5 minutes."
-- team_high tracks the best the team has ever posted, auto-updated on a PR.
-- ----------------------------------------------------------------------------
create table if not exists team_drills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  total_shots text,
  time_limit text,
  standard numeric,
  great numeric,
  team_high numeric,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists team_drill_attempts (
  id uuid primary key default gen_random_uuid(),
  drill_id uuid not null references team_drills(id) on delete cascade,
  attempt_date date not null,
  session_number int not null default 1,
  score numeric not null,
  created_at timestamptz not null default now()
);

create or replace function fn_update_team_drill_record() returns trigger as $$
begin
  update team_drills
    set team_high = new.score
    where id = new.drill_id
      and (team_high is null or new.score > team_high);
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_update_team_drill_record on team_drill_attempts;
create trigger trg_update_team_drill_record
  after insert on team_drill_attempts
  for each row execute function fn_update_team_drill_record();

-- ----------------------------------------------------------------------------
-- LIVE TRACKER DRILLS
-- A practice day can contain several drills (e.g. "3v3", "5v5 Scrimmage").
-- Each drill gets its own Blue/White team assignment, on-floor lineup, and
-- possession counts -- separate from the day-level practice_stats totals,
-- which keep working exactly as before (every stat tap still also updates
-- the whole-day totals used by Dashboard/Player Report/History).
-- ----------------------------------------------------------------------------
create table if not exists practice_drills (
  id uuid primary key default gen_random_uuid(),
  practice_session_id uuid not null references practice_sessions(id) on delete cascade,
  name text not null,
  sequence int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists drill_lineups (
  id uuid primary key default gen_random_uuid(),
  practice_drill_id uuid not null references practice_drills(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  team_color text check (team_color in ('Blue','White')),
  on_floor boolean not null default false,
  off_possessions int not null default 0,
  def_possessions int not null default 0,
  created_at timestamptz not null default now(),
  unique (practice_drill_id, player_id)
);

-- ----------------------------------------------------------------------------
-- SHOT CHART
-- One row per live field-goal attempt (2PT/3PT only -- free throws have no
-- meaningful location so they're excluded). Zone is one of 7 simplified
-- court areas. This is separate from practice_stats' running fgm/fga totals
-- -- Live Tracker writes to both at once.
-- ----------------------------------------------------------------------------
create table if not exists shot_events (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  practice_session_id uuid not null references practice_sessions(id) on delete cascade,
  practice_drill_id uuid references practice_drills(id) on delete set null,
  zone text not null check (zone in (
    'left_corner_3','left_wing_3','top_key_3','right_wing_3','right_corner_3',
    'paint','mid_range'
  )),
  shot_type text not null check (shot_type in ('2PT','3PT')),
  made boolean not null,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- POSSESSION EVENTS
-- One row per made shot (2PT/3PT/FT) that triggers a possession -- captures
-- exactly who was on the floor for each side at that moment, so we can
-- compute real Offensive/Defensive Rating (points scored or allowed per 100
-- possessions while a given player is on the floor), not just raw counts.
-- offense_ids/defense_ids are the on-floor player_ids for each side; points
-- is 2/3 for a field goal make or 1 for a free throw make.
-- ----------------------------------------------------------------------------
create table if not exists possession_events (
  id uuid primary key default gen_random_uuid(),
  practice_session_id uuid not null references practice_sessions(id) on delete cascade,
  practice_drill_id uuid references practice_drills(id) on delete set null,
  shooter_id uuid not null references players(id) on delete cascade,
  shooter_team text check (shooter_team in ('Blue','White')),
  points int not null check (points in (1,2,3)),
  offense_ids uuid[] not null default '{}',
  defense_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- Any signed-in coach (Supabase Auth user) can read/write everything.
-- Add finer-grained policies later if you want read-only "player view" users.
-- ----------------------------------------------------------------------------
alter table players enable row level security;
alter table practice_sessions enable row level security;
alter table practice_stats enable row level security;
alter table shooting_drills enable row level security;
alter table shooting_attempts enable row level security;
alter table ft_sessions enable row level security;
alter table conditioning_results enable row level security;
alter table practice_drills enable row level security;
alter table drill_lineups enable row level security;
alter table team_drills enable row level security;
alter table team_drill_attempts enable row level security;
alter table shot_events enable row level security;
alter table possession_events enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array['players','practice_sessions','practice_stats',
                                'shooting_drills','shooting_attempts',
                                'ft_sessions','conditioning_results',
                                'practice_drills','drill_lineups',
                                'team_drills','team_drill_attempts',
                                'shot_events','possession_events'])
  loop
    execute format('drop policy if exists "authenticated_all" on %I', t);
    execute format(
      'create policy "authenticated_all" on %I for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')',
      t
    );
  end loop;
end $$;
