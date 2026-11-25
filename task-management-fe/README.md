# task-management-fe

The Next.js 16 (App Router, React 19) frontend of the task manager. You can list, create, edit and delete tasks against [`task-management-be`](../task-management-be/README.md) over tRPC, with end-to-end types and no hand-written API types.

## Running it

The easiest way is from the repo root: run `yarn setup` once, then `yarn dev`. That starts the backend (port 3005) and this app (port 3000) together.

To run this app on its own, start the backend first (`yarn start` in `task-management-be`), then:

```bash
npm install
npm run dev             # http://localhost:3000
npm run build && npm start
npm test                # Vitest + Testing Library
npm run test:coverage   # with the 99.9% coverage threshold
npm run lint
```

| Env var | Default | Purpose |
| --- | --- | --- |
| `TRPC_URL` | `http://localhost:3005/api` | Backend tRPC endpoint. Read on the server only. |

This app is a separate npm project with its own lockfile. It isn't part of the root Yarn workspace.

## Pages

| Route | What it does | Backend calls |
| --- | --- | --- |
| `/` | Task list with infinite scroll. Each row has a Delete button. | `listTasks`, `deleteTask` |
| `/tasks/new` | Create form | `createTask` |
| `/tasks/[id]` | Edit form, with Delete | `getTaskById`, `updateTask`, `deleteTask` |

There is no read-only details page; selecting a task opens its edit form. After any create, update or delete, you land back on the list with a toast ("Task Created", "Task Updated", "Task Deleted").

## Structure

```
app/                     # routes only compose components
├── layout.tsx           # nav bar + <Toaster>
├── page.tsx             # task list
├── error.tsx            # "backend unreachable" boundary with retry
└── tasks/
    ├── actions.ts       # server actions: create, update, delete, loadMore
    ├── form-state.ts    # pure validation + form state (safe for client components)
    ├── form-errors.ts   # tRPC error → form message (server only)
    ├── new/page.tsx
    └── [id]/page.tsx, not-found.tsx
components/
├── ui/                  # generic: Button, ButtonLink, BackLink, PageHeader, FormField,
│                        #          FormattedDate, Toast, Toaster, InfiniteScrollTrigger
└── tasks/               # feature: TaskList, InfiniteTaskList, TaskListView, TaskListItem,
                         #          TaskForm, EditTask, DeleteTaskButton, skeletons
lib/
├── trpc.ts              # tRPC client + RouterInputs/RouterOutputs
├── tasks.ts             # server-side reads (data layer)
└── toast.ts             # toast kinds and messages
```

Feature components come in three kinds:
- **Async data components** (`TaskList`, `EditTask`): fetch on the server and pass data down.
- **Pure views** (`TaskListView`, `TaskListItem`): render what they're given.
- **Client components** (`TaskForm`, `DeleteTaskButton`, `InfiniteTaskList`): handle interaction.

Server actions are passed down as props instead of imported deep in the tree, so the views can be tested without mocks.

## Design decisions

### The browser never talks to the backend
Only the Next.js server calls tRPC:
- **Reads** go through `lib/tasks.ts` from Server Components.
- **Writes** and **"load more"** go through server actions in `app/tasks/actions.ts`.

The backend URL stays private, and the tRPC client is never shipped to the browser. These are server-to-server calls with no `Origin` header, so CORS doesn't apply to them. That's why the backend can deny all browser origins by default (`CORS_ORIGINS` empty). A production build confirms that no browser file contains it.

### End-to-end types from the backend router
`lib/trpc.ts` imports `AppRouter` **type-only** from `../task-management-be/src/trpc/root.ts`, which is erased at build time. Every input and output type is derived from it (`RouterOutputs["task"]["listTasks"]`, …), so a backend change that breaks the contract fails the frontend type check. That's how changing `listTasks` from an array to a page was caught.

### Rendering: server-side with streaming
Server Components are the App Router default; nothing on the data path has `"use client"`. With `cacheComponents: true` (in `next.config.ts`), each route is partially prerendered:
- **Static shell:** the nav, headings and loading skeletons are built ahead of time and sent immediately.
- **Data:** the task data is fetched on the server per request (`connection()` in `lib/tasks.ts`) and streamed into `<Suspense>` boundaries.

