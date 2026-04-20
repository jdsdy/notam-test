# Feedback System

This app stores pilot feedback in the `public.feedback` table. Feedback can be submitted from three places:

- **Dashboard**: general free-text feedback.
- **Flight**: free-text feedback tied to a specific flight.
- **NOTAM detail**: structured + free-text feedback tied to a specific NOTAM within a flight.

When documentation and code diverge, **trust the code**.

---

## UI entry points

### Dashboard feedback (free text)

- **Page**: `app/app/page.tsx`
- **Component**: `components/app/dashboard-feedback-card.tsx`
- **Action**: `submitDashboardFeedbackAction` in `app/actions/feedback.ts`

The dashboard feedback card:

- Stores `section = 'dashboard'`
- Stores `organisation_id` (selected in the UI)
- Stores `flight_id = null`
- Stores `reason = null`
- Stores `text` (required)

### Flight feedback (free text)

- **Page**: `app/app/organisations/[organisationId]/flights/[flightId]/page.tsx`
- **Component**: `components/app/flight-feedback-card.tsx` (rendered inside `components/app/flight-workspace.tsx`)
- **Action**: `submitFlightFeedbackAction` in `app/actions/feedback.ts`

The flight feedback card:

- Stores `section = 'flight'`
- Stores `organisation_id`
- Stores `flight_id` (required)
- Stores `reason = null`
- Stores `text` (required)

### NOTAM feedback (structured + free text)

- **Component**: `components/app/notam-feedback-form.tsx`
- **Rendered from**: `components/app/notam-analysis-panel.tsx` inside the NOTAM detail dialog
- **Action**: `submitNotamFeedbackAction` in `app/actions/feedback.ts`

The NOTAM feedback form asks:

- “**What is this feedback in relation to**” (multi-select)
  - Incorrect categorisation
  - Poor data extraction
  - Poor notam summary
- Optional free text for additional details

It stores:

- `section = 'notam'`
- `organisation_id`
- `flight_id` (required)
- `reason` (required; see format below)
- `text` (stored as the optional details; when empty, the app stores `"—"` to satisfy the non-null column)

---

## Data model mapping (`public.feedback`)

The table is expected to already exist (as per the schema in the product spec). The app uses the columns like this:

- **`user_id`**: always the authenticated user (server-side via Supabase session).
- **`organisation_id`**: which organisation the feedback belongs to.
- **`flight_id`**:
  - `null` for dashboard feedback
  - set for flight + notam feedback
- **`section`**: one of:
  - `"dashboard"`
  - `"flight"`
  - `"notam"`
- **`reason`**:
  - `null` for `"dashboard"` and `"flight"`
  - JSON string for `"notam"` (see below)
- **`text`**:
  - required free text for dashboard/flight
  - optional details for NOTAM feedback (stored as `"—"` when empty)

---

## NOTAM `reason` format

For `section = 'notam'`, `reason` is a JSON string containing:

```json
{
  "notam_id": "A1234/26",
  "aspects": ["incorrect_categorisation", "poor_notam_summary"]
}
```

Notes:

- `notam_id` may be `null` if the NOTAM does not have an id.
- `aspects` is a non-empty list of ids defined in `lib/feedback.ts`:
  - `incorrect_categorisation`
  - `poor_data_extraction`
  - `poor_notam_summary`

---

## Access control

### Route-level checks (server actions)

The feedback server actions perform:

- **Signed-in check** via `getCurrentUser()` (`lib/supabase/server.ts`)
- **Organisation membership check** via `assertOrgAccess(...)` (`lib/organisations.ts`) for dashboard feedback
- **Flight access check** via `assertUserCanAccessFlight(...)` (`lib/flights.ts`) for flight + NOTAM feedback, and verifies the flight belongs to the provided organisation id

### Database RLS (Supabase)

Policies live in:

- `supabase/migrations/20260420120000_feedback_rls.sql`

They enforce:

- **SELECT**: users can only read their own feedback (`user_id = auth.uid()`).
- **INSERT**: users can insert feedback only for organisations they belong to, and flight ids must belong to that organisation. Basic shape constraints are enforced (dashboard feedback must have `flight_id` null; flight/notam feedback must have `flight_id` set; notam feedback must have `reason` set).

---

## Source file map

| Concern | Path |
|--------|------|
| Feedback server actions | `app/actions/feedback.ts` |
| Feedback types/constants | `lib/feedback.ts` |
| Dashboard feedback card | `components/app/dashboard-feedback-card.tsx` |
| Flight feedback card | `components/app/flight-feedback-card.tsx` |
| NOTAM feedback form | `components/app/notam-feedback-form.tsx` |
| NOTAM detail dialog host | `components/app/notam-analysis-panel.tsx` |
| Feedback RLS migration | `supabase/migrations/20260420120000_feedback_rls.sql` |

