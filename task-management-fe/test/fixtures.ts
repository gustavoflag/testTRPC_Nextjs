import { TRPCClientError } from "@trpc/client";
import type { Task } from "@/lib/tasks";

export const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: "11111111-1111-4111-8111-111111111111",
  title: "Write tests",
  description: "Cover every component",
  creationDate: "2026-11-25T12:00:00.000Z",
  ...overrides,
});

/** A client error carrying a tRPC error code, as the client throws it for a failed call. */
export const trpcError = (code: string): TRPCClientError<never> =>
  Object.assign(new TRPCClientError<never>(`tRPC ${code}`), { data: { code } });

/** Mimics next/navigation's redirect/notFound: they throw to stop rendering. */
export class NavigationSignal extends Error {}
