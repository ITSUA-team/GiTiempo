<script setup lang="ts">
import { computed, ref } from "vue";
import type {
  ProjectListResponse,
  ProjectResponse,
  WorkspaceMemberListResponse,
} from "@gitiempo/shared";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Select from "primevue/select";
import Tag from "primevue/tag";

import ProjectEditForm from "@/components/ProjectEditForm.vue";
import { adminProjectsClient } from "@/services/admin-projects-client";
import { useAuthStore } from "@/stores/auth";

const props = defineProps<{
  projects: ProjectListResponse;
  members: WorkspaceMemberListResponse;
  loading: boolean;
}>();

const emit = defineEmits<{
  "edit-saved": [];
  archive: [];
  unarchive: [];
}>();

const authStore = useAuthStore();
const expandedRows = ref<Record<string, boolean>>({});
const selectedMemberId = ref<string | null>(null);

const memberFilterOptions = computed(() =>
  props.members.map((m) => ({
    label: m.displayName ?? m.email,
    value: m.userId,
  })),
);

const filteredProjects = computed(() => {
  if (!selectedMemberId.value) {
    return props.projects;
  }

  return props.projects.filter((p) =>
    p.members.some((m) => m.userId === selectedMemberId.value),
  );
});

function handleEdit(project: ProjectResponse): void {
  if (expandedRows.value[project.id]) {
    const next = { ...expandedRows.value };
    delete next[project.id];
    expandedRows.value = next;
  } else {
    expandedRows.value = { [project.id]: true };
  }
}

function collapseRow(project: ProjectResponse): void {
  const next = { ...expandedRows.value };
  delete next[project.id];
  expandedRows.value = next;
}

function handleEditSaved(project: ProjectResponse): void {
  collapseRow(project);
  emit("edit-saved");
}

function handleEditCancelled(project: ProjectResponse): void {
  collapseRow(project);
}

async function handleArchive(project: ProjectResponse): Promise<void> {
  const token = authStore.accessToken;
  if (!token) return;
  await adminProjectsClient.updateProject(token, project.id, { isActive: false });
  emit("archive");
}

async function handleUnarchive(project: ProjectResponse): Promise<void> {
  const token = authStore.accessToken;
  if (!token) return;
  await adminProjectsClient.updateProject(token, project.id, { isActive: true });
  emit("unarchive");
}

function formatSource(source: string): string {
  return source === "github" ? "GitHub Repo" : "Manual";
}
</script>

