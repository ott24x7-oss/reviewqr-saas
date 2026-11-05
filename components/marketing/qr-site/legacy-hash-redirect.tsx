"use client";

import * as React from "react";

/** Keep old homepage section links working after those sections moved to /features. */
export const MOVED_SECTION_IDS = [
  "story",
  "features",
  "how",
  "profile",
  "store",
  "reviews",
  "products",
  "growth",
  "industries",
  "plans-list"
] as const;

const MOVED = new Set<string>(MOVED_SECTION_IDS);

export function LegacyHashRedirect() {
  React.useEffect(() => {
    const go = () => {
      const id = window.location.hash.replace(/^#/, "");
      if (!MOVED.has(id)) return;
      if (document.getElementById(id)) return;
      window.location.replace(`/features#${id}`);
    };
    go();
    window.addEventListener("hashchange", go);
    return () => window.removeEventListener("hashchange", go);
  }, []);
  return null;
}
