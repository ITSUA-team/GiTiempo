<script setup lang="ts">
import Avatar from "primevue/avatar";
import Button from "primevue/button";
import ConfirmDialog from "primevue/confirmdialog";
import InputText from "primevue/inputtext";
import { updateUserSchema } from "@gitiempo/shared";
import { createAppToast, runWithFeedback } from "@gitiempo/web-shared";
import { computed, shallowRef, watch } from "vue";

import PageHeader from "@/components/layout/PageHeader.vue";
import SurfaceCard from "@/components/layout/SurfaceCard.vue";
import ProfileGithubConnectionCard from "@/components/profile/ProfileGithubConnectionCard.vue";
import { useProfileGithubConnection } from "@/composables/useProfileGithubConnection";
import { useAuthStore } from "@/stores/auth";
import { useToast } from "primevue/usetoast";

const authStore = useAuthStore();
const toast = useToast();
const appToast = createAppToast(toast);

const displayNameDraft = shallowRef(authStore.profile?.displayName ?? "");
const displayNameErrorMessage = shallowRef<string | null>(null);
const isSavingProfile = shallowRef(false);

const {
  connect,
  connection,
  isConnecting,
  isDisconnecting,
  refreshConnectionStatus,
  requestDisconnect,
  requestErrorMessage,
  state: githubConnectionState,
} = useProfileGithubConnection();

const persistedDisplayName = computed(() => authStore.profile?.displayName ?? "");
const isProfileDirty = computed(
  () => displayNameDraft.value !== persistedDisplayName.value,
);
const isSaveDisabled = computed(
  () => isSavingProfile.value || !isProfileDirty.value,
);

watch(
  () => authStore.profile?.displayName ?? "",
  (nextDisplayName) => {
    if (!isProfileDirty.value) {
      displayNameDraft.value = nextDisplayName;
    }
  },
);

watch(displayNameDraft, () => {
  displayNameErrorMessage.value = null;
});

function handleCancelProfileChanges(): void {
  displayNameDraft.value = persistedDisplayName.value;
  displayNameErrorMessage.value = null;
}

async function handleSaveProfile(): Promise<void> {
  const parsed = updateUserSchema.safeParse({
    displayName: displayNameDraft.value.trim(),
  });

  if (!parsed.success) {
    displayNameErrorMessage.value = parsed.error.issues[0]?.message ?? "Display name is invalid.";
    return;
  }

  displayNameErrorMessage.value = null;
  isSavingProfile.value = true;

  try {
    await runWithFeedback({
      onError: {
        detail: "Please try again.",
        logContext: { action: "save-profile", feature: "profile" },
        summary: "Could not save profile",
      },
      onSuccess: {
        detail: "Your display name has been updated.",
        summary: "Profile saved",
      },
      run: () => authStore.updateProfile(parsed.data),
      toast: appToast,
    });
    displayNameDraft.value = authStore.profile?.displayName ?? "";
    } catch {
      // Toast feedback is handled inside the shared feedback runner.
    } finally {
      isSavingProfile.value = false;
    }
}
</script>

<template>
  <section class="flex flex-col gap-6 pb-20 sm:pb-0">
    <ConfirmDialog />

    <PageHeader
      subtitle="Manage your personal settings and session access."
      title="Profile"
    />

    <div class="flex max-w-[620px] flex-col gap-6">
      <SurfaceCard body-class="flex flex-col gap-4">
        <div class="flex items-center gap-4">
          <Avatar
            :label="authStore.userInitials"
            shape="circle"
            class="size-10"
            :pt="{
              root: 'bg-accent-tint text-brand text-xs font-semibold',
            }"
          />
          <div class="flex flex-col gap-0.5">
            <p class="text-text-dark text-sm font-semibold">
              {{ authStore.displayName }}
            </p>
            <p class="text-text-muted text-xs">
              Workspace member
            </p>
          </div>
        </div>

        <div class="grid gap-4">
          <div class="flex flex-col gap-1">
            <label
              for="profile-display-name"
              class="text-text-dark text-[13px] font-medium"
            >
              Display name
            </label>
            <InputText
              v-model="displayNameDraft"
              data-testid="profile-display-name-input"
              input-id="profile-display-name"
              class="h-[42px] w-full"
              :invalid="!!displayNameErrorMessage"
            />
            <small
              v-if="displayNameErrorMessage"
              class="text-destructive text-xs"
            >
              {{ displayNameErrorMessage }}
            </small>
          </div>

          <div class="flex flex-col gap-1">
            <label
              for="profile-email"
              class="text-text-dark text-[13px] font-medium"
            >
              Email
            </label>
            <InputText
              data-testid="profile-email-input"
              input-id="profile-email"
              :model-value="authStore.profile?.email ?? ''"
              disabled
              class="h-[42px] w-full"
              :pt="{
                root: 'bg-app-bg text-text-muted',
              }"
            />
          </div>

          <div class="flex justify-end gap-2">
            <Button
              data-testid="profile-cancel"
              type="button"
              label="Cancel"
              severity="secondary"
              variant="outlined"
              size="small"
              :disabled="!isProfileDirty || isSavingProfile"
              @click="handleCancelProfileChanges"
            />
            <Button
              data-testid="profile-save"
              type="button"
              label="Save changes"
              size="small"
              :disabled="isSaveDisabled"
              :loading="isSavingProfile"
              @click="handleSaveProfile"
            />
          </div>
        </div>
      </SurfaceCard>

      <ProfileGithubConnectionCard
        :is-connecting="isConnecting"
        :is-disconnecting="isDisconnecting"
        :request-error-message="requestErrorMessage"
        :status="githubConnectionState"
        :value="connection"
        @connect="connect"
        @disconnect="requestDisconnect"
        @refresh="refreshConnectionStatus"
      />
    </div>
  </section>
</template>
