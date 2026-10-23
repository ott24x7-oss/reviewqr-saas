import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { apiData } from "../api/data";
import { useOnline } from "../net/online";
import { flushStoredOrderQueue } from "./queue";

/** Sends queued order status changes once the phone is back online. */
export function OrderStatusSync() {
  const online = useOnline();
  const client = useQueryClient();
  useEffect(() => {
    if (!online) return;
    void flushStoredOrderQueue((row) =>
      apiData(`/api/v1/orders/${row.orderId}/status`, {
        method: "POST",
        body: JSON.stringify({ status: row.status })
      })
    ).then((sent) => {
      if (sent > 0) void client.invalidateQueries({ predicate: (query) => query.queryKey.includes("orders") });
    });
  }, [client, online]);
  return null;
}
