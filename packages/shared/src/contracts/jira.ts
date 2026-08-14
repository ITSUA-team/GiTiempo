import { z } from "zod";

export const jiraSiteSchema = z.object({
  cloudId: z.string(),
  name: z.string(),
  url: z.string(),
});

export const jiraConnectionAccountSchema = z.object({
  accountId: z.string(),
  displayName: z.string(),
  email: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  sites: z.array(jiraSiteSchema),
  connectedAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const jiraConnectionStatusResponseSchema = z.discriminatedUnion(
  "status",
  [
    z.object({
      status: z.literal("disconnected"),
      account: z.null(),
    }),
    z.object({
      status: z.literal("connected"),
      account: jiraConnectionAccountSchema,
    }),
    z.object({
      status: z.literal("reauthorization-required"),
      account: jiraConnectionAccountSchema,
    }),
  ],
);

export const jiraAuthUrlResponseSchema = z.object({
  authorizationUrl: z.url(),
});

export type JiraSite = z.infer<typeof jiraSiteSchema>;
export type JiraConnectionAccount = z.infer<typeof jiraConnectionAccountSchema>;
export type JiraConnectionStatusResponse = z.infer<
  typeof jiraConnectionStatusResponseSchema
>;
export type JiraAuthUrlResponse = z.infer<typeof jiraAuthUrlResponseSchema>;
