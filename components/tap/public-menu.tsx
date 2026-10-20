import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/utils";
import { tapFontClass } from "@/components/brand/tap-font";
import { isLookupCode } from "@/lib/tap/ids";
import { loadPublicTap } from "@/lib/tap/resolve";
import { PublicTap } from "./public-page";

/** A short list until the Sola menu replaces this page. */
export async function PublicMenu({ code, channel }: { code: string; channel: "q" | "t" }) {
  if (!isLookupCode(code)) notFound();
  const record = await loadPublicTap(code);
  if (record.status !== "active") {
    return <PublicTap code={code} channel={channel} countScan={false} />;
  }
  const items = await prisma.menuItem.findMany({
    where: { businessId: record.businessId, available: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, pricePaise: true, veg: true }
  });
  return (
    <div className={`tap-page ${tapFontClass}`}>
      <div className="tap-card">
        <p className="tap-privacy">
          <Link href={`/${channel}/${code}`}>Back</Link>
        </p>
        <h1>{record.business.name}</h1>
        {items.length === 0 ? <p className="tap-bio">The menu is not published yet.</p> : null}
        <ul className="tap-secondary">
          {items.map((item) => (
            <li key={item.id}>
              {item.name} · {formatINR(item.pricePaise)}
              {item.veg === "NONE" ? "" : ` · ${item.veg === "NON_VEG" ? "Non-veg" : item.veg === "EGG" ? "Egg" : "Veg"}`}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
