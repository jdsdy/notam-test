"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { encodeNotamFeedbackReason } from "@/lib/feedback";
import { assertUserCanAccessFlight } from "@/lib/flights";
import { assertOrgAccess } from "@/lib/organisations";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";

const textSchema = z.string().trim().max(20000);

const dashboardSchema = z.object({
  section: z.literal("dashboard"),
  organisationId: z.string().uuid(),
  text: textSchema.pipe(z.string().min(1, "Please enter feedback.")),
});

const flightSchema = z.object({
  section: z.literal("flight"),
  organisationId: z.string().uuid(),
  flightId: z.string().uuid(),
  text: textSchema.pipe(z.string().min(1, "Please enter feedback.")),
});

const notamAspectEnum = z.enum([
  "incorrect_categorisation",
  "poor_data_extraction",
  "poor_notam_summary",
]);

const notamSchema = z.object({
  section: z.literal("notam"),
  organisationId: z.string().uuid(),
  flightId: z.string().uuid(),
  notamId: z.string().nullable(),
  aspects: z.array(notamAspectEnum).min(1, "Select at least one option."),
  text: z.string().trim().max(20000),
});

export type SubmitFeedbackResult = { error: string } | { ok: true };

export async function submitDashboardFeedbackAction(input: {
  organisationId: string;
  text: string;
}): Promise<SubmitFeedbackResult> {
  const parsed = dashboardSchema.safeParse({
    section: "dashboard" as const,
    organisationId: input.organisationId,
    text: input.text,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid feedback." };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const canAccessOrg = await assertOrgAccess(user.id, parsed.data.organisationId);
  if (!canAccessOrg) {
    return { error: "You do not have access to this organisation." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("feedback").insert({
    user_id: user.id,
    organisation_id: parsed.data.organisationId,
    flight_id: null,
    section: "dashboard",
    reason: null,
    text: parsed.data.text,
  });

  if (error) {
    return { error: error.message ?? "Could not save feedback." };
  }

  revalidatePath("/");
  return { ok: true };
}

export async function submitFlightFeedbackAction(input: {
  organisationId: string;
  flightId: string;
  text: string;
}): Promise<SubmitFeedbackResult> {
  const parsed = flightSchema.safeParse({
    section: "flight" as const,
    organisationId: input.organisationId,
    flightId: input.flightId,
    text: input.text,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid feedback." };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const access = await assertUserCanAccessFlight(user.id, parsed.data.flightId);
  if (!access || access.organisationId !== parsed.data.organisationId) {
    return { error: "You do not have access to this flight." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("feedback").insert({
    user_id: user.id,
    organisation_id: parsed.data.organisationId,
    flight_id: parsed.data.flightId,
    section: "flight",
    reason: null,
    text: parsed.data.text,
  });

  if (error) {
    return { error: error.message ?? "Could not save feedback." };
  }

  revalidatePath(`/organisations/${parsed.data.organisationId}/flights/${parsed.data.flightId}`);
  return { ok: true };
}

export async function submitNotamFeedbackAction(input: {
  organisationId: string;
  flightId: string;
  notamId: string | null;
  aspects: string[];
  text: string;
}): Promise<SubmitFeedbackResult> {
  const parsed = notamSchema.safeParse({
    section: "notam" as const,
    organisationId: input.organisationId,
    flightId: input.flightId,
    notamId: input.notamId,
    aspects: input.aspects,
    text: input.text,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid feedback." };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const access = await assertUserCanAccessFlight(user.id, parsed.data.flightId);
  if (!access || access.organisationId !== parsed.data.organisationId) {
    return { error: "You do not have access to this flight." };
  }

  const reason = encodeNotamFeedbackReason({
    notam_id: parsed.data.notamId,
    aspects: parsed.data.aspects,
  });

  const bodyText = parsed.data.text.trim();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("feedback").insert({
    user_id: user.id,
    organisation_id: parsed.data.organisationId,
    flight_id: parsed.data.flightId,
    section: "notam",
    reason,
    text: bodyText.length > 0 ? bodyText : "—",
  });

  if (error) {
    return { error: error.message ?? "Could not save feedback." };
  }

  revalidatePath(`/organisations/${parsed.data.organisationId}/flights/${parsed.data.flightId}`);
  return { ok: true };
}
