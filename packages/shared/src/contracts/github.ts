import { z } from "zod";

const dateTimeSchema = z.iso.datetime();

export const githubConnectionAccountSchema = z.object({
  githubUserId: z.string().min(1),
  login: z.string().min(1),
  avatarUrl: z.string().nullable(),
  connectedAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});

export const githubConnectionStatusResponseSchema = z.discriminatedUnion(
  "status",
  [
    z.object({
      status: z.literal("disconnected"),
      account: z.null(),
    }),
    z.object({
      status: z.literal("connected"),
      account: githubConnectionAccountSchema,
    }),
  ],
);

export const githubAuthUrlResponseSchema = z.object({
  authorizationUrl: z.url(),
});

export type GitHubConnectionAccount = z.infer<
  typeof githubConnectionAccountSchema
>;
export type GitHubConnectionStatusResponse = z.infer<
  typeof githubConnectionStatusResponseSchema
>;
export type GitHubAuthUrlResponse = z.infer<typeof githubAuthUrlResponseSchema>;
