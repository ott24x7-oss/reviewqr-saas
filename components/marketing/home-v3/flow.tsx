"use client";

import * as React from "react";
import { PhoneFrame } from "./phone-frame";
import { Reveal } from "./reveal";
import { Shot } from "./shot";

const STEPS = [
  {
    id: "scan",
    title: "Scan",
    text: "The page opens in the camera. No app.",
    shot: "tap",
    alt: "Customer tap page after a scan"
  },
  {
    id: "choose",
    title: "Choose",
    text: "They pick a review, a dish, or a link.",
    shot: "menu",
    alt: "Menu on the customer's phone"
  },
  {
    id: "done",
    title: "Done",
    text: "You get the WhatsApp order or the Google review.",
    shot: "order",
    alt: "WhatsApp order ready to send"
  }
];

export function HomeFlow() {
  const scroller = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState(0);
  const drag = React.useRef<{ x: number; left: number; armed: boolean } | null>(null);

  React.useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const cards = [...root.querySelectorAll<HTMLElement>("[data-flow-card]")];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = cards.indexOf(visible.target as HTMLElement);
        if (index >= 0) setActive(index);
      },
      { root, threshold: 0.6 }
    );
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const root = scroller.current;
    if (!root) return;
    drag.current = { x: event.clientX, left: root.scrollLeft, armed: false };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const root = scroller.current;
    const state = drag.current;
    if (!root || !state) return;
    const delta = event.clientX - state.x;
    if (!state.armed) {
      if (Math.abs(delta) < 24) return;
      state.armed = true;
      root.setPointerCapture(event.pointerId);
    }
    root.scrollLeft = state.left - delta;
  }

  function onPointerUp() {
    drag.current = null;
  }

  return (
    <section id="home-flow" className="hv3-section" aria-labelledby="home-flow-title">
      <div className="hv3-wrap">
        <Reveal>
          <h2 id="home-flow-title">How it works in 3 taps</h2>
        </Reveal>
        <div
          ref={scroller}
          className="hv3-flow-row"
          style={{ marginTop: 16 }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {STEPS.map((step, index) => (
            <Reveal key={step.id} className="hv3-flow-snap" delay={index * 0.08}>
              <article className="hv3-flow-card hv3-rise" data-flow-card={step.id}>
                <PhoneFrame>
                  <Shot name={step.shot} kind="ui" alt={step.alt} sizes="180px" width={390} height={844} />
                </PhoneFrame>
                <h3 style={{ margin: "0 0 4px", fontSize: 16, lineHeight: "24px" }}>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
        <div className="hv3-dots" role="group" aria-label="Steps">
          {STEPS.map((step, index) => (
            <button
              key={step.id}
              type="button"
              aria-label={step.title}
              aria-current={index === active ? "true" : undefined}
              onClick={() => {
                const root = scroller.current;
                const card = root?.querySelectorAll<HTMLElement>("[data-flow-card]")[index];
                card?.scrollIntoView({ inline: "start", block: "nearest" });
              }}
            >
              <span />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
