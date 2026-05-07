<script setup lang="ts">
import { ref } from 'vue';
import type {
  ProjectResponse,
  ProjectVisibility,
  WorkspaceMemberListResponse,
} from '@gitiempo/shared';
import { Form, FormField } from '@primevue/forms';
import Button from 'primevue/button';
import MultiSelect from 'primevue/multiselect';
import Select from 'primevue/select';

import { adminProjectsClient } from '@/services/admin-projects-client';
import { useAuthStore } from '@/stores/auth';

const props = defineProps<{
  project: ProjectResponse;
  allMembers: WorkspaceMemberListResponse;
}>();

const emit = defineEmits<{
  saved: [updated: ProjectResponse];
  cancelled: [];
}>();

const authStore = useAuthStore();

const selectedMemberIds = ref<string[]>(
  props.project.members.map((m) => m.userId),
);

const selectedVisibility = ref<ProjectVisibility>(props.project.visibility);

const saving = ref(false);

const memberOptions = props.allMembers.map((m) => ({
  label: m.displayName ?? m.email,
  value: m.userId,
}));

const visibilityOptions = [
  { label: 'Public', value: 'public' as const },
  { label: 'Private', value: 'private' as const },
];

async function handleSave(): Promise<void> {
  const token = authStore.accessToken;

  if (!token) {
    return;
  }

  saving.value = true;

  try {
    const updated = await adminProjectsClient.updateProject(
      token,
      props.project.id,
      { visibility: selectedVisibility.value },
    );

    const currentMemberIds = new Set(
      props.project.members.map((m) => m.userId),
    );
    const nextMemberIds = new Set(selectedMemberIds.value);

    const toAdd = selectedMemberIds.value.filter(
      (id) => !currentMemberIds.has(id),
    );
    const toRemove = props.project.members
      .map((m) => m.userId)
      .filter((id) => !nextMemberIds.has(id));

    for (const userId of toAdd) {
      await adminProjectsClient.assignMember(token, props.project.id, userId);
    }

    for (const userId of toRemove) {
      await adminProjectsClient.removeAssignment(
        token,
        props.project.id,
        userId,
      );
    }

    emit('saved', updated);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Form @submit.prevent>
    <div class="edit-form-panel">
      <!-- "Project settings" — Inter 600 13px #1a1a1a -->
      <span class="edit-form-title">Project settings</span>

      <!--
        Fields row (y6fv74): horizontal flex, align-items=end, gap=10px
      -->
      <div class="edit-form-row">
        <!--
          Members field (SvnYS): flex:1, vertical, gap=6px
          Label: Inter 500 12px #1a1a1a
        -->
        <FormField
          name="members"
          class="edit-form-field edit-form-field--fill"
        >
          <label
            for="edit-members"
            class="edit-form-label"
            >Select members</label
          >
          <MultiSelect
            id="edit-members"
            v-model="selectedMemberIds"
            :options="memberOptions"
            option-label="label"
            option-value="value"
            placeholder="Select members"
            fluid
          />
        </FormField>

        <!--
          Visibility field (H0rt2): width=180px, vertical, gap=6px
          Label: Inter 500 12px #1a1a1a
        -->
        <FormField
          name="visibility"
          class="edit-form-field edit-form-field--180"
        >
          <label
            for="edit-visibility"
            class="edit-form-label"
            >Visibility</label
          >
          <Select
            id="edit-visibility"
            v-model="selectedVisibility"
            :options="visibilityOptions"
            option-label="label"
            option-value="value"
            fluid
          />
        </FormField>

        <!--
          Cancel (xMII9):
            fill=$color-surface(#fff), stroke=$color-divider(#eeeeee) 1px,
            cornerRadius=6px, padding=[8px, 14px], Inter 500 13px #1a1a1a
          → severity="secondary" outlined gives white bg + border
        -->
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          @click="emit('cancelled')"
        />

        <!--
          Save (Fq21c):
            fill=$color-brand(#5d2b85), cornerRadius=6px,
            padding=[8px, 14px], Inter 600 13px #ffffff
          → default primary Button matches this exactly
        -->
        <Button
          label="Save"
          :loading="saving"
          @click="handleSave"
        />
      </div>
    </div>
  </Form>
</template>

<style scoped>
/* Panel shell — exact design values, all inline so nothing overrides */
.edit-form-panel {
  background-color: #f4f4f5;
  border-top: 1px solid #eeeeee;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
}

/* "Project settings" label */
.edit-form-title {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1;
}

/* Fields row: horizontal, align bottom, gap 10px */
.edit-form-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

/* FormField wrapper: vertical stack, gap 6px */
.edit-form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.edit-form-field--fill {
  flex: 1;
}

.edit-form-field--180 {
  width: 180px;
}

/* Field labels: Inter 500 12px #1a1a1a */
.edit-form-label {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: #1a1a1a;
  line-height: 1;
}
</style>
