-- Wingspan (meters) for NOTAM analysis / performance context; optional per row.

alter table public.aircraft
  add column if not exists wingspan double precision;
