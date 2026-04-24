import { defineStore } from "pinia";
import { computed, shallowRef } from "vue";

export const useAuthStore = defineStore("auth", () => {
  const accessToken = shallowRef<string | null>(null);
  const bootstrapComplete = shallowRef(false);

  const isAuthenticated = computed(() => accessToken.value !== null);
  const displayName = computed(() => "Admin User");
  const workspaceName = computed(() => "Workspace Admin");
  const userInitials = computed(() => "AU");

  async function bootstrapSession(): Promise<void> {
    bootstrapComplete.value = true;
  }

  return {
    accessToken,
    bootstrapComplete,
    bootstrapSession,
    displayName,
    isAuthenticated,
    userInitials,
    workspaceName,
  };
});