The first page of tasks is therefore in the initial HTML. The page doesn't load tasks with client-side JavaScript.

### Mutations: validate, redirect, toast
- **Server action steps:** each action validates its input, calls tRPC, calls `revalidatePath`, then `redirect(withToast("/", "created" | "updated" | "deleted"))`.
- **Order matters:** `revalidatePath` must come before `redirect`, and `redirect` must stay outside `try`, because it works by throwing.
- **Toasts:** `<Toaster>` (in the layout) reads `?toast=`, shows the message top-right for 3 seconds, then removes the parameter with `history.replaceState` so a refresh doesn't repeat it.
- **Allow-list:** only kinds listed in `lib/toast.ts` render, so a crafted URL can't put arbitrary text on screen.

### Form validation runs twice
`validateTaskForm` in `form-state.ts` is one pure function used in two places:
- **In the browser, on submit:** instant feedback with no round trip.
- **In the server action:** the source of truth, which also covers browsers without JavaScript.

`FormField` + `controlProps()` give required fields a red asterisk, and invalid ones a red border, `aria-invalid` and an error message linked to the field for screen readers. Failed submits return the typed `values`, so nothing is lost.

`form-state.ts` must stay free of server-only imports because client components import it. That's why the tRPC error mapping lives separately in `form-errors.ts`. Before the split, the tRPC client was leaking into the browser bundle.

### Forms reset when you leave them
With Cache Components, Next.js doesn't unmount a page you navigate away from. It hides it in React's `<Activity>` and keeps up to 3 such pages alive. A half-edited form would therefore reappear when you return. `TaskForm` remounts itself whenever it's hidden (a `useLayoutEffect` cleanup), so Back, Cancel or any other navigation discards unsaved edits. See `node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md`.

### Infinite scroll: server-rendered first page, server action for the rest
- **How it works:** `TaskList` renders page 1 (20 tasks) on the server. `InfiniteTaskList` (client) appends later pages through `loadMoreTasksAction` when `InfiniteScrollTrigger` (an `IntersectionObserver`) comes within 200px of the viewport.
- **Fallback and states:** a "Load more" button is the keyboard and screen-reader fallback. The list also shows an error with Retry, and an end-of-list message.
- **Rejected alternative:** we chose this over tRPC + React Query in the browser (`useInfiniteQuery`). That would have added a library, a provider and a public backend URL, and doubled the data-fetching models.
- **After a change:** when the server sends a new first page, the list restarts from page 1. That happens after any create, update or delete. Appended pages could otherwise show stale data.
- **Limitations:**
  - Deleting a task deep in the list scrolls you back to the top.
  - Without JavaScript only the first 20 tasks are reachable. A `?cursor=` link fallback isn't implemented.

### Navigation follows the org standard
Every navigation is a `<Link>` (`ButtonLink`, `BackLink`), never `onClick={() => router.push()}`. Back buttons go to a fixed parent page (the list) rather than browser history, so they also work when a page is opened from a URL.

### Delete asks for confirmation
`DeleteTaskButton` is two-step: Delete, then Confirm delete / Cancel. It's used both on the list rows and in the edit page header.

### Loading states
- **Page data:** skeletons in `<Suspense>` (`TaskListSkeleton`, `TaskSkeleton`).
- **Buttons:** "Loading…", "Saving…" and "Deleting…" labels, with the buttons disabled.

Against a local backend these flash by too fast to see. Use DevTools network throttling, or add artificial backend latency, to see them.

## Testing

- **Tools:** Vitest + Testing Library in jsdom, with a **99.9%** coverage threshold (currently 100%).
- **Async Server Components:** test by rendering the awaited element, `render(await TaskList())`. Pages stub their async children with `vi.mock`.
- **`IntersectionObserver`:** jsdom doesn't have one, so it's faked globally (`test/intersection-observer.ts`). Look observers up by element, `FakeIntersectionObserver.active(selector)`, because `next/link` also creates observers (for prefetching).
- **Fixtures:** shared in `test/fixtures.ts` (`makeTask`, `trpcError`, `NavigationSignal`).

