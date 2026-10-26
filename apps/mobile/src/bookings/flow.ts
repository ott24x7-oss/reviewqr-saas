import { applyBookingStatus, BOOKING_STATUSES, type BookingStatus } from "@reviewqr/shared";

/** Known statuses the owner can set after the current one. An unknown current status has no moves. */
export function bookingStatusChoices(current: string): BookingStatus[] {
  return BOOKING_STATUSES.filter((status) => status !== current && applyBookingStatus(current, status) === status);
}

export function moveBookingStatus(current: string, next: string) {
  return applyBookingStatus(current, next);
}
