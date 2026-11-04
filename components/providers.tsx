"use client";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const AuthSessionProvider = dynamic(() => import("./auth-session-provider").then((module) => module.AuthSessionProvider));

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  if (pathname === "/" || pathname === "/hi") return <>{children}</>;
  return <AuthSessionProvider>{children}</AuthSessionProvider>;
}
