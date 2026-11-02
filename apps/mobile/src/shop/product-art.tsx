import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from "react-native-svg";
import type { Palette } from "../ui/tokens";

export type ShopArtKind = "stand" | "combo" | "card" | "sticker" | "keychain" | "tent";

function shortName(name: string) {
  return name.length > 15 ? `${name.slice(0, 14)}…` : name;
}

function QrMark({ x, y, size, ink, stock }: { x: number; y: number; size: number; ink: string; stock: string }) {
  const unit = size / 9;
  const modules: [number, number][] = [
    [3, 0], [4, 0], [5, 0], [3, 1], [5, 1], [3, 2], [4, 2], [5, 2], [3, 3], [5, 3], [0, 3], [2, 3], [0, 4], [1, 4], [4, 4], [6, 4], [8, 4], [1, 5], [3, 5], [4, 5], [7, 5], [2, 6], [4, 6], [5, 6], [7, 6], [8, 7], [3, 8], [5, 8], [6, 8]
  ];
  return (
    <>
      <Rect x={x} y={y} width={size} height={size} rx={2} fill={stock} />
      {[[0, 0], [6, 0], [0, 6]].map(([cx, cy]) => (
        <G key={`${cx}-${cy}`}>
          <Rect x={x + cx * unit} y={y + cy * unit} width={3 * unit} height={3 * unit} rx={unit * 0.35} fill={ink} />
          <Rect x={x + (cx + 0.65) * unit} y={y + (cy + 0.65) * unit} width={1.7 * unit} height={1.7 * unit} rx={unit * 0.25} fill={stock} />
          <Rect x={x + (cx + 1) * unit} y={y + (cy + 1) * unit} width={unit} height={unit} rx={unit * 0.15} fill={ink} />
        </G>
      ))}
      {modules.map(([cx, cy]) => <Rect key={`${cx}-${cy}`} x={x + cx * unit} y={y + cy * unit} width={unit * 0.82} height={unit * 0.82} rx={unit * 0.15} fill={ink} />)}
    </>
  );
}

/** A square product illustration for items without an admin-uploaded photo. */
export function ShopProductArt({ kind, businessName, palette, size = 160 }: { kind: ShopArtKind; businessName: string; palette: Palette; size?: number }) {
  const name = shortName(businessName || "QR24x7");
  const ink = palette.ink;
  const stock = palette.card;
  const accent = palette.primary;
  const muted = palette.muted;

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" accessibilityElementsHidden>
      <Rect width="200" height="200" rx="24" fill={palette.surface2} />
      {kind === "card" ? <>
        <Rect x="35" y="54" width="132" height="91" rx="10" fill={ink} opacity="0.11" />
        <Rect x="32" y="50" width="132" height="91" rx="10" fill={stock} />
        <QrMark x={44} y={66} size={54} ink={ink} stock={stock} />
        <SvgText x={125} y={80} fill={ink} fontSize={9} textAnchor="middle">{name}</SvgText>
        <Path d="M121 116 Q132 102 143 116" fill="none" stroke={accent} strokeWidth={2.5} />
      </> : null}
      {kind === "sticker" ? <>
        <Rect x="49" y="48" width="102" height="108" rx="18" fill={ink} opacity="0.1" />
        <Rect x="46" y="44" width="102" height="108" rx="18" fill={stock} />
        <QrMark x={68} y={61} size={59} ink={ink} stock={stock} />
        <SvgText x={97} y={137} fill={ink} fontSize={8} textAnchor="middle">{name}</SvgText>
      </> : null}
      {kind === "keychain" ? <>
        <Circle cx="100" cy="38" r="15" fill="none" stroke={muted} strokeWidth="5" />
        <Rect x="94" y="50" width="12" height="16" rx="4" fill={muted} />
        <Rect x="67" y="63" width="66" height="111" rx="18" fill={ink} opacity="0.1" />
        <Rect x="64" y="59" width="66" height="111" rx="18" fill={stock} />
        <QrMark x={75} y={75} size={44} ink={ink} stock={stock} />
        <Path d="M91 145 Q100 135 109 145 M94 151 Q100 145 106 151" fill="none" stroke={accent} strokeWidth="2" />
        <SvgText x={97} y={163} fill={ink} fontSize={7} textAnchor="middle">{name}</SvgText>
      </> : null}
      {kind === "tent" ? <>
        <Path d="M42 153 L77 50 L157 50 L121 153 Z" fill={ink} opacity="0.1" />
        <Path d="M46 149 L79 51 L119 51 L87 149 Z" fill={stock} />
        <Path d="M91 149 L120 51 L157 51 L130 149 Z" fill={palette.surface} />
        <QrMark x={92} y={75} size={37} ink={ink} stock={stock} />
        <SvgText x={111} y={131} fill={ink} fontSize={7} textAnchor="middle">{name}</SvgText>
      </> : null}
      {kind === "stand" || kind === "combo" ? <>
        <Ellipse cx={kind === "combo" ? 91 : 100} cy="169" rx="48" ry="7" fill={ink} opacity="0.12" />
        <Rect x={kind === "combo" ? 51 : 64} y="150" width="72" height="15" rx="5" fill={ink} />
        <Rect x={kind === "combo" ? 54 : 67} y="33" width="66" height="121" rx="9" fill={ink} opacity="0.1" />
        <Rect x={kind === "combo" ? 51 : 64} y="29" width="66" height="121" rx="9" fill={stock} />
        <SvgText x={kind === "combo" ? 84 : 97} y="48" fill={ink} fontSize="7.5" textAnchor="middle">{name}</SvgText>
        <QrMark x={kind === "combo" ? 60 : 73} y={57} size={48} ink={ink} stock={stock} />
        {kind === "combo" ? <>
          <Rect x="121" y="104" width="54" height="38" rx="6" fill={stock} stroke={palette.line} strokeWidth="2" />
          <Path d="M137 119 Q147 109 157 119 M139 124 Q147 117 155 124 M143 129 Q147 125 151 129" fill="none" stroke={accent} strokeWidth="2.5" />
        </> : null}
      </> : null}
    </Svg>
  );
}
