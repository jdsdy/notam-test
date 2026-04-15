/** Dummy catalog — replace with DB-driven options later. */

export const AIRCRAFT_MANUFACTURERS = [
  "Boeing",
  "Gulfstream",
  "Bombardier",
  "Cessna",
] as const;

export type AircraftManufacturer = (typeof AIRCRAFT_MANUFACTURERS)[number];

export const AIRCRAFT_TYPES_BY_MANUFACTURER: Record<
  AircraftManufacturer,
  readonly [string, string, string]
> = {
  Boeing: ["737 MAX 8", "787-9", "777-300ER"],
  Gulfstream: ["G700", "G650ER", "G280"],
  Bombardier: ["Global 6000", "Challenger 350", "Learjet 75"],
  Cessna: ["Citation Latitude", "Citation Longitude", "Citation X"],
};

export function isManufacturer(value: string): value is AircraftManufacturer {
  return (AIRCRAFT_MANUFACTURERS as readonly string[]).includes(value);
}

export function isValidManufacturerAndType(
  manufacturer: string,
  aircraftType: string,
): boolean {
  if (!isManufacturer(manufacturer)) return false;
  return (AIRCRAFT_TYPES_BY_MANUFACTURER[manufacturer] as readonly string[]).includes(
    aircraftType,
  );
}
