const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"]);
const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);

function parsedHttps(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  return url;
}

/** True when the URL is an https object on our public storage host. */
export function isHelpStorageUrl(value: string, env: NodeJS.ProcessEnv = process.env) {
  const baseRaw = (env.S3_PUBLIC_BASE_URL || "").trim().replace(/\/$/, "");
  if (!baseRaw.startsWith("https://")) return false;
  const valueUrl = parsedHttps(value);
  let baseUrl: URL;
  try {
    baseUrl = new URL(baseRaw);
  } catch {
    return false;
  }
  if (!valueUrl || valueUrl.host !== baseUrl.host) return false;
  const basePath = baseUrl.pathname.replace(/\/$/, "");
  if (!basePath || basePath === "/") return true;
  return valueUrl.pathname === basePath || valueUrl.pathname.startsWith(`${basePath}/`);
}

function youtubeId(url: URL) {
  const host = url.hostname.toLowerCase();
  if (host === "youtu.be" || host === "www.youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] || "";
    return /^[\w-]{6,}$/.test(id) ? id : "";
  }
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] === "embed" || parts[0] === "shorts") {
    return /^[\w-]{6,}$/.test(parts[1] || "") ? parts[1] : "";
  }
  const watch = url.searchParams.get("v") || "";
  return /^[\w-]{6,}$/.test(watch) ? watch : "";
}

function vimeoId(url: URL) {
  const parts = url.pathname.split("/").filter(Boolean);
  const id = parts[0] === "video" ? parts[1] : parts[0];
  return /^\d+$/.test(id || "") ? id : "";
}

/** YouTube, Vimeo, or a file on our storage host. Anything else is not embeddable. */
export function videoEmbed(url: string, env: NodeJS.ProcessEnv = process.env) {
  const value = url.trim();
  if (!value) return { kind: "none" as const, src: "" };
  const parsed = parsedHttps(value);
  if (!parsed) return { kind: "none" as const, src: "" };
  const host = parsed.hostname.toLowerCase();
  if (YOUTUBE_HOSTS.has(host)) {
    const id = youtubeId(parsed);
    if (id) return { kind: "youtube" as const, src: `https://www.youtube.com/embed/${id}` };
  }
  if (VIMEO_HOSTS.has(host)) {
    const id = vimeoId(parsed);
    if (id) return { kind: "vimeo" as const, src: `https://player.vimeo.com/video/${id}` };
  }
  if (isHelpStorageUrl(value, env)) return { kind: "file" as const, src: parsed.toString() };
  return { kind: "none" as const, src: "" };
}

/** Empty is allowed. A non-empty value must be a permitted embed. */
export function helpVideoToStore(value: unknown, env: NodeJS.ProcessEnv = process.env) {
  const url = String(value || "").trim().slice(0, 400);
  if (!url) return "";
  return videoEmbed(url, env).kind === "none" ? null : url;
}

/** https links and same-site paths. Empty is allowed. http, protocol-relative, and javascript are not. */
export function announcementLinkToStore(value: unknown) {
  const link = String(value || "").trim().slice(0, 300);
  if (!link) return "";
  if (link.startsWith("/") && !link.startsWith("//") && !link.startsWith("/\\")) {
    if (/[\u0000-\u001f\\]/.test(link)) return null;
    if (link.toLowerCase().includes("javascript:")) return null;
    return link;
  }
  const url = parsedHttps(link);
  if (!url) return null;
  return link;
}
