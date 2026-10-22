import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { nfcQueue } from "@/lib/shop/proof";

export const dynamic = "force-dynamic";

export default async function NfcQueuePage() {
  await requireAdminPage();
  const items = await nfcQueue();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">NFC write queue</h1>
        <Link href="/admin/nfc" className="rounded-full bg-ink px-4 py-2 text-sm text-white">
          Open NFC writer
        </Link>
      </div>
      {items.length === 0 && <p className="rounded-[20px] bg-white p-4 text-sm">No NFC tags are waiting.</p>}
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={`${item.orderId}-${item.device.id}`} className="rounded-[20px] bg-white p-4 text-sm text-ink">
            <p className="font-semibold">{item.businessName || "QR24x7"}</p>
            <p>{item.lineName}</p>
            <p>
              {item.device.kind} · {item.device.shortCode} · {item.device.chipUid || "No chip uid"} · {item.device.status}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
