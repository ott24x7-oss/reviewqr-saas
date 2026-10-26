"use client";

import * as React from "react";

/** SVG bezel. The screenshot sits in HTML so the browser can pick AVIF or WebP. */
export function PhoneFrame({ children }: { children: React.ReactNode }) {
  const raw = React.useId().replace(/:/g, "");
  const mask = `hv3-phone-${raw}`;
  return (
    <div className="hv3-phone">
      <div className="hv3-phone-screen">{children}</div>
      <svg className="hv3-phone-svg" viewBox="0 0 240 500" aria-hidden="true">
        <defs>
          <mask id={mask}>
            <rect width="240" height="500" fill="white" />
            <rect x="11" y="13" width="218" height="474" rx="28" fill="black" />
          </mask>
        </defs>
        <rect width="240" height="500" rx="36" fill="#1C1813" mask={`url(#${mask})`} />
        <rect x="92" y="22" width="56" height="8" rx="4" fill="#1C1813" />
      </svg>
    </div>
  );
}
