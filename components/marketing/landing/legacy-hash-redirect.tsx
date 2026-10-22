"use client";

import * as React from "react";

/** Section ids that moved from the home page to /features. The hash is not sent to the server. */
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

/** Old home hashes such as /#features open the same section on /features. */
export function LegacyHashRedirect() {
  React.useEffect(() => {
    const go = () => {
      const id = window.location.hash.replace(/^#/, "");
      if (!MOVED.has(id)) return;
      window.location.replace(`/features#${id}`);
    };
    go();
    window.addEventListener("hashchange", go);
    return () => window.removeEventListener("hashchange", go);
  }, []);
  return null;
}
