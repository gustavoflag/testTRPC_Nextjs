import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp, type AppOptions } from "./app";
import { logger } from "./lib/logger";
import { taskService } from "./modules/task/task.service";
import { seedTasks } from "./modules/task/task.seed";

export const DEFAULT_PORT = 3005;

/** Reads PORT from the environment. Fails fast on anything that isn't a valid TCP port. */
export const resolvePort = (env: NodeJS.ProcessEnv): number => {
  if (env.PORT === undefined || env.PORT === "") return DEFAULT_PORT;
  const port = Number(env.PORT);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid PORT "${env.PORT}": expected an integer between 0 and 65535`);
  }
  return port;
};

const isExactOrigin = (value: string): boolean => {
  try {
    return new URL(value).origin === value;
  } catch {
    return false;
  }
};

/**
 * Reads CORS_ORIGINS, a comma-separated allow-list of browser origins. Unset or empty means none (deny by default).
 * Each entry must be an exact origin (scheme://host[:port], no path or trailing slash). Fails fast otherwise.
 */
export const resolveCorsOrigins = (env: NodeJS.ProcessEnv): string[] => {
  const origins = (env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const invalid = origins.filter((origin) => !isExactOrigin(origin));
  if (invalid.length > 0) {
    throw new Error(
      `Invalid CORS_ORIGINS entries: ${invalid.join(", ")} (expected exact origins like "http://localhost:3000")`
    );
  }
  return origins;
};

export type ServerOptions = AppOptions & { port: number };

/**
 * Seeds the in-memory store, then starts listening. Seeding happens before the first request can arrive.
 * Resolves once the server is listening; rejects if it can't bind (e.g. the port is taken).
 */
export const startServer = ({ port, corsOrigins }: ServerOptions): Promise<Server> => {
  const seeded = seedTasks(taskService);
  logger.info(`Seeded ${seeded.length} tasks`);
  logger.info(
    corsOrigins.length > 0
      ? `CORS allowed origins: ${corsOrigins.join(", ")}`
      : "CORS disabled: no browser origins allowed"
  );

  return new Promise((resolve, reject) => {
    const server = createApp({ corsOrigins }).listen(port);
    server.once("error", reject);
    server.once("listening", () => {
      const { port: actualPort } = server.address() as AddressInfo;
      logger.info(`task-management-be listening at http://localhost:${actualPort}`);
      resolve(server);
    });
  });
};
