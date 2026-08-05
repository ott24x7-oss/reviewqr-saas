/* ReviewQR public testimonial widget — drop one tag on any website. */
(function () {
  const script = document.currentScript || document.querySelector("script[data-business]");
  if (!script) return;
  const slug = script.getAttribute("data-business");
  if (!slug) return;

  const containerId = "reviewqr-widget-" + slug;
  let mount = document.getElementById(containerId);
  if (!mount) {
    mount = document.createElement("div");
    mount.id = containerId;
    script.parentNode.insertBefore(mount, script.nextSibling);
  }

  const apiOrigin = new URL(script.src).origin;

  fetch(apiOrigin + "/api/widget/" + encodeURIComponent(slug))
    .then((r) => r.json())
    .then((data) => {
      if (!data || data.error) return;
      const { business, average, total, reviews } = data;
      const c = business.primaryColor || "#1a73e8";

      const css = `
        .rqw-card{font-family:-apple-system,Segoe UI,sans-serif;border:1px solid #e5e7eb;border-radius:14px;padding:20px;background:#fff;color:#1f2937;max-width:560px;margin:16px auto;box-shadow:0 2px 8px rgba(0,0,0,.04)}
        .rqw-head{display:flex;align-items:center;gap:12px;margin-bottom:14px}
        .rqw-logo{width:40px;height:40px;border-radius:8px;background:${c};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700}
        .rqw-name{font-weight:600}
        .rqw-rating{font-size:13px;color:#6b7280}
        .rqw-stars{color:#fbbc04;letter-spacing:1px}
        .rqw-list{display:grid;gap:10px}
        .rqw-item{padding:12px;border:1px solid #f3f4f6;border-radius:10px;background:#fafafa}
        .rqw-item-stars{font-size:12px;color:#fbbc04;margin-bottom:4px}
        .rqw-item-text{font-size:14px;line-height:1.5}
        .rqw-item-author{font-size:12px;color:#6b7280;margin-top:6px}
        .rqw-foot{margin-top:12px;text-align:right;font-size:11px;color:#9ca3af}
        .rqw-foot a{color:#9ca3af;text-decoration:none}
      `;

      const star = (n) => "★".repeat(n) + "☆".repeat(5 - n);

      mount.innerHTML =
        `<style>${css}</style>` +
        `<div class="rqw-card">` +
        `<div class="rqw-head">` +
        (safeImg(business.logo)
          ? `<img class="rqw-logo" src="${escapeHtml(safeImg(business.logo))}" alt="" style="object-fit:cover">`
          : `<div class="rqw-logo">${escapeHtml((business.name || "?")[0])}</div>`) +
        `<div><div class="rqw-name">${escapeHtml(business.name)}</div>` +
        `<div class="rqw-rating"><span class="rqw-stars">${star(Math.round(average))}</span> ${average} · ${total} reviews</div></div>` +
        `</div>` +
        `<div class="rqw-list">` +
        reviews
          .slice(0, 4)
          .map(
            (r) =>
              `<div class="rqw-item">` +
              `<div class="rqw-item-stars">${star(r.rating)}</div>` +
              `<div class="rqw-item-text">${escapeHtml(r.message)}</div>` +
              `<div class="rqw-item-author">— ${escapeHtml(r.author)}</div>` +
              `</div>`
          )
          .join("") +
        `</div>` +
        `<div class="rqw-foot"><a href="${apiOrigin}" target="_blank" rel="noopener">Powered by ReviewQR</a></div>` +
        `</div>`;
    })
    .catch(() => {});

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));
  }

  // Only allow http(s) or inline image data URIs as an <img> source; reject
  // anything else (and anything with quotes/spaces that could break the attr).
  function safeImg(u) {
    const s = String(u || "").trim();
    if (!s || /["'\s<>]/.test(s)) return "";
    return /^(https?:\/\/|data:image\/)/i.test(s) ? s : "";
  }
})();
