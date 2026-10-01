-- ═══════════════════════════════════════════════════════════════════════════
-- OMNIA PICKS · schema
-- Ejecutar en Supabase → SQL Editor. Idempotente.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ─── Tipos ─────────────────────────────────────────────────────────────────
do $$ begin
  create type tier as enum ('free', 'pro', 'elite');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pick_result as enum ('pending', 'win', 'loss', 'push', 'void');
exception when duplicate_object then null; end $$;

do $$ begin
  create type market_type as enum ('h2h', 'spreads', 'totals', 'props');
exception when duplicate_object then null; end $$;


-- ─── Perfiles (extiende auth.users) ────────────────────────────────────────
create table if not exists profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text,
  tier            tier not null default 'free',
  bankroll        numeric(12,2) default 1000,
  unit_size_pct   numeric(5,2)  default 1.0,
  ls_customer_id  text,
  ls_subscription_id text,
  tier_expires_at timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists idx_profiles_tier on profiles(tier);


-- ─── Eventos deportivos ────────────────────────────────────────────────────
create table if not exists events (
  id            text primary key,              -- id de The Odds API
  sport_key     text not null,                 -- soccer_spain_la_liga
  sport_title   text not null,
  league_slug   text not null,                 -- laliga
  home_team     text not null,
  away_team     text not null,
  slug          text not null,                 -- real-madrid-vs-barcelona-2026-09-14
  commence_time timestamptz not null,
  completed     boolean not null default false,
  home_score    int,
  away_score    int,
  updated_at    timestamptz not null default now()
);

create unique index if not exists idx_events_slug on events(league_slug, slug);
create index if not exists idx_events_commence on events(commence_time);
create index if not exists idx_events_league on events(league_slug, commence_time desc);


-- ─── Snapshots de cuotas (line movement + closing line) ────────────────────
create table if not exists odds_snapshots (
  id          bigserial primary key,
  event_id    text not null references events(id) on delete cascade,
  captured_at timestamptz not null default now(),
  is_closing  boolean not null default false,
  payload     jsonb not null                   -- array de bookmakers crudo
);

create index if not exists idx_snap_event on odds_snapshots(event_id, captured_at desc);
create index if not exists idx_snap_closing on odds_snapshots(event_id) where is_closing;


-- ─── PICKS · el corazón del producto ───────────────────────────────────────
-- published_at + closing_odds + clv_pct son innegociables:
-- son lo que hace el track record auditable.
create table if not exists picks (
  id             uuid primary key default gen_random_uuid(),
  event_id       text not null references events(id) on delete cascade,

  -- qué se apuesta
  market         market_type not null,
  selection      text not null,                -- "Real Madrid" | "Over"
  line           numeric(6,2),                 -- -1.5 | 2.5 | null en h2h
  odds_taken     numeric(8,3) not null,        -- decimal (2.10)
  book           text not null,

  -- por qué se apuesta
  model_prob     numeric(6,5) not null,        -- prob. del modelo
  fair_prob      numeric(6,5) not null,        -- prob. del mercado sin vig
  edge_pct       numeric(6,3) not null,        -- (model_prob * odds) - 1
  stake_units    numeric(5,2) not null,        -- Kelly fraccionado
  confidence     int not null check (confidence between 1 and 5),
  rationale      text,

  -- visibilidad y timing
  tier_required  tier not null default 'pro',
  published_at   timestamptz not null default now(),
  free_visible_at timestamptz,                 -- free lo ve con retraso

  -- resultado y CLV
  result         pick_result not null default 'pending',
  closing_odds   numeric(8,3),
  clv_pct        numeric(7,3),                 -- (odds_taken/closing_odds - 1)*100
  profit_units   numeric(8,3),
  settled_at     timestamptz,

  created_at     timestamptz not null default now()
);

create index if not exists idx_picks_published on picks(published_at desc);
create index if not exists idx_picks_event on picks(event_id);
create index if not exists idx_picks_result on picks(result, published_at desc);
create index if not exists idx_picks_tier on picks(tier_required, published_at desc);
create unique index if not exists idx_picks_unique
  on picks(event_id, market, selection, coalesce(line, 0));


-- ─── Suscripciones (log de eventos de Lemon Squeezy) ───────────────────────
create table if not exists subscription_events (
  id          bigserial primary key,
  user_id     uuid references profiles(id) on delete set null,
  ls_event    text not null,
  ls_payload  jsonb not null,
  created_at  timestamptz not null default now()
);


-- ─── Contenido SEO generado ────────────────────────────────────────────────
create table if not exists seo_pages (
  slug         text primary key,
  league_slug  text,
  event_id     text references events(id) on delete cascade,
  title        text not null,
  meta_desc    text not null,
  body_md      text,
  updated_at   timestamptz not null default now()
);

