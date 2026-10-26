import { FlexWidget, TextWidget } from "react-native-android-widget";
import { formatWidget, QR_DEEP_LINK, type WidgetSnapshot } from "./format";

const openQr = {
  clickAction: "OPEN_URI" as const,
  clickActionData: { uri: QR_DEEP_LINK }
};

export function TodayWidget({ snapshot, wide }: { snapshot: WidgetSnapshot; wide?: boolean }) {
  const view = formatWidget(snapshot);
  return (
    <FlexWidget
      accessibilityLabel={view.loggedIn ? view.title : view.signedOut}
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: view.palette.bg,
        padding: 12,
        flexDirection: "column",
        justifyContent: "space-between",
        borderRadius: 16
      }}
      {...openQr}
    >
      <TextWidget text={view.title} style={{ fontSize: 13, color: view.palette.primary }} />
      {view.loggedIn ? (
        <FlexWidget style={{ flexDirection: wide ? "row" : "column", justifyContent: "space-between", width: "match_parent" }}>
          <TextWidget text={`${view.scans} scans`} style={{ fontSize: 16, color: view.palette.ink }} />
          <TextWidget text={`${view.orders} orders`} style={{ fontSize: 16, color: view.palette.ink }} />
          <TextWidget text={`${view.reviews} reviews`} style={{ fontSize: 16, color: view.palette.ink }} />
        </FlexWidget>
      ) : (
        <TextWidget text={view.signedOut} style={{ fontSize: 14, color: view.palette.ink }} />
      )}
      <TextWidget
        text={view.qrLabel}
        style={{ fontSize: 13, color: view.palette.onPrimary, backgroundColor: view.palette.primary, padding: 6 }}
        {...openQr}
      />
    </FlexWidget>
  );
}

export function MyQrWidget({ palette }: { palette: WidgetSnapshot["palette"] }) {
  return (
    <FlexWidget
      accessibilityLabel="My QR"
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: palette.primary,
        alignItems: "center",
        justifyContent: "center"
      }}
      {...openQr}
    >
      <TextWidget text="QR" style={{ fontSize: 18, color: palette.onPrimary }} />
    </FlexWidget>
  );
}
