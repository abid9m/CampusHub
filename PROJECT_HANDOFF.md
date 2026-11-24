# CampusHub — Project Handoff

This document is a technical map for a developer or AI continuing work on CampusHub. Do not assume production data is disposable: ask for explicit scope, verify the target database, and take a backup before any reset.

## Project summary

CampusHub is a university club and event management web application. Students discover campus events and clubs, register for events, and receive tickets. Club executives submit event and budget proposals, advisors review them together, and administrators manage accounts, roles, clubs, and shared resources.

## Technology and layout

- Frontend: React 18, Vite, React Router, Tailwind CSS.
- Backend: Node.js, Express, CommonJS, JSON REST API.
- Persistence: Prisma ORM; SQLite locally and PostgreSQL for hosting.
- Authentication: JWT bearer tokens, bcrypt password hashes, role-based authorization.
- Local certificates: PDF generation; event tickets use QR codes; optional email uses SMTP.

Main locations:

- `frontend/src/App.jsx`: auth pages, application shell, page components, and route table.
- `frontend/src/context/AuthContext.jsx`: session restore, login/register, logout, and profile state.
- `frontend/src/components/`: navbar, sidebar, Discover, resources, protected routes, and account settings.
- `frontend/src/lib/api.js`: API URL, bearer token, JSON requests, and invalid-session event.
- `src/index.js`: Express setup, CORS, error handling, and `/api/*` route mounting.
- `src/routes/` and `src/controllers/`: endpoint declarations and business logic.
- `src/middlewares/authMiddleware.js`: JWT validation and role checks.
- `src/services/`: authorization, email, reminders, and proposal services.
- `prisma/schema.sqlite.prisma`: local schema.
- `prisma/schema.prisma`: production PostgreSQL schema.
- `prisma/seed.js`: environment-driven idempotent administrator/resource seed; also creates a demo event for SQLite.

## Authentication and access

- Only `/login` and `/register` are reachable without a session. The app validates saved sessions with `GET /api/auth/me` before rendering the protected application shell.
- Login/register leads to Discover (`/`); logout clears local session state and returns to `/login`.
- Roles: `ADMIN`, `FACULTY_ADVISOR`, `CLUB_EXECUTIVE`, and `STUDENT`.
- Role workspaces: `/dashboard/admin`, `/dashboard/advisor`, `/dashboard/executive`, and `/dashboard/student`. `/dashboard` redirects by role.
- Authorization is enforced by backend middleware, not just frontend navigation.
- Profile settings are available at `/settings`: name/email edits and optional password change require the current password. The API is `PATCH /api/auth/me`.

## Application routes

- `/`: role-personalized Discover feed with approved events, club posts, announcements, event details, and student registration.
- `/calendar`: approved campus events.
- `/clubs`: club directory, executive listings, and membership application.
- `/resources`: shared inventory, availability, reservation history, booking and cancellation.
- `/settings`: personal information and password settings.
- `/dashboard/*`: role workspaces for admin, advisor, executive, and student features.
- `/check-in`: authorized event ticket check-in.
- `/verify-certificate`: certificate verification UI; public certificate verification API is `GET /api/certificates/verify/:code`.

## Core workflows

1. **Administration:** create users/roles, clubs, advisors, executives, and resources.
2. **Event and budget proposals:** executives submit event logistics and itemized budget together; advisors approve/reject the linked proposals together.
3. **Scheduling:** venue conflict checks and time-slot suggestions are handled by event APIs.
4. **Discover and club updates:** public feed reads approved events and club posts; admins/executives may publish posts for clubs they manage.
5. **Tickets and attendance:** students register for approved events; ticket QR codes are checked at `/check-in`.
6. **Certificates:** attended participants can request a PDF certificate; verification URLs use a unique code.
7. **Resource booking:** inventory reservations are checked for overlapping time ranges; booking history is per user.
8. **Collaboration and recruitment:** co-host invitations, club membership applications, executive listings.
9. **Budgets and receipts:** line items, advisor decisions, receipts, and event-linked proposal details.
10. **Notifications:** in-app notifications and a 24-hour event reminder worker; SMTP is optional.

## Data model

The Prisma schemas contain:

- Accounts and relationships: `User`, `Club`, `ClubMembership`.
- Events and social content: `Event`, `ClubPost`, `CoHostInvitation`, `Feedback`, `MembershipApplication`.
- Resources: `Resource`, `ResourceBooking`.
- Event entry and proof: `Ticket`, `Certificate`.
- Finance: `BudgetProposal`, `BudgetLineItem`, `BudgetApproval`, `ExpenseReceipt`.
- Alerts: `Notification`.

Related records use foreign keys and configured delete behavior. A complete reset must account for child rows and cannot be performed by deleting only users/clubs/posts.

## Local development

From the project root:

```powershell
npm run setup
npm run dev:all
```

- Frontend: `http://localhost:5173`
- API health: `http://localhost:5000/api/health`
- Local environment: root `.env`; frontend build-time API config: `frontend/.env`.
- Local database: `prisma/dev.db` using `file:./dev.db`.
- Local Prisma generation: `npm run generate:local`.
- Local schema sync: `npm run db:push:local`.
- Frontend production build: `npm --prefix frontend run build`.

`npm run setup` is intended to seed/setup local development. It is not a production database reset.

## Deployment

The existing deployment uses Vercel for the frontend and Render for the API:

- Frontend: `https://campus-hub-steel-two.vercel.app`
- API: `https://campushub-0m76.onrender.com`
- API base for the frontend: `https://campushub-0m76.onrender.com/api`

### Vercel

1. Import the GitHub repository `abid9m/CampusHub`.
2. Set Root Directory to `frontend`.
3. Build command: `npm run build`; output directory: `dist`.
4. Set `VITE_API_URL=https://campushub-0m76.onrender.com/api` in Vercel Project Settings → Environment Variables.
5. Redeploy after changing environment variables; Vite embeds this value at build time.

### Render API

1. Create a Node web service from the repository root and attach a PostgreSQL database.
2. Build command: `npm install && npm run generate:postgres`.
3. Start command: `npm start`.
4. Configure `DATABASE_URL` with the Render PostgreSQL connection, `JWT_SECRET` (random, at least 32 characters), `CORS_ORIGIN=https://campus-hub-steel-two.vercel.app`, plus `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
5. For a new schema, run `npm run db:push:postgres` against the intended database. This repository currently has no Prisma migration history; do not run `prisma migrate deploy` until migrations exist.
6. Seed initial admin/resources with `npm run seed` only after confirming the environment and target database.

Never commit `.env` files, production credentials, database dumps, or user data.

## Current handoff state

- Local and hosted API health were verified previously; local frontend/API are run through `npm run dev:all`.
- The latest pushed baseline is commit `ef148b6` on `main`.
- Account settings are implemented in the workspace but are not yet committed; check `git status` and validate/build before committing.
- The authorized local SQLite reset has completed: the old local users, clubs, posts, events, budgets, tickets, bookings, certificates, applications, and notifications were removed. A new administrator and two default resources were created and login was verified. The live Render PostgreSQL database was not changed; `.env.production.local` and Render CLI access were not found. Obtain the production DB connection through a secure local environment file before any production reset.
- The new administrator details and any passwords must not be written into source control or this handoff document.
