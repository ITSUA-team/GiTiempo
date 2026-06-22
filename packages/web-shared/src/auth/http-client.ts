import {
  loginRequestSchema,
  registerRequestSchema,
  refreshRequestSchema,
  type RegisterRequest,
  tokenPairResponseSchema,
  type TokenPairResponse,
} from "@gitiempo/shared";
import {
  createResponseError,
  getDefaultFetchFn,
  getRequestUrl,
  requestJson,
} from "../http";

/* eslint-disable no-unused-vars */

interface AuthHttpClientOptions {
  apiBaseUrl?: string;
  fetchFn?: typeof fetch;
}

export interface AuthHttpClient {
  loginWithFirebaseToken(firebaseIdToken: string): Promise<TokenPairResponse>;
  logoutAuthSession(accessToken: string, refreshToken: string): Promise<void>;
  registerWorkspaceOwner(input: RegisterRequest): Promise<TokenPairResponse>;
  refreshAuthSession(refreshToken: string): Promise<TokenPairResponse>;
}

/* eslint-enable no-unused-vars */

export function createAuthHttpClient({
  apiBaseUrl,
  fetchFn = getDefaultFetchFn(),
}: AuthHttpClientOptions = {}): AuthHttpClient {
  return {
    loginWithFirebaseToken(firebaseIdToken) {
      return requestJson({
        apiBaseUrl,
        body: loginRequestSchema.parse({ firebaseIdToken }),
        fetchFn,
        method: "POST",
        path: "/auth/login",
        responseSchema: tokenPairResponseSchema,
      });
    },
    async logoutAuthSession(accessToken, refreshToken) {
      const response = await fetchFn(getRequestUrl(apiBaseUrl, "/auth/logout"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw await createResponseError(response);
      }
    },
    registerWorkspaceOwner(input) {
      return requestJson({
        apiBaseUrl,
        body: registerRequestSchema.parse(input),
        fetchFn,
        method: "POST",
        path: "/auth/register",
        responseSchema: tokenPairResponseSchema,
      });
    },
    refreshAuthSession(refreshToken) {
      return requestJson({
        apiBaseUrl,
        body: refreshRequestSchema.parse({ refreshToken }),
        fetchFn,
        method: "POST",
        path: "/auth/refresh",
        responseSchema: tokenPairResponseSchema,
      });
    },
  };
}
