-- ═══════════════════════════════════════════════════════════════════════════
-- PIX · migración 002
-- Catálogo deportivo, jurisdicciones por país, histórico propio, parlays e IA.
-- Ejecutar DESPUÉS de supabase/schema.sql. Idempotente.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ─── Tipos ─────────────────────────────────────────────────────────────────
do $$ begin
  create type parlay_status as enum ('draft', 'published', 'won', 'lost', 'push', 'void');
exception when duplicate_object then null; end $$;

do $$ begin
  create type parlay_origin as enum ('engine', 'ai', 'user', 'mixed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type risk_level as enum ('low', 'medium', 'high');
exception when duplicate_object then null; end $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- CATÁLOGO DEPORTIVO
-- Un mismo equipo se llama distinto en cada proveedor. La tabla de alias es
-- lo que permite unir The Odds API, API-Football y los CSV históricos.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists sports (
  key         text primary key,            -- soccer | basketball | tennis | ...
  name_es     text not null,
  name_en     text not null,
  sort_order  int  not null default 100
);

create table if not exists leagues (
  slug              text primary key,      -- liga-mx
  sport_key         text not null references sports(key),
  name_es           text not null,
  name_en           text not null,
  country_code      text,                  -- MX | AR | BR | ES | null para internacionales
  odds_api_key      text unique,           -- soccer_mexico_ligamx
  apifootball_id    int,                   -- 262
  fdcouk_code       text,                  -- MEX (sección "extra leagues")
  seo               boolean not null default true,
  priority          int not null default 3,
  active            boolean not null default true
);

create index if not exists idx_leagues_sport on leagues(sport_key, priority);

create table if not exists teams (
  id            uuid primary key default gen_random_uuid(),
  sport_key     text not null references sports(key),
  canonical     text not null,             -- "Club América"
  slug          text not null,             -- club-america
  country_code  text,
  apifootball_id int,
  created_at    timestamptz not null default now(),
  unique (sport_key, slug)
);

create table if not exists team_aliases (
  alias     text not null,                 -- "America" | "Club America" | "CF América"
  source    text not null,                 -- odds_api | apifootball | fdcouk | manual
  team_id   uuid not null references teams(id) on delete cascade,
  primary key (source, alias)
);

create index if not exists idx_team_aliases_team on team_aliases(team_id);

alter table events add column if not exists league_ref text references leagues(slug);
alter table events add column if not exists home_team_id uuid references teams(id);
alter table events add column if not exists away_team_id uuid references teams(id);
alter table events add column if not exists apifootball_fixture_id int;
create index if not exists idx_events_apifootball on events(apifootball_fixture_id)
  where apifootball_fixture_id is not null;


-- ═══════════════════════════════════════════════════════════════════════════
-- JURISDICCIONES · qué se enseña en cada país
-- El país del usuario decide ligas, casas y avisos legales. Nunca se infiere
-- del idioma: viene de la IP (x-vercel-ip-country) o del selector manual.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists jurisdictions (
  code            text primary key,        -- MX | CO | AR | CL | PE | VE | EC | UY | BR | ES
  name_es         text not null,
  currency        text not null default 'USD',
  timezone        text not null,
  min_age         int  not null default 18,
  active          boolean not null default true,
  legal_notice_es text,                    -- texto adicional obligatorio por país
  sort_order      int not null default 100
);

create table if not exists league_availability (
  league_slug   text not null references leagues(slug) on delete cascade,
  country_code  text not null references jurisdictions(code) on delete cascade,
  featured      boolean not null default false,
  primary key (league_slug, country_code)
);

-- Casas de apuestas: catálogo + disponibilidad y afiliación por país.
create table if not exists books (
  key           text primary key,          -- pinnacle | betano | caliente
  title         text not null,
  odds_api_key  text,                      -- null si no está en The Odds API
  is_sharp      boolean not null default false,
  weight        numeric(4,2) not null default 1.0
);

create table if not exists book_availability (
  book_key       text not null references books(key) on delete cascade,
  country_code   text not null references jurisdictions(code) on delete cascade,
  affiliate_url  text,
  licensed       boolean not null default false,
  sort_order     int not null default 100,
  primary key (book_key, country_code)
);

alter table profiles add column if not exists country_code text references jurisdictions(code);
alter table profiles add column if not exists locale text not null default 'es';
alter table profiles add column if not exists display_name text;


-- ═══════════════════════════════════════════════════════════════════════════
-- HISTÓRICO PROPIO
-- Semilla: football-data.co.uk y tennis-data.co.uk (gratis, con cierre de
-- Pinnacle). Después: resultados oficiales de API-Football. Esta es la base
-- del backtest, de la calibración y del contexto que recibe la IA.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists hist_matches (
  id              uuid primary key default gen_random_uuid(),
  sport_key       text not null references sports(key),
  league_slug     text references leagues(slug),
  league_code     text not null,           -- código de la fuente (SP1, MEX, ARG...)
  season          text not null,           -- 2425
  match_date      date not null,
  home_team       text not null,
  away_team       text not null,
  home_team_id    uuid references teams(id),
  away_team_id    uuid references teams(id),
  home_score      int,
  away_score      int,
  ht_home_score   int,
  ht_away_score   int,
  result          char(1),                 -- H | D | A
  source          text not null,           -- fdcouk | tennisdata | apifootball
  source_row_hash text not null,           -- evita duplicados al re-importar
  created_at      timestamptz not null default now(),
  unique (source, source_row_hash)
);

create index if not exists idx_hist_matches_league on hist_matches(league_code, match_date desc);
create index if not exists idx_hist_matches_teams on hist_matches(home_team, away_team);
create index if not exists idx_hist_matches_date on hist_matches(match_date desc);

create table if not exists hist_odds (
  match_id      uuid not null references hist_matches(id) on delete cascade,
  book          text not null,             -- pinnacle | bet365 | max | avg
  market        market_type not null default 'h2h',
  is_closing    boolean not null default false,
  home_odds     numeric(8,3),
  draw_odds     numeric(8,3),
  away_odds     numeric(8,3),
  line          numeric(6,2),              -- para spreads/totals
  over_odds     numeric(8,3),
  under_odds    numeric(8,3),
  primary key (match_id, book, market, is_closing)
);


-- ═══════════════════════════════════════════════════════════════════════════
-- PARLAYS · el corazón de Pix
-- Un parlay publicado es tan auditable como un pick: published_at, cuota
-- combinada tomada, cierre por pierna y CLV del conjunto son innegociables.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists parlays (
  id               uuid primary key default gen_random_uuid(),
  origin           parlay_origin not null default 'engine',
  risk             risk_level not null default 'medium',
  title            text,
  summary          text,                   -- explicación en lenguaje de jugador
  legs_count       int not null check (legs_count between 2 and 8),
  joint_prob       numeric(8,6) not null,  -- producto de probabilidades justas
  combined_odds    numeric(10,3) not null, -- producto de cuotas tomadas
  fair_odds        numeric(10,3) not null, -- 1 / joint_prob
  edge_pct         numeric(7,3) not null,
  stake_units      numeric(5,2) not null,
  tier_required    tier not null default 'pro',
  status           parlay_status not null default 'published',
  published_at     timestamptz not null default now(),
  free_visible_at  timestamptz,
  closing_odds     numeric(10,3),          -- producto de cierres por pierna
  clv_pct          numeric(7,3),
  profit_units     numeric(8,3),
  settled_at       timestamptz,
  ai_request_id    uuid,
  created_at       timestamptz not null default now()
);

create index if not exists idx_parlays_published on parlays(published_at desc);
create index if not exists idx_parlays_status on parlays(status, published_at desc);
create index if not exists idx_parlays_tier on parlays(tier_required, published_at desc);

create table if not exists parlay_legs (
  parlay_id     uuid not null references parlays(id) on delete cascade,
  position      int not null,
  event_id      text not null references events(id) on delete cascade,
  pick_id       uuid references picks(id) on delete set null,
  market        market_type not null,
  selection     text not null,
  line          numeric(6,2),
  odds_taken    numeric(8,3) not null,
  book          text not null,
  fair_prob     numeric(6,5) not null,
  edge_pct      numeric(6,3) not null,
  rationale     text,
  result        pick_result not null default 'pending',
  closing_odds  numeric(8,3),
  clv_pct       numeric(7,3),
  primary key (parlay_id, position)
);

create index if not exists idx_parlay_legs_event on parlay_legs(event_id);

-- Parlays del usuario: los suyos, los de la IA que guardó, o mixtos.
create table if not exists user_parlays (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(id) on delete cascade,
  source_parlay  uuid references parlays(id) on delete set null,
  origin         parlay_origin not null default 'user',
  title          text,
  legs           jsonb not null,           -- [{event_id, market, selection, line, odds, book, fair_prob}]
  legs_count     int not null,
  joint_prob     numeric(8,6) not null,
  combined_odds  numeric(10,3) not null,
  edge_pct       numeric(7,3),
  stake_amount   numeric(12,2),            -- en la moneda del usuario
  status         parlay_status not null default 'draft',
  result_units   numeric(8,3),
  clv_pct        numeric(7,3),
  created_at     timestamptz not null default now(),
  settled_at     timestamptz
);

create index if not exists idx_user_parlays_user on user_parlays(user_id, created_at desc);


-- ═══════════════════════════════════════════════════════════════════════════
-- IA · log auditable de cada llamada
-- Guardar prompt, candidatos y salida hace tres cosas: depurar, medir coste,
-- y demostrar que la IA nunca alteró probabilidades ni stakes.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists ai_requests (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references profiles(id) on delete set null,
  kind           text not null,            -- intent | build | explain
  model          text not null,
  prompt_hash    text not null,
  input          jsonb not null,
  output         jsonb,
  input_tokens   int,
  output_tokens  int,
  cache_read     int,
  cost_usd       numeric(10,6),
  latency_ms     int,
  error          text,
  created_at     timestamptz not null default now()
);

create index if not exists idx_ai_requests_user on ai_requests(user_id, created_at desc);
create index if not exists idx_ai_requests_hash on ai_requests(prompt_hash, created_at desc);

alter table parlays
  drop constraint if exists parlays_ai_request_fk;
alter table parlays
  add constraint parlays_ai_request_fk
  foreign key (ai_request_id) references ai_requests(id) on delete set null;

-- Cuota diaria de construcciones con IA para el plan free
create table if not exists ai_usage_daily (
  user_id   uuid not null references profiles(id) on delete cascade,
  day       date not null,
  builds    int  not null default 0,
  primary key (user_id, day)
);

-- Contador atómico: dos peticiones simultáneas no pueden saltarse la cuota.
create or replace function increment_ai_builds(p_user uuid, p_day date)
returns int language plpgsql security definer set search_path = public as $$
declare v int;
begin
  insert into ai_usage_daily (user_id, day, builds) values (p_user, p_day, 1)
  on conflict (user_id, day) do update set builds = ai_usage_daily.builds + 1
  returning builds into v;
  return v;
end $$;

revoke all on function increment_ai_builds(uuid, date) from public, anon, authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- VISTAS
-- ═══════════════════════════════════════════════════════════════════════════

create or replace view v_parlay_performance as
select
  count(*)                                         as total_parlays,
  count(*) filter (where status = 'won')           as won,
  count(*) filter (where status = 'lost')          as lost,
  round(sum(profit_units)::numeric, 2)             as net_units,
  round(sum(profit_units) / nullif(sum(stake_units), 0) * 100, 2) as roi_pct,
  round(avg(clv_pct)::numeric, 3)                  as avg_clv_pct,
  round(avg(combined_odds)::numeric, 2)            as avg_combined_odds
from parlays
where status in ('won', 'lost', 'push');

create or replace view v_public_parlays as
select p.id, p.origin, p.risk, p.title, p.summary, p.legs_count, p.joint_prob,
       p.combined_odds, p.fair_odds, p.edge_pct, p.stake_units, p.tier_required,
       p.status, p.published_at, p.free_visible_at, p.closing_odds, p.clv_pct,
       p.profit_units, p.settled_at
from parlays p;


-- ═══════════════════════════════════════════════════════════════════════════
-- RLS · el gating vive aquí, igual que en picks
-- ═══════════════════════════════════════════════════════════════════════════

alter table sports              enable row level security;
alter table leagues             enable row level security;
alter table teams               enable row level security;
alter table team_aliases        enable row level security;
alter table jurisdictions       enable row level security;
alter table league_availability enable row level security;
alter table books               enable row level security;
alter table book_availability   enable row level security;
alter table hist_matches        enable row level security;
alter table hist_odds           enable row level security;
alter table parlays             enable row level security;
alter table parlay_legs         enable row level security;
alter table user_parlays        enable row level security;
alter table ai_requests         enable row level security;
alter table ai_usage_daily      enable row level security;

-- Catálogo e histórico: lectura pública. Escritura sólo con service role.
do $$
declare t text;
begin
  foreach t in array array['sports','leagues','teams','team_aliases','jurisdictions',
                           'league_availability','books','book_availability',
                           'hist_matches','hist_odds']
  loop
    execute format('drop policy if exists "lectura publica" on %I', t);
    execute format('create policy "lectura publica" on %I for select using (true)', t);
  end loop;
end $$;

-- Parlays: mismas reglas que picks (liquidado → público; si no, por tier o retraso).
drop policy if exists "parlays por tier" on parlays;
create policy "parlays por tier" on parlays
for select using (
  status in ('won', 'lost', 'push', 'void')
  or (free_visible_at is not null and free_visible_at <= now())
  or exists (
    select 1 from profiles pr
    where pr.id = auth.uid()
      and (pr.tier_expires_at is null or pr.tier_expires_at > now())
      and case parlays.tier_required
            when 'free'  then true
            when 'pro'   then pr.tier in ('pro', 'elite')
            when 'elite' then pr.tier = 'elite'
          end
  )
);

-- Las piernas heredan la visibilidad del parlay.
drop policy if exists "legs por parlay" on parlay_legs;
create policy "legs por parlay" on parlay_legs
for select using (exists (select 1 from parlays p where p.id = parlay_legs.parlay_id));

-- Parlays del usuario: sólo su dueño.
drop policy if exists "user_parlays propios" on user_parlays;
create policy "user_parlays propios" on user_parlays
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Log de IA: el usuario ve sus propias llamadas; nadie escribe salvo el servidor.
drop policy if exists "ai_requests propios" on ai_requests;
create policy "ai_requests propios" on ai_requests for select using (auth.uid() = user_id);

drop policy if exists "ai_usage propio" on ai_usage_daily;
create policy "ai_usage propio" on ai_usage_daily for select using (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- SEMILLA · deportes, jurisdicciones y ligas de arranque
-- ═══════════════════════════════════════════════════════════════════════════

insert into sports (key, name_es, name_en, sort_order) values
  ('soccer',           'Fútbol',           'Soccer',            1),
  ('basketball',       'Baloncesto',       'Basketball',        2),
  ('tennis',           'Tenis',            'Tennis',            3),
  ('baseball',         'Béisbol',          'Baseball',          4),
  ('americanfootball', 'Fútbol americano', 'American football', 5),
  ('mma',              'MMA',              'MMA',               6),
  ('icehockey',        'Hockey',           'Ice hockey',        7)
on conflict (key) do nothing;

insert into jurisdictions (code, name_es, currency, timezone, sort_order) values
  ('MX', 'México',    'USD', 'America/Mexico_City',        1),
  ('CO', 'Colombia',  'USD', 'America/Bogota',             2),
  ('AR', 'Argentina', 'USD', 'America/Argentina/Buenos_Aires', 3),
  ('CL', 'Chile',     'USD', 'America/Santiago',           4),
  ('PE', 'Perú',      'USD', 'America/Lima',               5),
  ('VE', 'Venezuela', 'USD', 'America/Caracas',            6),
  ('EC', 'Ecuador',   'USD', 'America/Guayaquil',          7),
  ('UY', 'Uruguay',   'USD', 'America/Montevideo',         8),
  ('BR', 'Brasil',    'USD', 'America/Sao_Paulo',          9),
  ('ES', 'España',    'USD', 'Europe/Madrid',             10)
on conflict (code) do nothing;

insert into leagues (slug, sport_key, name_es, name_en, country_code, odds_api_key, apifootball_id, fdcouk_code, priority) values
  ('liga-mx',        'soccer', 'Liga MX',                     'Liga MX',              'MX', 'soccer_mexico_ligamx',                 262, 'MEX', 1),
  ('liga-argentina', 'soccer', 'Liga Profesional Argentina',  'Argentine Primera',    'AR', 'soccer_argentina_primera_division',    128, 'ARG', 1),
  ('brasileirao',    'soccer', 'Brasileirão',                 'Brasileirão',          'BR', 'soccer_brazil_campeonato',             71,  'BRA', 1),
  ('libertadores',   'soccer', 'Copa Libertadores',           'Copa Libertadores',    null, 'soccer_conmebol_copa_libertadores',    13,  null,  1),
  ('laliga',         'soccer', 'LaLiga',                      'LaLiga',               'ES', 'soccer_spain_la_liga',                 140, 'SP1', 1),
  ('premier',        'soccer', 'Premier League',              'Premier League',       'GB', 'soccer_epl',                           39,  'E0',  1),
  ('champions',      'soccer', 'Champions League',            'Champions League',     null, 'soccer_uefa_champs_league',            2,   null,  1),
  ('serie-a',        'soccer', 'Serie A',                     'Serie A',              'IT', 'soccer_italy_serie_a',                 135, 'I1',  2),
  ('bundesliga',     'soccer', 'Bundesliga',                  'Bundesliga',           'DE', 'soccer_germany_bundesliga',            78,  'D1',  2),
  ('ligue-1',        'soccer', 'Ligue 1',                     'Ligue 1',              'FR', 'soccer_france_ligue_one',              61,  'F1',  2),
  ('europa-league',  'soccer', 'Europa League',               'Europa League',        null, 'soccer_uefa_europa_league',            3,   null,  2),
  ('mls',            'soccer', 'MLS',                         'MLS',                  'US', 'soccer_usa_mls',                       253, 'USA', 3),
  ('nba',            'basketball', 'NBA',                     'NBA',                  'US', 'basketball_nba',                       null, null, 1),
  ('nfl',            'americanfootball', 'NFL',               'NFL',                  'US', 'americanfootball_nfl',                 null, null, 1),
  ('mlb',            'baseball', 'MLB',                       'MLB',                  'US', 'baseball_mlb',                         null, null, 1),
  ('atp',            'tennis', 'ATP',                         'ATP',                  null, 'tennis_atp_aus_open_singles',          null, 'ATP', 2),
  ('ufc',            'mma',    'UFC / MMA',                   'UFC / MMA',            null, 'mma_mixed_martial_arts',               null, null, 2)
on conflict (slug) do nothing;

-- Disponibilidad inicial: todas las ligas en todos los países; destacada la local.
insert into league_availability (league_slug, country_code, featured)
select l.slug, j.code, (l.country_code = j.code)
from leagues l cross join jurisdictions j
on conflict do nothing;

insert into books (key, title, odds_api_key, is_sharp, weight) values
  ('pinnacle',     'Pinnacle',      'pinnacle',     true,  5.0),
  ('betfair_ex',   'Betfair Exchange', 'betfair_ex_eu', true, 3.5),
  ('bet365',       'Bet365',        'bet365',       false, 1.0),
  ('betano',       'Betano',        null,           false, 1.0),
  ('codere',       'Codere',        null,           false, 1.0),
  ('caliente',     'Caliente',      null,           false, 1.0),
  ('betsson',      'Betsson',       'betsson',      false, 1.0),
  ('williamhill',  'William Hill',  'williamhill',  false, 1.0),
  ('unibet',       'Unibet',        'unibet_eu',    false, 1.0)
on conflict (key) do nothing;
