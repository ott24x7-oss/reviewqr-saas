/** YouTube watch, share, embed, and shorts URLs. Returns null for anything else. */
export function youtubeId(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "");
  let id = "";
  if (host === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0] || "";
  else if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "m.youtube.com") {
    id = url.searchParams.get("v") || "";
    if (!id) {
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") id = parts[1] || "";
    }
  }
  return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : null;
}

export function youtubeThumb(raw: string) {
  const id = youtubeId(raw);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}
