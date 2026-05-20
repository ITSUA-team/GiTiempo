<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import type { RouteLocationRaw } from "vue-router";
import { RouterLink } from "vue-router";
import Avatar from "primevue/avatar";
import Button from "primevue/button";
import Menu from "primevue/menu";

type ProfileMenuRef = {
  toggle: CallableFunction;
};

const props = withDefaults(
  defineProps<{
    counterpartHref: string;
    counterpartLabel: string;
    displayName: string;
    productName?: string;
    settingsTo: RouteLocationRaw;
    userInitials: string;
    workspaceName: string;
    workspaceShortName?: string;
  }>(),
  {
    productName: "GiTiempo",
    workspaceShortName: "GT",
  },
);

const emit = defineEmits<{
  signOut: [];
}>();

const profileMenu = useTemplateRef<ProfileMenuRef>("profileMenu");

const profileMenuItems = computed(() => [
  {
    key: "settings",
    label: "Settings",
    route: props.settingsTo,
  },
  {
    separator: true,
  },
  {
    command: () => emit("signOut"),
    destructive: true,
    key: "sign-out",
    label: "Sign out",
  },
]);

function toggleProfileMenu(event: MouseEvent): void {
  profileMenu.value?.toggle(event);
}
</script>

<template>
  <header
    class="border-divider bg-surface sticky top-0 z-20 grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 border-b px-4 sm:px-6"
  >
    <div class="flex items-center gap-3">
      <div
        class="bg-accent-tint text-brand flex size-8 items-center justify-center rounded-lg text-xs font-semibold"
      >
        {{ props.workspaceShortName }}
      </div>
      <div class="flex flex-col gap-0.5">
        <p class="text-base font-semibold">
          {{ props.productName }}
        </p>
        <p class="text-text-muted text-xs">
          {{ props.workspaceName }}
        </p>
      </div>
    </div>

    <div class="min-w-0 px-2">
      <div class="flex justify-center">
        <slot name="center" />
      </div>
    </div>

    <div class="flex items-center gap-3">
      <a
        :href="props.counterpartHref"
        class="text-brand hidden text-[13px] font-semibold transition hover:underline sm:block"
      >
        {{ props.counterpartLabel }}
      </a>
      <Button
        type="button"
        aria-controls="profile_menu"
        aria-haspopup="menu"
        aria-label="Open profile menu"
        variant="text"
        :pt="{
          root: {
            class:
              'border-divider bg-surface hover:bg-app-bg focus-visible:outline-brand flex h-10 items-center gap-3 rounded-lg border px-1.5 py-1 transition focus-visible:outline-2 focus-visible:outline-offset-2',
          },
        }"
        @click="toggleProfileMenu"
      >
        <span class="text-text-dark hidden text-right text-[13px] font-medium sm:block">
          {{ props.displayName }}
        </span>
        <Avatar
          :label="props.userInitials"
          shape="circle"
          class="size-8"
          aria-hidden="true"
          :pt="{
            root: 'bg-accent-tint text-xs font-semibold text-brand ring-2 ring-brand',
          }"
        />
      </Button>

      <Menu
        id="profile_menu"
        ref="profileMenu"
        :model="profileMenuItems"
        popup
        aria-label="Profile actions"
        class="border-divider bg-surface shadow-popover mt-3 w-[264px] rounded-lg border p-1.5"
        data-testid="profile-menu"
      >
        <template #item="{ item, props: itemProps }">
          <RouterLink
            v-if="item.route"
            v-slot="{ href, navigate }"
            :to="item.route"
            custom
          >
            <a
              v-bind="itemProps.action"
              :href="href"
              class="text-text-dark hover:bg-app-bg focus-visible:outline-brand flex h-11 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2"
              data-testid="profile-menu-settings"
              @click="navigate"
            >
              <span
                class="bg-app-bg text-text-muted flex size-7 items-center justify-center rounded-sm"
                aria-hidden="true"
              >
                <svg
                  class="size-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                >
                  <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
                  <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.08A1.7 1.7 0 0 0 8.97 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1H3a2 2 0 1 1 0-4h.08A1.7 1.7 0 0 0 4.6 8.97a1.7 1.7 0 0 0-.34-1.88l-.06-.06A2 2 0 1 1 7.03 4.2l.06.06a1.7 1.7 0 0 0 1.88.34H9A1.7 1.7 0 0 0 10 3.08V3a2 2 0 1 1 4 0v.08a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.88V9c.3.6.91 1 1.56 1H21a2 2 0 1 1 0 4h-.08A1.7 1.7 0 0 0 19.4 15Z" />
                </svg>
              </span>
              <span>{{ item.label }}</span>
            </a>
          </RouterLink>

          <button
            v-else
            v-bind="itemProps.action"
            type="button"
            class="text-destructive hover:bg-app-bg focus-visible:outline-brand flex h-11 w-full items-center gap-2.5 rounded-md px-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2"
            data-testid="profile-menu-sign-out"
          >
            <span
              class="bg-status-error-bg text-destructive flex size-7 items-center justify-center rounded-sm"
              aria-hidden="true"
            >
              <svg
                class="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
            </span>
            <span>{{ item.label }}</span>
          </button>
        </template>
      </Menu>
    </div>
  </header>
</template>
