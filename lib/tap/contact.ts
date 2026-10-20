import { NextResponse } from "next/server";
import { isLookupCode } from "./ids";
import { loadPublicSlug, loadPublicTap, type TapRecord } from "./resolve";
import { buildVCard } from "./vcard";

function noteFrom(published: unknown) {
  if (!published || typeof published !== "object" || Array.isArray(published)) return "";
  const links = (published as { links?: unknown }).links;
  if (!Array.isArray(links)) return "";
  for (const row of links) {
    if (!row || typeof row !== "object") continue;
    if ((row as { type?: unknown }).type !== "vcard") continue;
    const url = (row as { url?: unknown }).url;
    if (typeof url === "string") return url.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 240);
  }
  return "";
}

function cardFor(record: Extract<TapRecord, { status: "active" | "limited" }>) {
  const note = noteFrom(record.business.published);
  const https = note.startsWith("https://") ? note : null;
  const body = buildVCard({
    name: record.business.name,
    phone: record.business.phone,
    address: record.business.address,
    city: record.business.city,
    pincode: record.business.pincode,
    url: https,
    note: https ? "" : note
  });
  const filename = `${record.business.slug || "contact"}.vcf`;
  return new NextResponse(body, {
    headers: {
      "content-type": "text/vcard; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store"
    }
  });
}

export async function vcardForCode(code: string) {
  if (!isLookupCode(code)) return new NextResponse("Not found", { status: 404 });
  const record = await loadPublicTap(code);
  if (record.status !== "active" && record.status !== "limited") {
    return new NextResponse("Not found", { status: 404 });
  }
  return cardFor(record);
}

export async function vcardForSlug(slug: string) {
  const record = await loadPublicSlug(slug);
  if (record.status !== "active" && record.status !== "limited") {
    return new NextResponse("Not found", { status: 404 });
  }
  return cardFor(record);
}
