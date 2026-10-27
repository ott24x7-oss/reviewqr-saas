import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { AdminButton } from "@/components/admin/ui/controls";
import { PageHeader } from "@/components/admin/ui/primitives";
import AdminQrPage from "../qr/page";
import AdminPrintPage from "../print/page";
import AdminNfcPage from "../nfc/page";

export const dynamic = "force-dynamic";

export default async function AdminToolsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined> }) {
  await requireAdminPage();
  const params = await searchParams;
  const tab = typeof params.tab === "string" ? params.tab : "qr";
  const active = tab === "print" ? "print" : tab === "nfc" ? "nfc" : "qr";
  const links = [{ id: "qr", label: "QR stock" }, { id: "print", label: "Print studio" }, { id: "nfc", label: "NFC writer" }];
  const content = active === "print" ? AdminPrintPage() : active === "nfc" ? AdminNfcPage() : AdminQrPage({ searchParams: { status: typeof params.status === "string" ? params.status : undefined, q: typeof params.q === "string" ? params.q : undefined } });
  return <div className="space-y-5"><PageHeader title="Print & NFC tools" subtitle="Manage QR inventory, prepare print artwork, and write NFC tags." />
    <nav aria-label="Print and NFC tools" className="flex flex-wrap gap-2">{links.map((link) => <Link key={link.id} href={`/admin/tools?tab=${link.id}`}><AdminButton variant={active === link.id ? "primary" : "outline"} aria-current={active === link.id ? "page" : undefined}>{link.label}</AdminButton></Link>)}</nav>
    <div>{content}</div>
  </div>;
}
