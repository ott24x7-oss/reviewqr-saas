import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readableBusinessWhere } from "@/lib/tenant";
import { readStoredLines } from "@/lib/store/order-public";
import { PrintSheet, type Ticket } from "./print-sheet";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Print order",
  robots: { index: false, follow: false }
};

export default async function PrintOrderPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams: { doc?: string; mm?: string };
}) {
  const doc = searchParams.doc === "bill" ? "bill" : "kot";
  const mm = searchParams.mm === "58" ? 58 : 80;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(`/orders/${params.id}?doc=${doc}&mm=${mm}`)}`);

  const order = await prisma.menuOrder.findFirst({
    where: { id: params.id, business: readableBusinessWhere(user.id) },
    include: { business: { select: { name: true } } }
  });
  if (!order) notFound();

  const when = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit"
  }).format(order.createdAt);
  const ticket: Ticket = {
    businessName: order.business.name,
    number: order.number,
    when,
    orderType: order.orderType || "",
    place: order.tableOrAddress || "",
    note: order.note || "",
    payment: order.payment || "",
    items: readStoredLines(order.items).map((line) => ({ name: line.name, qty: line.qty, note: line.note })),
    subtotalPaise: order.subtotalPaise,
    discountPaise: order.discountPaise,
    packingPaise: order.packingPaise,
    deliveryPaise: order.deliveryPaise,
    gstPaise: order.gstPaise,
    pricesIncludeGst: order.pricesIncludeGst,
    totalPaise: order.totalPaise
  };

  return <PrintSheet id={order.id} doc={doc} mm={mm} ticket={ticket} />;
}
