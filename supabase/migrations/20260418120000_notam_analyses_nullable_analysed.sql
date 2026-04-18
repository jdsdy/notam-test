-- Allow NOTAM extraction rows before AI analysis completes; enable updates after parse.

alter table public.notam_analyses
  alter column analysed_notams drop not null;

drop policy if exists "notam_analyses_update_org_members" on public.notam_analyses;
create policy "notam_analyses_update_org_members"
  on public.notam_analyses for update
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
  )
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

drop policy if exists "notam_analyses_delete_org_members" on public.notam_analyses;
create policy "notam_analyses_delete_org_members"
  on public.notam_analyses for delete
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
