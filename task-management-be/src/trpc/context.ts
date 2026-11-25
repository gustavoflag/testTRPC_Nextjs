import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

export const createContext = (_opts: CreateExpressContextOptions) => ({});

export type Context = Awaited<ReturnType<typeof createContext>>;
