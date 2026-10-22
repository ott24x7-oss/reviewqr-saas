import { mobileApi } from "./instance";
import { readData } from "./http";

export async function apiData<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (typeof init.body === "string" && !headers.has("content-type")) headers.set("content-type", "application/json");
  const res = await mobileApi.request(path, { ...init, headers });
  return readData<T>(res);
}
