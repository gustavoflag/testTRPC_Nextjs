/* Minimal project logger. Swap the implementation (pino, winston, …) here without touching callers. */
type LogMeta = Record<string, unknown>;

const write = (level: "info" | "warn" | "error", message: string, meta?: LogMeta): void => {
  const line = JSON.stringify({ level, time: new Date().toISOString(), message, ...meta });
  const stream = level === "info" ? process.stdout : process.stderr;
  stream.write(`${line}\n`);
};

export const logger = {
  info: (message: string, meta?: LogMeta) => write("info", message, meta),
  warn: (message: string, meta?: LogMeta) => write("warn", message, meta),
  error: (message: string, meta?: LogMeta) => write("error", message, meta),
};
