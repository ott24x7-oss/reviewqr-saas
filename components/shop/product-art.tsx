import * as React from "react";
import type { ShopArtKind } from "@/lib/shop/card";

// Pastel tiles from the landing palette; the object is drawn in marketing ink on white stock.
const TILE: Record<ShopArtKind, string> = {
  stand: "var(--marketing-sage)",
  combo: "var(--marketing-sky)",
  card: "var(--marketing-blush)",
  sticker: "var(--marketing-sand)",
  keychain: "var(--marketing-sage)",
  tent: "var(--marketing-sky)",
  plan: "var(--marketing-sand)"
};

const INK = "var(--marketing-ink)";
const MUTED = "var(--marketing-muted)";
const STOCK = "var(--store-card)";
const ACCENT = "hsl(var(--accent))";

/** A stable QR-like pattern (not scannable) so the preview reads as "your code goes here". */
function qrCells(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const cells: Array<[number, number]> = [];
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const eye = (x < 3 && y < 3) || (x > 5 && y < 3) || (x < 3 && y > 5);
      if (eye) continue;
      h = Math.imul(h ^ (x * 31 + y), 16777619);
      if ((h >>> 7) & 1) cells.push([x, y]);
    }
  }
  return cells;
}

function Qr({ x, y, size, seed }: { x: number; y: number; size: number; seed: string }) {
  const unit = size / 9;
  const eye = (ex: number, ey: number) => (
    <g key={`${ex}-${ey}`}>
      <rect x={x + ex * unit} y={y + ey * unit} width={unit * 3} height={unit * 3} rx={unit * 0.6} fill={INK} />
      <rect x={x + (ex + 0.6) * unit} y={y + (ey + 0.6) * unit} width={unit * 1.8} height={unit * 1.8} rx={unit * 0.4} fill={STOCK} />
      <rect x={x + (ex + 1) * unit} y={y + (ey + 1) * unit} width={unit} height={unit} rx={unit * 0.25} fill={INK} />
    </g>
  );
  return (
    <g>
      {eye(0, 0)}
      {eye(6, 0)}
      {eye(0, 6)}
      {qrCells(seed).map(([cx, cy]) => (
        <rect key={`${cx}-${cy}`} x={x + cx * unit + unit * 0.1} y={y + cy * unit + unit * 0.1} width={unit * 0.8} height={unit * 0.8} rx={unit * 0.2} fill={INK} />
      ))}
    </g>
  );
}

function Nfc({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill="none" stroke={ACCENT} strokeWidth={2.4} strokeLinecap="round">
      <path d="M0 -6 a6 6 0 0 1 0 12" />
      <path d="M5 -11 a12 12 0 0 1 0 22" />
      <path d="M10 -16 a18 18 0 0 1 0 32" />
    </g>
  );
}

function Stars({ x, y, size = 6 }: { x: number; y: number; size?: number }) {
  return (
    <g fill={ACCENT}>
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={i} cx={x + i * size * 1.7} cy={y} r={size / 2} />
      ))}
    </g>
  );
}

