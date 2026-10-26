"use client";

import { PaymentActions } from "../payment-actions";

export function PaymentDetailActions({ id, status, provider }: { id: string; status: string; provider: string }) {
  return (
    <div className="max-w-md">
      <PaymentActions id={id} status={status} provider={provider} />
    </div>
  );
}
