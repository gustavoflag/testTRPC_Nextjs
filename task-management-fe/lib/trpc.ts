import { createTRPCClient, httpBatchLink, TRPCClientError } from "@trpc/client";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
// Type-only import: erased at build time, so no backend code is bundled.
import type { AppRouter } from "../../task-management-be/src/trpc/root";

const TRPC_URL = process.env.TRPC_URL ?? "http://localhost:3005/api";

export const trpc = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: TRPC_URL })],
});

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

/** The tRPC error code (e.g. "NOT_FOUND") of an error thrown by the client, if it is one. */
export const trpcErrorCode = (error: unknown): string | undefined =>
  error instanceof TRPCClientError ? error.data?.code : undefined;
