## 1. API and shared API documentation

- [x] 1.1 Align saved-task, managed GitHub and managed reference starts with public-project visibility. Use current access at write time and retain private managed and external-reference authorization.
- [x] 1.2 Apply the same public-project rule to the read-only capability decision. Test an allowed preflight followed by a change to private visibility before start.
- [x] 1.3 Update service and HTTP e2e tests, including the existing same-project manual/linked pair, linked issue starts with personal GitHub disconnected, first materialization, and repeated start. Check private denials, existing running timers and absence of implicit assignments.
- [x] 1.4 Correct public-assignment wording in the time entries controller, regenerate the checked-in OpenAPI description and update docs/API-ENDPOINTS.md and docs/github-installations.md.

## 2. Admin web

- [x] 2.1 Render Select members according to draft visibility in ProjectEditForm. Keep the Project manager control independently editable. Update docs/ui/pages-admin.md.
- [x] 2.2 Guard the member-list diff in useProjectEditActions for public saves. Verify a save with hidden member IDs and an explicit manager change applies only the manager edit.
- [x] 2.3 Cover opening either visibility, switching both ways, cancel and save in component and page tests. Verify existing membership survives a public save and can be edited after choosing Private.

## 3. Acceptance and verification

- [x] 3.1 Verify a workspace member without project assignment can start eligible public tasks from Projects, the timer picker, a previous entry and supported GitHub extension controls. Stop between successful starts. Verify a private managed project still enforces its access policy.
- [x] 3.2 Check expanded Admin Projects settings on desktop and mobile against the Admin · Projects frame, including keyboard traversal with the member field hidden.
- [x] 3.3 Run root typecheck, lint, tests and isolated API e2e. Validate the change with OpenSpec strict mode.
