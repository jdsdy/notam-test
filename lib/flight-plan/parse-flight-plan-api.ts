import "server-only";

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  assertAircraftBelongsToOrganisation,
  assertUserCanAccessFlight,
} from "@/lib/flights";
import { splitterResultSchema } from "@/lib/flight-plan/schemas";

export const FLIGHT_PLAN_UPLOADS_BUCKET = "flight_plan_uploads";
export const FILES_API_BETA = "files-api-2025-04-14" as const;

const extractBodySchema = z.object({
  organisationId: z.string().trim().min(1),
  aircraftId: z.string().trim().min(1),
  planPdfUuid: z.string().uuid(),
  splitterResult: splitterResultSchema,
});

export type ExtractFlightPlanRequestBody = z.infer<typeof extractBodySchema>;

export function parseExtractFlightPlanJsonBody(
  raw: unknown,
):
  | { ok: false; error: string }
  | { ok: true; body: ExtractFlightPlanRequestBody } {
  const parsed = extractBodySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; ") || "Invalid body.",
    };
  }
  return { ok: true, body: parsed.data };
}

export async function persistOriginalFlightPlanPdf(args: {
  supabase: SupabaseClient;
  organisationId: string;
  planPdfUuid: string;
  originalPdfBytes: Uint8Array;
}): Promise<void> {
  const objectPath = `${args.organisationId}/${args.planPdfUuid}.pdf`;
  const { error } = await args.supabase.storage
    .from(FLIGHT_PLAN_UPLOADS_BUCKET)
    .upload(objectPath, args.originalPdfBytes, {
      contentType: "application/pdf",
    });
  if (error) {
    throw new Error(
      `Failed to store flight plan PDF: ${error.message ?? "unknown error"}`,
    );
  }
}

export async function downloadStoredFlightPlanPdf(args: {
  supabase: SupabaseClient;
  organisationId: string;
  planPdfUuid: string;
}): Promise<{ ok: true; bytes: Uint8Array } | { ok: false; error: string }> {
  const objectPath = `${args.organisationId}/${args.planPdfUuid}.pdf`;
  const { data, error } = await args.supabase.storage
    .from(FLIGHT_PLAN_UPLOADS_BUCKET)
    .download(objectPath);
  if (error || !data) {
    return {
      ok: false,
      error:
        error?.message ??
        "Stored flight plan PDF not found. Run identify-flight-plan again.",
    };
  }
  return { ok: true, bytes: new Uint8Array(await data.arrayBuffer()) };
}

export async function ensureParseFlightAccess(args: {
  supabase: SupabaseClient;
  userId: string;
  flightId: string;
  organisationId: string;
  aircraftId: string;
}): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const access = await assertUserCanAccessFlight(args.userId, args.flightId);
  if (!access) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false as const, error: "Forbidden" },
        { status: 403 },
      ),
    };
  }

  if (access.organisationId !== args.organisationId) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false as const,
          error: "Flight does not belong to the provided organisation.",
        },
        { status: 403 },
      ),
    };
  }

  const aircraftBelongsToOrg = await assertAircraftBelongsToOrganisation(
    args.aircraftId,
    args.organisationId,
  );
  if (!aircraftBelongsToOrg) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false as const,
          error: "Aircraft does not belong to the provided organisation.",
        },
        { status: 403 },
      ),
    };
  }

  const { data: flight, error: flightErr } = await args.supabase
    .from("flights")
    .select("organisation_id, aircraft_id")
    .eq("id", args.flightId)
    .maybeSingle();

  if (flightErr || !flight) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false as const, error: "Flight not found." },
        { status: 404 },
      ),
    };
  }

  if (
    String(flight.organisation_id) !== args.organisationId ||
    String(flight.aircraft_id) !== args.aircraftId
  ) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false as const,
          error: "Provided organisation/aircraft does not match this flight.",
        },
        { status: 400 },
      ),
    };
  }

  return { ok: true };
}
