import type { UserResponse } from "@gitiempo/shared";
import { computed, type Ref } from "vue";

interface AuthProfilePresentationOptions {
  displayNameFallback: string;
  initialsFallback?: string;
}

export function createAuthProfilePresentation(
  profile: Ref<UserResponse | null>,
  {
    displayNameFallback,
    initialsFallback = "GT",
  }: AuthProfilePresentationOptions,
) {
  const displayName = computed(
    () => profile.value?.displayName ?? displayNameFallback,
  );
  const userInitials = computed(() => {
    const source =
      profile.value?.displayName?.trim() ||
      profile.value?.email ||
      displayName.value;
    const parts = source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase());

    return parts.join("") || initialsFallback;
  });

  return {
    displayName,
    userInitials,
  };
}
