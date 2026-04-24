<script setup lang="ts">
import { getUserWorkspaceHref } from "@/lib/workspace-link";

const userWorkspaceHref = getUserWorkspaceHref();
</script>

<template>
  <div class="min-h-screen bg-app-bg text-text-dark">
    <div class="mx-auto flex min-h-screen max-w-[1280px] flex-col lg:flex-row">
      <section
        class="flex flex-1 flex-col justify-between bg-surface px-6 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-tint text-sm font-semibold text-brand"
          >
            GT
          </div>
          <div class="flex flex-col gap-0.5">
            <p class="text-lg font-semibold text-text-dark">
              GiTiempo
            </p>
            <p class="text-[13px] text-text-muted">
              Admin workspace access
            </p>
          </div>
        </div>

        <div class="flex max-w-[520px] flex-col gap-5 py-12 lg:py-0">
          <h1 class="text-[40px] font-semibold leading-[1.1] text-text-dark">
            Manage reporting, members, and projects in one workspace.
          </h1>
          <p class="max-w-[34rem] text-base leading-7 text-text-muted">
            This route is reserved for the admin login and bootstrap flow. It
            exists now so protected admin routes can resolve through a stable,
            auth-aware entry point.
          </p>
        </div>

        <div class="flex flex-wrap gap-4 text-xs font-medium text-text-muted">
          <span>Guest-only admin entry</span>
          <span>Shared auth direction with user-web</span>
          <a
            :href="userWorkspaceHref"
            class="text-brand transition hover:underline"
          >
            Need time tracking? Open the user workspace.
          </a>
        </div>
      </section>

      <section
        class="flex w-full items-center justify-center bg-app-bg px-6 py-8 sm:px-10 sm:py-10 lg:w-[520px] lg:px-12 lg:py-12"
      >
        <div class="w-full rounded-[10px] bg-surface p-6 shadow-card">
          <div class="flex flex-col gap-5">
            <div class="flex flex-col gap-[6px]">
              <p class="text-[28px] font-semibold text-text-dark">
                Admin sign in
              </p>
              <p class="text-sm text-text-muted">
                Final Firebase-backed admin login behavior will be implemented
                in a follow-up auth change.
              </p>
            </div>

            <div
              class="rounded-sm border border-divider bg-app-bg px-4 py-4 text-sm leading-6 text-text-muted"
            >
              The route map and auth-aware entry structure are now in place so
              future admin auth work can mount against a stable login path and
              protected shell.
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
