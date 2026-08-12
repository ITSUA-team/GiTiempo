import { deriveProfileInitials, type UserResponse } from "@gitiempo/shared";
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
  const avatarUrl = computed(() => profile.value?.avatarUrl ?? null);
  const displayName = computed(
    () => profile.value?.displayName ?? displayNameFallback,
  );
  const userInitials = computed(() =>
    deriveProfileInitials(
      profile.value?.displayName?.trim() ||
        profile.value?.email ||
        displayName.value,
      initialsFallback,
    ),
  );

  return {
    avatarUrl,
    displayName,
    userInitials,
  };
}
