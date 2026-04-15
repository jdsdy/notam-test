import { z } from "zod";

export const aircraftInputSchema = z.object({
  organisationId: z.uuid("Select a valid organisation."),
  tailNumber: z
    .string()
    .trim()
    .min(2, "Tail number is required.")
    .max(20, "Tail number is too long.")
    .transform((value) => value.toUpperCase()),
  manufacturer: z.string().trim().min(1, "Manufacturer is required."),
  type: z.string().trim().min(1, "Aircraft type is required."),
  seats: z.string().trim().regex(/^\d+$/, "Seats must be numeric."),
});

export type AircraftInput = z.infer<typeof aircraftInputSchema>;
