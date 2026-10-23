"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "What is NFC? Do my customers need an app?",
    a: "NFC is the same tap used for contactless payments. Most phones open your page when they touch the stand. Phones without NFC scan the QR with the camera. No app either way."
  },
  {
    q: "Can I change my links after the stand is printed?",
    a: "Yes. The QR and NFC point at your QR24x7 page, so you can change the menu, links, offers, or theme from the dashboard. The printed stand stays the same."
  },
  {
    q: "How does WhatsApp ordering work?",
    a: "Customers add items and tap Order on WhatsApp. A message with the items, total, table or address, and a UPI link opens in WhatsApp to your number. You get the order with no commission."
  },
  {
    q: "Is this allowed by Google?",
    a: "Every customer sees the public Google link and a private note on the same screen, at any star rating. Nothing is posted for them. Rewards are never offered in exchange for a public review."
  },
  {
    q: "Do you deliver the stands?",
    a: "Yes, across India with tracking. You approve the design first. We then print, program the NFC, and ship."
  },
  {
    q: "Can I manage more than one branch?",
    a: "Yes. Each branch, table, or staff member can have its own QR and NFC, and you see them in one dashboard."
  }
];

export function HomeFaq() {
  const [open, setOpen] = React.useState<number | null>(null);
  return (
    <section id="home-faq" className="hv3-section" aria-labelledby="home-faq-title">
      <div className="hv3-wrap hv3-faq">
        <h2 id="home-faq-title">Questions owners ask</h2>
        <div style={{ marginTop: 16 }}>
          {FAQS.map((item, index) => {
            const on = open === index;
            const panelId = `home-faq-${index}`;
            return (
              <div key={item.q} className="hv3-faq-item">
                <h3 style={{ margin: 0, fontSize: 16, lineHeight: "24px", fontWeight: 600 }}>
                  <button
                    type="button"
                    aria-expanded={on}
                    aria-controls={panelId}
                    onClick={() => setOpen(on ? null : index)}
                  >
                    <span>{item.q}</span>
                    <ChevronDown size={20} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </h3>
                {on ? (
                  <div id={panelId} role="region" className="hv3-faq-panel">
                    {item.a}
                  </div>
                ) : (
                  <div id={panelId} role="region" hidden>
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
