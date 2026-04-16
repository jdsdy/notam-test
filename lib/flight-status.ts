export const FLIGHT_STATUS_VALUES = [
  "draft",
  "filled",
  "in-progress",
  "complete",
  "cancelled",
] as const;

export type FlightStatus = (typeof FLIGHT_STATUS_VALUES)[number];

export const FLIGHT_STATUS_LABELS: Record<FlightStatus, string> = {
  draft: "Draft",
  filled: "Filled",
  "in-progress": "In progress",
  complete: "Complete",
  cancelled: "Cancelled",
};

export function isFlightStatus(value: string | null | undefined): value is FlightStatus {
  return (
    value != null &&
    FLIGHT_STATUS_VALUES.includes(value as FlightStatus)
  );
}
