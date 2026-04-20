-- Row level security for public.feedback (table is expected to exist already).
-- Apply after: create table public.feedback (...);

alter table public.feedback enable row level security;

drop policy if exists "feedback_select_own" on public.feedback;
create policy "feedback_select_own"
  on public.feedback for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "feedback_insert_org_members" on public.feedback;
create policy "feedback_insert_org_members"
  on public.feedback for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.organisation_members m
      where m.organisation_id = feedback.organisation_id
        and m.user_id = auth.uid()
    )
    and (
      feedback.flight_id is null
      or exists (
        select 1 from public.flights f
        where f.id = feedback.flight_id
          and f.organisation_id = feedback.organisation_id
      )
    )
    and (
      (feedback.section = 'dashboard' and feedback.flight_id is null)
      or (
        feedback.section in ('flight', 'notam')
        and feedback.flight_id is not null
      )
    )
    and (
      feedback.section <> 'notam'
      or feedback.reason is not null
    )
  );
