## 1. Router Structure

- [ ] 1.1 Extract the admin-web router from `src/main.ts` into `src/router/index.ts` and define route entries for dashboard, reports, invoices, members, projects, settings, and login
- [ ] 1.2 Add route names and path structure that match the documented admin UI page inventory and reserve login as the guest-only entry route

## 2. Auth-Aware Shell Mounting

- [ ] 2.1 Create the authenticated admin app-shell route structure so protected admin pages mount through the shared shell pattern
- [ ] 2.2 Add stub protected views or placeholders so each documented admin route resolves through the shell without waiting for the full page implementations
- [ ] 2.3 Add admin-web route metadata and navigation-guard behavior so anonymous users are redirected to login and authenticated users are redirected away from login to the default protected route

## 3. Verification

- [ ] 3.1 Verify the `admin-routing` spec and planned route map against `docs/ui/pages-admin.md`, `docs/ui/layout.md`, `docs/TECHNICAL-REQUIREMENTS.md`, and `apps/admin-web/AGENTS.md`
- [ ] 3.2 Add or update focused tests for the admin-web router route inventory and auth-aware redirect behavior
- [ ] 3.3 Run `pnpm --filter admin-web lint`, `pnpm --filter admin-web typecheck`, and `pnpm --filter admin-web test` and resolve any issues
