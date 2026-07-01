<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  useTemplateRef,
  useSlots,
  type Component,
} from "vue";
import type { CurrentUserWorkspaceMembershipResponse } from "@gitiempo/shared";
import type { RouteLocationRaw } from "vue-router";
import { RouterLink } from "vue-router";
import Avatar from "primevue/avatar";
import Button from "primevue/button";
import Menu from "primevue/menu";
import type { MenuItem as PrimeMenuItem } from "primevue/menuitem";
import {
  getWorkspaceRoleLabel,
  getWorkspaceSwitchStatus,
  getWorkspaceSwitchStatusLabel,
  isWorkspaceSwitchDisabled,
} from "./workspace-membership-display";

type WorkspaceMembershipMenuItem = PrimeMenuItem & {
  command?: () => void;
  isCurrent: boolean;
  isSwitching: boolean;
  label: string;
  roleLabel: string;
  type: "workspace-membership";
  workspaceId: string;
};

type CounterpartMenuItem = PrimeMenuItem & {
  href: string;
  label: string;
  type: "counterpart";
};

type SettingsMenuItem = PrimeMenuItem & {
  label: string;
  route: RouteLocationRaw;
  type: "settings";
};

type SignOutMenuItem = PrimeMenuItem & {
  command: () => void;
  label: string;
  type: "sign-out";
};

type ProfileMenuItem =
  | WorkspaceMembershipMenuItem
  | CounterpartMenuItem
  | SettingsMenuItem
  | SignOutMenuItem;

type ProfileMenuEntry = ProfileMenuItem | (PrimeMenuItem & { separator: true });

type CenterContentAlign = "center" | "end";

const props = withDefaults(
  defineProps<{
    counterpartHref: string;
    counterpartLabel: string;
    centerContentAlign?: CenterContentAlign;
    displayName: string;
    pageName?: string;
    productName?: string;
    profileContextLabel?: string;
    settingsIcon?: Component;
    settingsLabel?: string;
    showDisplayName?: boolean;
    showSettings?: boolean;
    settingsTo: RouteLocationRaw;
    switchingWorkspaceId?: string | null;
    userInitials: string;
    workspaceMemberships?: CurrentUserWorkspaceMembershipResponse[];
    workspaceName: string;
    workspaceShortName?: string;
  }>(),
  {
    centerContentAlign: "center",
    pageName: undefined,
    productName: "GiTiempo",
    profileContextLabel: undefined,
    settingsIcon: undefined,
    settingsLabel: "Settings",
    showDisplayName: false,
    showSettings: true,
    switchingWorkspaceId: null,
    workspaceMemberships: () => [],
    workspaceShortName: "GT",
  },
);

const slots = useSlots();
const hasCenterSlot = computed(() => Boolean(slots.center));
const normalizedPageName = computed(() => props.pageName?.trim() ?? "");
const hasPageName = computed(() => normalizedPageName.value.length > 0);

const emit = defineEmits<{
  signOut: [];
  switchWorkspace: [workspaceId: string];
}>();

const profileMenuRegion = useTemplateRef<HTMLElement>("profileMenuRegion");
const isProfileMenuOpen = ref(false);
const profileTriggerLabel = computed(
  () => `Open profile menu for ${props.displayName}`,
);
const openProfileTriggerClass =
  "ring-divider bg-surface-primary h-10 gap-3 rounded-lg px-1.5 py-1 ring-1 ring-inset";

const profileTriggerRootClass = computed(() =>
  [
    "focus-visible:outline-brand flex items-center justify-center transition focus-visible:outline-2 focus-visible:outline-offset-2",
    isProfileMenuOpen.value
      ? openProfileTriggerClass
      : "size-8 rounded-full border-0 bg-transparent p-0 hover:bg-app-bg",
  ].join(" "),
);

const profileAvatarRootClass = computed(() =>
  [
    "bg-accent-tint text-brand flex items-center justify-center rounded-full text-xs font-semibold leading-[14px]",
    isProfileMenuOpen.value ? "border-2 border-brand" : "border-0",
  ]
    .filter(Boolean)
    .join(" "),
);

const centerRowContentClass = computed(() =>
  [
    "flex w-full",
    props.centerContentAlign === "end"
      ? "justify-start sm:justify-end"
      : "justify-start sm:justify-center",
  ].join(" "),
);

