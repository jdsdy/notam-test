-- Row level security for public.aircraft (table is expected to exist already).

alter table public.aircraft enable row level security;

drop policy if exists "aircraft_select_org_members" on public.aircraft;
create policy "aircraft_select_org_members"
  on public.aircraft for select
  to authenticated
  using (
    exists (
      select 1 from public.organisation_members m
      where m.organisation_id = aircraft.organisation_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "aircraft_insert_org_admins" on public.aircraft;
create policy "aircraft_insert_org_admins"
  on public.aircraft for insert
  to authenticated
  with check (
    exists (
      select 1 from public.organisation_members m
      where m.organisation_id = aircraft.organisation_id
        and m.user_id = auth.uid()
        and m.is_admin = true
    )
  );
