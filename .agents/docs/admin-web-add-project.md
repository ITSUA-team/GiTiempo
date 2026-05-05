# Admin Web — Add Project Page

**Source:** `apps/admin-web/src/views/AddProjectView.vue`

---

## Component Tree

```
AddProjectView
├── AdminPageHeader
│     props: title="Add Project"
│             subtitle="Create a project manually now, with the flexibility to add workspace imports alongside it."
│             back-label="Back to projects"
│     emits:  @back → handleCancel → router.push({ name: 'admin-projects' })
│
└── div.flex.items-start.gap-5
    ├── AddProjectForm
    │     props: :pm-options="pmOptions"
    │             :members-loading="membersLoading"
    │             :is-submitting="isSubmitting"
    │     emits: @submit="handleSubmit"
    │             @cancel="handleCancel"
    │
    └── ProjectSourceCard
          (no props — static informational sidebar)
```

### AddProjectForm Internal Tree

```
AddProjectForm
├── h2 "Add Project Manually"
└── form @submit.prevent="handleSubmit"
    ├── AppInput
    │     id="project-name"
    │     v-model="projectName"
    │     label="Project name"
    │     placeholder="Enter project name"
    │     :maxlength="255"
    │     :disabled="isSubmitting"
    │
    ├── div.flex.gap-3
    │   ├── AppFormField(label="Source", size="sm", class="flex-1")
    │   │   └── div.border-divider.h-[34px].rounded-[6px].px-3  → "Manual" (read-only)
    │   │
    │   └── AppFormField(label="Project manager", size="sm", class="w-[160px]")
    │       └── AppSelect
    │             v-model="selectedPmUserId"
    │             :options="pmOptions"
    │             option-label="label"
    │             option-value="userId"
    │             placeholder="Select PM"
    │             empty-message="No PMs available"
    │             :disabled="isSubmitting || membersLoading"
    │
    ├── AppFormField(label="Visibility", size="sm")
    │   └── AppSelect
    │         v-model="projectVisibility"
    │         :options="[{label:'Public',value:'public'},{label:'Private',value:'private'}]"
    │         option-label="label"
    │         option-value="value"
    │         :disabled="isSubmitting"
    │
    └── div.actions.flex.justify-end.gap-[10px]
        ├── Button(outlined/secondary, label="Back", @click=emit('cancel'))
        └── Button(type=submit, label="Create project" | "Creating…", :disabled="!canSubmit")
```

---

## Imports from `@gitiempo/web-shared`

- `createProjectsClient`, `createMembersClient` — HTTP clients
- `AppInput`, `AppSelect`, `AppFormField` — form primitives

## Local State (AddProjectView)

| Ref              | Type                                    | Purpose                                 |
| ---------------- | --------------------------------------- | --------------------------------------- |
| `isSubmitting`   | `ref<boolean>`                          | Disables form + shows "Creating…" label |
| `members`        | `shallowRef<WorkspaceMemberResponse[]>` | Raw member list from API                |
| `membersLoading` | `ref<boolean>`                          | Disables PM selector while fetching     |

## Computed (AddProjectView)

| Name        | Logic                                                            |
| ----------- | ---------------------------------------------------------------- |
| `pmOptions` | Members filtered to `role === 'pm'`; maps to `{ userId, label }` |

## Local State (AddProjectForm)

| Ref                 | Type                       | Default                                          |
| ------------------- | -------------------------- | ------------------------------------------------ |
| `projectName`       | `ref<string>`              | `''`                                             |
| `projectVisibility` | `ref<'public'\|'private'>` | `'private'`                                      |
| `selectedPmUserId`  | `ref<string \| null>`      | `null`                                           |
| `canSubmit`         | computed                   | `projectName.trim().length > 0 && !isSubmitting` |

---

## UX Flow

```
onMounted
  → loadMembers()
      → membersClient.listMembers()
      → members.value filtered to role='pm' → pmOptions
      → membersLoading.value = false
      (on error: toast warn, members = [])

User types project name
  → projectName updated → canSubmit recomputed

User selects PM
  → selectedPmUserId updated

User selects visibility
  → projectVisibility updated

User clicks "Back" or AdminPageHeader back-link
  → handleCancel() → router.push({ name: 'admin-projects' })

User clicks "Create project" (submit)
  → handleSubmit(values)
      → validates: name required, accessToken present
      → isSubmitting = true
      → projectsClient.createProject({ name, visibility })
      → if pmUserId: assignUserToProject(newProject.id, { userId })
          (on assign error: toast warn "partial success")
      → toast success
      → router.push({ name: 'admin-projects' })
      (on create error: toast error)
      → isSubmitting = false
```

### ProjectSourceCard

Static informational sidebar. No props, no emits. Two content blocks:

- **Manual project** (highlighted, brand border, `bg-[#F7F2FC]`) — active/selected state
- **Workspace import** (inactive, `bg-app-bg`) — greyed state
  Footer note: "You can still assign the PM, set visibility, and adjust project details after creation."
