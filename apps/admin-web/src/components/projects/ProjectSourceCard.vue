<template>
  <div
    class="flex w-[320px] shrink-0 flex-col gap-[14px] rounded-[10px] bg-white p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.08)]"
  >
    <!-- Title -->
    <h3 class="text-text-dark text-[18px] font-semibold">Project Source</h3>

    <!-- Copy -->
    <p class="text-text-muted text-[13px] font-normal leading-snug">
      Projects can come from connected workspaces or be added manually. This
      screen covers the manual path.
    </p>

    <!-- Manual project option (highlighted / active) -->
    <div
      class="border-brand flex flex-col gap-2 rounded-[10px] border bg-[#F7F2FC] p-[14px]"
    >
      <span class="text-text-dark text-[14px] font-semibold"
        >Manual project</span
      >
      <p class="text-text-muted text-[13px] font-normal leading-snug">
        Use this when a project is internal, still being prepared, or not
        available through a workspace import yet.
      </p>
    </div>

    <!-- Workspace import option (inactive) -->
    <div class="bg-app-bg flex flex-col gap-2 rounded-[10px] p-[14px]">
      <span class="text-text-dark text-[14px] font-semibold"
        >Workspace import</span
      >
      <p class="text-text-muted text-[13px] font-normal leading-snug">
        Use imports when the project already exists in a connected workspace and
        should keep its external context.
      </p>
    </div>

    <!-- Footer note -->
    <p class="text-text-muted text-[12px] font-normal leading-snug">
      You can still assign the PM, set visibility, and adjust project details
      after creation.
    </p>
  </div>
</template>
