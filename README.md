# Lao Health Survey Management System — Demo

A small portfolio application inspired by the administrative and digital data-collection needs of public-health surveys. **Independent demonstration only; not affiliated with or endorsed by WHO or Lao MOH.** Not an official WHO STEPS instrument.

## Features
- User sign-in with server-side sessions and password hashing
- Administrator, data entry and viewer roles, plus administrator-only user creation and access management
- Enter a fictional participant's NCD-risk-factor survey
- Edit a saved survey from the dashboard and update its responses
- Validate and save survey responses in PostgreSQL
- View survey counts, tobacco-use counts, average age and counts by province
- Export CSV for spreadsheet reporting
- Search recent records and filter by date range, month, or year before export
- Advanced dashboard at `/analytics`: collection trends, geographic reach, participant profiles, tobacco/activity responses, quality checks, workflow and transparent security status

## Requirements
Node.js 24 (run `nvm use` if you use nvm); PostgreSQL 14+.

## Quick start
1. Create a PostgreSQL database named `health_survey`.
2. Run `psql -d health_survey -f database/schema.sql` and `psql -d health_survey -f database/auth.sql` from repository root (use your PostgreSQL credentials). For an existing survey database, apply only `database/auth.sql` to add login tables without changing survey records.
3. `cd backend && npm install && cp .env.example .env` then edit `.env` with your local PostgreSQL credentials.
4. `npm run dev` in `backend` (API at http://localhost:5151).
5. In a second terminal, `cd frontend && npm install && npm run dev` (web at http://localhost:3000).
6. Test API at http://localhost:5151/api/health.
7. Open http://localhost:3000/login and create the first administrator. There is no default password. After setup, sign in with your email and password; administrators can open **Users** to add accounts, change roles and deactivate users.

## Sign-in and roles

| Role | View, search, analytics and CSV | Create and edit surveys | Delete surveys | Manage users |
| --- | --- | --- | --- | --- |
| Administrator | Yes | Yes | Yes | Yes |
| Data entry | Yes | Yes | No | No |
| Viewer | Yes | No | No | No |

Passwords must contain 12–128 characters and are stored using salted scrypt hashes. The browser uses an HttpOnly, SameSite=Strict cookie; random session tokens are hashed in PostgreSQL and expire after eight hours. Sign-out revokes the session. Role/status changes revoke the affected user's sessions. Administrators cannot change their own role or deactivate themselves. Sign-in/setup attempts are limited to ten per 15 minutes per API client IP in this single-process demo; the in-memory limit resets when the API restarts.

The frontend proxies `/api/**` to `http://127.0.0.1:5151` so authenticated pages and CSV downloads use the same origin. Set frontend `API_PROXY_TARGET` to change that backend target, and backend `FRONTEND_ORIGIN` to your frontend origin. Local `localhost` and `127.0.0.1` aliases are accepted. The API binds to `127.0.0.1` by default. Set `NODE_ENV=production` on the API only behind HTTPS so its Secure cookies can be sent. Password reset, MFA and audit logging are not implemented.

Run the normal backend tests with `npm test`. To include the login/role integration test, set `TEST_DATABASE_URL` to a reachable PostgreSQL URL when running tests. The integration test creates and drops its own randomly named schema and uses API port 5152 by default (`TEST_API_PORT` overrides it); existing user and survey tables are untouched.

### Restart the database in this workspace

This Mac runs PostgreSQL from `~/Library/Application Support/Lao Health Survey/postgresql` with database files in `~/Library/Application Support/Lao Health Survey/postgres-data`, listening on `127.0.0.1:5433`. Both are outside the Desktop cloud-storage folder: cloud offloading previously caused transaction-file timeouts and database shutdowns. The ignored `.local/postgresql-runtime` and `.local/postgres-runtime` symlinks point to these local folders. The previous `.local/postgres` and `.local/postgres-reinstalled` copies are preserved separately and are not the active database. Runtime files are not included when cloning the project.

From the project root, after restarting your computer:

```sh
.local/postgresql-runtime/bin/pg_ctl -D "$HOME/Library/Application Support/Lao Health Survey/postgres-data" -l "$HOME/Library/Application Support/Lao Health Survey/postgres.log" -o '-h 127.0.0.1 -p 5433' start
```

The local backend `.env` uses `DATABASE_URL=postgresql://postgres@127.0.0.1:5433/health_survey`. Then start the backend and frontend in separate terminals using steps 4–5 above. Run `nvm use` from the project root first in each terminal if you use nvm.

On this Mac, backend and frontend `node_modules` are symlinks to their respective folders under `~/Library/Application Support/Lao Health Survey/dependencies/`. This keeps installed dependencies outside the Desktop cloud-storage folder. This machine-specific arrangement is ignored by Git; on another machine, use the normal `npm ci` installation in each project folder.

## API
- `GET /api/auth/status` (first-admin setup status)
- `POST /api/auth/setup` (first administrator only)
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/users`, `POST /api/users`, `PATCH /api/users/:id` (administrator only)
- `GET /api/health`
- `POST /api/surveys`
- `GET /api/surveys`
- `GET /api/surveys/:id`
- `PUT /api/surveys/:id` (all survey fields required)
- `DELETE /api/surveys/:id`
- `GET /api/surveys/summary`
- `GET /api/surveys/reporting`
- `GET /api/surveys/export.csv`

Survey endpoints require a valid session cookie. New and edit operations require administrator or data entry access; delete requires administrator access.

Example request:
```json
{"participant_code":"DEMO-001","province":"Vientiane Capital","district":"Xaysettha","age":32,"sex":"female","tobacco_use":false,"physical_activity_days":3}
```

## Search and date filters

List, summary, reporting and CSV endpoints accept `q`, `date_from`, `date_to` and exact-match `province` query parameters. Dates use `YYYY-MM-DD` and filter the original creation time using Laos calendar days, including both endpoints. Month/year selections are converted to complete date ranges. Search matches code, province, district, age or sex, case-insensitively. The dashboard shows up to 200 matching records; CSV exports all matches. Clicking **Export matching CSV** also applies the current filter selections.

The **Advanced dashboard** button opens `/analytics` and preserves the applied record filters. Charts use actual database aggregates rather than sample statistics. Province bars and month buttons drill down; **View matching records** carries the same scope back to the record list. The collection chart shows up to 12 calendar months ending at the selected end date (or latest matching record); missing months have zero matching records. Quality checks cover required fields, accepted values and distinct codes, not clinical accuracy. Empty groups show no percentage. The workflow describes supported operations and the security panel explicitly lists controls that are not implemented. CSV export and printable reporting use the selected scope.

Run filter and chart calculation tests with `cd backend && npm test`.

## Important limitations
This is a **local development prototype**, not a production health information system. Sign-in and role permissions are implemented; encryption configuration, consent workflow, audit trail and offline synchronization are not. Do **not** expose the API publicly or enter real personal or health data. CSV export is available to all signed-in roles for local demonstration. Data model is deliberately simplified and not an official STEPS questionnaire.

## Next steps
Password reset/MFA, field-team assignment and target tracking, consent and review workflows, audit logging, deployment and privacy/security review.
