import { z } from "zod";

export const webAppNameSchema = z.enum(["user-web", "admin-web"]);

export const appStackSchema = z.object({
  app: webAppNameSchema,
  title: z.string().min(1),
  packages: z.array(z.string().min(1)).min(1),
});

export type WebAppName = z.infer<typeof webAppNameSchema>;
export type AppStack = z.infer<typeof appStackSchema>;
