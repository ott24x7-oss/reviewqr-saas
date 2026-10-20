import { vcardForSlug } from "@/lib/tap/contact";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  return vcardForSlug(params.slug);
}
