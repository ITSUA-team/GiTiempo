# Timer and billing controlled QA

Run: 13 October 2026. The compiled candidate API ran on loopback 3041 behind an owned loopback gateway on 3042. The runner created a uniquely named disposable PostgreSQL database, applied migrations through 0022 and used synthetic member/peer/admin sessions. Development records were untouched. This run made actual HTTP requests with database postconditions; the access, timer and GitHub services were not mocked.

**36 assertions passed, zero failed.**

| Scenario | Observed result |
| --- | --- |
| First external extension start | 201, `source=extension`; its exact task/project immediately became readable with own-time scope. |
| Running-only totals | Project `totalSeconds=0` while the first timer was running. |
| Global timer across workspaces | The same member established a second workspace session through the actual switch-workspace endpoint. A reference start there returned 409 while the original workspace timer was running. No project was created in the second workspace and the original timer ID remained unchanged. |
| Conditional stopping | A random stale `expectedTimerId` returned 409 and left the current timer intact. The correct ID returned 200 with a positive integer duration. |
| Existing external billing default | The controlled QA task default was changed to false. Repeating its reference start returned 201 with `isBillable=false`, `source=extension` and the same task; the caller's replacement title did not overwrite the shared title. |
| Saved external recording | Saved exact-task start returned 201 with `source=web`, the false task billing default and the supplied description. Owned stop returned 200 and retained task, user, workspace, description, billing and source. |
| Provider independence | Runtime remote-fetch/HTTPS instrumentation recorded zero provider requests during these external starts and stops. |

The runner also checked the existing migration/history fixture and authenticated all three synthetic identities. Non-secret evidence is at `/private/tmp/gitiempo-timer-invariants-qa.vlgseynp/evidence.json`. The first launch was blocked by sandbox loopback access before creating a database; the permitted rerun completed normally. Its `finally` handler closed the gateway/API/pools and dropped only `gitiempo_qa_timer_20261013_15c3bb53`; the cleanup record is retained beside the evidence. No tokens or credentials are recorded in this report.
