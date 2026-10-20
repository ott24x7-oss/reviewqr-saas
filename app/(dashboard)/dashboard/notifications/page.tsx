"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

export default function NotificationsPage() {
  const [items, setItems] = React.useState<Item[]>([]);

  React.useEffect(() => {
    fetch("/api/notifications")
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((json) => setItems(json.items || []))
      .catch(() => {});
  }, []);

  async function mark(id: string) {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id })
    });
    setItems((current) => current.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold font-display">Notifications</h1>
      <div className="rounded-xl border divide-y">
        {items.length === 0 && <p className="p-4 text-sm text-muted-foreground">No notifications yet.</p>}
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.link || "/dashboard/notifications"}
            onClick={() => mark(item.id)}
            className={cn("block p-4 hover:bg-secondary", !item.isRead && "bg-secondary/40")}
          >
            <div className="text-sm font-medium">{item.title}</div>
            <p className="text-sm text-muted-foreground">{item.message}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
