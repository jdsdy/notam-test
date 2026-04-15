import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long.");

export const authSignInSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const authSignUpSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.email("Enter a valid email address."),
  password: passwordSchema,
});

export type AuthSignInInput = z.infer<typeof authSignInSchema>;
export type AuthSignUpInput = z.infer<typeof authSignUpSchema>;
