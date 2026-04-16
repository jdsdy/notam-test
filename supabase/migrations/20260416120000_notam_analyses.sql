-- NOTAM analysis runs tied to flights (JSON payloads for raw extraction + AI output).

create table if not exists public.notam_analyses (
  id uuid not null,
  flight_id uuid not null,
  raw_notams jsonb not null,
  analysed_notams jsonb not null,
  created_at timestamp with time zone not null default now(),
  constraint notam_analyses_pkey primary key (id),
  constraint notam_analyses_flight_id_fkey
    foreign key (flight_id) references public.flights (id)
    on update cascade on delete cascade
);

create index if not exists notam_analyses_flight_id_created_at_idx
  on public.notam_analyses (flight_id, created_at desc);

alter table public.notam_analyses enable row level security;

drop policy if exists "notam_analyses_select_org_members" on public.notam_analyses;
create policy "notam_analyses_select_org_members"
  on public.notam_analyses for select
  to authenticated
  using (
    exists (
      select 1
      from public.flights f
      join public.organisation_members m
        on m.organisation_id = f.organisation_id
      where f.id = notam_analyses.flight_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "notam_analyses_insert_org_members" on public.notam_analyses;
create policy "notam_analyses_insert_org_members"
  on public.notam_analyses for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.flights f
      join public.organisation_members m
        on m.organisation_id = f.organisation_id
      where f.id = notam_analyses.flight_id
        and m.user_id = auth.uid()
    )
  );
