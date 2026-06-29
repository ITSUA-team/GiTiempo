import {
  updateUserSchema,
  userResponseSchema,
  type UpdateUserInput,
  type UserResponse,
} from "@gitiempo/shared";
import { getDefaultFetchFn, requestJson } from "../http";


interface CurrentUserClientOptions {
  apiBaseUrl?: string;
  fetchFn?: typeof fetch;
}

export interface CurrentUserClient {
  getCurrentUser(accessToken: string): Promise<UserResponse>;
  updateCurrentUser(
    accessToken: string,
    input: UpdateUserInput,
  ): Promise<UserResponse>;
}


export function createCurrentUserClient({
  apiBaseUrl,
  fetchFn = getDefaultFetchFn(),
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
    updateCurrentUser(accessToken, input) {
      return requestJson({
        accessToken,
        apiBaseUrl,
        body: updateUserSchema.parse(input),
        fetchFn,
        method: "PATCH",
        path: "/users/me",
        responseSchema: userResponseSchema,
      });
    },
  };
}
