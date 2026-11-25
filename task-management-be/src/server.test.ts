import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { logger } from "./lib/logger";
import { createApp } from "./app";
import { DEFAULT_PORT, resolveCorsOrigins, resolvePort, startServer } from "./server";

/* Real HTTP: the server listens on a random free port and is called with Node's fetch. */

let server: Server;
let base: string;
let infoSpy: ReturnType<typeof vi.spyOn>;

const MISSING_ID = "00000000-0000-4000-8000-000000000000";
const ALLOWED = "http://allowed.test";
const OTHER = "http://evil.test";

const query = (procedure: string, input?: unknown) =>
  fetch(`${base}/api/${procedure}${input === undefined ? "" : `?input=${encodeURIComponent(JSON.stringify(input))}`}`);

const mutate = (procedure: string, input: unknown) =>
  fetch(`${base}/api/${procedure}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

beforeAll(async () => {
  infoSpy = vi.spyOn(logger, "info").mockImplementation(() => undefined);
  server = await startServer({ port: 0, corsOrigins: [ALLOWED] });
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  vi.restoreAllMocks();
});

describe("startServer", () => {
  it("seeds the demo tasks before serving and logs where it listens", async () => {
    expect(infoSpy).toHaveBeenCalledWith("Seeded 50 tasks");
    expect(infoSpy).toHaveBeenCalledWith(`CORS allowed origins: ${ALLOWED}`);
    expect(infoSpy).toHaveBeenCalledWith(expect.stringMatching(/^task-management-be listening at http:\/\/localhost:\d+$/));

    const body = await (await query("task.listTasks")).json();
    expect(body.result.data.items).toHaveLength(20);
    expect(body.result.data.items[0].title).toBe("Add authentication");
    expect(body.result.data.nextCursor).toEqual(expect.any(String));
  });

  it("rejects when the port is already taken", async () => {
    const port = (server.address() as AddressInfo).port;
    await expect(startServer({ port, corsOrigins: [] })).rejects.toMatchObject({ code: "EADDRINUSE" });
    expect(infoSpy).toHaveBeenCalledWith("CORS disabled: no browser origins allowed");
  });
});

describe("HTTP API", () => {
  it("serves a plain-text root", async () => {
    const res = await fetch(base);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Hello from task-management-be");
  });

  it("decodes query input from the URL and pages with the cursor", async () => {
    const first = (await (await query("task.listTasks", { limit: 2 })).json()).result.data;
    const second = (await (await query("task.listTasks", { limit: 2, cursor: first.nextCursor })).json()).result.data;

    expect(first.items).toHaveLength(2);
    expect(second.items).toHaveLength(2);
    expect(second.items[0].id).not.toBe(first.items[1].id);
  });

  it("creates via a JSON POST body and reads it back", async () => {
    const createRes = await mutate("task.createTask", { title: "Over HTTP" });
    expect(createRes.status).toBe(200);
    const created = (await createRes.json()).result.data;

    const fetched = (await (await query("task.getTaskById", { id: created.id })).json()).result.data;
    expect(fetched).toEqual(created);
  });

  it("maps NOT_FOUND to HTTP 404", async () => {
    const res = await query("task.getTaskById", { id: MISSING_ID });
    expect(res.status).toBe(404);
    expect((await res.json()).error.data.code).toBe("NOT_FOUND");
  });

  it("maps invalid input to HTTP 400", async () => {
    const res = await mutate("task.createTask", { title: "   " });
    expect(res.status).toBe(400);
    expect((await res.json()).error.data.code).toBe("BAD_REQUEST");
  });

  it("returns 404 for unknown procedures", async () => {
    expect((await query("task.nope")).status).toBe(404);
  });
});

describe("resolvePort", () => {
  it.each([{}, { PORT: "" }])("defaults to %s → DEFAULT_PORT", (env) => {
    expect(resolvePort(env)).toBe(DEFAULT_PORT);
  });

  it("reads PORT", () => {
    expect(resolvePort({ PORT: "4000" })).toBe(4000);
  });

  it.each(["abc", "3.5", "-1", "70000"])("rejects PORT=%s", (value) => {
    expect(() => resolvePort({ PORT: value })).toThrow(/Invalid PORT/);
  });
});

describe("CORS", () => {
  const listUrl = () => `${base}/api/task.listTasks`;

  it("allows an origin on the allow-list", async () => {
    const res = await fetch(listUrl(), { headers: { Origin: ALLOWED } });
    expect(res.headers.get("access-control-allow-origin")).toBe(ALLOWED);
  });

  it("sends no CORS headers to other origins, so browsers block the response", async () => {
    const res = await fetch(listUrl(), { headers: { Origin: OTHER } });
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("answers preflight requests only for allowed origins", async () => {
    const preflight = (origin: string) =>
      fetch(listUrl(), {
        method: "OPTIONS",
        headers: { Origin: origin, "Access-Control-Request-Method": "POST" },
      });

    const allowed = await preflight(ALLOWED);
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get("access-control-allow-origin")).toBe(ALLOWED);

    expect((await preflight(OTHER)).headers.get("access-control-allow-origin")).toBeNull();
  });

  it("serves server-to-server calls, which send no Origin (like the Next.js frontend)", async () => {
    const res = await fetch(listUrl());
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("denies every origin when the allow-list is empty", async () => {
    const open = createApp({ corsOrigins: [] }).listen(0);
    await new Promise((resolve) => open.once("listening", resolve));
    try {
      const url = `http://localhost:${(open.address() as AddressInfo).port}/api/task.listTasks`;
      const res = await fetch(url, { headers: { Origin: ALLOWED } });
      expect(res.status).toBe(200); // the request itself works; the browser just can't read it
      expect(res.headers.get("access-control-allow-origin")).toBeNull();
    } finally {
      await new Promise((resolve) => open.close(resolve));
    }
  });
});

describe("resolveCorsOrigins", () => {
  it.each([{}, { CORS_ORIGINS: "" }, { CORS_ORIGINS: " , " }])("defaults %j to no origins", (env) => {
    expect(resolveCorsOrigins(env)).toEqual([]);
  });

  it("parses a trimmed, comma-separated list", () => {
    expect(resolveCorsOrigins({ CORS_ORIGINS: " http://localhost:3000 , https://app.example.com:8443" })).toEqual([
      "http://localhost:3000",
      "https://app.example.com:8443",
    ]);
  });

  it.each(["localhost:3000", "http://localhost:3000/", "https://app.example.com/path", "*", "not a url"])(
    "rejects %j",
    (entry) => {
      expect(() => resolveCorsOrigins({ CORS_ORIGINS: `http://ok.test,${entry}` })).toThrow(
        new RegExp(`Invalid CORS_ORIGINS entries: ${entry.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")} `)
      );
    }
  );
});
