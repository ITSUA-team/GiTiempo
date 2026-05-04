## 1. Script Setup — Members + PM State

- [x] 1.1 Import `createMembersClient`, `MembersClient` from `@gitiempo/web-shared` and `WorkspaceMemberResponse` from `@gitiempo/shared` in `AddProjectView.vue`
- [x] 1.2 Add `membersClient`, `members` (shallowRef), `membersLoading` (ref), and `selectedPmUserId` (ref<string | null>) to the script
- [x] 1.3 Add `pmOptions` computed — filters `members` to `role === "pm"`, maps to `{ userId, label: displayName ?? email }`
- [x] 1.4 Add `loadMembers()` async function that fetches members into `members.value`; on error shows a toast and sets members to `[]`
- [x] 1.5 Call `loadMembers()` in `onMounted`

## 2. Post-Create PM Assignment

- [x] 2.1 In `handleSubmit`, after `createProject` succeeds and before navigation: if `selectedPmUserId.value` is set, call `projectsClient.assignUserToProject(newProject.id, { userId: selectedPmUserId.value }, accessToken)`; if that call throws, add a warning toast but do not abort navigation

## 3. Template — Replace Read-Only PM Field With AppSelect

- [x] 3.1 Replace the static read-only PM `<div>` in the Source + PM row with `<AppSelect>` bound to `selectedPmUserId`, using `pmOptions` as options, `option-label="label"`, `option-value="userId"`, `placeholder="Select PM"`, `:disabled="isSubmitting || membersLoading"`, and `empty-message="No PMs available"`
- [x] 3.2 Run `pnpm --filter admin-web lint --fix && pnpm --filter admin-web typecheck`

## 4. Final Verification

- [x] 4.1 Run `pnpm --filter admin-web build` — confirm zero errors
