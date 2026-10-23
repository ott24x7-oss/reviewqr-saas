import { Redirect } from "expo-router";

/** qr24x7://qr from the home-screen widgets. */
export default function QrDeepLink() {
  return <Redirect href="/(app)/tap" />;
}
