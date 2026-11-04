function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function inlineMarkdown(value: string) {
  const links: string[] = [];
  const withLinks = value.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, label: string, href: string) => {
    let safeHref = "";
    try {
      const url = new URL(href);
      if (url.protocol === "https:" || url.protocol === "http:") safeHref = url.href;
    } catch { /* Unsafe and relative links remain plain text. */ }
    const markup = safeHref ? `<a href="${escapeHtml(safeHref)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>` : escapeHtml(label);
    const token = `\u0000${links.length}\u0000`;
    links.push(markup);
    return token;
  });
  let html = escapeHtml(withLinks)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return html.replace(/\u0000(\d+)\u0000/g, (_match, index: string) => links[Number(index)] || "");
}

/** Tiny safe markdown renderer: raw HTML is escaped and only known tags are emitted. */
export function renderSafeMarkdown(markdown: string) {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const blocks: string[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) { index += 1; continue; }
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) { blocks.push(`<h2>${inlineMarkdown(heading[1])}</h2>`); index += 1; continue; }
    if (/^[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index])) items.push(`<li>${inlineMarkdown(lines[index++].replace(/^\s*[-*+]\s+/, ""))}</li>`);
      blocks.push(`<ul>${items.join("")}</ul>`); continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) items.push(`<li>${inlineMarkdown(lines[index++].replace(/^\s*\d+\.\s+/, ""))}</li>`);
      blocks.push(`<ol>${items.join("")}</ol>`); continue;
    }
    if (/^>\s?/.test(line)) { blocks.push(`<blockquote><p>${inlineMarkdown(line.replace(/^>\s?/, ""))}</p></blockquote>`); index += 1; continue; }
    const paragraph = [line]; index += 1;
    while (index < lines.length && lines[index].trim() && !/^\s*(#{1,6}\s|[-*+]\s|\d+\.\s|>\s?)/.test(lines[index])) paragraph.push(lines[index++].trim());
    blocks.push(`<p>${paragraph.map(inlineMarkdown).join("<br />")}</p>`);
  }
  return blocks.join("\n");
}
