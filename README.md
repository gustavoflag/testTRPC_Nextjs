# Task Management: tRPC + Next.js

A proof-of-concept task manager made of two apps that share one type-safe API contract:

| App | Stack | Port | Docs |
| --- | --- | --- | --- |
| [`task-management-be`](task-management-be/) | tRPC v11 on Express, zod, in-memory storage | 3005 | [README](task-management-be/README.md) |
| [`task-management-fe`](task-management-fe/) | Next.js 16 (App Router, React 19), Tailwind | 3000 | [README](task-management-fe/README.md) |

You can list tasks (with infinite scroll), create, edit and delete them. The backend seeds 50 demo tasks on every start.

## Quick start

Requirements: Node.js (developed on v24), Yarn 1 and npm.

```bash
yarn setup   # once: installs the root + backend (Yarn) and the frontend (npm)
yarn dev     # starts both apps; Ctrl+C stops both
```

Then open http://localhost:3000.

## Root scripts

| Script | What it does |
| --- | --- |
| `yarn setup` | Runs `yarn install` for the root and backend, then `npm install` in `task-management-fe`. |
| `yarn dev` | Starts both apps with `concurrently`: the backend via `ts-node` and the frontend via `next dev`. Output is prefixed `[be]` (blue) and `[fe]` (magenta). |
| `yarn start` | Alias of `yarn dev`. |
| `yarn test` | Runs the backend test suite, then the frontend one. |

`yarn dev` runs `concurrently` with `-k`, so if one app exits the other is stopped too. For example, if port 3005 is already taken the backend fails, and you don't end up with a frontend that only shows "Something went wrong".

To run a single app, use its own scripts (`yarn start` in `task-management-be`, `npm run dev` in `task-management-fe`). Both READMEs have the details.

## Configuration

| Env var | App | Default | Purpose |
| --- | --- | --- | --- |
| `PORT` | backend | `3005` | HTTP port. tRPC is served at `/api`. |
| `CORS_ORIGINS` | backend | *(empty)* | Browser origins allowed to call the API. Empty means none. The frontend doesn't need an entry: it calls server-to-server. |
| `TRPC_URL` | frontend | `http://localhost:3005/api` | Where the Next.js server reaches the backend. |

> `next dev` also reads `PORT`, so setting `PORT` before `yarn dev` would move **both** apps to that port. To run the backend on another port, start the apps separately and point the frontend at it with `TRPC_URL`.

## How the two apps fit together

```
Browser ──HTTP──▶ Next.js server (task-management-fe) ──tRPC──▶ Express + tRPC (task-management-be)
                     ▲                                                  │
                     └──── import type { AppRouter } ◀─ src/trpc/root.ts┘   (types only, at build time)
```

- **One contract, no duplicated types:** the frontend imports the backend's `AppRouter` *type* from `task-management-be/src/trpc/root.ts`. Every request and response type is derived from it. If a backend change breaks the contract, the frontend type check fails.
- **The browser never calls the backend:** reads happen in Server Components, and writes (plus "load more") go through Next.js server actions. The backend URL stays private, and the tRPC client isn't shipped to the browser. The backend therefore allows **no** browser origins by default (CORS deny-by-default).
- **Server-rendered with streaming:** the first page of tasks is in the initial HTML. Later pages load as you scroll.

The design decisions behind each app (module layout, pagination, validation, toasts, form resets, …) are explained in the app READMEs.

## Repository layout and tooling choices

```
.
├── package.json          # root scripts + Yarn workspace (backend only)
├── yarn.lock
├── task-management-be/   # Yarn workspace member
└── task-management-fe/   # separate npm project (own package-lock.json)
```

- **Flat layout:** both apps live directly at the root. They used to sit under a `trpclibrary/` folder, which was removed and the workspace config updated to match.
- **The frontend is not in the Yarn workspace, on purpose.** Adding it would move all of its packages, including Next.js and React, into a shared Yarn setup, and its `package-lock.json` would be dropped. That's a larger change than a PoC needs. As a result, it is installed separately (`yarn setup` handles it) and its scripts are called with `npm --prefix`.

## Known issues

- **No authentication.** Anyone who can reach the apps can read, edit and delete every task. That's fine for a local PoC, but it **must be added before production**. Both apps describe what's needed under "Required before production" in their improvement lists ([backend](task-management-be/README.md#required-before-production-authentication-and-authorization), [frontend](task-management-fe/README.md#required-before-production-authentication)).
- **The IDE can show stale type errors** (e.g. "Property 'task' does not exist") after backend changes. Because the frontend type-checks against a backend file, VS Code may keep an old copy of the router. Run *TypeScript: Restart TS Server*. `npx tsc --noEmit` in `task-management-fe` reflects the real state.
- **Data is in memory.** Every backend restart, including each `yarn dev`, resets the store to the 50 seed tasks.

## Docs for AI-assisted changes

Each folder has a `CLAUDE.md` with the condensed conventions: the [root](CLAUDE.md), the [backend module pattern](task-management-be/CLAUDE.md) and the [frontend patterns](task-management-fe/CLAUDE.md). The frontend also has `AGENTS.md`, which is generated by `next dev`.
