"use client";

import * as React from "react";
import { formatDuration, formatServicePrice, type PriceType } from "@reviewqr/shared";
import { tapText, type TapLang } from "@/lib/tap/i18n";
import { safeImageSrc } from "@/lib/tap/links";
import type { StoreCategory, StoreItem } from "./store-menu";

type DateMode = "today" | "tomorrow" | "pick";
type TimeMode = "MORNING" | "AFTERNOON" | "EVENING" | "exact";

function istKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function addDays(key: string, days: number) {
  const [year, month, day] = key.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day));
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function ServicesBoard({
  code,
  channel,
  businessName,
  items,
  categories,
  lang
}: {
  code: string;
  channel: "q" | "t";
  businessName: string;
  items: StoreItem[];
  categories: StoreCategory[];
  lang: TapLang;
}) {
  const text = (key: Parameters<typeof tapText>[1]) => tapText(lang, key);
  const label = (item: { name?: string; nameHi?: string; label?: string; labelHi?: string }) => {
    const hindiName = item.nameHi || item.labelHi || "";
    const englishName = item.name || item.label || "";
    return lang === "hi" && hindiName ? hindiName : englishName;
  };
  const [chip, setChip] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [optionId, setOptionId] = React.useState("");
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const services = items.filter((item) => item.kind === "SERVICE" && item.bookable !== false);
  const used = new Set(services.map((item) => item.categoryId).filter(Boolean));
  const chips = categories.filter((category) => used.has(category.id));
  const q = query.trim().toLowerCase();
  const visible = services.filter((item) => {
    if (chip !== "all" && item.categoryId !== chip) return false;
    if (!q) return true;
    return `${item.name} ${item.nameHi} ${item.description}`.toLowerCase().includes(q);
  });
  const booking = services.find((item) => item.id === openId) || null;

  return (
    <div className="svc-board" data-testid="services-board">
      <div className="svc-chips" role="tablist" aria-label={text("services")}>
        <button type="button" aria-pressed={chip === "all"} onClick={() => setChip("all")}>
          {text("allCategories")}
        </button>
        {chips.map((category) => (
          <button key={category.id} type="button" aria-pressed={chip === category.id} onClick={() => setChip(category.id)}>
            {label(category)}
          </button>
        ))}
      </div>
      <label className="store-search-wrap">
        <input
          className="store-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={text("searchServices")}
          aria-label={text("searchServices")}
        />
      </label>
      {visible.length === 0 ? <p className="store-empty">{text("noServices")}</p> : null}
      <ul className="svc-list">
        {visible.map((item) => {
          const photo = safeImageSrc(item.photo);
          const options = item.variants.filter((row) => row.inStock);
          const minutes = item.durationMinutes;
          return (
            <li key={item.id} className="svc-card" data-testid="service-card">
              {photo ? <img className="svc-photo" src={photo} alt="" /> : null}
              <div className="svc-card-body">
                <h3>{label(item)}</h3>
                <p className="svc-meta">
                  {minutes ? <span>{formatDuration(minutes, lang)}</span> : null}
                  <span>{priceLabel(item, lang)}</span>
                </p>
                {item.description ? (
                  <>
                    <p className={expanded === item.id ? "svc-desc" : "svc-desc svc-desc-clip"}>{item.description}</p>
                    <button type="button" className="svc-more" onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
                      {expanded === item.id ? text("hideDetails") : text("moreDetails")}
                    </button>
                  </>
                ) : null}
                {options.length > 0 ? (
                  <div className="svc-options">
                    {options.map((option) => (
                      <span key={option.id}>
                        {label(option)}
                        {option.durationMinutes ? ` · ${formatDuration(option.durationMinutes, lang)}` : ""}
                        {option.pricePaise ? ` · ${formatServicePrice({ pricePaise: option.pricePaise, lang })}` : ""}
                      </span>
                    ))}
                  </div>
                ) : null}
                <button
                  type="button"
                  className="svc-book"
                  data-testid="book-open"
                  onClick={() => {
                    setOptionId(options[0]?.id || "");
                    setOpenId(item.id);
                  }}
                >
                  {text("book")}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {booking ? (
        <BookSheet
          code={code}
          channel={channel}
          businessName={businessName}
          item={booking}
          lang={lang}
          optionId={optionId}
          onOption={setOptionId}
          onClose={() => setOpenId(null)}
          label={label}
          text={text}
        />
      ) : null}
    </div>
  );
}

function priceLabel(item: StoreItem, lang: TapLang) {
  const type = (item.priceType || "FIXED") as PriceType;
  return formatServicePrice({ pricePaise: item.pricePaise, priceType: type, lang });
}

function BookSheet({
  code,
  channel,
  businessName,
  item,
  lang,
  optionId,
  onOption,
  onClose,
  label,
  text
}: {
  code: string;
  channel: "q" | "t";
  businessName: string;
  item: StoreItem;
  lang: TapLang;
  optionId: string;
  onOption: (id: string) => void;
  onClose: () => void;
  label: (item: { name?: string; nameHi?: string; label?: string; labelHi?: string }) => string;
  text: (key: Parameters<typeof tapText>[1]) => string;
}) {
  const today = istKey();
  const tomorrow = addDays(today, 1);
  const latest = addDays(today, 90);
  const options = item.variants.filter((row) => row.inStock);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [dateMode, setDateMode] = React.useState<DateMode>("today");
  const [picked, setPicked] = React.useState(today);
  const [timeMode, setTimeMode] = React.useState<TimeMode>("MORNING");
  const [exact, setExact] = React.useState("");
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState("");
  const [saved, setSaved] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const preferredDate = dateMode === "today" ? today : dateMode === "tomorrow" ? tomorrow : picked;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (timeMode === "exact" && !exact) {
      setError(text("preferredTime"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/public/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code,
          itemId: item.id,
          variantId: optionId || undefined,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          consent: true,
          preferredDate,
          preferredSlot: timeMode === "exact" ? undefined : timeMode,
          preferredTime: timeMode === "exact" ? exact : undefined,
          note: note.trim() || undefined,
          lang,
          source: channel === "q" ? "qr" : "nfc"
        })
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; whatsappUrl?: string | null };
      if (!res.ok) {
        setError(body.error || text("bookingFailed"));
        return;
      }
      setSaved(true);
      if (body.whatsappUrl) window.location.assign(body.whatsappUrl);
    } catch {
      setError(text("bookingFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="svc-sheet-back" role="presentation" onClick={onClose}>
      <form
        className="svc-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={text("book")}
        data-testid="book-sheet"
        onClick={(event) => event.stopPropagation()}
        onSubmit={submit}
      >
        <div className="svc-sheet-head">
          <h2>
            {text("book")} · {label(item)}
          </h2>
          <button type="button" onClick={onClose} aria-label={text("closeBag")}>
            ×
          </button>
        </div>
        <p className="svc-meta">
          {formatDuration(options.find((row) => row.id === optionId)?.durationMinutes || item.durationMinutes, lang)}
          {" · "}
          {priceLabel(item, lang)}
        </p>
        {options.length > 0 ? (
          <fieldset className="svc-choice">
            <legend>{text("serviceOption")}</legend>
            {options.map((option) => (
              <label key={option.id}>
                <input
                  type="radio"
                  name="option"
                  checked={optionId === option.id}
                  onChange={() => onOption(option.id)}
                />
                {label(option)}
              </label>
            ))}
          </fieldset>
        ) : null}
        <label>
          {text("yourName")}
          <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} autoComplete="name" />
        </label>
        <label>
          {text("phone")}
          <input value={phone} onChange={(event) => setPhone(event.target.value)} required inputMode="tel" autoComplete="tel" maxLength={20} />
        </label>
        <label className="svc-consent">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required />
          {text("consentBooking")}
        </label>
        <fieldset className="svc-choice">
          <legend>{text("preferredDate")}</legend>
          <button type="button" aria-pressed={dateMode === "today"} onClick={() => setDateMode("today")}>{text("today")}</button>
          <button type="button" aria-pressed={dateMode === "tomorrow"} onClick={() => setDateMode("tomorrow")}>{text("tomorrow")}</button>
          <button type="button" aria-pressed={dateMode === "pick"} onClick={() => setDateMode("pick")}>{text("pickDate")}</button>
          {dateMode === "pick" ? (
            <input type="date" value={picked} min={today} max={latest} onChange={(event) => setPicked(event.target.value)} required />
          ) : null}
        </fieldset>
        <fieldset className="svc-choice">
          <legend>{text("preferredTime")}</legend>
          <button type="button" aria-pressed={timeMode === "MORNING"} onClick={() => setTimeMode("MORNING")}>{text("morning")}</button>
          <button type="button" aria-pressed={timeMode === "AFTERNOON"} onClick={() => setTimeMode("AFTERNOON")}>{text("afternoon")}</button>
          <button type="button" aria-pressed={timeMode === "EVENING"} onClick={() => setTimeMode("EVENING")}>{text("evening")}</button>
          <button type="button" aria-pressed={timeMode === "exact"} onClick={() => setTimeMode("exact")}>{text("exactTime")}</button>
          {timeMode === "exact" ? (
            <input type="time" value={exact} onChange={(event) => setExact(event.target.value)} required />
          ) : null}
        </fieldset>
        <label>
          {text("bookingNote")}
          <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={400} rows={2} />
        </label>
        {error ? <p className="svc-error" role="alert">{error}</p> : null}
        {saved && !error ? <p className="svc-saved">{text("bookingSaved")}</p> : null}
        <button type="submit" className="svc-book" data-testid="book-submit" disabled={busy || !consent}>
          {text("sendBooking")}
        </button>
        <p className="svc-fine">{businessName}</p>
      </form>
    </div>
  );
}
