# Admin Web — Projects List Page

**Source:** `apps/admin-web/src/views/ProjectsView.vue`

---

## Component Tree

```
ProjectsView
├── AdminPageHeader
│     props: title="Projects"
│             subtitle="Manage project visibility, member assignments, and manual project creation."
│     slot:  <Button label="New Project" @click="openCreateProject" />
│
├── ProgressSpinner  (shown while loading=true)
│     style: width:40px height:40px, stroke-width=3
│
└── [v-else template — loaded state]
    ├── ProjectStatsCards
    │     props: :active-projects="activeProjects"
    │             :private-projects="privateProjects"
    │             :public-projects="publicProjects"
    │
    └── ProjectsTable
          props: :projects="filteredProjects"
                 :assignable-members="assignableMembers"
                 :member-filter-options="memberFilterOptions"
                 :saving-project-id="savingProjectId"
                 :closed-project-id="closedProjectId"
          v-model: member-filter (string | null)
          emits:  @save="handleSave"
                  @archive="handleArchive"
                  @unarchive="handleUnarchive"
```

---

## Imports from `@gitiempo/web-shared`

- `createProjectsClient`, `createMembersClient` — HTTP clients
- Types: `ProjectsClient`, `MembersClient`

## Local State

| Ref                    | Type                                    | Purpose                                       |
| ---------------------- | --------------------------------------- | --------------------------------------------- |
| `projects`             | `shallowRef<ProjectWithAssignments[]>`  | Full project list with assignment counts      |
| `members`              | `shallowRef<WorkspaceMemberResponse[]>` | All workspace members                         |
| `loading`              | `ref<boolean>`                          | Controls spinner / table rendering            |
| `selectedMemberFilter` | `ref<string \| null>`                   | Bound to `ProjectsTable` v-model:memberFilter |
| `savingProjectId`      | `ref<string \| null>`                   | Tracks which project row is saving            |
| `closedProjectId`      | `ref<string \| null>`                   | Signals which inline-edit row to collapse     |

## Computed

| Name                  | Logic                                                                     |
| --------------------- | ------------------------------------------------------------------------- |
| `assignableMembers`   | Members with `role !== 'admin'`; adds `label` field                       |
| `activeProjects`      | Count of `isActive === true`                                              |
| `privateProjects`     | Count of active + visibility=private                                      |
| `publicProjects`      | Count of active + visibility=public                                       |
| `filteredProjects`    | All projects if no filter; filtered by `assignedMembers.userId` otherwise |
| `memberFilterOptions` | `[{id:null, label:'All members'}, ...members]`                            |

---

## UX Flow

```
onMounted
  → loadData()
      → Promise.all([listProjects, listMembers])
      → per project: listProjectAssignments()   ← N+1 calls
      → projects.value = merged array
      → loading.value = false

User clicks "New Project" (in AdminPageHeader slot)
  → router.push({ name: routeNames.addProject })

User changes member filter in ProjectsTable header
  → selectedMemberFilter updated via v-model
  → filteredProjects recomputed
  → table rows rerender

User clicks "Edit" on a row (in ProjectsTable)
  → ProjectsTable expands inline settings row for that project
  → user edits members/visibility
  → user clicks "Save" → emits @save(project, members[], visibility)
  → handleSave()
      → updateProject (if visibility changed)
      → assignUserToProject / removeProjectAssignment (diff)
      → toast success
      → closedProjectId = project.id → ProjectsTable collapses row
      → refreshData()

User clicks "Archive"
  → emits @archive(project)
  → handleArchive() → updateProject({ isActive: false })
  → toast success → refreshData()

User clicks "Unarchive"
  → emits @unarchive(project)
  → handleUnarchive() → updateProject({ isActive: true })
  → toast success → refreshData()
```

### Known Issues

- `loadData` and `refreshData` are near-identical — duplicated async logic.
- N+1 pattern: `listProjectAssignments` is called sequentially per project (wrapped in `Promise.all` but still one HTTP request per project).
