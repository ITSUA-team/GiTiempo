# Identity Recovery — Platform Operator Runbook

Operator-facing documentation for the identity-recovery surface introduced by
OpenSpec change `refactor-auth-identity-recovery`: on-demand observability of
stranded manual registrations (`assess`) and the audited recovery procedure for
conclusively abandoned registrations (`resolve`). The surface is backend-only;
an admin-web UI is a deferred follow-up (see [Deferred follow-ups](#deferred-follow-ups)).

Related sources:
- Endpoints: `apps/api/src/auth/controllers/identity-recovery.controller.ts`
- Guard: `apps/api/src/auth/guards/platform-operator.guard.ts`
- Recovery procedure: `apps/api/src/auth/services/identity-reservation-coordinator.ts`
  (`resolveConclusivelyAbandonedRegistration`)
- Contracts: `packages/shared/openapi.json` (`IdentityRecoveryAssessResponseDto`,
  `IdentityRecoveryResolveRequestDto`) and the Swagger UI at `/docs`

## Configuration

Both keys are validated in `apps/api/src/config/env.validation.ts` and read once
at process boot; changing them requires an API restart. Invalid values fail
startup.

| Key | Purpose | Format / default |
| --- | --- | --- |
| `AUTH_AGED_RESERVATION_THRESHOLD` | Minimum age before an unbound `registration` reservation is surfaced as "aged" and becomes resolvable. | Duration string, default `24h`. Accepted units: bare seconds or `s` / `m` / `h` / `d` (e.g. `86400`, `3600s`, `24h`, `7d`). |
| `PLATFORM_OPERATOR_USER_IDS` | Allowlist of local user IDs (UUIDs from the `users` table, i.e. the JWT `sub` value) permitted to call the two endpoints. | Comma-separated UUIDs. Default (empty) means **no** platform operators — both endpoints return 403 for everyone. |

There is no workspace-scoped "platform operator" role: the platform operator is
whichever authenticated user's subject appears in the allowlist. Regular
workspace roles (`admin`, `pm`, `member`) confer no access to this surface.

Example:

```
AUTH_AGED_RESERVATION_THRESHOLD=24h
PLATFORM_OPERATOR_USER_IDS=96d0d3f4-b9ff-48a7-b9c9-79869cc63c55,8e2f1d0a-0b3c-4f8e-9d2a-1234567890ab
```

## Running the requests

The endpoints require a local access token (bearer). Bruno users can add the
two requests under `bruno/auth/` — the collection's `Login` request already
stores `{{accessToken}}` in the `local` environment; use `{{baseUrl}}` for the
host.

### Login (token source)

```bash
TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"firebaseIdToken":"test:admin-uid:admin@example.com"}' \
  | jq -r .accessToken)
```

(`test:...` tokens are only accepted when the API runs with
`NODE_ENV=test` / `FakeFirebaseAdminService`. In staging/production, mint the
bearer token through the Firebase login flow of an allowlisted operator account.)

### `GET /auth/identity-recovery/assess`

Lists aged unbound `registration` reservations: rows in
`firebase_identity_reservations` where `purpose = 'registration'`,
`state = 'reserved'`, and `created_at < now() - AUTH_AGED_RESERVATION_THRESHOLD`.
The query is read-only; it never mutates reservation state. Every row is
redacted: only the display/workspace names of the registration foundation are
included, no secrets.

```bash
curl -s "$BASE_URL/auth/identity-recovery/assess" \
  -H "Authorization: Bearer $TOKEN"
```

Response — `200 OK`, array of:

```json
[
  {
    "reservationId": "11111111-1111-4111-8111-111111111111",
    "normalizedEmail": "aged.owner@example.com",
    "firebaseUid": "runbook-aged-uid-1",
    "purpose": "registration",
    "state": "reserved",
    "registrationDisplayName": "Aged Owner",
    "registrationWorkspaceName": "Aged Studio",
    "createdAt": "2026-11-09T05:33:54.558Z"
  }
]
```

| Field | Notes |
| --- | --- |
| `reservationId` | UUID — pass unchanged to `resolve`. |
| `normalizedEmail` / `firebaseUid` | Reserved identity keys that were stranded. |
| `purpose` / `state` | Always `registration` / `reserved`: the endpoint only surfaces resolvable candidates. |
| `registrationDisplayName`, `registrationWorkspaceName` | Non-secret registration foundation snapshot; nullable. |
| `createdAt` | ISO-8601 UTC timestamp. |

An empty array `[]` means nothing is stranded. Rows stay listed until they are
resolved (state leaves `reserved`), another flow binds them, or they are
deleted by the automated registration-compensation path.

### `POST /auth/identity-recovery/resolve`

Runs the audited operator recovery for one reservation. The operator identity is
taken from the **access token** (`sub`); the body cannot and must not carry it.

```bash
curl -s -w "%{http_code}" -X POST "$BASE_URL/auth/identity-recovery/resolve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
        "reservationId": "11111111-1111-4111-8111-111111111111",
        "operatorDecision": "Registration abandoned: Firebase UID absent and unadopted"
      }'
```

Request body (`IdentityRecoveryResolveRequestDto`, strict):

| Field | Type | Notes |
| --- | --- | --- |
| `reservationId` | UUID | From the `assess` response. |
| `operatorDecision` | string, 1–500 | Free-form rationale, persisted to the audit trail. |

`operatorIdentity` is rejected as an unrecognized key (400) — it always comes
from the token.

Response statuses:

| Status | Meaning | Reservation state after |
| --- | --- | --- |
| `204` | Conclusive abandonment confirmed; resolved and audited. | `resolved` |
| `400` | Malformed body (bad UUID, missing/long `operatorDecision`, unexpected keys). | unchanged |
| `401` | No/invalid bearer token. | unchanged |
| `403` | Caller is not in `PLATFORM_OPERATOR_USER_IDS`. | unchanged |
| `404` | Reservation does not exist. | unchanged |
| `409` | Not resolvable: not aged (younger than the threshold), state no longer `reserved`, or the Firebase UID is already adopted/bound by a local account. | unchanged |
| `503` | Firebase existence check is inconclusive (lookup failure, ambiguity). | `reserved` (retained) |

After a `204`, the audit row records the decision and the reservation row is
retained with `state = 'resolved'`; its `normalizedEmail` becomes
re-registrable because the resolved state is excluded from the email-ownership
proof set. The Firebase identity is never deleted by this flow — conclusive
absence means there is nothing to delete.

## Conclusive-abandonment criteria

All checks re-run inside one transaction under the shared `identity:*`
advisory locks (`email:` keys before `uid:` keys), so concurrent
registration/social-login flows cannot race the operator:

1. The reservation exists and is re-read as `purpose = 'registration' AND
   state = 'reserved'` under the lock (a single prior read is not trusted).
2. The reservation is older than `AUTH_AGED_RESERVATION_THRESHOLD`.
3. Firebase confirms the UID is absent **deterministically**: two consecutive
   provider lookups both return `auth/user-not-found`. A user-present result or
   any lookup failure (timeout, transient outage) is *not* absence.
4. The UID is not adopted locally: no `users.firebase_uid` match and no row in
   `firebase_subject_bindings` for the UID.

Only then does the same transaction transition the reservation to `resolved`
and insert the audit row. Any other outcome is a refusal — see the
[What is not authorized](#what-is-not-authorized) section.

The provider-absence result is persisted verbatim as evidence, e.g.
`auth/user-not-found (confirmed by two consecutive lookups)`.

## Audit trail

Every successful resolve writes one row into `identity_recovery_audit`
(migration `apps/api/drizzle/0028_identity_recovery_audit.sql`,
schema `apps/api/src/auth/schemas/identity-recovery-audit.schema.ts`):

| Column | Content |
| --- | --- |
| `id` | Audit row UUID. |
| `reservation_id` | FK to `firebase_identity_reservations.id` (`ON DELETE CASCADE`). |
| `normalized_email` / `firebase_uid` | The resolved identity keys. |
| `purpose` | Reservation purpose (`registration`). |
| `registration_display_name`, `registration_workspace_name` | Provenance snapshot of the abandoned registration. |
| `operator_identity` | JWT `sub` of the authenticated operator (never request-supplied). |
| `operator_decision` | The operator's free-form rationale. |
| `provider_absence_evidence` | Provider result summary (e.g. the double-checked `user-not-found`). |
| `created_at` / `updated_at` | Timestamps. |

The audit row contains no credentials: passwords and refresh tokens are never
persisted, and the registration foundation payload itself holds no secret
fields (only names and the owner acknowledgement, which the reservation schema
stores — the audit row stores the non-secret subset).

Query the trail after an incident:

```sql
SELECT id, reservation_id, normalized_email, operator_identity, operator_decision,
       provider_absence_evidence, created_at
FROM identity_recovery_audit
ORDER BY created_at DESC;
```

## What is not authorized

- **Uncertain outcomes are retained.** A failed or inconclusive provider lookup
  → `503`, the reservation stays `reserved`, and no audit row is written. The
  operator must retry later; there is no force flag.
- **Generic errors never authorize cleanup.** Internal/transport errors during
  recovery leave the reservation untouched; `resolve` never deletes the
  reservation row and never deletes a Firebase identity.
- **Adopted identities are never deleted or resolved.** A UID owned by a local
  account (canonical `users.firebase_uid` or
  `firebase_subject_bindings`) → `409` refusal.
- **Observability is read-only.** `assess` and the aged-reservation query never
  mutate state, and no background job sweeps or expires reservations.
- **The operator surface is allowlist-only.** Workspace-admin roles are
  irrelevant; an empty `PLATFORM_OPERATOR_USER_IDS` disables the surface
  entirely (403 for all callers).

## Monitoring

Today the signal is on-demand: operators poll `assess`, or a scheduled external
job can call it (see [Deferred follow-ups](#deferred-follow-ups)).
`AuthService.reportAgedUnboundRegistrationReservations()` emits a structured,
redacted `warn` event (`auth.identity.aged_unbound_reservation` with
`reservationId`, `normalizedEmail`, `firebaseUid`, `ageMs`) per aged
reservation — the query + event pair is intentionally reusable by the future
scheduler, but nothing invokes it automatically yet, so log-based alerting on
this event will not fire until that follow-up lands.

## Migration / deployment implications

### What moves with the release

- **Migration `0028_identity_recovery_audit.sql`** (additive): creates
  `identity_recovery_audit` with the columns above plus a FK from
  `reservation_id` to `firebase_identity_reservations(id) ON DELETE CASCADE`.
  No existing table or column is altered.
- **`resolved` reservation state**: the `state` column is `varchar(16)`, so the
  new value requires **no DDL**. The change is additive; existing
  `reserved` / `confirmed` / `bound` rows are untouched and no existing flow
  ever produces `resolved` — only the operator path does.
- **Platform-operator authorization** is deployment configuration only
  (`PLATFORM_OPERATOR_USER_IDS`); no DB-backed role is introduced.

### Deployment order

1. Apply the migration (`pnpm --filter @gitiempo/api db:migrate`, or the
   deployment pipeline's equivalent). Deploy the migration before or together
   with the release; if the API ships before the migration exists, `assess`
   keeps working but `resolve` fails at runtime when the audit row is written
   (the table is required by the resolve path).
2. Configure `AUTH_AGED_RESERVATION_THRESHOLD` (default `24h` is usually
   correct) and `PLATFORM_OPERATOR_USER_IDS` in the deployment environment.
3. Restart the API (both keys are read at boot).
4. Smoke-check: `GET /auth/identity-recovery/assess` with an operator token
   returns `200 []`, and with a non-operator token returns `403`.

### Rollback

- The feature can be disabled without a rollback: set `PLATFORM_OPERATOR_USER_IDS`
  empty and restart — both endpoints then refuse every caller (403).
- To roll back the data model, in order:
  1. Set `resolved` reservations back to `reserved`: `UPDATE
     firebase_identity_reservations SET state = 'reserved', updated_at = now()
     WHERE state = 'resolved';` — safe because no automated flow depends on
     `resolved`; the affected emails were resolvable only through this flow, so
     reverting simply re-strands them.
  2. `DROP TABLE identity_recovery_audit;` (no automated flow reads it; the
     drop only loses the operator-action provenance).
  3. Roll the API release back to the previous version.

## Deferred follow-ups

- **Admin-web UI page for operator recovery**: new admin route + PrimeVue page
  consuming these endpoints (with acceptance QA). The backend contract above is
  the single source this UI will consume.
- **Scheduled emission of the aged-reservation signal**: an external cron
  hitting `GET /auth/identity-recovery/assess`, or a future in-process
  scheduler invoking
  `AuthService.reportAgedUnboundRegistrationReservations()` (the structured
  `auth.identity.aged_unbound_reservation` warn events). Deliberately not a
  background sweeper: the signal must stay read-only and non-mutating.
