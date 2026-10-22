import { z } from "zod";

export const dashboardSchema = z.object({
  ordersToday: z.number().int(),
  feedbackToday: z.number().int(),
  scansToday: z.number().int(),
  businessId: z.string().nullable(),
  plan: z.object({
    tier: z.string(),
    status: z.string(),
    trialEndsAt: z.string().nullable(),
    subscriptionEndsAt: z.string().nullable()
  })
});

export const placePredictionSchema = z.object({
  placeId: z.string(),
  description: z.string()
});

export const placesSearchSchema = z.object({
  enabled: z.boolean(),
  predictions: z.array(placePredictionSchema)
});

export const placeDetailsSchema = z.object({
  enabled: z.boolean(),
  place: z
    .object({
      name: z.string(),
      address: z.string(),
      phone: z.string(),
      city: z.string(),
      googlePlaceId: z.string(),
      googleReviewUrl: z.string()
    })
    .nullable()
});

export type Dashboard = z.infer<typeof dashboardSchema>;
export type PlacesSearch = z.infer<typeof placesSearchSchema>;
export type PlaceDetails = z.infer<typeof placeDetailsSchema>;