function short(name: string, max: number) {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

function Label({ x, y, text, size, max, weight = 700 }: { x: number; y: number; text: string; size: number; max: number; weight?: number }) {
  return (
    <text x={x} y={y} textAnchor="middle" fontSize={size} fontWeight={weight} fill={INK} style={{ fontFamily: "var(--font-hindi), system-ui, sans-serif" }}>
      {short(text, max)}
    </text>
  );
}

type ArtWords = { tagline: string; lifetime: string };

function Piece({ kind, name, words }: { kind: ShopArtKind; name: string; words: ArtWords }) {
  switch (kind) {
    case "card":
      return (
        <g>
          <rect x={34} y={58} width={132} height={84} rx={8} fill={INK} opacity={0.12} transform="translate(4 6)" />
          <rect x={34} y={58} width={132} height={84} rx={8} fill={STOCK} />
          <Qr x={48} y={74} size={52} seed={name} />
          <Label x={130} y={92} text={name} size={9} max={12} />
          <Stars x={110} y={106} size={5} />
          <Nfc x={124} y={126} scale={0.7} />
        </g>
      );
    case "sticker":
      return (
        <g>
          <rect x={70} y={44} width={86} height={86} rx={12} fill={STOCK} transform="rotate(8 113 87)" opacity={0.7} />
          <rect x={52} y={60} width={92} height={92} rx={12} fill={INK} opacity={0.12} transform="translate(3 5)" />
          <rect x={52} y={60} width={92} height={92} rx={12} fill={STOCK} />
          <Qr x={70} y={70} size={56} seed={name} />
          <Label x={98} y={142} text={name} size={8} max={16} />
        </g>
      );
    case "keychain":
      return (
        <g>
          <circle cx={100} cy={40} r={14} fill="none" stroke={MUTED} strokeWidth={4} />
          <rect x={95} y={50} width={10} height={14} rx={3} fill={MUTED} />
          <rect x={70} y={62} width={60} height={100} rx={14} fill={INK} opacity={0.12} transform="translate(3 5)" />
          <rect x={70} y={62} width={60} height={100} rx={14} fill={STOCK} />
          <circle cx={100} cy={72} r={4} fill={TILE.keychain} />
          <Qr x={78} y={82} size={44} seed={name} />
          <Nfc x={94} y={145} scale={0.6} />
        </g>
      );
    case "tent":
      return (
        <g>
          <path d="M40 160 L80 50 L160 50 L120 160 Z" fill={INK} opacity={0.1} />
          <path d="M44 160 L84 50 L124 50 L84 160 Z" fill={STOCK} transform="translate(32 0)" />
          <Qr x={96} y={78} size={40} seed={name} />
          <Label x={112} y={140} text={name} size={8} max={12} />
        </g>
      );
    case "plan":
      return (
        <g>
          <circle cx={100} cy={96} r={52} fill={STOCK} />
          <circle cx={100} cy={96} r={44} fill="none" stroke={ACCENT} strokeWidth={3} strokeDasharray="4 5" />
          <path d="M100 66 l9 19 21 3 -15 15 4 21 -19 -10 -19 10 4 -21 -15 -15 21 -3z" fill={ACCENT} />
          <Label x={100} y={168} text={words.lifetime} size={11} max={18} weight={800} />
        </g>
      );
    case "combo":
    case "stand":
    default:
      return (
        <g>
          <ellipse cx={kind === "combo" ? 88 : 100} cy={168} rx={50} ry={6} fill={INK} opacity={0.12} />
          <rect x={kind === "combo" ? 52 : 64} y={152} width={72} height={14} rx={5} fill={INK} opacity={0.85} />
          <rect x={kind === "combo" ? 54 : 66} y={34} width={68} height={122} rx={8} fill={STOCK} />
          <Label x={kind === "combo" ? 88 : 100} y={54} text={name} size={8} max={14} />
          <Qr x={kind === "combo" ? 64 : 76} y={62} size={48} seed={name} />
          <Stars x={kind === "combo" ? 69 : 81} y={124} size={5} />
          <text x={kind === "combo" ? 88 : 100} y={143} textAnchor="middle" fontSize={6.5} fontWeight={600} fill={MUTED} style={{ fontFamily: "var(--font-hindi), system-ui, sans-serif" }}>
            {words.tagline}
          </text>
          {kind === "combo" && (
            <g>
              <rect x={118} y={104} width={58} height={38} rx={5} fill={INK} opacity={0.12} transform="translate(2 4) rotate(-12 147 123)" />
              <rect x={118} y={104} width={58} height={38} rx={5} fill={STOCK} transform="rotate(-12 147 123)" />
              <Nfc x={140} y={124} scale={0.65} />
            </g>
          )}
        </g>
      );
  }
}

/** Illustrated product preview shown until the admin uploads a photo. Never an empty box. */
export function ProductArt({ kind, businessName, words, className }: { kind: ShopArtKind; businessName: string; words: ArtWords; className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <rect width={200} height={200} fill={TILE[kind]} />
      <Piece kind={kind} name={businessName} words={words} />
    </svg>
  );
}
