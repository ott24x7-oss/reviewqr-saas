import crypto from "crypto";
import { scanSalt } from "../scans";

/** Hash a client-generated visitor id. The raw id and the IP are not stored. */
export function hashVisitor(visitorId: string, salt = scanSalt()) {
  const id = visitorId.trim().slice(0, 80);
  if (id.length < 8) return "";
  return crypto.createHash("sha256").update(`${salt}|visitor|${id}`).digest("hex");
}
