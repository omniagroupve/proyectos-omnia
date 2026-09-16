-- ═══════════════════════════════════════════════════════════════════════════
-- PIX · migración 003
-- Precios LatAm, ligas de toda la región y catálogo de casas por país.
-- Ejecutar después de 002_pix.sql. Idempotente.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Ligas nuevas de LatAm ────────────────────────────────────────────────
insert into leagues (slug, sport_key, name_es, name_en, country_code, odds_api_key, apifootball_id, fdcouk_code, priority) values
  ('liga-colombia',  'soccer', 'Liga BetPlay',              'Liga BetPlay',            'CO', 'soccer_colombia_primera_a',         239,  null, 1),
  ('liga-chile',     'soccer', 'Primera División de Chile', 'Chilean Primera',         'CL', 'soccer_chile_campeonato',           265,  null, 1),
  ('liga-peru',      'soccer', 'Liga 1 de Perú',            'Peruvian Liga 1',         'PE', 'soccer_peru_primera_division',      281,  null, 3),
  ('sudamericana',   'soccer', 'Copa Sudamericana',         'Copa Sudamericana',       null, 'soccer_conmebol_copa_sudamericana', 11,   null, 2),
  ('brasileirao-b',  'soccer', 'Brasileirão Série B',       'Brasileirão Série B',     'BR', 'soccer_brazil_serie_b',             72,   null, 3),
  ('laliga-2',       'soccer', 'LaLiga Hypermotion',        'LaLiga 2',                'ES', 'soccer_spain_segunda_division',     141,  'SP2', 3),
  ('liga-portugal',  'soccer', 'Primeira Liga',             'Primeira Liga',           'PT', 'soccer_portugal_primeira_liga',     94,   'P1', 3),
  ('eredivisie',     'soccer', 'Eredivisie',                'Eredivisie',              'NL', 'soccer_netherlands_eredivisie',     88,   'N1', 3),
  ('mundial',        'soccer', 'Mundial',                   'FIFA World Cup',          null, 'soccer_fifa_world_cup',             1,    null, 1)
on conflict (slug) do nothing;

-- Toda liga disponible en todos los países; destacada la del país.
insert into league_availability (league_slug, country_code, featured)
select l.slug, j.code, (l.country_code = j.code)
from leagues l cross join jurisdictions j
on conflict do nothing;


-- ═══════════════════════════════════════════════════════════════════════════
-- CASAS DE APUESTAS · el comparador es el motor de ingresos
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Con el modelo freemium la afiliación es el ingreso PRINCIPAL, no un extra.
-- Este catálogo decide qué ve cada visitante según su país.
--
-- Dos avisos importantes, por orden de gravedad:
--
-- 1. `affiliate_url` va vacío a propósito. Sólo se rellena cuando el acuerdo
--    está firmado. Un enlace inventado no paga y además te quema con el
--    operador.
-- 2. `licensed` va en false para todas. La licencia se verifica operador por
--    operador y país por país antes de enseñar nada: afirmar que una casa está
--    licenciada donde no lo está es exactamente el tipo de error que te cierra
--    el negocio. El front ordena primero las licenciadas, así que en cuanto
--    verifiques una, la pones en true y sube sola.

insert into books (key, title, odds_api_key, is_sharp, weight) values
  ('caliente',     'Caliente',       null,            false, 1.0),
  ('betano',       'Betano',         null,            false, 1.0),
  ('codere',       'Codere',         null,            false, 1.0),
  ('wplay',        'Wplay',          null,            false, 1.0),
  ('betplay',      'BetPlay',        null,            false, 1.0),
  ('rushbet',      'Rushbet',        null,            false, 1.0),
  ('bplay',        'bplay',          null,            false, 1.0),
  ('coolbet',      'Coolbet',        null,            false, 1.0),
  ('doradobet',    'Doradobet',      null,            false, 1.0),
  ('apuestatotal', 'Apuesta Total',  null,            false, 1.0),
  ('sportingbet',  'Sportingbet',    null,            false, 1.0),
  ('kto',          'KTO',            null,            false, 1.0),
  ('winamax',      'Winamax',        null,            false, 1.0),
  ('bwin',         'Bwin',           'bwin',          false, 1.0),
  ('betfair',      'Betfair',        'betfair_ex_eu', true,  3.5),
  ('strendus',     'Strendus',       null,            false, 1.0)
on conflict (key) do nothing;

-- Disponibilidad por país. El orden define cómo se listan en el comparador.
insert into book_availability (book_key, country_code, licensed, sort_order) values
  -- México
  ('caliente','MX',false,1), ('betano','MX',false,2), ('bet365','MX',false,3),
  ('codere','MX',false,4), ('strendus','MX',false,5), ('betsson','MX',false,6),
  -- Colombia
  ('wplay','CO',false,1), ('betplay','CO',false,2), ('rushbet','CO',false,3),
  ('betano','CO',false,4), ('codere','CO',false,5), ('bet365','CO',false,6),
  -- Argentina
  ('bplay','AR',false,1), ('betano','AR',false,2), ('codere','AR',false,3), ('bet365','AR',false,4),
  -- Chile
  ('betano','CL',false,1), ('coolbet','CL',false,2), ('betsson','CL',false,3), ('bet365','CL',false,4),
  -- Perú
  ('betano','PE',false,1), ('doradobet','PE',false,2), ('apuestatotal','PE',false,3),
  ('betsson','PE',false,4), ('bet365','PE',false,5),
  -- Brasil
  ('betano','BR',false,1), ('bet365','BR',false,2), ('sportingbet','BR',false,3),
  ('kto','BR',false,4), ('betfair','BR',false,5),
  -- Venezuela, Ecuador, Uruguay (menos operadores locales)
  ('betano','VE',false,1), ('bet365','VE',false,2), ('betsson','VE',false,3),
  ('betano','EC',false,1), ('bet365','EC',false,2), ('betsson','EC',false,3),
  ('betano','UY',false,1), ('bet365','UY',false,2), ('betsson','UY',false,3),
  -- España
  ('bet365','ES',false,1), ('codere','ES',false,2), ('betfair','ES',false,3),
  ('winamax','ES',false,4), ('bwin','ES',false,5)
on conflict (book_key, country_code) do nothing;

-- Pinnacle no se muestra en el comparador (casi nadie de LatAm tiene cuenta),
-- pero sigue pesando 5× en el consenso: es la mejor estimación pública del
-- precio real. Se queda en `books` sin fila en `book_availability`.
