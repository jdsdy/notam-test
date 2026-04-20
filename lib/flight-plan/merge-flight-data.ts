import type {
  FlightDataCorePartial,
  FlightDataExtractionPartial,
  FlightRouteWeatherExtractionPartial,
} from "@/lib/flight-plan/schemas";

/**
 * Combines core flight-data extraction (no route) with the route-only
 * extraction from the route/weather breakdown table PDF.
 */
export function mergeFlightDataPartials(
  core: FlightDataCorePartial,
  routePartial: FlightRouteWeatherExtractionPartial,
): FlightDataExtractionPartial {
  const route = routePartial.route ?? null;
  const unidentified = new Set([
    ...(core.unidentified_fields ?? []),
    ...(routePartial.unidentified_fields ?? []),
  ]);
  if (route != null) {
    unidentified.delete("route");
  }
  return {
    ...core,
    route,
    unidentified_fields: Array.from(unidentified),
  };
}
