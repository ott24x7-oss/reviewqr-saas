import { vcardForCode } from "@/lib/tap/contact";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  return vcardForCode(params.code);
}
