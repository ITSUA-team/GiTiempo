## 1. AppInput Component

- [x] 1.1 Create `packages/web-shared/src/components/AppInput.vue` — labeled text-input wrapper with `id`, `label`, `modelValue`, `placeholder`, `maxlength`, `type`, `disabled`, `error`, `helper` props; emits `update:modelValue`; label uses `text-[13px] font-medium text-text-dark`; InputText gets `w-full` and `h-[34px]`
- [x] 1.2 Export `AppInput` from `packages/web-shared/src/components/index.ts`
- [x] 1.3 Run `pnpm --filter @gitiempo/web-shared typecheck` to confirm the component is valid

## 2. AddProjectView Integration

- [x] 2.1 Replace the inline `<label>` + `<InputText>` "Project name" field in `apps/admin-web/src/views/AddProjectView.vue` with `<AppInput>` imported from `@gitiempo/web-shared`
- [x] 2.2 Run `pnpm --filter admin-web lint --fix && pnpm --filter admin-web typecheck`

## 3. Skill File

- [x] 3.1 Create `.agents/skills/admin-web-shared-components/SKILL.md` documenting: when to use `AppInput` vs raw `InputText`, the prop API, the design-spec values it enforces, and a code example

## 4. Final Verification

- [x] 4.1 Run `pnpm --filter user-web typecheck` to confirm no breakage in user-web
- [x] 4.2 Run `pnpm --filter admin-web build` — confirm zero errors
