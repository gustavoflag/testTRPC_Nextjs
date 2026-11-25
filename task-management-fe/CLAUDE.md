@AGENTS.md

# task-management-fe

Next.js 16 client for `task-management-be`, talking to it over tRPC from the server only. The browser never calls the backend directly.

## Data flow

- **Reads:** `lib/tasks.ts` is the server-side data layer. Each function calls `connection()` first, then the tRPC client from `lib/trpc.ts`, and returns `null` for a missing record instead of throwing.
- **Writes:** server actions live in `app/<feature>/actions.ts` and call `trpc.<module>.<procedure>.mutate`. Expected tRPC errors (`BAD_REQUEST`, `NOT_FOUND`) become a `{ error }` form state for `useActionState`. Anything else is rethrown to `app/error.tsx`. Call `revalidatePath` before `redirect`, and keep `redirect` outside `try`, because it works by throwing.
- **Form validation:**
  - Rules live in `app/<feature>/form-state.ts` as a pure `validate…Form` function.
  - The client form runs it on submit, for instant feedback, and the server action runs it again before calling tRPC. Field errors go in `fieldErrors`, and the submitted `values` come back so typed input isn't lost.
  - Render each field with `FormField` (`required`, `error`) and spread `controlProps(id, error)` on the control. That gives the red asterisk, the red border, and `aria-invalid`/`aria-describedby`.
  - `form-state.ts` is imported by client components, so keep it free of server-only imports such as `lib/trpc`. tRPC error mapping lives in `form-errors.ts`.
- **After a successful mutation:** redirect to the list with a toast, e.g. `redirect(withToast("/", "created"))`. `<Toaster>` in the layout shows it and strips `?toast=` from the URL. New toast kinds go in `toastMessages` in `lib/toast.ts`. Unknown kinds are ignored, so URLs can't inject text.
- **Types:** derive them from the router with `RouterOutputs` and `RouterInputs` from `lib/trpc.ts`, never by redeclaring backend shapes.

## Components

- Pages in `app/` only compose. They wrap each data component in `<Suspense>` with a skeleton fallback, which `cacheComponents` requires.
- `components/<feature>/` holds feature components, of two kinds:
  - **Async data components** (e.g. `TaskList`, `EditTask`) fetch and pass data down. They receive `params` as a promise and call `notFound()` on `null`.
  - **Pure views** (e.g. `TaskListView`, `TaskListItem`) and **client components** (`"use client"`, e.g. `TaskForm`, `DeleteTaskButton`) take data and server actions as props, so they can be tested without mocks.
- `cacheComponents` hides pages you leave (React `<Activity>`) instead of unmounting them, so their state and DOM come back on return. Forms that should start fresh on every visit must reset when hidden. `TaskForm` does this by remounting its body from a `useLayoutEffect` cleanup. See `node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md`.
- The task list is an infinite scroll. `TaskList` renders page 1 on the server, and `InfiniteTaskList` appends later pages through the `loadMoreTasksAction` server action when `InfiniteScrollTrigger` scrolls into view. A "Load more" button is the keyboard fallback. A new `initialPage` from the server (after any mutation) restarts the list from page 1.
- `components/ui/` holds generic primitives (`Button`, `ButtonLink`, `PageHeader`, `FormField`, `FormattedDate`). Build features from these before adding new markup.

## Tests

Vitest and Testing Library. Tests sit next to the code, or are grouped per folder, and shared fixtures live in `test/fixtures.ts`. To test an async server component, render the result of awaiting it: `render(await TaskList())`. Pages stub their async children with `vi.mock`. `IntersectionObserver` is faked globally (`test/intersection-observer.ts`). Find observers with `FakeIntersectionObserver.active(selector)`, never "the latest", because `next/link` creates its own for prefetching.
