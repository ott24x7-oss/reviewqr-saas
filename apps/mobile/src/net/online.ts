import { useEffect, useState } from "react";

export function onlineFrom(state: { isConnected?: boolean | null; isInternetReachable?: boolean | null } | null) {
  if (!state) return true;
  if (state.isConnected === false) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}

export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    let remove = () => {};
    let alive = true;
    import("expo-network")
      .then((Network) => {
        if (!alive) return;
        Network.getNetworkStateAsync()
          .then((state) => {
            if (alive) setOnline(onlineFrom(state));
          })
          .catch(() => undefined);
        const sub = Network.addNetworkStateListener((state) => setOnline(onlineFrom(state)));
        remove = () => {
          sub.remove();
        };
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      remove();
    };
  }, []);
  return online;
}
