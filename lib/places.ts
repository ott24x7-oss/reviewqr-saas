/** Google Places is optional. The wizard still works when the key is unset. */

export function placesEnabled() {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY);
}

export function googleReviewLink(placeId: string) {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

export function supportWhatsAppLink(businessName: string) {
  const digits = (process.env.SUPPORT_WHATSAPP || "").replace(/\D/g, "");
  if (!digits) return null;
  const text = `I'd like to order a printed QR/NFC for ${businessName}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

type Prediction = { placeId: string; description: string };

export async function searchPlaces(query: string): Promise<Prediction[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || query.trim().length < 2) return [];
  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", query.trim());
  url.searchParams.set("types", "establishment");
  url.searchParams.set("components", "country:in");
  url.searchParams.set("key", key);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    predictions?: Array<{ place_id?: string; description?: string }>;
  };
  return (json.predictions || [])
    .filter((row) => row.place_id && row.description)
    .slice(0, 5)
    .map((row) => ({ placeId: row.place_id!, description: row.description! }));
}

export async function placeDetails(placeId: string) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !placeId) return null;
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "name,formatted_address,formatted_phone_number,address_component");
  url.searchParams.set("key", key);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    result?: {
      name?: string;
      formatted_address?: string;
      formatted_phone_number?: string;
      address_components?: Array<{ long_name: string; types: string[] }>;
    };
  };
  const result = json.result;
  if (!result) return null;
  const city =
    result.address_components?.find((part) => part.types.includes("locality"))?.long_name || "";
  return {
    name: result.name || "",
    address: result.formatted_address || "",
    phone: (result.formatted_phone_number || "").replace(/[^\d+]/g, ""),
    city,
    googlePlaceId: placeId,
    googleReviewUrl: googleReviewLink(placeId)
  };
}
