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

/**
 * Body for `POST /auth/github/session`: the one-time GitHub sign-in handoff code,
 * plus the proof of possession required of a public client.
 *
 * Web clients omit `verifier`: their transaction is bound to the browser by an
 * HttpOnly cookie the callback can read. The browser extension cannot rely on
 * that — its authorization window does not carry the cookie through to the
 * callback — so it instead sends a challenge when starting the flow and redeems
 * the handoff with the matching verifier (RFC 9700 proof of possession for
 * public clients).
 *
 * `verifier` is an opaque secret, not a formatted value. The server only hashes
 * it and compares the digest with the challenge signed into the state, so the
 * encoding is the client's to choose — today's extension sends 64 lowercase hex
 * characters, but base64url would work identically, because the challenge is
 * always the hex digest regardless. The bounds are therefore not the PKCE
 * `code_verifier` character range they resemble: `min` is an entropy floor that
 * holds in either encoding (168 bits as hex, 256 as base64url) and `max` only
 * keeps junk out.
 */
export const githubSessionRequestSchema = z
  .object({
    code: z.string().min(1).max(4096),
    verifier: z.string().min(43).max(128).optional(),
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
export type GithubSessionRequest = z.infer<typeof githubSessionRequestSchema>;
export type SwitchWorkspaceRequest = z.infer<typeof switchWorkspaceRequestSchema>;
export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type RegistrationErrorCode = z.infer<typeof registrationErrorCodeSchema>;
export type TokenPairResponse = z.infer<typeof tokenPairResponseSchema>;