create index if not exists idx_seo_league on seo_pages(league_slug);


-- ═══════════════════════════════════════════════════════════════════════════
-- VISTAS DE RENDIMIENTO · lo que justifica el precio
-- ═══════════════════════════════════════════════════════════════════════════

create or replace view v_performance as
select
  count(*)                                          as total_picks,
  count(*) filter (where result = 'win')            as wins,
  count(*) filter (where result = 'loss')           as losses,
  count(*) filter (where result = 'push')           as pushes,
  round(sum(profit_units)::numeric, 2)              as net_units,
  round(sum(profit_units) / nullif(sum(stake_units), 0) * 100, 2) as roi_pct,
  round(count(*) filter (where result = 'win')::numeric
        / nullif(count(*) filter (where result in ('win','loss')), 0) * 100, 2) as hit_rate_pct,
  round(avg(clv_pct)::numeric, 3)                   as avg_clv_pct,
  round(count(*) filter (where clv_pct > 0)::numeric
        / nullif(count(*) filter (where clv_pct is not null), 0) * 100, 2) as clv_beat_pct
from picks
where result in ('win', 'loss', 'push');

create or replace view v_performance_by_month as
select
  date_trunc('month', published_at)                 as month,
  count(*)                                          as picks,
  round(sum(profit_units)::numeric, 2)              as net_units,
  round(sum(profit_units) / nullif(sum(stake_units), 0) * 100, 2) as roi_pct,
  round(avg(clv_pct)::numeric, 3)                   as avg_clv_pct
from picks
where result in ('win', 'loss', 'push')
group by 1 order by 1 desc;

create or replace view v_performance_by_sport as
select
  e.sport_title,
  count(*)                                          as picks,
  round(sum(p.profit_units)::numeric, 2)            as net_units,
  round(sum(p.profit_units) / nullif(sum(p.stake_units), 0) * 100, 2) as roi_pct
from picks p join events e on e.id = p.event_id
where p.result in ('win', 'loss', 'push')
group by 1 order by net_units desc;


-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY · el gating por tier vive aquí, no en el front
-- ═══════════════════════════════════════════════════════════════════════════

alter table profiles enable row level security;
alter table picks    enable row level security;
alter table events   enable row level security;
alter table seo_pages enable row level security;

drop policy if exists "perfil propio" on profiles;
create policy "perfil propio" on profiles
  for select using (auth.uid() = id);

drop policy if exists "actualizar perfil propio" on profiles;
create policy "actualizar perfil propio" on profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and tier = (select tier from profiles where id = auth.uid()));

drop policy if exists "eventos publicos" on events;
create policy "eventos publicos" on events for select using (true);

drop policy if exists "seo publico" on seo_pages;
create policy "seo publico" on seo_pages for select using (true);

-- Un pick es visible si:
--   a) ya está liquidado (track record público = prueba social + SEO), o
--   b) el usuario tiene el tier necesario, o
--   c) pasó su ventana de retraso para free
drop policy if exists "picks por tier" on picks;
create policy "picks por tier" on picks
for select using (
  result <> 'pending'
  or (free_visible_at is not null and free_visible_at <= now())
  or exists (
    select 1 from profiles pr
    where pr.id = auth.uid()
      and (pr.tier_expires_at is null or pr.tier_expires_at > now())
      and case picks.tier_required
            when 'free'  then true
            when 'pro'   then pr.tier in ('pro', 'elite')
            when 'elite' then pr.tier = 'elite'
          end
  )
);


-- ─── Trigger: crear perfil al registrarse ──────────────────────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ═══════════════════════════════════════════════════════════════════════════
-- TELEGRAM
-- ═══════════════════════════════════════════════════════════════════════════

alter table profiles add column if not exists telegram_chat_id text;
alter table profiles add column if not exists telegram_user_id bigint;

create index if not exists idx_profiles_tg on profiles(telegram_chat_id)
  where telegram_chat_id is not null;

-- Marcas de envío: evitan duplicar picks si el cron se reintenta
alter table picks add column if not exists notified_at timestamptz;
alter table picks add column if not exists channel_posted_at timestamptz;

create index if not exists idx_picks_pending_notify on picks(published_at)
  where notified_at is null;

-- Códigos de vinculación de un solo uso, caducan en 15 min
create table if not exists telegram_link_codes (
  code       text primary key,
  user_id    uuid not null references profiles(id) on delete cascade,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_tg_codes_user on telegram_link_codes(user_id)
  where used_at is null;

-- Sólo el servidor toca esta tabla. Sin políticas = nadie más entra.
alter table telegram_link_codes enable row level security;
