import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { DeleteAccountForm } from "./form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Delete your account",
  description: "Request deletion of a ReviewQR account from the web."
};

export default function DeleteAccountPage() {
  return (
    <LegalPage
      eyebrow="Account"
      title="Delete your account"
      intro="This page is the public way to delete a ReviewQR account. The Android app uses the same check."
      updated="22 October 2026"
    >
      <p>
        Deleting the account removes the businesses, reviews, feedback, and profile details, and
        replaces the login so it cannot be used again. Payment rows and GST invoices are kept because
        Indian tax rules require those records.
      </p>
      <p>
        Sign in on the web, then ask for a code. The code arrives on WhatsApp or email. The account is
        deleted only after that code matches. The Android app does the same from More, then Delete
        account. Admin accounts are not deleted here.
      </p>
      <DeleteAccountForm />
    </LegalPage>
  );
}
