import { userResponseSchema, type UserResponse } from "@gitiempo/shared";
import { requestJson } from "../http";

/* eslint-disable no-unused-vars */

interface CurrentUserClientOptions {
  apiBaseUrl?: string;
  fetchFn?: typeof fetch;
}

export interface CurrentUserClient {
  getCurrentUser(accessToken: string): Promise<UserResponse>;
}

/* eslint-enable no-unused-vars */

export function createCurrentUserClient({
  apiBaseUrl,
  fetchFn = fetch,
}: CurrentUserClientOptions = {}): CurrentUserClient {
  return {
    getCurrentUser(accessToken) {
      return requestJson({
        accessToken,
        apiBaseUrl,
        fetchFn,
        path: "/users/me",
        responseSchema: userResponseSchema,
      });
    },
  };
}
