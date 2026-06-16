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
    class="hidden h-auto w-full flex-1 flex-col justify-between px-[52px] py-[56px] text-white lg:flex"
    data-testid="register-desktop-intro"
  >
    <div class="flex flex-col gap-8">
      <div class="flex items-center gap-3">
        <div class="flex size-10 items-center justify-center rounded-xl bg-white/14 text-sm font-semibold">
          GT
        </div>
        <div class="flex flex-col gap-0.5">
          <p class="text-[18px] font-semibold">
            GiTiempo
          </p>
          <p class="text-[13px] text-white/80">
            New workspace owner setup
          </p>
        </div>
      </div>

      <div class="flex max-w-[396px] flex-col gap-4">
        <h1 class="text-[40px] leading-[1.1] font-semibold">
          Create the first workspace owner account.
        </h1>
        <p class="text-sm leading-6 text-white/80">
          Register the first owner account, name the workspace, then continue straight into the dashboard.
        </p>
      </div>

      <div class="flex max-w-[396px] flex-col gap-3">
        <article
          v-for="step in desktopSteps"
          :key="step.title"
          class="rounded-lg border border-white/16 bg-white/10 px-4 py-4"
        >
          <div class="flex flex-col gap-1.5">
            <p class="text-sm font-semibold text-white">
              {{ step.title }}
            </p>
            <p class="text-[13px] leading-6 text-white/78">
              {{ step.description }}
            </p>
          </div>
        </article>
      </div>
    </div>

    <div class="flex max-w-[396px] flex-col gap-2">
      <p class="text-[13px] font-semibold text-white">
        Owner registration
      </p>
      <p class="text-[13px] leading-6 text-white/72">
        This flow creates the first workspace owner only. Existing members continue to join through invites.
      </p>
    </div>
  </section>

  <section
    v-if="showMobile"
    class="bg-brand flex flex-col gap-[18px] px-6 py-7 text-white lg:hidden"
    data-testid="register-mobile-hero"
  >
    <div class="flex items-center gap-2.5">
      <div class="text-brand flex size-[34px] items-center justify-center rounded-[9px] bg-white text-sm font-semibold">
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
      <p class="text-sm leading-6 text-white/82">
        Register the first owner account, then invite the rest of your team.
      </p>
    </div>
  </section>
</template>