## Possible next improvements

None of these are needed for the PoC, with one exception: **authentication must be added before any production use**. The rest are listed roughly by value, each with what it buys and what it costs.

### Required before production: authentication

Today there's **no login**. Anyone who can open the app can read, edit and delete every task. That's acceptable for a local PoC and not for production. It pairs with the backend's authentication and authorization item, and both sides should ship together.

- **Pick an approach:**
  - **Self-hosted library:** Auth.js (NextAuth v5) or Better Auth. Users and sessions stay in our own database.
  - **Hosted provider:** Clerk, Auth0 or WorkOS. Gives SSO, MFA and user management out of the box, at a per-user cost.
  - **Hand-rolled:** the Next.js authentication guide shows encrypted cookie sessions with `jose` or `iron-session`. It's feasible, but more security surface to own.
  - **Any choice:** the session lives in an `httpOnly`, `secure`, `sameSite=lax` cookie.
- **Sign-in and sign-out:** a `/login` page and server actions, plus a "Signed in as … / Sign out" area in the nav bar.
- **Protect routes in two layers,** as the Next.js docs recommend:
  1. **Optimistic redirect in `proxy.ts`** (Next 16's name for middleware). Cheap cookie check: send signed-out users to `/login`. This is for UX only.
  2. **Real check close to the data.** `lib/tasks.ts` and **every server action** verify the session before calling tRPC. Server actions can be called directly, so a check in the page alone isn't enough.
- **Pass the user to the backend:**
  - `lib/trpc.ts` adds the user's credential (a short-lived JWT) to each server-to-server call through `httpBatchLink({ headers })`;
  - the token never reaches the browser, and the backend stays CORS-closed;
  - if the frontend later adopts React Query (improvement 3), auth must also work for browser calls.
- **Handle auth errors:**
  - map tRPC `UNAUTHORIZED` (expired session) to a redirect to `/login`, through `trpcErrorCode`, `form-errors.ts` and `error.tsx`;
  - a task that belongs to someone else already shows "Task not found", because the backend answers `NOT_FOUND`.
- **Cache Components caveats:** reading the session (`cookies()`) is request-time data, so it must sit inside `<Suspense>`. Never put user data in `"use cache"` keys or tags. See `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md`.
- **Tests:** unit-test the data-layer and server-action checks with a mocked session. The Playwright suite (improvement 1) should cover the signed-out redirect and the sign-in → tasks → sign-out flow.

### Testing

1. **End-to-end tests with Playwright.** Unit tests mock tRPC, `next/navigation` and `IntersectionObserver`, so the real browser flow is only checked by hand. A small suite running against `yarn dev` would cover what jsdom can't:
   - **Flows:** create → toast → task at the top of the list; blank title → red field and nothing sent; edit → Back → reopen shows the original title (the hidden-page regression); delete from the list → toast; scroll → more tasks load → end-of-list message.
   - **Real-browser behaviour:** SSR streaming, hydration, real scrolling, and Next.js's page preservation (`<Activity>`), which the unit tests only simulate.
   - **Cost:** a browser download in CI, and a running backend. The Next.js testing docs recommend E2E specifically for async Server Components.
2. **Visual and accessibility checks.** Run `@axe-core/playwright` inside the E2E suite to catch accessibility issues. Optionally add screenshot comparisons for states asserted today only through CSS class names: the red invalid border, the toast position, the skeletons.

### Data fetching

3. **TanStack React Query via `@trpc/tanstack-react-query`** (option B from the infinite-scroll decision).
   - **Gains:**
     - a client cache with `useInfiniteQuery`, deduplication and background refetching;
     - optimistic updates, so a delete disappears instantly;
     - **keeping your scroll position and loaded pages after a mutation**, instead of today's reset to page 1;
     - cheap tRPC subscriptions or polling later.
   - **Costs:**
     - a provider in the layout;
     - prefetching the first page on the server and handing it to the browser (`HydrationBoundary`), to keep the first load server-rendered;
     - the browser calling the backend directly. Its URL becomes public, the frontend's origin must be added to the backend's `CORS_ORIGINS`, and authentication has to be designed for browsers.
   - **When:** this pays off once several screens share data or need live updates. Until then, server actions keep things simpler.
4. **Optimistic UI without a new library.** React 19's `useOptimistic` could remove a task from the list the moment Delete is confirmed, and roll back if the server action fails. It's a smaller step than React Query, for the most visible delay.
5. **Caching reads with Cache Components.** The list is fetched on every request (`connection()`). `"use cache"` + `cacheTag("tasks")` on the reads, with `updateTag("tasks")` in the server actions, would serve the list from cache until something changes. Worth it when the backend is slow or busy.
6. **Real `Date`s with superjson.** Configure the same `superjson` transformer in the backend and in `lib/trpc.ts`, so `creationDate` can be a real `Date` end to end instead of an ISO string.

### UI components and forms

Every component is hand-rolled today on purpose, to keep the PoC dependency-free and show the patterns. As the UI grows, these libraries would replace custom code:

7. **shadcn/ui (Radix UI primitives + Tailwind).** It fits the current Tailwind setup, and the components are copied into the repo, so we own the code and there's no runtime dependency to version.
   - **Replacements:** `Button`, `FormField` and the input classes, plus a proper **AlertDialog** in place of the inline two-step delete confirmation.
   - **Gains:** focus trapping, keyboard handling and ARIA behaviour we'd otherwise have to build and test ourselves.
8. **Sonner for toasts.** Instead of `Toast`/`Toaster`, it handles stacking, swipe-to-dismiss, pausing on hover and promise toasts ("Deleting… → Task Deleted"). Keep the `?toast=` allow-list bridge so toasts still survive a server-side redirect.
9. **React Hook Form + `@hookform/resolvers/zod`.** Field-level validation as you type, dirty-state tracking (e.g. "You have unsaved changes" before leaving the edit page), and less hand-written form state. It works with server actions through `handleSubmit` → action.
10. **Shared zod schemas.** Move the task schemas into a package both apps import, which is option 5 from the backend's structure decision. Form validation would then reuse the backend's exact rules instead of re-implementing them in `validateTaskForm`. This pairs naturally with React Hook Form's zod resolver.
11. **lucide-react icons.** Replaces text glyphs (`←`, `✕`) with consistent, accessible SVG icons. It's the icon set shadcn/ui uses.
12. **Storybook.** A browsable catalog of the `components/ui` primitives and task components in every state (loading, error, empty, invalid). Useful once more than one person builds UI, or for design review.

### UX gaps called out in the decisions above

13. **Keep your scroll position after deleting deep in the list.** This comes for free with React Query (item 3). Without it, merge the new first page into the already-loaded pages instead of restarting.
14. **No-JavaScript fallback for infinite scroll.** Render "Load more" as a `<Link href="/?cursor=…">` that the server understands, so pages beyond the first 20 are reachable without JavaScript.
15. **"Unsaved changes" guard on the edit form.** Today, leaving the form silently discards edits (by design). A confirmation when the form has been changed would prevent accidental loss. It needs dirty tracking (item 9).
16. **Search, filter and sort** on the list. These need matching `listTasks` input on the backend, and should keep cursor pagination.

### Operations

17. **Frontend logging and error reporting.** The org standard is a project logger instead of `console.*`. The frontend doesn't log anywhere yet. Add a logger (server and client) and report `error.tsx` boundaries to an error tracker.
18. **Environment validation at startup.** Validate `TRPC_URL` (e.g. with zod) when the app boots, the way the backend validates `PORT`, so a typo fails fast instead of surfacing as "Something went wrong".

## Known issues
- **The IDE can show stale type errors** (e.g. "Property 'task' does not exist") after backend changes, because VS Code may keep an old copy of the backend router. Run *TypeScript: Restart TS Server*. `npx tsc --noEmit` reflects the real state.
- **`next dev` modifies `AGENTS.md`.** It rewrites part of the file because `experimental.agentFeedback` is enabled.

[CLAUDE.md](CLAUDE.md) holds the condensed conventions for AI-assisted changes.
