/* Domain errors thrown by services. Mapped to tRPC error codes in src/trpc/init.ts. */
export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} ${id} not found`);
    this.name = "NotFoundError";
  }
}
