export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

export type PageQuery = { limit: number; cursorId: string | null };

export function encodeCursor(id: string) {
  return Buffer.from(JSON.stringify({ id }), "utf8").toString("base64url");
}

/** `null` when the client sent no cursor. `"bad"` when the value is not one we issued. */
export function decodeCursor(raw: string | null | undefined): string | null | "bad" {
  if (raw == null || raw === "") return null;
  try {
    const json = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as { id?: unknown };
    if (!json || typeof json.id !== "string" || json.id.length < 1 || json.id.length > 64) return "bad";
    return json.id;
  } catch {
    return "bad";
  }
}

export function readPage(searchParams: URLSearchParams): PageQuery | FailPage {
  const rawLimit = searchParams.get("limit");
  let limit = DEFAULT_PAGE_LIMIT;
  if (rawLimit != null && rawLimit !== "") {
    if (!/^\d+$/.test(rawLimit)) return { ok: false, error: "limit must be from 1 to 100" };
    limit = Number(rawLimit);
    if (limit < 1 || limit > MAX_PAGE_LIMIT) return { ok: false, error: "limit must be from 1 to 100" };
  }
  const cursorId = decodeCursor(searchParams.get("cursor"));
  if (cursorId === "bad") return { ok: false, error: "Invalid cursor" };
  return { limit, cursorId };
}

type FailPage = { ok: false; error: string };

export function isPageError(value: PageQuery | FailPage): value is FailPage {
  return "ok" in value && value.ok === false;
}

export function cursorQuery(cursorId: string | null, limit: number) {
  return {
    take: limit + 1,
    ...(cursorId ? { skip: 1, cursor: { id: cursorId } } : {})
  };
}
