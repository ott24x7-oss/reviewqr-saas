import { useEffect } from "react";
import { trackAppEvent } from "./events";

export function AppOpenEvent() {
  useEffect(() => {
    void trackAppEvent("app_open");
  }, []);
  return null;
}
