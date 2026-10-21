"use client";

import { formatRupees } from "@/lib/tap/order-message";

export type Ticket = {
  businessName: string;
  number: string;
  when: string;
  orderType: string;
  place: string;
  note: string;
  payment: string;
  items: { name: string; qty: number; note: string }[];
  subtotalPaise: number;
  discountPaise: number;
  packingPaise: number;
  deliveryPaise: number;
  gstPaise: number;
  pricesIncludeGst: boolean;
  totalPaise: number;
};

const TYPE_LABEL: Record<string, string> = {
  DINE_IN: "Dine-in",
  TAKEAWAY: "Takeaway",
  DELIVERY: "Delivery"
};

export function PrintSheet({
  id,
  doc,
  mm,
  ticket
}: {
  id: string;
  doc: "kot" | "bill";
  mm: 58 | 80;
  ticket: Ticket;
}) {
  const other = mm === 58 ? 80 : 58;
  return (
    <div className="min-h-screen bg-white text-black">
      <style>{`
        @page { size: ${mm}mm auto; margin: 3mm; }
        .ticket { width: ${mm}mm; margin: 0 auto; font-family: ui-monospace, "Cascadia Mono", "Segoe UI Mono", monospace; font-size: ${mm === 58 ? 11 : 13}px; line-height: 1.35; }
        @media print {
          body { background: #fff !important; }
          .no-print { display: none !important; }
          [aria-hidden="true"] { display: none !important; }
        }
      `}</style>
      <div className="no-print mx-auto flex max-w-lg flex-wrap gap-2 p-4">
        <button type="button" className="h-11 min-h-11 rounded-lg bg-black px-4 text-sm font-medium text-white" onClick={() => window.print()}>
          Print
        </button>
        <a className="inline-flex h-11 min-h-11 items-center rounded-lg border px-4 text-sm" href={`/orders/${id}?doc=${doc}&mm=${other}`}>
          {other}mm
        </a>
        <a className="inline-flex h-11 min-h-11 items-center rounded-lg border px-4 text-sm" href={`/orders/${id}?doc=${doc === "kot" ? "bill" : "kot"}&mm=${mm}`}>
          {doc === "kot" ? "Bill" : "KOT"}
        </a>
      </div>
      <article className="ticket px-1 py-2">
        <h1 className="text-center text-base font-bold">{ticket.businessName}</h1>
        <p className="text-center font-bold">{doc === "kot" ? "KOT" : "BILL"} {ticket.number}</p>
        <p className="text-center">{ticket.when}</p>
        <p>{TYPE_LABEL[ticket.orderType] || ticket.orderType}</p>
        {ticket.place ? <p>{ticket.orderType === "DELIVERY" ? "Address" : "Table"}: {ticket.place}</p> : null}
        <hr className="my-2 border-black" />
        <ul>
          {ticket.items.map((item, index) => (
            <li key={`${item.name}-${index}`}>
              <div>{item.qty} x {item.name}</div>
              {item.note ? <div>  {item.note}</div> : null}
            </li>
          ))}
        </ul>
        {ticket.note ? <p className="mt-2">Note: {ticket.note}</p> : null}
        {doc === "bill" ? (
          <div className="mt-2 space-y-1">
            <hr className="border-black" />
            <Row label="Subtotal" value={formatRupees(ticket.subtotalPaise)} />
            {ticket.discountPaise > 0 ? <Row label="Discount" value={formatRupees(ticket.discountPaise)} /> : null}
            {ticket.packingPaise > 0 ? <Row label="Packing" value={formatRupees(ticket.packingPaise)} /> : null}
            {ticket.deliveryPaise > 0 ? <Row label="Delivery" value={formatRupees(ticket.deliveryPaise)} /> : null}
            {ticket.gstPaise > 0 ? <Row label={ticket.pricesIncludeGst ? "GST included" : "GST"} value={formatRupees(ticket.gstPaise)} /> : null}
            <Row label="Total" value={formatRupees(ticket.totalPaise)} />
            {ticket.payment ? <p>Pay: {ticket.payment === "UPI" ? "UPI" : "Cash"}</p> : null}
          </div>
        ) : null}
      </article>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex justify-between gap-2">
      <span>{label}</span>
      <span>{value}</span>
    </p>
  );
}
