import type { UserResponse } from "@gitiempo/shared";
import { describe, expect, it } from "vitest";
import { shallowRef } from "vue";

import { createAuthProfilePresentation } from "./profile-presentation";

function createProfile(overrides: Partial<UserResponse>): UserResponse {
  return {
    avatarUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    displayName: "Alexey Tsukanov",
    email: "alexey@example.com",
    id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
    role: "member",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("createAuthProfilePresentation", () => {
  it("uses configured guest presentation fallbacks", () => {
    const profile = shallowRef<UserResponse | null>(null);
    const presentation = createAuthProfilePresentation(profile, {
      displayNameFallback: "Workspace member",
    });

    expect(presentation.displayName.value).toBe("Workspace member");
    expect(presentation.userInitials.value).toBe("WM");
  });

  it("derives initials from the current profile display name", () => {
    const profile = shallowRef<UserResponse | null>(
      createProfile({ displayName: "Alexey Tsukanov" }),
    );
    const presentation = createAuthProfilePresentation(profile, {
      displayNameFallback: "Workspace member",
    });

    expect(presentation.displayName.value).toBe("Alexey Tsukanov");
    expect(presentation.userInitials.value).toBe("AT");
  });

  it("falls back to email when display name is absent or blank", () => {
    const profile = shallowRef<UserResponse | null>(
      createProfile({ displayName: null }),
    );
    const presentation = createAuthProfilePresentation(profile, {
      displayNameFallback: "Workspace member",
    });

    expect(presentation.displayName.value).toBe("Workspace member");
    expect(presentation.userInitials.value).toBe("A");

    profile.value = createProfile({
      displayName: "   ",
      email: "blank@example.com",
    });

    expect(presentation.displayName.value).toBe("   ");
    expect(presentation.userInitials.value).toBe("B");
  });

  it("uses configured initials fallback when no source yields initials", () => {
    const profile = shallowRef<UserResponse | null>(
      createProfile({
        displayName: "",
        email: "",
      }),
    );
    const presentation = createAuthProfilePresentation(profile, {
      displayNameFallback: "",
      initialsFallback: "NA",
    });

    expect(presentation.displayName.value).toBe("");
    expect(presentation.userInitials.value).toBe("NA");
  });
});
