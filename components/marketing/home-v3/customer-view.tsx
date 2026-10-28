"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { PhoneFrame } from "./phone-frame";
import { PhoneTilt, Reveal } from "./reveal";
import { Shot } from "./shot";

const TABS = [
  {
    id: "reviews",
    label: "Reviews",
    shot: "review",
    alt: "Google review step on the customer's phone",
    benefits: ["Public Google review and a private note", "No app for the customer", "Hindi and English on the same page"]
  },
  {
    id: "menu",
    label: "Menu",
    shot: "menu",
    alt: "Menu with prices on the customer's phone",
    benefits: ["Menu and prices on the phone", "Add items without an account", "No commission on the order"]
  },
  {
    id: "order",
    label: "WhatsApp order",
    shot: "order",
    alt: "Cart ready to send on WhatsApp",
    benefits: ["The cart becomes a WhatsApp message", "The order reaches your number", "Cash or UPI, your choice"]
  },
  {
    id: "booking",
    label: "Booking",
    shot: "booking",
    alt: "Salon services ready to book on WhatsApp",
    benefits: ["Services and times on the phone", "They book without an account", "The request reaches you on WhatsApp"]
  }
];

export function CustomerView() {
  const [current, setCurrent] = React.useState(0);
  const tabs = React.useRef<Array<HTMLButtonElement | null>>([]);

  function onKey(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next =
      event.key === "ArrowRight" ? (current + 1) % TABS.length : (current - 1 + TABS.length) % TABS.length;
    setCurrent(next);
    tabs.current[next]?.focus();
  }

  return (
    <section id="customer-view" className="hv3-section" aria-labelledby="customer-view-title">
      <div className="hv3-wrap">
        <Reveal>
          <h2 id="customer-view-title">What your customers see</h2>
        </Reveal>
        <div className="hv3-tabs" role="tablist" aria-label="Customer views" onKeyDown={onKey} style={{ marginTop: 16 }}>
          {TABS.map((tab, index) => (
            <button
              key={tab.id}
              ref={(node) => {
                tabs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`customer-tab-${tab.id}`}
              aria-selected={index === current}
              aria-controls={`customer-panel-${tab.id}`}
              tabIndex={index === current ? 0 : -1}
              onClick={() => setCurrent(index)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <PhoneTilt>
          <div className="hv3-stage">
          {TABS.map((tab, index) => (
            <div
              key={tab.id}
              className="hv3-panel"
              role="tabpanel"
              id={`customer-panel-${tab.id}`}
              aria-labelledby={`customer-tab-${tab.id}`}
              data-active={index === current ? "true" : "false"}
              aria-hidden={index === current ? undefined : true}
            >
              <PhoneFrame>
                <Shot
                  name={tab.shot}
                  kind="ui"
                  alt={tab.alt}
                  sizes="220px"
                  width={390}
                  height={844}
                  active={index === current}
                  shot={tab.shot}
                />
              </PhoneFrame>
              <ul className="hv3-checks">
                {tab.benefits.map((benefit) => (
                  <li key={benefit}>
                    <Check size={20} strokeWidth={1.75} aria-hidden="true" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          </div>
        </PhoneTilt>
      </div>
    </section>
  );
}
