import { Prisma } from "@prisma/client";
import { encodeCursor } from "./cursor";
import { fail, ok, type ServiceResult } from "./result";

export async function takePage<T extends { id: string }>(
  load: () => Promise<T[]>,
  limit: number
): Promise<ServiceResult<{ items: T[]; nextCursor: string | null }>> {
  let rows: T[];
  try {
    rows = await load();
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      (err.code === "P2025" || err.code === "P2023")
    ) {
      return fail(400, "Invalid cursor");
    }
    throw err;
  }
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  return ok({ items, nextCursor: hasMore && last ? encodeCursor(last.id) : null });
}
