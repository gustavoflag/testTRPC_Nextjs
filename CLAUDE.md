# testTRPC_Nextjs

Two apps sharing one tRPC contract:

- `task-management-be/`: tRPC API (Express, Yarn workspace member). Before backend work, read `task-management-be/CLAUDE.md` for the module pattern.
- `task-management-fe/`: Next.js 16 client. It is a separate npm project with its own lockfile, outside the Yarn workspace. Its `AGENTS.md` covers Next.js specifics.

Root scripts:
- `yarn setup`: installs both apps.
- `yarn dev` (alias `yarn start`): runs both with `concurrently`, backend on 3005 and frontend on 3000. Ctrl+C stops both.
- `yarn test`: runs both test suites.

The frontend gets end-to-end types by importing `AppRouter` type-only from `task-management-be/src/trpc/root.ts` (see `task-management-fe/lib/trpc.ts`). The client is called from server components wrapped in `<Suspense>`, because `cacheComponents` is on.
