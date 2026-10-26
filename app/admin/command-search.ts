"use server";

import { requireAdminPage } from "@/lib/admin";
import { adminSearch } from "@/lib/admin/search";

export async function searchAdminCommand(query: string) {
  await requireAdminPage();
  const result = await adminSearch(query);
  if (!result.ok) {
    return { users: [], businesses: [], payments: [], agents: [], orders: [] };
  }
  return result.data;
}
