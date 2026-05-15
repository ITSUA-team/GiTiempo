## 1. Shell And Routing Spec Alignment

- [ ] 1.1 Update `openspec/specs/layout/spec.md` to document standalone authenticated 403/404 pages as exceptions to shell chrome.
- [ ] 1.2 Update `openspec/specs/frontend-routing/spec.md` to cover standalone protected user-web 403/404 routes and the conditional 404 back action.
- [ ] 1.3 Update `openspec/specs/admin-routing/spec.md` to cover standalone protected admin-web 403/404 routes outside the admin shell.

## 2. Page Entry Spec Alignment

- [ ] 2.1 Update `openspec/specs/user-pages/spec.md` so shell-owned entry expectations apply to normal member pages while 403/404 remain standalone authenticated exceptions.
- [ ] 2.2 Update `openspec/specs/admin-pages/spec.md` so shell-owned entry expectations apply to normal admin pages while 403/404 remain standalone authenticated exceptions.

## 3. Change Validation

- [ ] 3.1 Review the change artifacts against the approved UI docs and `.pen` screens to confirm the spec language matches the current source of truth.
- [ ] 3.2 Run the OpenSpec validation workflow for `align-standalone-error-pages-specs` and resolve any schema or artifact issues before archiving.
