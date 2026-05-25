<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  useTemplateRef,
  type Component,
} from "vue";
import type { RouteLocationRaw } from "vue-router";
import { RouterLink } from "vue-router";
import Avatar from "primevue/avatar";
import Button from "primevue/button";
import Menu from "primevue/menu";

type ProfileMenuItem = {
  destructive?: boolean;
  href?: string;
  key: string;
  label: string;
  route?: RouteLocationRaw;
};

type ProfileMenuSlotItem = {
  destructive?: boolean;
  key?: string;
};

const props = withDefaults(
  defineProps<{
    counterpartHref: string;
    counterpartLabel: string;
    displayName: string;
    productName?: string;
    settingsIcon?: Component;
    settingsLabel?: string;
    settingsTo: RouteLocationRaw;
    userInitials: string;
    workspaceName: string;
    workspaceShortName?: string;
  }>(),
  {
    productName: "GiTiempo",
    settingsIcon: undefined,
    settingsLabel: "Settings",
    workspaceShortName: "GT",
  },
);

const emit = defineEmits<{
  signOut: [];
}>();

const profileMenuRegion = useTemplateRef<HTMLElement>("profileMenuRegion");
const isProfileMenuOpen = shallowRef(false);

const profileTriggerRootClass = computed(() =>
  [
    "focus-visible:outline-brand flex h-10 items-center gap-3 rounded-lg border px-1.5 py-1 transition focus-visible:outline-2 focus-visible:outline-offset-2",
    isProfileMenuOpen.value
      ? "border-divider bg-surface"
      : "border-transparent bg-transparent hover:bg-app-bg",
  ].join(" "),
);

const profileAvatarRootClass = computed(() =>
  [
    "bg-accent-tint text-xs font-semibold text-brand",
    isProfileMenuOpen.value ? "ring-2 ring-brand" : "",
  ]
    .filter(Boolean)
    .join(" "),
);

const profileMenuItems = computed<(ProfileMenuItem | { separator: true })[]>(() => [
  {
    href: props.counterpartHref,
    key: "workspace",
    label: props.counterpartLabel,
  },
  {
    key: "settings",
    label: props.settingsLabel,
    route: props.settingsTo,
  },
  {
    separator: true,
  },
  {
    command: () => {
      closeProfileMenu({ restoreFocus: true });
      emit("signOut");
    },
    destructive: true,
    key: "sign-out",
    label: "Sign out",
  },
]);

function focusProfileTrigger(): void {
  profileMenuRegion.value
    ?.querySelector<HTMLElement>('[aria-controls="profile_menu"]')
    ?.focus();
}

function closeProfileMenu(options: { restoreFocus?: boolean } = {}): void {
  isProfileMenuOpen.value = false;

  if (options.restoreFocus) {
    focusProfileTrigger();
  }
}

function toggleProfileMenu(): void {
  isProfileMenuOpen.value = !isProfileMenuOpen.value;
}

function handleDocumentClick(event: MouseEvent): void {
  if (!isProfileMenuOpen.value) return;

  const target = event.target;

  if (target instanceof Node && profileMenuRegion.value?.contains(target)) return;

  closeProfileMenu();
}

function handleDocumentKeydown(event: KeyboardEvent): void {
  if (!isProfileMenuOpen.value || event.key !== "Escape") return;

  event.preventDefault();
  closeProfileMenu({ restoreFocus: true });
}

function handleSettingsClick(
  navigate: CallableFunction,
  event: MouseEvent,
): void {
  navigate(event);
  closeProfileMenu({ restoreFocus: true });
}

function getMenuActionClass(item: ProfileMenuSlotItem): string {
  return [
    "hover:bg-app-bg focus-visible:outline-brand flex h-11 items-center gap-2.5 rounded-md px-2.5 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2",
    item.key === "workspace" ? "text-brand font-semibold" : "",
    item.key === "settings" ? "text-text-dark font-medium" : "",
    item.destructive ? "text-destructive font-semibold" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function getMenuIconClass(item: ProfileMenuSlotItem): string {
  return [
    "flex size-7 items-center justify-center rounded-sm",
    item.key === "workspace" ? "bg-accent-tint text-brand" : "",
    item.key === "settings" ? "bg-app-bg text-text-muted" : "",
    item.destructive ? "bg-status-error-bg text-destructive" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function getMenuActionTestId(item: ProfileMenuSlotItem): string {
  if (item.key === "workspace") return "profile-menu-counterpart";
  if (item.key === "settings") return "profile-menu-settings";

  return "profile-menu-sign-out";
}

onMounted(() => {
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", handleDocumentKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleDocumentClick);
  document.removeEventListener("keydown", handleDocumentKeydown);
});
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

    <div
      ref="profileMenuRegion"
      class="relative flex items-center gap-3"
    >
      <Button
        type="button"
        aria-controls="profile_menu"
        :aria-expanded="isProfileMenuOpen"
        aria-haspopup="menu"
        aria-label="Open profile menu"
        data-testid="profile-menu-trigger"
        variant="text"
        :pt="{
          root: {
            class: profileTriggerRootClass,
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
          data-testid="profile-avatar"
          aria-hidden="true"
          :pt="{
            root: {
              class: profileAvatarRootClass,
            },
          }"
        />
      </Button>

      <Menu
        v-if="isProfileMenuOpen"
        id="profile_menu"
        :model="profileMenuItems"
        aria-label="Profile actions"
        class="border-divider bg-surface shadow-popover before:border-divider before:bg-surface absolute top-full right-0 mt-3 w-[264px] rounded-lg border p-1.5 before:absolute before:-top-1.5 before:right-5 before:size-3 before:rotate-45 before:border-t before:border-l before:content-['']"
        data-testid="profile-menu"
      >
        <template #item="{ item, props: itemProps }">
          <a
            v-if="item.href"
            v-bind="itemProps.action"
            :href="item.href"
            :class="getMenuActionClass(item)"
            :data-testid="getMenuActionTestId(item)"
            @click="closeProfileMenu()"
          >
            <span
              :class="getMenuIconClass(item)"
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
                <path d="M8 7h12" />
                <path d="m16 3 4 4-4 4" />
                <path d="M16 17H4" />
                <path d="m8 21-4-4 4-4" />
              </svg>
            </span>
            <span>{{ item.label }}</span>
          </a>

          <RouterLink
            v-else-if="item.route"
            v-slot="{ href, navigate }"
            :to="item.route"
            custom
          >
            <a
              v-bind="itemProps.action"
              :href="href"
              :class="getMenuActionClass(item)"
              :data-testid="getMenuActionTestId(item)"
              @click="handleSettingsClick(navigate, $event)"
            >
              <span
                :class="getMenuIconClass(item)"
                aria-hidden="true"
              >
                <component
                  :is="props.settingsIcon"
                  v-if="props.settingsIcon"
                  class="size-4"
                />
                <svg
                  v-else
                  class="size-4"
                  data-testid="profile-menu-settings-icon"
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

          <a
            v-else
            v-bind="itemProps.action"
            :class="getMenuActionClass(item)"
            :data-testid="getMenuActionTestId(item)"
          >
            <span
              :class="getMenuIconClass(item)"
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
          </a>
        </template>
      </Menu>
    </div>
  </header>
</template>
