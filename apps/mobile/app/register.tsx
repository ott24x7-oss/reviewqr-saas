import { Redirect, useLocalSearchParams } from "expo-router";

export default function RegisterDeepLink() {
  const params = useLocalSearchParams<{ ref?: string | string[]; signup?: string | string[] }>();
  const ref = Array.isArray(params.ref) ? params.ref[0] : params.ref;
  const signup = Array.isArray(params.signup) ? params.signup[0] : params.signup;
  return <Redirect href={{ pathname: "/(auth)/signup", params: { ...(ref ? { ref: ref.slice(0, 40) } : {}), ...(signup ? { signup } : {}) } }} />;
}
