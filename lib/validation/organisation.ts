import { z } from "zod";

export const organisationInputSchema = z.object({
  name: z.string().trim().min(2, "Organisation name is required."),
});

export type OrganisationInput = z.infer<typeof organisationInputSchema>;
