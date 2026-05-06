## ADDED Requirements

### Requirement: Frontend Staging API Origin
Frontend staging builds SHALL use the dedicated API staging hostname for backend requests.

#### Scenario: User web staging build receives API hostname
- **WHEN** the user-web staging deploy workflow builds the app
- **THEN** the build receives `VITE_API_BASE_URL` with value `https://gitiempo-api.itsua.dev`
- **AND** the build continues to receive `VITE_ADMIN_APP_URL` with value `https://gitiempo-admin.itsua.dev`

#### Scenario: Admin web staging build receives API hostname
- **WHEN** the admin-web staging deploy workflow builds the app
- **THEN** the build receives `VITE_API_BASE_URL` with value `https://gitiempo-api.itsua.dev`
- **AND** the build continues to receive `VITE_USER_APP_URL` with value `https://gitiempo.itsua.dev`

#### Scenario: Staging deploy guide documents API hostname
- **WHEN** an operator reads the frontend staging deploy guide
- **THEN** the guide documents `https://gitiempo-api.itsua.dev` as the staging frontend `VITE_API_BASE_URL`
