import { registerRequestSchema } from "@gitiempo/shared";
import { z } from "zod";

export const registerFormSchema = registerRequestSchema
  .extend({
    confirmPassword: z.string().min(1, "Confirm your password."),
    email: z.string().trim().min(1, "Enter your work email.").email(
      "Enter a valid work email address.",
    ),
    fullName: z.string().trim().min(1, "Enter your full name."),
    ownerAcknowledgement: z.boolean(),
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

    if (!values.ownerAcknowledgement) {
      ctx.addIssue({
        code: "custom",
        message: "Accept the workspace owner responsibility to continue.",
        path: ["ownerAcknowledgement"],
      });
    }
  });

export type RegisterFormValues = z.infer<typeof registerFormSchema>;

export const registerFormInitialValues: RegisterFormValues = {
  confirmPassword: "",
  email: "",
  fullName: "",
  ownerAcknowledgement: false,
  password: "",
  workspaceName: "",
};