const profileMenuItems = computed<ProfileMenuEntry[]>(() => {
  const items: ProfileMenuEntry[] = [];

  if (props.workspaceMemberships.length > 1) {
    items.push(
      ...props.workspaceMemberships.map((membership) => ({
        command:
          isWorkspaceSwitchDisabled(membership, props.switchingWorkspaceId)
            ? undefined
            : () => emit("switchWorkspace", membership.workspaceId),
        isCurrent: membership.isCurrent,
        isSwitching:
          getWorkspaceSwitchStatus(membership, props.switchingWorkspaceId) ===
          "switching",
        label: membership.workspaceName,
        roleLabel: getWorkspaceRoleLabel(membership.role),
        type: "workspace-membership" as const,
        workspaceId: membership.workspaceId,
      })),
      {
        separator: true,
      },
    );
  }

  items.push({
    href: props.counterpartHref,
    label: props.counterpartLabel,
    type: "counterpart",
  });

  if (props.showSettings) {
    items.push({
      label: props.settingsLabel,
      route: props.settingsTo,
      type: "settings",
    });
  }

  items.push(
    {
      separator: true,
    },
    {
      command: () => {
        closeProfileMenu({ restoreFocus: true });
        emit("signOut");
      },
      label: "Sign out",
      type: "sign-out",
    },
  );

  return items;
});

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
  // eslint-disable-next-line no-unused-vars
  navigate: (...args: [MouseEvent]) => void,
  event: MouseEvent,
): void {
  navigate(event);
  closeProfileMenu({ restoreFocus: true });
}

function toProfileMenuItem(item: PrimeMenuItem): ProfileMenuItem {
  switch (item.type) {
    case "workspace-membership":
    case "counterpart":
    case "settings":
    case "sign-out":
      return item as ProfileMenuItem;
    default:
      throw new Error(`Unhandled profile menu item type: ${String(item.type)}`);
  }
}

function toWorkspaceMembershipMenuItem(
  item: PrimeMenuItem,
): WorkspaceMembershipMenuItem {
  const profileMenuItem = toProfileMenuItem(item);

  if (profileMenuItem.type !== "workspace-membership") {
    throw new Error(
      `Expected workspace membership item, received ${profileMenuItem.type}`,
    );
  }

  return profileMenuItem;
}

function getWorkspaceStatusLabel(item: PrimeMenuItem): string | null {
  const workspaceItem = toWorkspaceMembershipMenuItem(item);

  return getWorkspaceSwitchStatusLabel(
    workspaceItem.isSwitching
      ? "switching"
      : workspaceItem.isCurrent
        ? "current"
        : "available",
  );
}

function getMenuActionClass(item: PrimeMenuItem): string {
  const baseClass =
    "hover:bg-app-bg focus-visible:outline-brand flex w-full min-w-0 min-h-11 gap-2.5 rounded-md px-2.5 py-2 text-left text-sm leading-[17px] transition focus-visible:outline-2 focus-visible:outline-offset-2";
  const profileMenuItem = toProfileMenuItem(item);

  switch (profileMenuItem.type) {
    case "workspace-membership":
      return `${baseClass} items-start ${profileMenuItem.isCurrent ? "text-brand font-semibold" : "text-text-dark font-medium"}`;
    case "counterpart":
      return `${baseClass} items-center text-brand font-semibold`;
    case "settings":
      return `${baseClass} items-center text-text-dark font-medium`;
    case "sign-out":
      return `${baseClass} items-center text-destructive font-semibold`;
  }
}

function getMenuIconClass(item: PrimeMenuItem): string {
  const baseClass = "flex size-7 items-center justify-center rounded-sm";
  const profileMenuItem = toProfileMenuItem(item);

  switch (profileMenuItem.type) {
    case "workspace-membership":
      return `${baseClass} ${profileMenuItem.isCurrent ? "bg-accent-tint text-brand" : "bg-app-bg text-text-muted"}`;
    case "counterpart":
      return `${baseClass} bg-accent-tint text-brand`;
    case "settings":
      return `${baseClass} bg-app-bg text-text-muted`;
    case "sign-out":
      return `${baseClass} bg-status-error-bg text-destructive`;
  }
}

