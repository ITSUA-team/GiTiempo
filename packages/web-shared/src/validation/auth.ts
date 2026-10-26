import { z } from "zod";

export const emailPasswordSignInSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email address.")),
  password: z.string().min(1, "Enter your password."),
});

export type EmailPasswordSignInInput = z.infer<typeof emailPasswordSignInSchema>;

export const emailOnlySchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email address.")),
});

export type EmailOnlyInput = z.infer<typeof emailOnlySchema>;

export const newPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type NewPasswordInput = z.infer<typeof newPasswordSchema>;
