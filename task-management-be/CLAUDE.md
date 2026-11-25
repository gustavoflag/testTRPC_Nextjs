# task-management-be

tRPC v11 API on Express. Code is organised by **module**: one folder per domain under `src/modules/<name>/`.

## Module pattern

Every feature is a module with these files:

| File | Holds |
| --- | --- |
| `<name>.schema.ts` | zod input schemas and the input/output types inferred from them |
| `<name>.service.ts` | business logic as plain functions on a `<name>Service` object. Takes typed input, returns typed output; imports nothing from tRPC or Express |
| `<name>.router.ts` | thin procedures: `publicProcedure.input(schema).query/mutation(({ input }) => service.fn(input))` |
| `<name>.repository.ts` | only for modules that store data: a `<Name>Repository` type plus a `create<Name>Repository()` factory. Currently in-memory, swappable for a DB without touching the service |
| `<name>.*.test.ts` | Vitest tests, next to the code they cover |

Services that use a repository take it as a constructor argument: `create<Name>Service(repository)`, plus an exported default instance the router uses. Tests build a fresh service per test from a fresh repository.

Demo data lives in `<name>.seed.ts`: a `seed<Name>s(service)` function that creates records through the service. Only `startServer()` in `src/server.ts` calls it, once at startup. Unit tests build their own services and always start from an empty store.

Services signal failures with domain errors from `src/lib/errors.ts` (e.g. `NotFoundError`). The `domainErrors` middleware in `src/trpc/init.ts` maps them to tRPC codes. To add a new error kind, add the class there and its mapping in that middleware.

List procedures use cursor pagination: input `{ limit?, cursor? }`, output `{ items, nextCursor }` (`null` on the last page), newest first. The cursor is a repository-internal sequence number, not an id or a page number, so deleting a task mid-scroll never breaks it.

Timestamps are ISO 8601 strings (`z.iso.datetime()`). No data transformer is configured, so `Date` objects would arrive at clients as strings while being typed as `Date`.

Adding a module is done when:
1. All four files exist, with logic in the service and the router only wiring.
2. The router is registered in `src/trpc/root.ts` as `<name>: <name>Router`.
3. `yarn test:coverage` passes its 99.9% threshold.

Router tests call procedures without HTTP: `createCallerFactory(appRouter)({})` from `src/trpc/init.ts`.

## Boundaries

- `src/trpc/root.ts` is the API contract. `task-management-fe` imports `AppRouter` from it (type-only), so this file and everything it imports stay free of server bootstrap: no `app.listen`, no Express setup.
- `src/app.ts` (`createApp`) is the only place that touches Express. `src/server.ts` (`startServer`, `resolvePort`) seeds and listens. `src/index.ts` is a 3-line entry point and the only file coverage excludes.
- CORS is deny-by-default: `CORS_ORIGINS` (validated by `resolveCorsOrigins`) lists exact browser origins. Never reintroduce a bare `cors()`, which allows `*`. The frontend calls server-to-server, so it needs no entry.
- HTTP-level behaviour (URL input encoding, status codes, CORS, seeding) is tested in `src/server.test.ts` against a real server on port 0 using `fetch`. Add a case there when you change anything in `app.ts` or `server.ts`.
- `src/trpc/init.ts` is the only place that calls `initTRPC`. New procedure kinds (e.g. a `protectedProcedure` with auth middleware) are exported from there.
- Renaming or moving a procedure changes its client path (`trpc.<module>.<procedure>`). Update callers in `task-management-fe` in the same change.

## Logging

Log through `logger` from `src/lib/logger.ts`.
