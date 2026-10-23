import { useEffect } from "react";
import { noteObserved } from "./prompt";

/** Asks for a Play review after enough completed orders or received reviews, never on an error screen. */
export function useReviewMoment(orders: { status: string }[], reviews: unknown[], errored: boolean) {
  const ordersCompleted = orders.filter((order) => order.status === "COMPLETED").length;
  const reviewsReceived = reviews.length;
  useEffect(() => {
    void noteObserved(ordersCompleted, reviewsReceived, errored);
  }, [ordersCompleted, reviewsReceived, errored]);
}
