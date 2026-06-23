<script setup lang="ts">
withDefaults(
  defineProps<{
    showDesktop?: boolean;
    showMobile?: boolean;
  }>(),
  {
    showDesktop: true,
    showMobile: true,
  },
);

const desktopSteps = [
  {
    description: "Create the first owner account for the workspace.",
    title: "Create owner account",
  },
  {
    description: "Choose the workspace name your team will use across the app.",
    title: "Name the workspace",
  },
  {
    description: "Land in the dashboard with a normal signed-in workspace session.",
    title: "Continue to dashboard",
  },
] as const;
</script>

<template>
  <section
    v-if="showDesktop"
    class="text-text-inverse hidden h-auto w-full flex-1 flex-col justify-between px-[52px] py-[56px] lg:flex"
    data-testid="register-desktop-intro"
  >
    <div class="flex flex-col gap-8">
      <div class="flex items-center gap-3">
        <div class="bg-surface-primary/14 flex size-10 items-center justify-center rounded-xl text-sm font-semibold">
          GT
        </div>
        <div class="flex flex-col gap-0.5">
          <p class="text-[18px] font-semibold">
            GiTiempo
          </p>
          <p class="text-text-inverse/80 text-[13px]">
            New workspace owner setup
          </p>
        </div>
      </div>

      <div class="flex max-w-[396px] flex-col gap-4">
        <h1 class="text-[40px] leading-[1.1] font-semibold">
          Create the first workspace owner account.
        </h1>
        <p class="text-text-inverse/80 text-sm leading-6">
          Register the first owner account, name the workspace, then continue straight into the dashboard.
        </p>
      </div>

      <div class="flex max-w-[396px] flex-col gap-3">
        <article
          v-for="step in desktopSteps"
          :key="step.title"
          class="border-surface-primary/16 bg-surface-primary/10 rounded-lg border px-4 py-4"
        >
          <div class="flex flex-col gap-1.5">
            <p class="text-text-inverse text-sm font-semibold">
              {{ step.title }}
            </p>
            <p class="text-text-inverse/78 text-[13px] leading-6">
              {{ step.description }}
            </p>
          </div>
        </article>
      </div>
    </div>

    <div class="flex max-w-[396px] flex-col gap-2">
      <p class="text-text-inverse text-[13px] font-semibold">
        Owner registration
      </p>
      <p class="text-text-inverse/72 text-[13px] leading-6">
        This flow creates the first workspace owner only. Existing members continue to join through invites.
      </p>
    </div>
  </section>

  <section
    v-if="showMobile"
    class="bg-brand text-text-inverse flex flex-col gap-[18px] px-6 py-7 lg:hidden"
    data-testid="register-mobile-hero"
  >
    <div class="flex items-center gap-2.5">
      <div class="text-brand bg-surface-primary flex size-[34px] items-center justify-center rounded-[9px] text-sm font-semibold">
        GT
      </div>
      <p class="text-[15px] font-semibold">
        GiTiempo
      </p>
    </div>
    <div class="flex flex-col gap-3.5">
      <h1 class="text-[28px] leading-[1.12] font-bold">
        Create workspace
      </h1>
      <p class="text-text-inverse/82 text-sm leading-6">
        Register the first owner account, then invite the rest of your team.
      </p>
    </div>
  </section>
</template>
