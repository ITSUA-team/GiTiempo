# Disposable rollout and rollback rehearsal

Date: 2026-10-13. Branch: `feat/external-github-time-tracking`, base `75cdb08d` plus the current uncommitted candidate. PostgreSQL 17.11. This is a local operational rehearsal, not a production deployment or extension distribution.

## Executed environment

Created a uniquely named disposable database, `gitiempo_qa_rollback_20261013_af7bf0cb`, on local PostgreSQL. Applied SQL migrations 0000–0021 transactionally, inserted an isolated historical managed project/task/entry and three QA identities (member, peer, admin), then applied 0022 in one transaction. Started the compiled candidate API on loopback 3041 and an owned loopback HTTP gateway on 3042. Authentication used the repository's test Firebase provider and freshly generated in-memory JWT secrets. No development records or credentials were changed.

The gateway initially forwarded every request. During the rollback phase it returned 503 with `Retry-After: 60` only for `POST /time-entries/timer/start-from-github-reference`. The compatible API and database remained in place. This rehearses operational withdrawal of the new entry point; it adds no product setting, removes no schema, and does not deploy an older API.

## Results

**49 assertions passed, zero failed** in the final run. Assertions were executed through actual HTTP requests and database postconditions, without mocking the access, timer or GitHub services.

| Phase | Observed result |
| --- | --- |
| Schema upgrade | Historical time-entry row remained byte-for-value identical; the old project received `managed` mode. |
| Supported old saved-task contract | A managed local task started and stopped with the old request shape; its non-billable default remained false. |
| Default-on reference start | An unlinked ordinary member started successfully; the new external project was private with no assignments, and its running entry immediately granted own-time scope. |
| Independent server outbound audit | Before loading the actual API, the runner instrumented `globalThis.fetch` and HTTPS requests to reject and count remote calls while allowing loopback client requests. First reference start, repeats, owned stopping and legacy denial succeeded with zero remote calls. The GitHub runtime clients use `fetch`; this check does not replace managed provider testing. |
| Legacy installation endpoint | The old GitHub endpoint rejected the external target with 404 instead of bypassing its policy. |
| New entry-point withdrawal | A fresh reference start received 503 without creating records. Supported managed saved-task start/stop continued to work. |
| Running timer during withdrawal | Current timer remained available; a stale expected ID received 409; stopping the owned timer with its correct ID succeeded. |
| Access during withdrawal | Member response remained own-time with redacted members; peer project/history reads remained 404; admin retained full-project access. |
| Persistence | All project/task/reference/assignment rows, IDs, stored policy, provenance and metadata were unchanged across withdrawal and owned stop. The historical entry was unchanged. The stopped entry kept its owner, task, workspace, start, description, billing and source, with a positive duration. |
| Forward restoration | Restoring gateway forwarding permitted saved external repeat with source `web`; owned stop succeeded and shared identity was unchanged. |
| Deferred rename/transfer | A different repository key created a distinct task; the original reference remained intact. No automatic rebinding or merge was performed. |
| Deferred conversion | Caller-selected tracking mode was rejected with 400; making an external project public was rejected with 422. |

Detailed non-secret assertions are retained at `/private/tmp/gitiempo-rollback-qa.MssuRI/evidence.json`. The first helper run misread the existing `{ timeEntry }` current-timer envelope; correcting the helper required no product change. A second run also blocked generic starts; the final run narrowed withdrawal to the new reference endpoint and verified that managed saved starts remained available.

## Candidate identifiers

SHA-256 of the executed compiled API time-entry service: `ca28aa6859834617c26912e31e4c2d52e5738f340394b42689b402c33be7f41d`.

SHA-256 of migration 0022: `829d6b58b82e0e158977babd1148b17af5ef3953e0ddbc6b3d2b21a655ea12eb`.

These identify the local test inputs, not a committed release artifact.

## Release ordering and safe recovery

1. Back up the target database, run the repository-reference collision preflight and stop on any collision. Apply the reviewed migration with the matching runtime writers; do not merge or delete historical identities automatically.
2. Deploy the API enforcing stored tracking policy and the compatible shared contracts, then the user/admin consumers. Verify restricted responses and old managed behavior before distributing the extension.
3. Verify the revised public policy anonymously and identify the production extension package by version, hash, configured API origin and permissions before distribution. Local localhost candidates do not certify that release.
4. If new reference starts must be withdrawn, retain the compatible policy-aware API and all schema/history. Block the new entry point operationally while leaving owned current/stop/history and scope enforcement available. Restore with a compatible forward fix.

The base API has no external tracking-policy handling in its project access service. Downgrading to that API after external records exist is unsupported; it was deliberately not executed against the fixture. Dropping mode/provenance columns or treating external records as ordinary full-project records is not a valid recovery path. Actual managed GitHub provider/import lifecycle checks are recorded separately in the API completion report.

## Cleanup

The runner closed its gateway and API, ended all pools and dropped only its exact owned QA database in `finally`, including the earlier helper runs. Generated tokens/secrets stayed in memory. Non-secret evidence and the helper remain in the temporary QA directory. The development database and user-created entries were untouched.
