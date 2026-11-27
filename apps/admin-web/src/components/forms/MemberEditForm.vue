<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  WorkspaceRoles,
  type ProjectListResponse,
  type WorkspaceMemberResponse,
} from '@gitiempo/shared';
import { giTiempoSelectPt, giTiempoSelfAppendedMultiAutoCompleteDropdownPt } from '@gitiempo/web-config/theme';
import {
  DialogFooterActionGroups,
  EditFormPanel,
  WORKSPACE_ROLE_OPTIONS,
  memberAssignFormSchema,
} from '@gitiempo/web-shared';
import type { MemberAssignFormInput } from '@gitiempo/web-shared';
import { Form } from '@primevue/forms';
import { zodResolver } from '@primevue/forms/resolvers/zod';
import AutoComplete from 'primevue/autocomplete';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Select from 'primevue/select';
import type { MemberSettingsInput } from '@/lib/member-management';

const props = defineProps<{
  canAssignPm?: boolean;
  canRemove?: boolean;
  initialProjectIds?: string[] | undefined;
  member: WorkspaceMemberResponse;
  projects: ProjectListResponse;
  saving?: boolean;
}>();

const emit = defineEmits<{
  cancelled: [];
  remove: [];
  save: [input: MemberSettingsInput];
  'update:canViewInvoices': [value: boolean];
}>();

const resolver = zodResolver(memberAssignFormSchema);

const roleDraft = ref(props.member.role);
const roleChanged = computed(() => roleDraft.value !== props.member.role);
const canEditProjects = computed(() => props.canAssignPm && roleDraft.value !== WorkspaceRoles.Admin);
watch([() => props.member.id, () => props.member.role], () => {
  roleDraft.value = props.member.role;
});

const isPmMember = computed(() => props.member.role === WorkspaceRoles.PM);
const canViewInvoicesChecked = ref(props.member.canViewInvoices);

// The parent refreshes member data after the permission mutation (success or
// failure), replacing the member object. Watch the reference — not just the
// boolean — so a failed toggle that refreshes the same `canViewInvoices`
// value still reverts the local checkbox to the authoritative server state.
watch(
  () => props.member,
  (member) => {
    canViewInvoicesChecked.value = member.canViewInvoices;
  },
);

function handleCanViewInvoicesChange(value: unknown): void {
  const next = value === true;
  canViewInvoicesChecked.value = next;
  emit('update:canViewInvoices', next);
}

const activeProjects = computed(() => props.projects.filter((project) => project.isActive));
const activeProjectOptions = computed(() =>
  activeProjects.value.map((project) => ({ label: project.name, value: project.id })),
);
const projectSuggestions = ref<string[]>([]);
const assignedProjectIds = computed(() =>
  activeProjects.value
    .filter((project) =>
      project.members.some((projectMember) => projectMember.userId === props.member.userId),
    )
    .map((project) => project.id),
);
const initialValues = computed<MemberAssignFormInput>(() => ({
  projectIds: props.initialProjectIds ?? assignedProjectIds.value,
}));

interface AutoCompleteCompleteEvent {
  query: string;
}

function getProjectOptionLabel(projectId: string): string {
  return activeProjectOptions.value.find((option) => option.value === projectId)?.label ?? projectId;
}

function handleProjectComplete(event: AutoCompleteCompleteEvent): void {
  const query = event.query.trim().toLowerCase();

  projectSuggestions.value = activeProjectOptions.value
    .filter((option) => option.label.toLowerCase().includes(query))
    .map((option) => option.value);
}

function preventProjectSearchSubmit(event: KeyboardEvent): void {
  if (event.target instanceof HTMLInputElement && event.target.getAttribute('role') === 'combobox') {
    event.preventDefault();
  }
}

watch(
  activeProjectOptions,
  (options) => {
    projectSuggestions.value = options.map((option) => option.value);
  },
  { immediate: true },
);

function handleSave({
  valid,
  values,
}: {
  valid: boolean;
  values: Record<string, unknown>;
}): void {
  if (props.saving || (canEditProjects.value && !valid)) return;

  const input: MemberSettingsInput = {};
  if (roleChanged.value) input.role = roleDraft.value;
  if (canEditProjects.value) {
    const { projectIds } = values as MemberAssignFormInput;
    const original = assignedProjectIds.value;
    if (!roleChanged.value || projectIds.length !== original.length ||
      projectIds.some((id) => !original.includes(id))) {
      input.projectIds = projectIds;
    }
  }

  if (input.role || input.projectIds) emit('save', input);
}
</script>

