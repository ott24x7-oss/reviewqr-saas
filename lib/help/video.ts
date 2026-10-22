export function videoEmbed(url: string) {
  const value = url.trim();
  if (!value) return { kind: "none" as const, src: "" };
  const youtube = value.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  if (youtube) return { kind: "youtube" as const, src: `https://www.youtube.com/embed/${youtube[1]}` };
  const vimeo = value.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return { kind: "vimeo" as const, src: `https://player.vimeo.com/video/${vimeo[1]}` };
  return { kind: "file" as const, src: value };
}
