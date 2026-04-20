import { z } from "zod";

export const FLIGHT_PLAN_WAYPOINT_NULLABLE_FIELDS = [
  "name",
  "latitude",
  "longitude",
  "flt",
  "tas",
  "grs",
  "awy",
  "wind/comp",
  "mh",
  "mcrs",
] as const;

export const EXTRACTED_NOTAM_NULLABLE_FIELDS = [
  "id",
  "title",
  "q",
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
] as const;

export type FlightPlanWaypointNullFieldKey =
  (typeof FLIGHT_PLAN_WAYPOINT_NULLABLE_FIELDS)[number];
export type ExtractedNotamNullFieldKey =
  (typeof EXTRACTED_NOTAM_NULLABLE_FIELDS)[number];

export const extractedNotamSchema = z.object({
  id: z.string(),
  title: z.string(),
  q: z.string(),
  a: z.string(),
  b: z.string(),
  c: z.string(),
  d: z.string(),
  e: z.string(),
  f: z.string(),
  g: z.string(),
  null_values: z.array(z.enum(EXTRACTED_NOTAM_NULLABLE_FIELDS)),
});

export const extractedNotamsPayloadSchema = z.object({
  notams: z.array(extractedNotamSchema),
  unformatted_notams: z.array(z.string()).default([]),
});

export const flightPlanWaypointSchema = z.object({
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  flt: z.string(),
  tas: z.number(),
  grs: z.number(),
  awy: z.string(),
  "wind/comp": z.string(),
  mh: z.number(),
  mcrs: z.number(),
  null_values: z.array(z.enum(FLIGHT_PLAN_WAYPOINT_NULLABLE_FIELDS)),
});

export const flightPlanJsonSchema = z.object({
  primary: z.array(flightPlanWaypointSchema),
  alternate: z.array(flightPlanWaypointSchema),
});

/**
 * Full schema for a complete flight-plan extraction. Used by the supervisor
 * agent (the only agent that has visibility of all fields) and by downstream
 * persistence code.
 */
export const flightPlanExtractionSchema = z.object({
  departure_icao: z.string().nullable(),
  arrival_icao: z.string().nullable(),
  departure_time: z.string().nullable(),
  arrival_time: z.string().nullable(),
  time_enroute: z.number().nullable(),
  departure_rwy: z.string().nullable(),
  arrival_rwy: z.string().nullable(),
  route: z.string().nullable(),
  aircraft_weight: z.number().nullable(),
  flight_plan_json: flightPlanJsonSchema,
  flight_metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  extracted_notams: extractedNotamsPayloadSchema,
  unidentified_fields: z.array(z.string()).default([]),
});

export type FlightPlanExtraction = z.infer<typeof flightPlanExtractionSchema>;

/**
 * Partial schema containing only the NOTAM-related slice of the full
 * extraction. This is the contract returned by the NOTAM extraction agent.
 */
export const notamExtractionPartialSchema = z.object({
  extracted_notams: extractedNotamsPayloadSchema,
  unidentified_fields: z.array(z.string()).default([]),
});

export type NotamExtractionPartial = z.infer<typeof notamExtractionPartialSchema>;

/**
 * Partial schema containing only the flight-data slice of the full extraction.
 * This is the contract returned by the flight-data extraction agent.
 */
export const flightDataExtractionPartialSchema = z.object({
  departure_icao: z.string().nullable(),
  arrival_icao: z.string().nullable(),
  departure_time: z.string().nullable(),
  arrival_time: z.string().nullable(),
  time_enroute: z.number().nullable(),
  departure_rwy: z.string().nullable(),
  arrival_rwy: z.string().nullable(),
  route: z.string().nullable(),
  aircraft_weight: z.number().nullable(),
  flight_plan_json: flightPlanJsonSchema,
  flight_metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  unidentified_fields: z.array(z.string()).default([]),
});

export type FlightDataExtractionPartial = z.infer<
  typeof flightDataExtractionPartialSchema
>;

/** Flight-data fields without \`route\` (route comes from the route/weather table agent). */
export type FlightDataCorePartial = Omit<FlightDataExtractionPartial, "route">;

export const FLIGHT_DATA_CORE_FALLBACK: FlightDataCorePartial = {
  departure_icao: null,
  arrival_icao: null,
  departure_time: null,
  arrival_time: null,
  time_enroute: null,
  departure_rwy: null,
  arrival_rwy: null,
  aircraft_weight: null,
  flight_plan_json: { primary: [], alternate: [] },
  flight_metadata: null,
  unidentified_fields: [
    "departure_icao",
    "arrival_icao",
    "departure_time",
    "arrival_time",
    "time_enroute",
    "departure_rwy",
    "arrival_rwy",
    "route",
    "aircraft_weight",
    "flight_plan_json",
  ],
};

export const FLIGHT_DATA_FALLBACK_PARTIAL: FlightDataExtractionPartial = {
  ...FLIGHT_DATA_CORE_FALLBACK,
  route: null,
};

/**
 * Output of the dedicated route / weather-breakdown-table extractor (left column
 * waypoints only). Merged in code with the core flight-data partial.
 */
export const flightRouteWeatherExtractionPartialSchema = z.object({
  route: z.string().nullable(),
  unidentified_fields: z.array(z.string()).default([]),
});

export type FlightRouteWeatherExtractionPartial = z.infer<
  typeof flightRouteWeatherExtractionPartialSchema
>;

/** Use when the splitter did not emit a route/weather table PDF slice. */
export const ROUTE_PARTIAL_WHEN_NO_TABLE_PDF: FlightRouteWeatherExtractionPartial =
  {
    route: null,
    unidentified_fields: ["route"],
  };

/**
 * Schema used by the PDF splitter agent to describe how the source flight plan
 * PDF should be broken up before extraction. All page numbers are 1-indexed.
 *
 * The splitter groups NOTAM pages so that a single NOTAM is never bisected
 * across two groups. Wind/weather-chart pages are listed separately.
 * Route–weather breakdown table pages (compact table: waypoints left, wind
 * columns right, under the main route table) are listed separately and omitted
 * from flightDetailPages. Remaining pages are flight detail content.
 */
export const notamGroupSchema = z.object({
  pages: z.array(z.number().int()),
  notamCount: z.number().int(),
  startId: z.string(),
  endId: z.string(),
});

export type NotamGroup = z.infer<typeof notamGroupSchema>;

export const splitterResultSchema = z.object({
  notamGroups: z.array(notamGroupSchema),
  windMapPages: z.array(z.number().int()),
  /** Pages containing the compact waypoint + wind breakdown table (left column = route). */
  routeWeatherTablePages: z.array(z.number().int()),
  flightDetailPages: z.array(z.number().int()),
});

export type SplitterResult = z.infer<typeof splitterResultSchema>;
