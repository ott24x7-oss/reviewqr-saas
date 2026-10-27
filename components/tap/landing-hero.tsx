"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { tapText, type TapLang } from "@/lib/tap/i18n";
import {
  chipTextKey,
  countLine,
  heroPhotos,
  openUntilLabel,
  ratingLine,
  type LandingChipId,
  type LandingFamily
} from "@/lib/tap/landing";
import type { PublicLink } from "@/lib/tap/links";
import { LandingPlaceholder } from "./landing-placeholder";

export function LandingHero({
  family,
  name,
  logo,
  initials,
  bio,
  open,
  closesAt,
  rating,
  serviceCount,
  productCount,
  chips,
  cover,
  gallery,
  heroLinks,
  lang,
  onLang,
  onTrack
}: {
  family: LandingFamily;
  name: string;
  logo: string | null;
  initials: string;
  bio: string;
  open: boolean | null;
  closesAt: string | null;
  rating: { average: number; count: number } | null;
  serviceCount: number;
  productCount: number;
  chips: LandingChipId[];
  cover: string | null;
  gallery: string[];
  heroLinks: PublicLink[];
  lang: TapLang;
  onLang: (lang: TapLang) => void;
  onTrack: (linkKey: string) => void;
}) {
  const photos = heroPhotos(cover, gallery);
  const [index, setIndex] = React.useState(0);
  const safeIndex = photos.length === 0 ? 0 : index % photos.length;
  const until = open ? openUntilLabel(lang, closesAt) : null;
  const stars = rating ? ratingLine(lang, rating.average, rating.count) : null;
  const count = countLine(lang, family, serviceCount, productCount);
  const status =
    open === null ? null : until && open ? until : tapText(lang, open ? "openNow" : "closedNow");

  function step(delta: number) {
    if (photos.length < 2) return;
    setIndex((current) => (current + delta + photos.length) % photos.length);
  }

  return (
    <section className="tap-landing-hero" data-testid="landing-hero" data-family={family}>
      <div className="tap-landing-media">
        {photos.length === 0 ? <LandingPlaceholder family={family} /> : null}
        {photos.length > 0 ? (
          <div className="tap-landing-carousel">
            <img src={photos[safeIndex]} alt="" width={1200} height={800} />
            {photos.length > 1 ? (
              <>
                <button
                  type="button"
                  className="tap-landing-nav tap-landing-nav-prev"
                  aria-label={tapText(lang, "previousPhoto")}
                  onClick={() => step(-1)}
                >
                  <ChevronLeft aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="tap-landing-nav tap-landing-nav-next"
                  aria-label={tapText(lang, "nextPhoto")}
                  onClick={() => step(1)}
                >
                  <ChevronRight aria-hidden="true" />
                </button>
                <div className="tap-landing-dots" aria-label="Photos">
                  {photos.map((src, photoIndex) => (
                    <button
                      key={src}
                      type="button"
                      aria-label={`${photoIndex + 1} / ${photos.length}`}
                      aria-current={photoIndex === safeIndex ? "true" : undefined}
                      onClick={() => setIndex(photoIndex)}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
        <div className="tap-lang" role="group" aria-label="Language">
          <button type="button" aria-pressed={lang === "en"} onClick={() => onLang("en")}>
            EN
          </button>
          <button type="button" aria-pressed={lang === "hi"} onClick={() => onLang("hi")} lang="hi">
            हिं
          </button>
        </div>
      </div>

      <div className="tap-landing-sheet">
        <div className="tap-landing-id">
          {logo ? (
            <img className="tap-logo" src={logo} alt="" width={64} height={64} />
          ) : (
            <span className="tap-logo tap-initials" aria-hidden="true">
              {initials}
            </span>
          )}
          <div className="tap-landing-title">
            <h1>{name}</h1>
            {status ? (
              <p className="tap-hours" data-open={open ? "true" : "false"}>
                <span aria-hidden="true" />
                {status}
              </p>
            ) : null}
          </div>
        </div>

        {stars || count ? (
          <p className="tap-landing-facts">
            {stars ? (
              <span className="tap-landing-rating">
                <Star className="tap-landing-star" aria-hidden="true" />
                {stars}
              </span>
            ) : null}
            {count ? <span className="tap-landing-count">{count}</span> : null}
          </p>
        ) : null}

        {bio ? <p className="tap-bio">{bio}</p> : null}

        {heroLinks.length > 0 ? (
          <div className="tap-hero-actions">
            {heroLinks.map((item, actionIndex) => (
              <a
                key={item.key}
                className="tap-primary tap-hero-cta"
                data-featured={actionIndex === 0 ? "true" : "false"}
                data-tone={actionIndex === 0 ? "primary" : "quiet"}
                href={item.href || "#"}
                onClick={() => onTrack(item.key)}
              >
                <span className="tap-btn-label">{lang === "hi" ? item.labelHi : item.labelEn}</span>
              </a>
            ))}
          </div>
        ) : null}

        {chips.length > 0 ? (
          <ul className="tap-landing-chips" data-testid="landing-chips">
            {chips.map((id) => (
              <li key={id}>{tapText(lang, chipTextKey(id))}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
