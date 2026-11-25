import express, { type Express } from "express";
import cors from "cors";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter } from "./trpc/root";
import { createContext } from "./trpc/context";

export type AppOptions = {
  /**
   * Browser origins allowed to call the API (exact matches, e.g. "http://localhost:3000").
   * Empty means no CORS headers at all, so browsers on other origins can't read responses.
   * Server-to-server calls (like the Next.js frontend's) send no Origin header and are unaffected.
   */
  corsOrigins: string[];
};

/** The HTTP app: CORS allow-list, tRPC at /api, and a plain-text root. No side effects; startServer() runs it. */
export const createApp = ({ corsOrigins }: AppOptions): Express => {
  const app = express();

  if (corsOrigins.length > 0) {
    app.use(cors({ origin: corsOrigins }));
  }

  app.use(
    "/api",
    trpcExpress.createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  app.get("/", (_req, res) => {
    res.send("Hello from task-management-be");
  });

  return app;
};
