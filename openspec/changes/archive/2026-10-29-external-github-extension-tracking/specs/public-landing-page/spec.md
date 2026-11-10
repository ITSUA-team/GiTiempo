## MODIFIED Requirements

### Requirement: Privacy Policy Matches Actual Data Handling

The Privacy Policy MUST accurately disclose collection, use, storage, sharing, and deletion of service and extension data. It MUST identify actual recipients and distinguish local browser state from server-held records. Its Chrome Web Store Limited Use commitment MUST cover all extension user data, including GitHub-derived information, rather than only Google API data. It SHALL distinguish user-supplied external reference recording from managed installation-authorized GitHub retrieval and describe the actual access scope of shared records.

#### Scenario: User reads authentication and GitHub disclosures

- **GIVEN** the extension supports Firebase and GitHub sign-in and GitHub-linked timers
- **WHEN** the user reads the policy
- **THEN** it describes profile/authentication information and how the supported identity providers participate
- **AND** it distinguishes GiTiempo tokens in extension storage from Firebase authentication state in extension-local IndexedDB
- **AND** it explains local issue-context recognition and transmission of repository name, issue number, bounded issue title, and canonical direct issue URL to GiTiempo when the updated extension requests a reference timer start
- **AND** it distinguishes managed starts that subsequently verify and retrieve issue information through the workspace GitHub App installation from external-reference starts that record user-supplied context without GitHub API retrieval or proof of provider access
- **AND** it describes time records and sharing with authorized workspace members under the applicable project or own-time access scope

#### Scenario: User understands scoped external-reference sharing

- **GIVEN** external-reference tracking reuses a workspace project and issue task across members
- **WHEN** the user reads the policy's sharing and deletion disclosures
- **THEN** it explains that tracking alone grants access only to the member's own entries and the projects and exact tasks containing those entries, including running entries
- **AND** it distinguishes that access from separately authorized administrator or project access to shared workspace records
- **AND** it explains that removing or moving the final own entry removes derived visibility without automatically deleting shared projects, tasks, or other members' records

#### Scenario: Changed extension data flow is disclosed before distribution

- **GIVEN** an extension candidate transmits issue title and canonical URL through the reference-start contract
- **WHEN** readiness for distributing that candidate is evaluated
- **THEN** the deployed public policy and candidate-specific collection inventory describe that payload and the implemented managed and external-reference flows consistently
- **AND** the verification record identifies the candidate version/hash and the policy URL and review date
- **AND** a historical handoff for a repository/issue-number-only package does not establish privacy readiness for the changed candidate
- **AND** Store declaration confirmation remains publisher-owned under the existing release requirements

#### Scenario: User reads use and recipient restrictions

- **GIVEN** the publisher has confirmed the actual data recipients and operational practices
- **WHEN** the policy is prepared for publication
- **THEN** it identifies the relevant identity, GitHub, and hosting/processing recipients and their purposes
- **AND** it discloses Limited Use restrictions on unrelated use, transfers, advertising, and human access, including applicable permitted exceptions, for all extension user data
- **AND** those statements agree with the intended Store certifications and actual practices

#### Scenario: User distinguishes logout from deletion

- **GIVEN** the user has server-held account, workspace, or time-entry records
- **WHEN** the user reads the retention and deletion sections
- **THEN** the policy explains the confirmed retention criteria, deletion-request process, and treatment of backups and applicable transfers
- **AND** it states that successful extension logout clears extension-local authentication state while logout/uninstall does not delete server records or stop an active timer
- **AND** it provides the monitored contact for requests without promising unimplemented automatic deletion
