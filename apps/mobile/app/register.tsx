import { Redirect, useLocalSearchParams } from "expo-router";

export default function RegisterDeepLink() {
  const params = useLocalSearchParams<{ ref?: string | string[] }>();
  const ref = Array.isArray(params.ref) ? params.ref[0] : params.ref;
  return <Redirect href={{ pathname: "/(auth)/signup", params: ref ? { ref: ref.slice(0, 40) } : {} }} />;
}
