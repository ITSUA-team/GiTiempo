import { z } from "zod";

export const emailPasswordSignInSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email address.")),
  password: z.string().min(1, "Enter your password."),
});

export type EmailPasswordSignInInput = z.infer<typeof emailPasswordSignInSchema>;
