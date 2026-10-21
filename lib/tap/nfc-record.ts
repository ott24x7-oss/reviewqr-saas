import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isLookupCode } from "./ids";
import { normalizeChipUid } from "./nfc";

export type ChipName = "NTAG213" | "NTAG215" | "NTAG216";

type Fail = { ok: false; status: number; error: string };
type Saved = { ok: true; id: string; code: string; chipUid: string; chip: ChipName; changed: boolean };

export async function recordChipUid(input: { code: string; chipUid: string; chip: ChipName }): Promise<Fail | Saved> {
  const code = input.code.trim();
  if (!isLookupCode(code)) return { ok: false, status: 400, error: "Enter a valid QR code" };
  const chipUid = normalizeChipUid(input.chipUid);
  if (!chipUid) return { ok: false, status: 400, error: "Chip UID is not valid" };
  const device = await prisma.device.findUnique({ where: { shortCode: code } });
  if (!device) return { ok: false, status: 404, error: "Print this code before writing a tag" };
  if (device.chipUid && device.chipUid !== chipUid) {
    return { ok: false, status: 409, error: "This code is already linked to another chip" };
  }
  try {
    const updated = await prisma.device.update({
      where: { id: device.id },
      data: { chipUid, chip: input.chip }
    });
    return { ok: true, id: updated.id, code, chipUid, chip: input.chip, changed: device.chipUid !== chipUid };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, status: 409, error: "This chip is already linked to another code" };
    }
    throw error;
  }
}
