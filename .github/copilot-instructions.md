# Copilot Instructions

## Architecture Snapshot

**Core layers (request → database):**

- Express entrypoint: `src/index.ts` boots middleware (`express.json`, `bodyParser.urlencoded`) and routes `/incoming-webhook` → `webhookMiddleware` → `webhookController`. Register new routes here or via extracted routers.
- Controllers (`src/controllers/`): Orchestrate the flow (receive validated payload, instantiate services, return response). Example: `webhook-controller.ts` dispatches lead processing to `WebhookService` per lead ID.
- Services (`src/services/`): Stateless business logic (see `webhook-service.ts` for lead/product processing, `api-service.ts` for external CRM calls, `email-logger-service.ts` for notifications).
- Repositories (`src/repositories/`): Prisma query wrappers (e.g., `PaymentRepository`, `StudentRepository`) for consistent data access; instantiate fresh per service call.
- Schemas (`src/schemas/`): Zod validators for webhook shape, lead data, and catalog elements; define once, reuse in middleware and services.

**Middleware ordering matters:** `webhookMiddleware` (in `src/middleware.ts`) validates the payload and logs via email _before_ the controller runs; validation failures return early with `400`.

## Data & Prisma

- Schema is in `prisma/schema.prisma`; key entities: `Student`, `Payment`, `Attendance`, `Cart`, `Group`, `Lesson`, `UnprocessedPayment` (catch-all for failed lead processing).
- Prisma singleton: `src/lib/prisma.ts` uses `PrismaPg` adapter and `.env` `DATABASE_URL`; import as `import { prisma } from "../lib/prisma"` and reuse across requests (avoids connection pool exhaustion).
- Migrations: Live in `prisma/migrations/`; regenerate client after schema changes via `npx prisma generate` (auto-updates `src/generated/prisma/client`—never hand-edit that folder).
- Important: When adding new model relations (e.g., linking `Payment` to `Lead`), update the schema and regenerate; then update Zod schemas in `src/schemas/` to match.

## Request Flow & Error Handling

- **Happy path:** `POST /incoming-webhook` → parsed body matches `WebhookSchema` → valid subdomain + leads extracted → per lead: `WebhookService.processLead()` fetches from CRM, `processProducts()` extracts items → store result or throw.
- **Validation failure:** `WebhookSchema.safeParse()` fails → log detailed error via `emailLoggerService.logError()` → return `400 + validation tree` to caller.
- **Business logic failure:** Lead missing required name, student not found, etc. → create `UnprocessedPayment` record (see `webhook-service.ts`) with reason + raw data; continue processing other leads; final response is `200 OK` unless _all_ leads fail.
- **Transient errors:** Service calls may timeout; always wrap in try-catch and decide: retry, store for manual review, or fail the lead gracefully.

## Email & Observability

- **Centralized logging:** `EmailLoggerService` (`src/services/email-logger-service.ts`) sends structured emails (styled HTML template) via nodemailer; methods: `logError()`, `logSuccess()`, `logInfo()` all return `true/false`.
- **Usage pattern:** `const sent = await emailLoggerService.logError(message); if (!sent) { /* fallback: log to console, store in DB */ }`.
- **SMTP config:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` required in `.env`; transporter creation happens once in constructor; missing env keys fail at runtime (nodemailer throws on `sendMail()`).
- **Content escaping:** Always call `escapeHtml()` (from `src/lib/utils.ts`) before inserting user input into email templates; middleware and controller already do this for webhook validation errors.

## Build & Runtime Workflow

- **TypeScript:** `tsconfig.json` targets `ES2023`, `module: commonjs`, rootDir `src/`, outDir `dist/`. Build: `npm run build` → emits `dist/index.js` (executable via `npm start`).
- **Dev workflow:** `npm run dev` runs `tsx src/index.ts` (ts-node with ESM support); auto-restarts on file changes. For production, always run `npm run build` first; `npm start` runs compiled output, not source.
- **Environment loading:** `dotenv/config` imported in `src/lib/prisma.ts` (dev) or injected by hosting platform (production); ensure `.env` exists locally and all required keys are set before `npm run dev`.
- **Port:** Defaults to `3000` unless `PORT` env var is set; check logs for confirmation.

## Implementation Conventions

- **ESM only:** `package.json` sets `type: module`; use `import/export`, no `require()`. Breaking this freezes the app at startup.
- **Validation & DTO types:** Define Zod schemas in `src/schemas/`, export TypeScript types as `z.infer<typeof Schema>` (e.g., `WebhookSchemaType`, `LeadDataDto`). Import schemas into middleware for early validation.
- **Repositories over raw Prisma:** Wrap data access in `PaymentRepository`, `StudentRepository` classes; keeps queries in one place and simplifies testing/mocking.
- **Service composition:** Services take dependencies as constructor parameters (e.g., `WebhookService` instantiates its own `APIService`, `StudentRepository`). Avoid circular imports; pass data via arguments if needed.
- **Fail gracefully on partial success:** If webhook has 5 leads and 2 fail → store them in `UnprocessedPayment`, log the errors, return `200 OK` for the batch. Only return `500` if _infrastructure_ fails (Prisma connection, SMTP timeout, etc.).
- **Response shape:** All endpoints return JSON; error responses include `{ ok: false, error: string }` or `{ ok: true }` for success.
