import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type FlightRow = {
  id: string;
  organisation_id: string;
  pic_id: string;
  aircraft_id: string;
  departure_icao: string | null;
  arrival_icao: string | null;
  departure_time: string | null;
  arrival_time: string | null;
  time_enroute: number | null;
  departure_rwy: string | null;
  arrival_rwy: string | null;
  route: string | null;
  aircraft_weight: number | null;
  status: string | null;
  flight_plan_pdf_text: string | null;
  flight_plan_json: Record<string, unknown> | null;
  created_at: string;
};

export type FlightSummary = {
  id: string;
  created_at: string;
  status: string | null;
  departure_icao: string | null;
  arrival_icao: string | null;
  tail_number: string;
  aircraft_type: string;
  pic_name: string;
};

export type FlightDetail = FlightRow & {
  tail_number: string;
  aircraft_type: string;
  aircraft_manufacturer: string;
  pic_name: string;
  pic_email: string;
};

export async function listFlightsForOrganisation(
  organisationId: string,
): Promise<FlightSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data: flights, error } = await supabase
    .from("flights")
    .select("id, created_at, status, departure_icao, arrival_icao, aircraft_id, pic_id")
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: false });

  if (error || !flights?.length) return [];

  const aircraftIds = [...new Set(flights.map((f) => f.aircraft_id as string))];
  const picIds = [...new Set(flights.map((f) => f.pic_id as string))];

  const [{ data: aircraftRows }, { data: profiles }] = await Promise.all([
    supabase
      .from("aircraft")
      .select("id, tail_number, type")
      .in("id", aircraftIds),
    supabase.from("profiles").select("id, name, email").in("id", picIds),
  ]);

  const aircraftById = new Map(
    (aircraftRows ?? []).map((a) => [
      a.id as string,
      {
        tail_number: a.tail_number as string,
        type: a.type as string,
      },
    ]),
  );
  const profileById = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      {
        name: ((p.name as string) ?? "").trim() || "—",
        email: ((p.email as string) ?? "").trim() || "—",
      },
    ]),
  );

  return flights.map((f) => {
    const ac = aircraftById.get(f.aircraft_id as string);
    const pic = profileById.get(f.pic_id as string);
    return {
      id: f.id as string,
      created_at: f.created_at as string,
      status: (f.status as string | null) ?? null,
      departure_icao: (f.departure_icao as string | null) ?? null,
      arrival_icao: (f.arrival_icao as string | null) ?? null,
      tail_number: ac?.tail_number ?? "—",
      aircraft_type: ac?.type ?? "—",
      pic_name: pic?.name ?? "—",
    };
  });
}

export async function assertUserCanAccessFlight(
  userId: string,
  flightId: string,
): Promise<{ organisationId: string } | null> {
  const supabase = await createSupabaseServerClient();
  const { data: flight, error: fErr } = await supabase
    .from("flights")
    .select("organisation_id")
    .eq("id", flightId)
    .maybeSingle();

  if (fErr || !flight) return null;

  const organisationId = flight.organisation_id as string;
  const { data: membership } = await supabase
    .from("organisation_members")
    .select("id")
    .eq("organisation_id", organisationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership) return null;
  return { organisationId };
}

export async function getFlightDetailForUser(
  userId: string,
  organisationId: string,
  flightId: string,
): Promise<FlightDetail | null> {
  const access = await assertUserCanAccessFlight(userId, flightId);
  if (!access || access.organisationId !== organisationId) return null;

  const supabase = await createSupabaseServerClient();
  const { data: flight, error } = await supabase
    .from("flights")
    .select(
      [
        "id",
        "organisation_id",
        "pic_id",
        "aircraft_id",
        "departure_icao",
        "arrival_icao",
        "departure_time",
        "arrival_time",
        "time_enroute",
        "departure_rwy",
        "arrival_rwy",
        "route",
        "aircraft_weight",
        "status",
        "flight_plan_pdf_text",
        "flight_plan_json",
        "created_at",
      ].join(", "),
    )
    .eq("id", flightId)
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (error || !flight) return null;

  const row = flight as unknown as FlightRow;
  const [{ data: ac }, { data: pic }] = await Promise.all([
    supabase
      .from("aircraft")
      .select("tail_number, type, manufacturer")
      .eq("id", row.aircraft_id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("name, email")
      .eq("id", row.pic_id)
      .maybeSingle(),
  ]);
  const json = row.flight_plan_json;
  const normalizedJson =
    json && typeof json === "object" && !Array.isArray(json)
      ? (json as Record<string, unknown>)
      : null;

  return {
    ...row,
    flight_plan_json: normalizedJson,
    tail_number: (ac?.tail_number as string) ?? "—",
    aircraft_type: (ac?.type as string) ?? "—",
    aircraft_manufacturer: (ac?.manufacturer as string) ?? "—",
    pic_name: (((pic?.name as string) ?? "").trim() || "—") as string,
    pic_email: (((pic?.email as string) ?? "").trim() || "—") as string,
  };
}

export async function assertPicIsMemberOfOrganisation(
  picId: string,
  organisationId: string,
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("organisation_members")
    .select("id")
    .eq("organisation_id", organisationId)
    .eq("user_id", picId)
    .maybeSingle();

  return Boolean(data);
}

export async function assertAircraftBelongsToOrganisation(
  aircraftId: string,
  organisationId: string,
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("aircraft")
    .select("id")
    .eq("id", aircraftId)
    .eq("organisation_id", organisationId)
    .maybeSingle();

  return Boolean(data);
}