<template>
  <EditFormPanel title="Member settings">
    <Form
      v-slot="$form"
      :resolver="resolver"
      :initial-values="initialValues"
      @submit="handleSave"
    >
      <div
        data-testid="member-edit-form-layout"
        class="flex flex-col gap-3"
      >
        <dl class="grid gap-3 sm:grid-cols-2">
          <div>
            <dt class="text-text-dark text-xs font-medium">
              Name
            </dt>
            <dd>{{ member.displayName || '—' }}</dd>
          </div>
          <div>
            <dt class="text-text-dark text-xs font-medium">
              Email
            </dt>
            <dd class="break-all">
              {{ member.email }}
            </dd>
          </div>
        </dl>
        <div class="flex flex-col gap-1.5">
          <label
            :id="`member-role-label-${member.id}`"
            :for="`member-role-${member.id}`"
            class="text-text-dark text-xs font-medium"
          >Role</label>
          <Select
            v-model="roleDraft"
            :input-id="`member-role-${member.id}`"
            :aria-labelledby="`member-role-label-${member.id}`"
            :options="WORKSPACE_ROLE_OPTIONS"
            option-label="label"
            option-value="value"
            :pt="giTiempoSelectPt"
            :disabled="saving"
            class="w-full sm:w-48"
          />
        </div>
        <div
          v-if="props.canAssignPm"
          v-show="canEditProjects"
          data-testid="member-edit-project-select"
          class="flex flex-col gap-1.5"
          @keydown.enter="preventProjectSearchSubmit"
        >
          <label
            :for="`member-settings-${member.id}-projects`"
            class="text-text-dark font-sans text-[12px] leading-none font-medium"
          >Assigned projects</label>
          <AutoComplete
            append-to="self"
            :input-id="`member-settings-${member.id}-projects`"
            name="projectIds"
            :suggestions="projectSuggestions"
            :option-label="getProjectOptionLabel"
            complete-on-focus
            dropdown
            dropdown-mode="blank"
            force-selection
            multiple
            :min-length="0"
            placeholder="Search projects..."
            :invalid="$form.projectIds?.invalid"
            :disabled="saving || !canEditProjects"
            :pt="giTiempoSelfAppendedMultiAutoCompleteDropdownPt"
            fluid
            @complete="handleProjectComplete"
          />
          <small class="text-text-muted text-xs">
            Type to search active projects, then select multiple results.
          </small>
          <small
            v-if="$form.projectIds?.invalid"
            class="text-destructive text-xs"
          >
            {{ $form.projectIds.error?.message }}
          </small>
        </div>

        <div
          v-if="canEditProjects && activeProjects.length === 0"
          class="text-text-muted text-[13px]"
        >
          No active projects available.
        </div>

        <div
          v-if="member.role === WorkspaceRoles.Admin || roleDraft === WorkspaceRoles.Admin"
          data-testid="member-edit-assignment-unavailable"
          class="text-text-muted text-[13px]"
        >
          Has access to all projects
        </div>

        <div
          v-if="isPmMember"
          data-testid="member-edit-invoice-permission"
          class="flex flex-col gap-1.5"
        >
          <div class="flex items-center gap-2">
            <Checkbox
              :input-id="`member-settings-${member.id}-can-view-invoices`"
              :model-value="canViewInvoicesChecked"
              :disabled="saving || roleChanged"
              binary
              @update:model-value="handleCanViewInvoicesChange"
            />
            <label
              :for="`member-settings-${member.id}-can-view-invoices`"
              class="text-text-dark font-sans text-[12px] leading-none font-medium"
            >Allow viewing invoices</label>
          </div>
          <small class="text-text-muted text-xs">
            When enabled, this PM can view and manage invoices for their assigned projects.
          </small>
        </div>

        <DialogFooterActionGroups
          data-testid="member-edit-form-actions"
          :has-destructive-actions="props.canRemove"
          stack-on-mobile
        >
          <template #destructive>
            <Button
              type="button"
              label="Remove member"
              severity="danger"
              variant="outlined"
              class="w-full sm:w-auto"
              :disabled="saving"
              @click="emit('remove')"
            />
          </template>
          <Button
            type="button"
            label="Cancel"
            severity="secondary"
            variant="outlined"
            class="w-full sm:w-auto"
            :disabled="saving"
            @click="emit('cancelled')"
          />
          <Button
            type="submit"
            label="Save changes"
            class="w-full sm:w-auto"
            :disabled="saving || (!roleChanged && !canEditProjects)"
            :loading="saving"
          />
        </DialogFooterActionGroups>
      </div>
    </Form>
  </EditFormPanel>
</template>
