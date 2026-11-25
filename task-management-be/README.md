# task-management-be

The tRPC API behind the task manager. It's an Express server that exposes CRUD for tasks plus a paginated list, consumed by [`task-management-fe`](../task-management-fe/README.md).

> **Status: proof of concept.** Data lives in memory and is reset on every restart. See [Storage](#storage-in-memory-for-now).

## Running it

To run both apps together from the repo root, run `yarn setup` once, then `yarn dev`. To run only this one:

```bash
yarn install          # from the repo root (this is a Yarn workspace member)
yarn start            # ts-node src/index.ts, listens on http://localhost:3005
yarn test             # Vitest
yarn test:coverage    # Vitest with the 99.9% coverage threshold
```

| Env var | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3005` | HTTP port (integer 0–65535; anything else fails at startup). tRPC is mounted at `/api`. |
| `CORS_ORIGINS` | *(empty)* | Comma-separated browser origins allowed to call the API, e.g. `http://localhost:3000`. Empty means none. Each entry must be an exact origin (no path or trailing slash), or startup fails. |

On startup the server seeds 50 demo tasks and logs `Seeded 50 tasks`.

## API

All procedures live under the `task` namespace and are called as `trpc.task.<procedure>`.

| Procedure | Type | Input | Returns | Errors |
| --- | --- | --- | --- | --- |
| `createTask` | mutation | `{ title, description? }` | the new `Task` | `BAD_REQUEST` (blank title) |
| `listTasks` | query | `{ limit?, cursor? }` (optional) | `{ items: Task[], nextCursor: string \| null }` | `BAD_REQUEST` (limit outside 1–100, malformed cursor) |
| `getTaskById` | query | `{ id }` | `Task` | `NOT_FOUND`, `BAD_REQUEST` (id is not a UUID) |
| `updateTask` | mutation | `{ id, title?, description? }` | the updated `Task` | `NOT_FOUND`, `BAD_REQUEST` |
| `deleteTask` | mutation | `{ id }` | the deleted `Task` | `NOT_FOUND` |

`Task` is `{ id: string (UUID), title: string, description?: string, creationDate: string (ISO 8601) }`. `id` and `creationDate` are always set by the server.

Over plain HTTP, queries are `GET /api/task.listTasks?input=<url-encoded JSON>` and mutations are `POST /api/task.createTask` with a JSON body.

## Structure

The code is organised by **feature module**: one folder per domain under `src/modules/`.

```
src/
├── index.ts                 # entry point: startServer({ port: resolvePort(process.env) }), exit 1 on failure
├── app.ts                   # createApp({ corsOrigins }): Express + CORS allow-list + tRPC at /api. Nothing else touches Express.
├── server.ts                # startServer(): seed, then listen. resolvePort() / resolveCorsOrigins(): validate env.
├── trpc/
│   ├── init.ts              # initTRPC, publicProcedure, domain-error middleware
│   ├── context.ts           # request context (empty for now)
│   └── root.ts              # appRouter + AppRouter type: the API contract
├── modules/
│   └── task/
│       ├── task.schema.ts      # zod schemas and inferred types
│       ├── task.service.ts     # business logic
│       ├── task.repository.ts  # data access (in memory)
│       ├── task.router.ts      # thin procedures: validate → call service
│       ├── task.seed.ts        # demo data, run at startup only
│       └── *.test.ts
└── lib/
    ├── errors.ts            # domain errors (NotFoundError)
    └── logger.ts            # project logger (JSON lines)
```

To add a feature, create `src/modules/<name>/` with the same files and register its router in `src/trpc/root.ts`. [CLAUDE.md](CLAUDE.md) has the full checklist.

## Design decisions

### Feature modules over a flat router folder
We compared the common tRPC layouts: flat routers (tRPC's own examples), T3-style `server/api/routers`, feature modules, layered folders, and a monorepo with a shared `api` package. Feature modules won. Each domain keeps its schema, logic, data access and tests together. Routers stay one-liners, and services are plain functions that can be tested without tRPC or HTTP. Moving to a shared-package monorepo later wouldn't require changing the module folders.

### `root.ts` is separate from the server code
The frontend imports `AppRouter` as a **type** to get end-to-end type safety. If that type lived next to the Express setup, every frontend type check would also load Express, CORS and `app.listen`. `root.ts` holds only the router, so the contract stays light. Keep server bootstrap out of anything `root.ts` imports.

### Services never import tRPC
Services throw plain domain errors (`NotFoundError` in `src/lib/errors.ts`). One middleware in `src/trpc/init.ts` maps them to tRPC codes (`NOT_FOUND`). That keeps business logic independent of the transport and easy to unit test. To add an error kind, add its class and its mapping in that middleware.

### Storage: in memory for now
`task.repository.ts` keeps tasks in a `Map` behind a `TaskRepository` interface, which is enough for a PoC. The service receives the repository as a constructor argument, so a database-backed implementation can replace it without touching the service, router or tests of other layers.

### Server-generated ids and ISO timestamps
`id` is a `randomUUID()` and `creationDate` is the creation time, both set in the service rather than trusted from clients. `creationDate` is an **ISO 8601 string**, not a `Date`. No tRPC data transformer (e.g. superjson) is configured, so a `Date` would arrive at clients as a string while being typed as `Date`. A string keeps the types honest. Adding superjson to both apps would allow real `Date`s.

### Cursor pagination for `listTasks`
The frontend has an infinite-scroll list, so `listTasks` uses the `{ cursor } → { items, nextCursor }` convention tRPC uses for infinite queries.
- **Order:** newest first. The default page size is 20 and the maximum is 100.
- **Cursor:** each task gets an internal sequence number on first save, like a database auto-increment id, and the cursor is that number. That gives a stable order even for tasks created in the same millisecond, which all 50 seed tasks are.
- **Why not page numbers:** creating or deleting tasks while someone scrolls would shift rows between pages, causing duplicates or gaps.
- **Why not "last task id":** the cursor would break if that task were deleted.

### CORS: deny by default
Browsers only let a page read a cross-origin response if the server sends `Access-Control-Allow-Origin` for that page's origin. The API used to send `*` (any website). That meant any page a user visited could call it from their browser and read the task data.
- **Default:** no browser origins are allowed, and no CORS headers are sent. Our frontend is unaffected because it calls the API **server-to-server** from Next.js: those requests carry no `Origin` header and aren't subject to CORS.
- **Opening it up:** when a browser client appears (e.g. the frontend adopts React Query), list its exact origin in `CORS_ORIGINS`. Allowed origins are echoed back individually, never as `*`.
- **Fail fast:** invalid entries stop the server at startup with a clear message, the same as `PORT`. The startup log states which origins are allowed.
- **Limits:** CORS protects users' browsers, not the API itself. `curl` or any server can still call it. Real access control is authentication (see [Required before production](#required-before-production-authentication-and-authorization)).

### Seed at startup only
`task.seed.ts` creates 50 demo tasks: 45 generated ones (some without a description), then 5 milestone tasks, which appear at the top. Seeding goes through the service, so ids and dates are generated normally. Only `startServer()` calls it, and it seeds before listening, so no request ever sees an empty list. Unit tests build their own services, so they always start from an empty store.

### Org standards applied
- **Logging:** through `src/lib/logger.ts`, never `console.*`.
- **No `any`:** explicit types throughout.
- **Type checking:** TypeScript 5.9, the same as the frontend. `@trpc/server` requires 5.7.2 or newer. `npx tsc --noEmit` passes cleanly.
- **Coverage:** Vitest with a **99.9%** threshold, currently at 100% (65 tests). Only `src/index.ts`, a 3-line entry point, is excluded.

### Testing at three levels
- **Unit:** the repository and the service, using a fresh in-memory store and a fake clock.
- **Procedure:** routers called through `createCallerFactory(appRouter)`, which exercises the real zod validation and error mapping without HTTP.
- **HTTP:** `src/server.test.ts` starts the real server on a random port (`port: 0`) and calls it with Node's `fetch`. It covers query input encoded in the URL, JSON POST bodies, status codes (404 for `NOT_FOUND`, 400 for `BAD_REQUEST`), CORS (allowed origin, blocked origin, preflight, no-Origin server calls, deny by default), seeding before the first request, and a clean failure when the port is taken. No `supertest` dependency is needed.

`createApp()` and `startServer()` were split out of `index.ts` so that these HTTP tests could exist. `resolvePort()` makes an invalid `PORT` fail fast with a clear message and exit code 1, instead of a confusing listen error.
- **Router tests:** procedures are called through `createCallerFactory(appRouter)`, without HTTP.

## Possible next improvements

None of these are needed for the PoC, with one exception: **authentication must be added before any production use**. The rest are listed roughly by value, each with what it buys and what it costs.

### Required before production: authentication and authorization

Today the API has **no notion of a user**. Anyone who can reach it can list, edit and delete every task. That's fine for a local PoC, and CORS (deny by default) keeps other websites' scripts out. But CORS doesn't stop `curl` or any server from calling the API. This must change before the API holds real data or runs anywhere beyond localhost. It pairs with the frontend's authentication item, and both sides should ship together.

- **Identify the caller in `createContext`:**
  - verify a credential on every request, typically a short-lived JWT in the `Authorization` header (with `jose`, against the auth provider's JWKS or a shared secret);
  - put `{ userId }` in the context;
  - treat a missing or invalid token as anonymous, never as an error inside `createContext`.
- **Add a `protectedProcedure`** in `src/trpc/init.ts`: middleware that throws `UNAUTHORIZED` when there's no user and narrows `ctx.userId` to non-null. Switch every task procedure from `publicProcedure` to it, and keep `publicProcedure` only for genuinely public routes (e.g. a future `/health`).
- **Authorization (ownership):**
  - tasks get an `ownerId`, and services take the user id explicitly (`taskService.listTasks(userId, input)`), so services still never import tRPC;
  - the repository filters every query by owner, and pagination cursors are scoped to the owner;
  - reading or changing someone else's task returns `NOT_FOUND` rather than `FORBIDDEN`, so ids can't be probed for existence.
- **Seeding:** demo data becomes per user (or development only), never shared across accounts.
- **Tests at all three levels:** a valid token passes, a missing or expired token gets HTTP **401**, and another user's task gets **404**. The procedure-level `createCaller` tests pass a context with a fake `userId`.
- **Next steps once identity exists:** rate limiting per user (improvement 13), and audit fields (`createdBy`/`updatedBy`). Items marked *(pairs with FE n)* match an entry in the [frontend's list](../task-management-fe/README.md#possible-next-improvements).

### Developer experience

1. **Reload on save in development.** `yarn start` runs `ts-node` once, so code changes need a manual restart. That's how a stale server once kept answering "No procedure found" for the new task module. `tsx watch src/index.ts` (or `node --watch` with a TS loader) restarts on every save. Keep a separate non-watching script for production.
2. **ESLint + Prettier.** The frontend is linted; the backend isn't. Use `typescript-eslint` with the strict and type-checked presets. That would also enforce the org rules automatically (`no-console`, `no-explicit-any`, file and function size limits) instead of relying on review.
3. **Fake latency in development.** A `LATENCY_MS` environment variable that delays every tRPC response. It makes the frontend's skeletons and "Loading…" states visible locally. It's off by default and a few lines in `createApp()`.

### Persistence

4. **A real database.** Replace the in-memory `Map` with Postgres (or SQLite for local work) through **Drizzle** or **Prisma**. Only `task.repository.ts` changes, because the service depends on the `TaskRepository` interface.
   - **The cursor:** becomes an auto-increment column or `(creationDate, id)`. Paging becomes `WHERE … ORDER BY … LIMIT`.
   - **Seeding:** moves out of startup into an explicit `yarn db:seed` script, so restarts stop wiping data.
   - **Costs:** migrations, a database in development and CI (Docker Compose), and connection handling in `startServer()`.
5. **Repository tests against the real database.** Run the existing repository tests against a throwaway Postgres (Testcontainers), so paging and ordering are verified on the engine that runs in production.
6. **`updatedAt` and optimistic concurrency.** Add `updatedAt`, and have `updateTask` accept the version it last read. Two people editing the same task then get a conflict error instead of the second save silently overwriting the first.

### API

7. **Search, filter and sort on `listTasks`** *(pairs with FE 16)*. Add optional `search`, `sort` and filter input. Each sort needs its own cursor encoding, e.g. `(title, seq)` when sorting by title, to keep cursor paging stable.
8. **superjson transformer** *(pairs with FE 6)*. Set it in `initTRPC.create({ transformer })` and change `creationDate` to `z.date()`, so clients get real `Date`s. The frontend's client must switch in the same change.
9. **Shared zod schemas package** *(pairs with FE 10)*. Move `task.schema.ts` into a package both apps import, so the frontend's forms validate with the exact backend rules. This is option 5 from the structure decision: a monorepo with a shared package.
10. **Explicit "clear" semantics in `updateTask`.** Clearing a description currently relies on sending `""` (now covered by a test). Accepting `description: null` to mean "remove" would be clearer for API clients other than our own form.
11. **Live updates.** tRPC subscriptions over server-sent events (`httpSubscriptionLink`) could push task changes to open lists. That only makes sense once the frontend has a client cache *(pairs with FE 3)*.
12. **OpenAPI for non-TypeScript clients.** `trpc-to-openapi` can expose selected procedures as REST with an OpenAPI spec, if a mobile app or third party ever needs the API.

### Security and hardening

13. **Security headers and rate limiting.** `helmet` for standard headers, and `express-rate-limit` (per IP, later per user) on mutations, to blunt abuse once the API is reachable beyond localhost.
14. **Request size and input limits.** Set an explicit JSON body limit, and a max length on `title`/`description` in the zod schema, so a single request can't store megabytes of text.

### Operations

15. **Production build.** Compile with `tsc` to `dist/` and run `node dist/index.js` in production. `ts-node` compiles at startup and is meant for development. Add a `Dockerfile` for deployment.
16. **Validate all configuration at startup.** Extend `resolvePort()` into a single zod-validated `env.ts` (port, database URL, allowed origins…). Every misconfiguration then fails fast with one clear message.
17. **Health check and graceful shutdown.** Add a `GET /health` route (and later a readiness check that pings the database) for load balancers. On `SIGTERM`, stop accepting connections and let in-flight requests finish via `server.close()`, then close the database pool.
18. **Request-scoped structured logging.** Swap the logger's internals for `pino` (`src/lib/logger.ts` already isolates that). Add a request id to the tRPC context and log each procedure's path, duration and error code. Report unexpected errors to an error tracker.
19. **CI pipeline.** On every push: lint, `tsc --noEmit`, and `yarn test:coverage` (which enforces the 99.9% threshold) for both apps.

## Known issues
- **The IDE can show stale type errors after backend changes.** Because the frontend type-checks against `src/trpc/root.ts`, VS Code may keep an old copy of the router. Fix it with *TypeScript: Restart TS Server*.
