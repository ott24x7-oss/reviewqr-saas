"use client";

import * as React from "react";
import { formatINR } from "@/lib/utils";
import { GrowthCard } from "./growth-card";

type Business = { id: string; name: string };
type Payload = {
  range: { preset: string; from: string; to: string };
  modules: { menu: boolean; store: boolean };
  summary: {
    scans: number;
    tapsNfc: number;
    tapsQr: number;
    pageViews: number;
    buttonClicks: number;
    orders: number | null;
    orderPaise: number | null;
    feedback: number;
    avgRating: number | null;
  };
  change: Record<string, number | null>;
  trend: Array<{ day: string; scans: number; pageViews: number; orders: number | null }>;
  ratings: Record<string, number>;
  topItems: Array<{ itemId: string; name: string; views: number }>;
  heatmap: number[][];
  byQr: Array<{ qrId: string; label: string; scans: number; nfc: number; qr: number }>;
  byDevice: { mobile: number; tablet: number; desktop: number; other: number };
  byTable: Array<{ table: string; scans: number; orders: number }>;
  byStaff: Array<{ staffId: string; name: string; scans: number; feedback: number }>;
  buttonClicks: Record<string, number>;
};

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const daysHi = ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"];

const copy = {
  en: {
    title: "Analytics",
    scans: "Scans",
    taps: "Taps",
    views: "Page views",
    clicks: "Button clicks",
    orders: "WhatsApp orders",
    feedback: "Feedback",
    rating: "Average rating",
    trend: "Trend",
    ratings: "Rating distribution",
    items: "Top menu items",
    hours: "Busiest hours",
    places: "QR codes and devices",
    tables: "Tables",
    staff: "Staff",
    emptyOrders: "WhatsApp orders show when the store module is on.",
    emptyMenu: "Menu stats show when the menu module is on.",
    emptyStaff: "No staff attribution yet.",
    none: "Nothing in this range.",
    pdf: "Download monthly PDF",
    email: "Email me the weekly summary",
    whatsapp: "WhatsApp me the weekly summary",
    custom: "Custom",
    from: "From",
    to: "To"
  },
  hi: {
    title: "एनालिटिक्स",
    scans: "स्कैन",
    taps: "टैप",
    views: "पेज व्यू",
    clicks: "बटन क्लिक",
    orders: "WhatsApp ऑर्डर",
    feedback: "फ़ीडबैक",
    rating: "औसत रेटिंग",
    trend: "रुझान",
    ratings: "रेटिंग बाँट",
    items: "टॉप मेनू आइटम",
    hours: "सबसे व्यस्त घंटे",
    places: "QR और डिवाइस",
    tables: "टेबल",
    staff: "स्टाफ",
    emptyOrders: "स्टोर मॉड्यूल चालू होने पर ऑर्डर दिखेंगे।",
    emptyMenu: "मेनू मॉड्यूल चालू होने पर मेनू आँकड़े दिखेंगे।",
    emptyStaff: "अभी स्टाफ आँकड़े नहीं हैं।",
    none: "इस अवधि में कुछ नहीं।",
    pdf: "मासिक PDF डाउनलोड करें",
    email: "साप्ताहिक सारांश ईमेल पर",
    whatsapp: "साप्ताहिक सारांश WhatsApp पर",
    custom: "अपनी तारीख",
    from: "से",
    to: "तक"
  }
};

function changeText(value: number | null | undefined) {
  if (value == null) return "—";
  return `${value > 0 ? "+" : ""}${value}%`;
}

