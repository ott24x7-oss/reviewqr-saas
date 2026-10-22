import type { Metadata } from "next";
import { absoluteUrl } from "../utils";
import type { TapRecord } from "./resolve";

export function metadataForBusiness(record: TapRecord, index: boolean): Metadata {
  if (record.status !== "active" && record.status !== "limited") {
    return { title: "QR24x7", robots: { index: false, follow: false } };
  }
  const name = record.business.name;
  const description = record.business.description || name;
  const picture = record.business.logo || record.business.cover || "";
  const image = picture.startsWith("http") ? picture : picture.startsWith("/") ? absoluteUrl(picture) : "";
  return {
    title: name,
    description,
    openGraph: {
      title: name,
      description,
      url: absoluteUrl(`/${record.business.slug}`),
      images: image ? [{ url: image }] : undefined
    },
    robots: { index, follow: true }
  };
}
