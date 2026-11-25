import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";
import { NotFoundError } from "../lib/errors";

const t = initTRPC.context<Context>().create();

/* Translates domain errors thrown by services into tRPC error codes. */
const domainErrors = t.middleware(async ({ next }) => {
  const result = await next();
  if (!result.ok && result.error.cause instanceof NotFoundError) {
    throw new TRPCError({ code: "NOT_FOUND", message: result.error.cause.message, cause: result.error.cause });
  }
  return result;
});

export const router = t.router;
export const publicProcedure = t.procedure.use(domainErrors);
export const createCallerFactory = t.createCallerFactory;
