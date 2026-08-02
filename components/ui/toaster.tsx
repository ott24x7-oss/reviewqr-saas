"use client";
import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      theme="dark"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "!font-sans",
          title: "text-sm font-semibold",
          description: "text-sm"
        }
      }}
    />
  );
}
