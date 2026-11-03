import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState } from "react-native";
import { apiData } from "../api/data";
import { accountKey } from "../query/keys";
import { isModuleList } from "./plan-lock-logic";
import { useBusiness } from "./business";
import { useSession } from "./session";

export type SubscriptionView = {
  tier: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  trialEndsAt: string | null;
  modules?: string[];
  plan: { slug: string; nameEn: string; nameHi: string; duration: string | null } | null;
};

export function useEntitlement() {
  const { user } = useSession();
  const { businessId } = useBusiness();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: accountKey(user?.id ?? "", "subscription", businessId),
    enabled: !!user,
    queryFn: async () => {
      const response = await apiData<unknown>(
        businessId ? `/api/v1/subscription?businessId=${encodeURIComponent(businessId)}` : "/api/v1/subscription",
        {},
        { planSheet: false }
      );
      const value = response && typeof response === "object" && !Array.isArray(response)
        ? response as Record<string, unknown>
        : {};
      return { ...value, modules: isModuleList(value.modules) ? value.modules : undefined } as SubscriptionView;
    }
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

export function hasModule(modules: unknown, id: string) {
  return Array.isArray(modules) && modules.some((module) => typeof module === "string" && module === id);
}