export function AnalyticsBoard({ businesses }: { businesses: Business[] }) {
  const [lang, setLang] = React.useState<"en" | "hi">("en");
  const [businessId, setBusinessId] = React.useState(businesses[0]?.id || "");
  const [range, setRange] = React.useState("7d");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [data, setData] = React.useState<Payload | null>(null);
  const [emailOn, setEmailOn] = React.useState(false);
  const [whatsappOn, setWhatsappOn] = React.useState(false);
  const text = copy[lang];

  React.useEffect(() => {
    const stored = window.localStorage.getItem("rq-lang");
    if (stored === "hi" || stored === "en") setLang(stored);
    fetch("/api/v1/reports/preferences")
      .then((res) => res.json())
      .then((json) => {
        if (!json.data) return;
        setEmailOn(json.data.emailOptIn === true);
        setWhatsappOn(json.data.whatsappOptIn === true);
      })
      .catch(() => undefined);
  }, []);

  React.useEffect(() => {
    if (!businessId) return;
    const params = new URLSearchParams({ businessId, range });
    if (range === "custom" && from && to) {
      params.set("from", from);
      params.set("to", to);
    }
    fetch(`/api/v1/analytics?${params}`)
      .then((res) => res.json())
      .then((json) => setData(json.data || null))
      .catch(() => setData(null));
  }, [businessId, range, from, to]);

  function chooseLang(next: "en" | "hi") {
    setLang(next);
    window.localStorage.setItem("rq-lang", next);
  }

  async function savePrefs(email: boolean, whatsapp: boolean) {
    setEmailOn(email);
    setWhatsappOn(whatsapp);
    await fetch("/api/v1/reports/preferences", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ emailOptIn: email, whatsappOptIn: whatsapp })
    });
  }

  if (!businessId) return <p className="text-sm">{text.none}</p>;
  const summary = data?.summary;
  const heat = data?.heatmap || [];
  const heatMax = Math.max(1, ...heat.flat());
  const trend = data?.trend || [];
  const trendMax = Math.max(1, ...trend.map((row) => row.scans));

  const cards = [
    { label: text.scans, value: summary ? String(summary.scans) : "…", delta: data?.change.scans, test: "scans-value" },
    {
      label: text.taps,
      value: summary ? `${summary.tapsNfc} NFC · ${summary.tapsQr} QR` : "…",
      delta: data?.change.taps,
      test: "taps-value"
    },
    { label: text.views, value: summary ? String(summary.pageViews) : "…", delta: data?.change.pageViews, test: "views-value" },
    { label: text.clicks, value: summary ? String(summary.buttonClicks) : "…", delta: data?.change.buttonClicks, test: "clicks-value" },
    {
      label: text.orders,
      value:
        data && !data.modules.store
          ? text.emptyOrders
          : summary?.orders == null
            ? "…"
            : `${summary.orders} · ${formatINR(summary.orderPaise || 0)}`,
      delta: data?.modules.store ? data.change.orders : null,
      test: "orders-value"
    },
    { label: text.feedback, value: summary ? String(summary.feedback) : "…", delta: data?.change.feedback, test: "feedback-value" },
    {
      label: text.rating,
      value: summary ? (summary.avgRating == null ? "—" : String(summary.avgRating)) : "…",
      delta: data?.change.avgRating,
      test: "rating-value"
    }
  ];

  return (
    <div className="space-y-4" data-testid="analytics-board">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{text.title}</h1>
        <div className="flex gap-2">
          <button type="button" className="min-h-11 rounded-full border px-3 text-sm" onClick={() => chooseLang("en")}>
            English
          </button>
          <button type="button" className="min-h-11 rounded-full border px-3 text-sm" onClick={() => chooseLang("hi")}>
            हिंदी
          </button>
        </div>
      </div>
      {businesses.length > 1 ? (
        <label className="block text-sm">
          <select className="min-h-11 w-full rounded-xl border px-3" value={businessId} onChange={(event) => setBusinessId(event.target.value)}>
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {[
          ["7d", "7d"],
          ["30d", "30d"],
          ["90d", "90d"]
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="min-h-11 rounded-full border px-3 text-sm"
            aria-pressed={range === id}
            onClick={() => setRange(id)}
          >
            {label}
          </button>
        ))}
        <button type="button" className="min-h-11 rounded-full border px-3 text-sm" aria-pressed={range === "custom"} onClick={() => setRange("custom")}>
          {text.custom}
        </button>
      </div>
      {range === "custom" ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs">
            {text.from}
            <input className="mt-1 min-h-11 w-full rounded-xl border px-2" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="text-xs">
            {text.to}
            <input className="mt-1 min-h-11 w-full rounded-xl border px-2" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground" data-testid="analytics-range">
        {data ? `${data.range.from} → ${data.range.to}` : ""}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cards.map((card) => (
          <article key={card.test} className="rounded-2xl border bg-white p-4">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-xl font-semibold" data-testid={card.test}>
              {card.value}
            </p>
            <p className="text-xs">{changeText(card.delta)}</p>
          </article>
        ))}
      </div>
      <section className="rounded-2xl border bg-white p-4">
        <h2 className="text-sm font-semibold">{text.trend}</h2>
        <svg viewBox={`0 0 ${Math.max(trend.length, 2) * 12} 80`} className="mt-2 h-24 w-full" role="img" aria-label={text.trend}>
          <polyline
            fill="none"
            stroke="#1C1B18"
            strokeWidth="2"
            points={trend.map((row, index) => `${index * 12 + 4},${74 - (row.scans / trendMax) * 64}`).join(" ")}
          />
        </svg>
      </section>
      <section className="rounded-2xl border bg-white p-4">
        <h2 className="text-sm font-semibold">{text.ratings}</h2>
        <ul className="mt-2 space-y-1">
          {["5", "4", "3", "2", "1"].map((star) => (
            <li key={star} className="flex items-center gap-2 text-sm">
              <span className="w-4">{star}</span>
              <span className="h-2 flex-1 rounded bg-slate-100">
                <span
                  className="block h-2 rounded bg-slate-900"
                  style={{ width: `${Math.min(100, ((data?.ratings?.[star] || 0) / Math.max(1, summary?.feedback || data?.ratings?.[star] || 1)) * 100)}%` }}
                />
              </span>
              <span>{data?.ratings?.[star] || 0}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="min-w-0 overflow-x-auto rounded-2xl border bg-white p-4" data-testid="analytics-heatmap">
        <h2 className="text-sm font-semibold">{text.hours}</h2>
        <div className="mt-2 grid gap-px" style={{ gridTemplateColumns: "2.2rem repeat(24, minmax(0, 1fr))" }} role="img" aria-label={text.hours}>
          {heat.map((row, day) => (
            <React.Fragment key={days[day]}>
              <span className="text-xs leading-4">{lang === "hi" ? daysHi[day] : days[day]}</span>
              {row.map((count, hour) => (
                <span
                  key={`${day}-${hour}`}
                  data-testid="heat-cell"
                  title={`${days[day]} ${hour}:00 · ${count}`}
                  className="block h-3 rounded-[2px]"
                  style={{ background: `rgba(28,27,24,${0.08 + (count / heatMax) * 0.92})` }}
                />
              ))}
            </React.Fragment>
          ))}
        </div>
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">{text.items}</h2>
        {data && !data.modules.menu ? (
          <p className="rounded-2xl border bg-white p-4 text-sm" data-testid="menu-empty">
            {text.emptyMenu}
          </p>
        ) : (
          (data?.topItems || []).map((item) => (
            <article key={item.itemId} className="rounded-2xl border bg-white p-3 text-sm">
              <p className="font-medium">{item.name}</p>
              <p>{item.views}</p>
            </article>
          ))
        )}
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">{text.places}</h2>
        <article className="rounded-2xl border bg-white p-3 text-sm">
          {data
            ? `mobile ${data.byDevice.mobile} · tablet ${data.byDevice.tablet} · desktop ${data.byDevice.desktop}`
            : ""}
        </article>
        {(data?.byQr || []).map((row) => (
          <article key={row.qrId} className="rounded-2xl border bg-white p-3 text-sm">
            <p className="font-medium">{row.label}</p>
            <p>
              {row.scans} · NFC {row.nfc} · QR {row.qr}
            </p>
          </article>
        ))}
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">{text.tables}</h2>
        {(data?.byTable || []).length === 0 ? <p className="text-sm text-muted-foreground">{text.none}</p> : null}
        {(data?.byTable || []).map((row) => (
          <article key={row.table} className="rounded-2xl border bg-white p-3 text-sm">
            <p className="font-medium">{row.table}</p>
            <p>
              {row.scans} · {row.orders}
            </p>
          </article>
        ))}
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">{text.staff}</h2>
        {(data?.byStaff || []).length === 0 ? <p className="text-sm text-muted-foreground">{text.emptyStaff}</p> : null}
        {(data?.byStaff || []).map((row) => (
          <article key={row.staffId} className="rounded-2xl border bg-white p-3 text-sm">
            <p className="font-medium">{row.name}</p>
            <p>
              {row.scans} · {row.feedback}
            </p>
          </article>
        ))}
      </section>
      <GrowthCard businessId={businessId} />
      <section className="rounded-2xl border bg-white p-4 text-sm">
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" checked={emailOn} onChange={(event) => savePrefs(event.target.checked, whatsappOn)} />
          {text.email}
        </label>
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" checked={whatsappOn} onChange={(event) => savePrefs(emailOn, event.target.checked)} />
          {text.whatsapp}
        </label>
        <a className="mt-2 inline-flex min-h-11 items-center font-medium underline" href={`/api/v1/reports/monthly?businessId=${encodeURIComponent(businessId)}`}>
          {text.pdf}
        </a>
      </section>
    </div>
  );
}
