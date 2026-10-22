import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState } from "react-native";
import { apiData } from "../api/data";
import { accountKey } from "../query/keys";
import { useSession } from "./session";

export type SubscriptionView = {
  tier: string;
  status: string;
  endsAt: string | null;
  trialEndsAt: string | null;
  modules: string[];
  plan: { slug: string; nameEn: string; nameHi: string; duration: string | null } | null;
};

export function useEntitlement() {
  const { user } = useSession();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: accountKey(user?.id ?? "", "subscription"),
    enabled: !!user,
    queryFn: () => apiData<SubscriptionView>("/api/v1/subscription")
  });

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "subscription") }).catch(() => undefined);
      }
    });
    return () => sub.remove();
  }, [client, user?.id]);

  return query;
}

export function hasModule(modules: string[] | undefined, id: string) {
  return !!modules?.includes(id);
}
