-- Region for the Pacific region filter: chosen by admins per event.
--   solomon_islands | pacific (other Pacific Island countries) | international
alter table public.events
  add column if not exists region text not null default 'solomon_islands'
    check (region in ('solomon_islands', 'pacific', 'international'));

create index if not exists events_region_starts_at_idx on public.events (region, starts_at);

-- Best-effort backfill for existing events from the location text.
-- Anything not recognised keeps the default; admins can correct it in the event form.
update public.events
set region = 'pacific'
where location ~* '(fiji|suva|nadi|lautoka|papua new guinea|port moresby|vanuatu|port vila|samoa|apia|tonga|nuku''alofa|kiribati|tuvalu|nauru|palau|micronesia|marshall islands|cook islands|niue|new caledonia|noum[eé]a|new zealand|auckland|wellington)';

update public.events
set region = 'international'
where region = 'solomon_islands'
  and location ~* '(australia|sydney|brisbane|melbourne|united states|usa|united kingdom|london|japan|china|singapore|philippines|manila|indonesia)';
