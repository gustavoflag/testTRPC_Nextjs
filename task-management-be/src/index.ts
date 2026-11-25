import { logger } from "./lib/logger";
import { resolveCorsOrigins, resolvePort, startServer } from "./server";

// Entry point only: all behaviour lives in server.ts and app.ts, which are tested.
const main = async () =>
  startServer({ port: resolvePort(process.env), corsOrigins: resolveCorsOrigins(process.env) });

main().catch((error: unknown) => {
  logger.error("task-management-be failed to start", { error: String(error) });
  process.exit(1);
});
