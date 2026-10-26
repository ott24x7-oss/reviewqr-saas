import type { ReactNode } from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

/** Stroke icons drawn with react-native-svg. Release builds keep these glyphs when icon fonts are missing. */
function Icon({ children }: { children: ReactNode }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      {children}
    </Svg>
  );
}

export function HomeTabIcon({ color }: { color: string }) {
  return (
    <Icon>
      <Path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" stroke={color} strokeWidth={1.75} strokeLinejoin="round" />
    </Icon>
  );
}

export function OrdersTabIcon({ color }: { color: string }) {
  return (
    <Icon>
      <Rect x="6" y="3.5" width="12" height="17" rx="2" stroke={color} strokeWidth={1.75} />
      <Path d="M9 8h6M9 12h6M9 16h4" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Icon>
  );
}

export function MenuTabIcon({ color }: { color: string }) {
  return (
    <Icon>
      <Path d="M6 3.5v17M6 8h4a3 3 0 0 1 0 6H6" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 3.5v7a2.5 2.5 0 0 0 2.5 2.5H19" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
      <Path d="M16 3.5v17" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Icon>
  );
}

export function FeedbackTabIcon({ color }: { color: string }) {
  return (
    <Icon>
      <Path d="M5 6.5h14v9H8l-3 3v-12Z" stroke={color} strokeWidth={1.75} strokeLinejoin="round" />
    </Icon>
  );
}

export function MoreTabIcon({ color }: { color: string }) {
  return (
    <Icon>
      <Circle cx="6" cy="12" r="1.3" fill={color} />
      <Circle cx="12" cy="12" r="1.3" fill={color} />
      <Circle cx="18" cy="12" r="1.3" fill={color} />
    </Icon>
  );
}

export function AgentBusinessesTabIcon({ color }: { color: string }) {
  return (
    <Icon>
      <Path d="M4 20V8l8-4 8 4v12H4Z" stroke={color} strokeWidth={1.75} strokeLinejoin="round" />
      <Path d="M9 20v-6h6v6M8 9h.01M12 9h.01M16 9h.01" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Icon>
  );
}

export function AgentTeamTabIcon({ color }: { color: string }) {
  return (
    <Icon>
      <Circle cx="9" cy="8" r="3" stroke={color} strokeWidth={1.75} />
      <Path d="M3.5 20v-1a5.5 5.5 0 0 1 11 0v1h-11ZM16 5.5a3 3 0 0 1 0 5.8M17 14a4.5 4.5 0 0 1 3.5 4.4V20h-3" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  );
}

export function AgentEarningsTabIcon({ color }: { color: string }) {
  return (
    <Icon>
      <Rect x="3.5" y="6" width="17" height="13" rx="2" stroke={color} strokeWidth={1.75} />
      <Path d="M3.5 10h17M7.5 15h3" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Icon>
  );
}
