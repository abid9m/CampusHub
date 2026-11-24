# CampusHub

CampusHub is a React/Vite campus-club and event platform backed by Express, Prisma and a local SQLite database by default. This workspace includes role-aware APIs and dashboards for students, club executives, faculty advisors and administrators.

## Requirements

- Node.js 20.19+ (or 22.12+)
- PostgreSQL 14 or newer for production deployments (optional for local development)

## Local setup

The easiest setup, from the project root:

```sh
npm run setup
npm run dev:all
```

`npm run setup` installs missing dependencies, creates missing environment files, makes local JWT/admin credentials when needed, generates Prisma Client, syncs the SQLite database and seeds the admin/resources plus a sample approved event for local development. It does not overwrite existing environment files or reset local data. Save the one-time admin password printed during first setup.

Open http://localhost:5173 for the frontend; the API health endpoint is http://localhost:5000/api/health. Press Ctrl+C once to stop both servers. Alternatively run `npm run dev` and `npm --prefix frontend run dev` in separate terminals.

## First-use workflow

1. Sign in at `/login` using the local administrator credentials configured by `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`.
2. On the admin dashboard, create accounts for a club executive and a faculty advisor. Set their roles during account creation.
3. Use **Create a club** to assign its executive lead and advisor. The local seed creates a Main Auditorium and Portable Projector for resource booking.
4. Sign in as the executive and submit an event with its itemized budget in the **Event & budget proposal** form. The event and budget are created and submitted for review together.
5. Sign in as the assigned advisor to review the venue, schedule and linked budget, then approve or reject both together. Everyone lands on the role-personalized Discover feed after sign-in; students can open event details and register for a QR ticket there.
6. The executive can check in attendees at `/check-in`; checked-in students can request certificates from their dashboard.
7. Browse the shared inventory and manage reservations from the centralized Resource hub at `/resources`. Executives and admins can also publish club updates and announcements to Discover.

Use separate browser profiles, or sign out between test accounts. Public registration creates student accounts; administrators can create and assign all roles in the dashboard.

## Included workflows

- Club directory, executive listings and public membership applications
- Role-personalized Discover feed combining approved events, club posts and announcements
- Paired event-and-budget proposal creation, venue interval conflict checks, submission and joint advisor approval
- Public event discovery, registration with QR tickets and authorized check-in
- Central resource inventory, personal reservation tracking and overlap-safe bookings
- Club-to-club co-host invitations with accept/decline workflow
- Budget proposals, itemized lines, advisor decisions and expense receipt records
- Attendance-verified PDF certificates with public verification endpoints
- In-app notifications and a 15-minute worker for upcoming-event reminders

## API and configuration notes

- API health endpoint: `GET /api/health`
- API role authorization is enforced server-side. Never treat frontend role-based navigation as an access control boundary.
- Frontend sessions are restored through `GET /api/auth/me`; expired sessions are cleared, and successful sign-in/registration always opens Discover. Role-specific dashboards remain protected workspace routes.
- Set `CORS_ORIGIN` to a comma-separated allowlist in deployment.
- The default SQLite development schema is `prisma/schema.sqlite.prisma` (configured as the project's default Prisma schema); it stores enum-like values as strings, budget amounts as floats, and notification payloads as JSON-encoded text. The PostgreSQL production schema with native enums and decimal/json columns remains at `prisma/schema.prisma`. For PostgreSQL, set `DATABASE_URL` to your PostgreSQL connection string, then run `npm run generate:postgres` and `npx prisma migrate deploy --schema=prisma/schema.prisma` (or `npm run migrate:postgres` for development).
- SMTP email is enabled when `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` and `SMTP_PASSWORD` are configured. Without SMTP, email delivery is reported as unavailable; in-app notifications continue to work.
- Certificate PDFs are stored in `storage/certificates`. Use persistent, access-controlled storage and backups for deployed environments.
- The reminder worker runs in each API process. For horizontally scaled deployments, disable it with `DISABLE_REMINDER_WORKER=true` and run a single dedicated worker process.
