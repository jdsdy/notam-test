import { describe, expect, it } from "vitest";

import {
  AIRCRAFT_MANUFACTURERS,
  getAircraftTypesByManufacturer,
} from "@/lib/aircraft/catalog";

describe("aircraft manufacturer catalog", () => {
  it("contains major manufacturers used in private aviation", () => {
    expect(AIRCRAFT_MANUFACTURERS).toContain("Gulfstream");
    expect(AIRCRAFT_MANUFACTURERS).toContain("Bombardier");
    expect(AIRCRAFT_MANUFACTURERS).toContain("Dassault");
  });

  it("returns only matching aircraft types for a manufacturer", () => {
    const gulfstreamTypes = getAircraftTypesByManufacturer("Gulfstream");
    expect(gulfstreamTypes).toContain("G700");
    expect(gulfstreamTypes).not.toContain("Global 7500");
  });

  it("returns empty list for unknown manufacturer", () => {
    expect(getAircraftTypesByManufacturer("Unknown")).toEqual([]);
  });
});
