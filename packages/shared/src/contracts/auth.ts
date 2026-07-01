import { z } from "zod";

/**
 * Body for `POST /auth/login`.
 *
 * Client sends a Firebase ID token obtained from the Firebase JS SDK.
 * Strict mode rejects unknown keys so clients cannot smuggle claims.
 */
export const loginRequestSchema = z
  .object({
    firebaseIdToken: z.string().min(1),
  })
  .strict();

/** Body for `POST /auth/refresh`. */
export const refreshRequestSchema = z
  .object({
    refreshToken: z.string().min(1),
  })
  .strict();

/** Body for `POST /auth/logout`. */
export const logoutRequestSchema = z
  .object({
    refreshToken: z.string().min(1),
  })
  .strict();

/** Body for `POST /auth/switch-workspace`. */
export const switchWorkspaceRequestSchema = z
  .object({
    refreshToken: z.string().min(1),
    workspaceId: z.uuid(),
  })
  .strict();

/** Body for `POST /auth/register`. */
export const registerRequestSchema = z
  .object({
    email: z.string().trim().pipe(z.email()),
    fullName: z.string().trim().min(1),
    workspaceName: z.string().trim().min(1).max(255),
    password: z.string().min(8),
    ownerAcknowledgement: z.literal(true),
  })
  .strict();

/** Stable frontend-visible registration error identifiers. */
export const registrationErrorCodeSchema = z.enum([
  "duplicate_email",
  "weak_password",
  "invalid_workspace_name",
  "workspace_name_unavailable",
  "rate_limited",
  "registration_service_unavailable",
]);

/**
 * Response shape for `/auth/login` and `/auth/refresh`.
 *
 * `accessTokenExpiresIn` is seconds-until-expiry for the access token,
 * matching the `exp - iat` claim so clients do not need to decode the JWT.
 */
export const tokenPairResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  accessTokenExpiresIn: z.number().int().positive(),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type RefreshRequest = z.infer<typeof refreshRequestSchema>;
export type LogoutRequest = z.infer<typeof logoutRequestSchema>;
export type SwitchWorkspaceRequest = z.infer<typeof switchWorkspaceRequestSchema>;
export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type RegistrationErrorCode = z.infer<typeof registrationErrorCodeSchema>;
export type TokenPairResponse = z.infer<typeof tokenPairResponseSchema>;
