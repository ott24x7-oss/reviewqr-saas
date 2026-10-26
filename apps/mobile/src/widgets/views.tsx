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
        backgroundColor: "#F4EFE6",
        padding: 12,
        flexDirection: "column",
        justifyContent: "space-between",
        borderRadius: 16
      }}
      {...openQr}
    >
      <TextWidget text={view.title} style={{ fontSize: 13, color: "#0F7A37" }} />
      {view.loggedIn ? (
        <FlexWidget style={{ flexDirection: wide ? "row" : "column", justifyContent: "space-between", width: "match_parent" }}>
          <TextWidget text={`${view.scans} scans`} style={{ fontSize: 16, color: "#1C1813" }} />
          <TextWidget text={`${view.orders} orders`} style={{ fontSize: 16, color: "#1C1813" }} />
          <TextWidget text={`${view.reviews} reviews`} style={{ fontSize: 16, color: "#1C1813" }} />
        </FlexWidget>
      ) : (
        <TextWidget text={view.signedOut} style={{ fontSize: 14, color: "#1C1813" }} />
      )}
      <TextWidget
        text={view.qrLabel}
        style={{ fontSize: 13, color: "#FFFFFF", backgroundColor: "#0F7A37", padding: 6 }}
        {...openQr}
      />
    </FlexWidget>
  );
}

export function MyQrWidget() {
  return (
    <FlexWidget
      accessibilityLabel="My QR"
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: "#0F7A37",
        alignItems: "center",
        justifyContent: "center"
      }}
      {...openQr}
    >
      <TextWidget text="QR" style={{ fontSize: 18, color: "#FFFFFF" }} />
    </FlexWidget>
  );
}
