import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";

const DAY_MS = 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      gcTime: DAY_MS,
      networkMode: "offlineFirst"
    }
  }
});

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "reviewqr.queryCache"
});

export const queryPersistOptions = {
  persister: queryPersister,
  maxAge: DAY_MS
};
