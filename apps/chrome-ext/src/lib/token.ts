import {
  readAccessTokenPayload,
  readAccessTokenStringClaim,
} from "@gitiempo/shared";

export function decodeAccessTokenEmail(accessToken: string): string | null {
  const payload = readAccessTokenPayload(accessToken);

  return payload ? readAccessTokenStringClaim(payload, "email") : null;
}
