import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiData } from "../api/data";
import { accountKey } from "../query/keys";
import { useSession } from "./session";
import { BUSINESS_ID_KEY } from "./storage";

export type BusinessCard = {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  city: string | null;
  address: string | null;
  googlePlaceId: string | null;
  googleReviewUrl: string | null;
  whatsappNumber: string | null;
  ownerId?: string;
};

type BusinessValue = {
  businesses: BusinessCard[];
  businessId: string | null;
  business: BusinessCard | null;
  choose: (id: string) => void;
  loading: boolean;
  reload: () => void;
};

const BusinessContext = createContext<BusinessValue | null>(null);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [stored, setStored] = useState(false);
  const query = useQuery({
    queryKey: accountKey(user?.id ?? "", "businesses"),
    enabled: !!user,
    queryFn: () => apiData<{ items: BusinessCard[] }>("/api/v1/businesses?limit=50")
  });

  useEffect(() => {
    AsyncStorage.getItem(BUSINESS_ID_KEY)
      .then((value) => setBusinessId(value))
      .finally(() => setStored(true));
  }, []);

  const businesses = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const selected = businesses.find((item) => item.id === businessId) ?? businesses[0] ?? null;

  useEffect(() => {
    if (!stored || !selected) return;
    AsyncStorage.setItem(BUSINESS_ID_KEY, selected.id).catch(() => undefined);
  }, [stored, selected]);

  const value = useMemo<BusinessValue>(
    () => ({
      businesses,
      businessId: selected?.id ?? null,
      business: selected,
      choose: (id: string) => {
        setBusinessId(id);
        AsyncStorage.setItem(BUSINESS_ID_KEY, id).catch(() => undefined);
      },
      loading: query.isLoading,
      reload: () => {
        query.refetch().catch(() => undefined);
      }
    }),
    [businesses, selected, query]
  );

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusiness() {
  const value = useContext(BusinessContext);
  if (!value) throw new Error("useBusiness outside provider");
  return value;
}