function getMenuActionTestId(item: PrimeMenuItem): string {
  const profileMenuItem = toProfileMenuItem(item);

  switch (profileMenuItem.type) {
    case "workspace-membership":
      return `profile-menu-workspace-${profileMenuItem.workspaceId}`;
    case "counterpart":
      return "profile-menu-counterpart";
    case "settings":
      return "profile-menu-settings";
    case "sign-out":
      return "profile-menu-sign-out";
  }
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
    class="bg-surface-primary after:bg-divider sticky top-0 z-20 grid grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[4rem_auto] items-center gap-x-4 px-4 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:content-[''] sm:h-16 sm:grid-rows-1 sm:px-6"
  >
    <div class="row-start-1 flex min-w-0 items-center gap-3">
      <div
        class="bg-accent-tint text-brand flex size-8 items-center justify-center rounded-lg text-xs leading-[14px] font-semibold"
      >
        {{ props.workspaceShortName }}
      </div>
      <div
        v-if="hasPageName"
        class="flex min-w-0 items-center gap-2"
        data-testid="workspace-header-breadcrumb"
      >
        <p class="text-base font-semibold">
          {{ props.productName }}
        </p>

        <span class="text-text-muted text-[13px] font-medium">/</span>

        <p class="text-text-dark truncate text-[13px] font-semibold">
          {{ normalizedPageName }}
        </p>
      </div>

      <div
        v-else
        class="flex flex-col gap-0.5"
      >
        <p class="text-base font-semibold">
          {{ props.productName }}
        </p>
      </div>
    </div>

    <div
      v-if="hasCenterSlot"
      class="col-span-3 row-start-2 -mx-4 min-w-0 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:mx-0"
      data-testid="workspace-header-center-row"
    >
      <div
        :class="centerRowContentClass"
        data-testid="workspace-header-center-content"
      >
        <slot name="center" />
      </div>
    </div>

    <div
      ref="profileMenuRegion"
      class="relative col-start-3 row-start-1 flex items-center gap-3"
      data-testid="profile-menu-region"
    >
      <span
        v-if="props.profileContextLabel && !isProfileMenuOpen"
        class="text-text-muted hidden text-right text-[13px] leading-4 font-medium sm:block"
      >
        {{ props.profileContextLabel }}
      </span>

      <Button
        unstyled
        type="button"
        aria-controls="profile_menu"
        :aria-expanded="isProfileMenuOpen"
        aria-haspopup="menu"
        :aria-label="profileTriggerLabel"
        :class="profileTriggerRootClass"
        data-testid="profile-menu-trigger"
        @click="toggleProfileMenu"
      >
        <span
          v-if="props.profileContextLabel && isProfileMenuOpen"
          class="text-text-muted hidden text-right text-[13px] leading-4 font-medium sm:block"
        >
          {{ props.profileContextLabel }}
        </span>
        <span
          v-else-if="props.showDisplayName"
          class="text-text-dark hidden text-right text-[13px] font-medium sm:block"
        >
          {{ props.displayName }}
        </span>
        <Avatar
          unstyled
          :label="props.userInitials"
          shape="circle"
          class="size-8"
          data-testid="profile-avatar"
          aria-hidden="true"
          :pt="{
            root: {
              class: profileAvatarRootClass,
            },
            label: {
              class: 'leading-[14px]',
            },
          }"
        />
      </Button>

      <Menu
        v-if="isProfileMenuOpen"
        id="profile_menu"
        unstyled
        :model="profileMenuItems"
        aria-label="Profile actions"
        class="ring-divider bg-surface-primary shadow-popover before:ring-divider before:bg-surface-primary absolute top-full right-0 z-30 mt-5 max-h-[calc(100vh-6rem)] w-[320px] max-w-[calc(100vw-1rem)] overflow-x-hidden overflow-y-auto rounded-lg p-1.5 ring-1 ring-inset before:absolute before:top-0 before:right-4 before:size-3 before:rotate-45 before:ring-1 before:content-[''] before:ring-inset"
        data-testid="profile-menu"
        :pt="{
          list: 'm-0 flex list-none flex-col gap-1 p-0',
          item: 'm-0 p-0',
          separator: 'bg-divider my-0 h-px border-0',
        }"
      >
        <template #item="{ item, props: itemProps }">
          <a
            v-if="item.type === 'counterpart'"
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

          <button
            v-else-if="item.type === 'workspace-membership'"
            v-bind="itemProps.action"
            type="button"
            :aria-current="item.isCurrent ? 'true' : undefined"
            :disabled="item.isCurrent || item.isSwitching || props.switchingWorkspaceId !== null"
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
                <path d="M6 7h12" />
                <path d="M9 12h9" />
                <path d="M12 17h6" />
              </svg>
            </span>
            <span class="flex min-w-0 flex-1 items-start justify-between gap-3">
              <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                <span class="block text-left leading-5 break-words whitespace-normal">
                  {{ item.label }}
                </span>
                <span class="text-text-muted block text-left text-xs font-medium">
                  {{ item.roleLabel }}
                </span>
              </span>
              <span
                v-if="getWorkspaceStatusLabel(item)"
                class="text-text-muted shrink-0 text-xs font-semibold"
                data-testid="profile-menu-workspace-status"
              >
                {{ getWorkspaceStatusLabel(item) }}
              </span>
            </span>
          </button>

          <RouterLink
            v-else-if="item.type === 'settings'"
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
