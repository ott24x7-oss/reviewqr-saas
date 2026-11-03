import { Redirect, useLocalSearchParams } from "expo-router";

export default function ReferralDeepLink() {
  const params = useLocalSearchParams<{ code: string }>();
  return <Redirect href={{ pathname: "/(auth)/signup", params: { ref: params.code.slice(0, 40) } }} />;
}