<template>
  <!-- Section title + member filter -->
  <div class="flex items-center justify-between">
    <h2
      class="text-[18px] font-semibold"
      style="color: #1a1a1a;"
    >
      Projects Table
    </h2>
    <div class="flex flex-col gap-1.5">
      <label
        for="member-filter"
        class="text-[12px] font-medium"
        style="color: #666666;"
      >Assigned member</label>
      <Select
        id="member-filter"
        v-model="selectedMemberId"
        :options="memberFilterOptions"
        option-label="label"
        option-value="value"
        placeholder="All members"
        show-clear
        class="w-[260px]"
      />
    </div>
  </div>

  <!--
    Table shell: rounded border ($radius-sm=6px, $color-divider=#eeeeee)
    Header is plain HTML so zero PrimeVue interference.
    DataTable body uses :show-headers="false" to avoid duplicate / unstyled headers.
  -->
  <div style="border: 1px solid #eeeeee; border-radius: 6px; overflow: hidden;">
    <!-- Header row: exact design values — fill=$color-app-bg, height=44px, Inter 600 13px $color-text-dark -->
    <div
      style="
        display: flex;
        align-items: center;
        background-color: #f4f4f5;
        height: 44px;
        border-bottom: 1px solid #eeeeee;
        font-family: 'Inter', sans-serif;
        font-size: 13px;
        font-weight: 600;
        color: #1a1a1a;
      "
    >
      <div style="flex: 1; padding: 0 12px;">
        Project
      </div>
      <div style="width: 140px; padding: 0 12px;">
        Source
      </div>
      <div style="width: 220px; padding: 0 12px;">
        Assigned members
      </div>
      <div style="width: 120px; padding: 0 12px;">
        Hours
      </div>
      <div style="width: 120px; padding: 0 12px;">
        Visibility
      </div>
      <div style="width: 150px; padding: 0 12px; text-align: right;">
        Actions
      </div>
    </div>

    <!-- Body: PrimeVue DataTable with headers suppressed -->
    <DataTable
      v-model:expanded-rows="expandedRows"
      :value="filteredProjects"
      :loading="loading"
      :show-headers="false"
      data-key="id"
      class="gt-projects-table"
      :pt="{
        rowExpansion: { style: 'height: auto;' },
      }"
    >
      <Column>
        <template #body="{ data }">
          <span
            class="text-[14px] leading-none font-semibold"
            :class="data.isActive ? '' : 'text-text-muted'"
            :style="data.isActive ? 'color: #1a1a1a;' : ''"
          >{{ data.name }}</span>
        </template>
      </Column>

      <Column style="width: 140px">
        <template #body="{ data }">
          <span style="font-size: 13px; font-weight: 400; color: #666666;">{{ formatSource(data.source) }}</span>
        </template>
      </Column>

      <Column style="width: 220px">
        <template #body="{ data }">
          <span style="font-size: 13px; font-weight: 400; color: #666666;">{{ data.members.length }} members</span>
        </template>
      </Column>

      <Column style="width: 120px">
        <template #body="{ data }">
          <span style="font-size: 13px; font-weight: 600; color: #1a1a1a;">{{ data.totalHours }}h</span>
        </template>
      </Column>

      <Column style="width: 120px">
        <template #body="{ data }">
          <template v-if="data.isActive">
            <Tag
              v-if="data.visibility === 'public'"
              value="Public"
              :pt="{
                root: 'inline-flex items-center rounded-[6px] bg-accent-tint px-2 py-1 text-[12px] font-semibold leading-none text-brand',
              }"
            />
            <Tag
              v-else
              value="Private"
              :pt="{
                root: 'inline-flex items-center rounded-[6px] bg-status-warn-bg px-2 py-1 text-[12px] font-semibold leading-none text-status-warn-text',
              }"
            />
          </template>
          <Tag
            v-else
            :value="data.visibility === 'public' ? 'Public' : 'Private'"
            :pt="{
              root: 'inline-flex items-center rounded-[6px] px-2 py-1 text-[12px] font-semibold leading-none',
              label: 'text-[#666666]',
            }"
            style="background-color: #eeeeee;"
          />
        </template>
      </Column>

      <Column style="width: 150px">
        <template #body="{ data }">
          <div class="flex items-center justify-end gap-2">
            <template v-if="data.isActive">
              <button
                type="button"
                style="cursor: pointer; border: none; background: transparent; padding: 4px 6px; border-radius: 4px; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; color: #5d2b85; line-height: 1;"
                @click="handleEdit(data)"
              >
                Edit
              </button>
              <button
                type="button"
                style="cursor: pointer; border: none; background: transparent; padding: 4px 6px; border-radius: 4px; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; color: #d32f2f; line-height: 1;"
                @click="handleArchive(data)"
              >
                Archive
              </button>
            </template>
            <template v-else>
              <button
                type="button"
                style="cursor: pointer; border: none; background: transparent; padding: 4px 6px; border-radius: 4px; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; color: #666666; line-height: 1;"
                @click="handleUnarchive(data)"
              >
                Unarchive
              </button>
            </template>
          </div>
        </template>
      </Column>

      <template #expansion="{ data }">
        <ProjectEditForm
          :project="data"
          :all-members="members"
          @saved="handleEditSaved(data)"
          @cancelled="handleEditCancelled(data)"
        />
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
/* Strip ALL PrimeVue DataTable default chrome — borders, backgrounds, padding */
:deep(.gt-projects-table.p-datatable) {
  background: transparent !important;
  border: none !important;
  border-radius: 0 !important;
}

:deep(.gt-projects-table .p-datatable-table-container) {
  border: none !important;
  border-radius: 0 !important;
  overflow: visible !important;
}

:deep(.gt-projects-table table) {
  border-collapse: collapse !important;
  width: 100% !important;
}

/* Body rows: height 56px, no background */
:deep(.gt-projects-table .p-datatable-tbody > tr:not(.p-datatable-row-expansion)) {
  height: 56px !important;
  background: transparent !important;
}

:deep(.gt-projects-table .p-datatable-tbody > tr:not(.p-datatable-row-expansion):hover) {
  background: transparent !important;
}

/* Body cells (data rows only): padding [0,12], top border */
:deep(.gt-projects-table .p-datatable-tbody > tr:not(.p-datatable-row-expansion) > td) {
  padding: 0 12px !important;
  border: none !important;
  border-top: 1px solid #eeeeee !important;
  vertical-align: middle !important;
  font-family: "Inter", sans-serif !important;
}

/* Expansion row: auto height, no height constraint */
:deep(.gt-projects-table .p-datatable-row-expansion) {
  height: auto !important;
}

/* Expansion cell: zero padding, flush edge-to-edge */
:deep(.gt-projects-table .p-datatable-row-expansion > td) {
  padding: 0 !important;
  border: none !important;
  border-top: 1px solid #eeeeee !important;
}
</style>
