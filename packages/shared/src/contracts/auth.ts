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
export type TokenPairResponse = z.infer<typeof tokenPairResponseSchema>;
