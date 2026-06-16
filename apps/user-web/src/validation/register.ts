import { registerRequestSchema } from "@gitiempo/shared";
import { z } from "zod";

export const registerFormSchema = registerRequestSchema
  .extend({
    confirmPassword: z.string().min(1, "Confirm your password."),
    email: z.string().trim().min(1, "Enter your work email.").email(
      "Enter a valid work email address.",
    ),
    fullName: z.string().trim().min(1, "Enter your full name."),
    ownerAcknowledgement: z.boolean().pipe(
      z.literal(true, "Accept the workspace owner responsibility to continue."),
    ),
    password: z.string().min(1, "Enter a password.").min(
      8,
      "Choose a password with at least 8 characters.",
    ),
    workspaceName: z
      .string()
      .trim()
      .min(1, "Enter your workspace name.")
      .max(255, "Workspace name must be 255 characters or fewer."),
  })
  .superRefine((values, ctx) => {
    if (values.password !== values.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        message: "Passwords do not match.",
        path: ["confirmPassword"],
      });
    }
  });

export type RegisterFormValues = z.output<typeof registerFormSchema>;
export type RegisterFormInputValues = z.input<typeof registerFormSchema>;

export const registerFormInitialValues: RegisterFormInputValues = {
  confirmPassword: "",
  email: "",
  fullName: "",
  ownerAcknowledgement: false,
  password: "",
  workspaceName: "",
};
