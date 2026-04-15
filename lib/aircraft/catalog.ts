const AIRCRAFT_TYPE_BY_MANUFACTURER = {
  Gulfstream: ["G650ER", "G700", "G800", "G500", "G600"],
  Bombardier: ["Global 6000", "Global 6500", "Global 7500", "Challenger 3500"],
  Dassault: ["Falcon 6X", "Falcon 8X", "Falcon 2000LXS", "Falcon 900LX"],
  Boeing: ["BBJ 737-7", "BBJ 737-8", "BBJ 787-8", "BBJ 787-9"],
  Airbus: ["ACJ TwoTwenty", "ACJ319neo", "ACJ320neo", "ACJ350"],
  Embraer: ["Praetor 500", "Praetor 600", "Legacy 650E", "Phenom 300E"],
  Cessna: ["Citation XLS Gen2", "Citation Longitude", "Citation Latitude"],
  Honda: ["HondaJet Elite II"],
  Pilatus: ["PC-24"],
  Beechcraft: ["King Air 360ER", "King Air 260"],
} as const;

export const AIRCRAFT_MANUFACTURERS = Object.keys(AIRCRAFT_TYPE_BY_MANUFACTURER);

export function getAircraftTypesByManufacturer(manufacturer: string): string[] {
  return AIRCRAFT_TYPE_BY_MANUFACTURER[
    manufacturer as keyof typeof AIRCRAFT_TYPE_BY_MANUFACTURER
  ]
    ? [...AIRCRAFT_TYPE_BY_MANUFACTURER[manufacturer as keyof typeof AIRCRAFT_TYPE_BY_MANUFACTURER]]
    : [];
}
