"use client";

import * as React from "react";
import { codeFromScan } from "@/lib/tap/qr-stock";

type Detector = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
};

/** Shown only where the browser has BarcodeDetector. Other browsers keep the typed field. */
export function CodeScan({ onCode }: { onCode: (code: string) => void }) {
  const [supported, setSupported] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState("");
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const onCodeRef = React.useRef(onCode);
  onCodeRef.current = onCode;

  React.useEffect(() => {
    setSupported(typeof window !== "undefined" && "BarcodeDetector" in window);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    let stopped = false;
    let stream: MediaStream | null = null;
    const DetectorCtor = (window as unknown as {
      BarcodeDetector?: new (opts?: { formats?: string[] }) => Detector;
    }).BarcodeDetector;
    if (!DetectorCtor || !navigator.mediaDevices?.getUserMedia) {
      setError("The camera is not available. Type the code instead.");
      setOpen(false);
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then(async (next) => {
        stream = next;
        if (stopped) {
          next.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = next;
        await video.play();
        const detector = new DetectorCtor({ formats: ["qr_code"] });
        const tick = async () => {
          if (stopped) return;
          try {
            const found = await detector.detect(video);
            const code = found.map((item) => codeFromScan(item.rawValue)).find((value): value is string => !!value);
            if (code) {
              stopped = true;
              next.getTracks().forEach((track) => track.stop());
              setOpen(false);
              onCodeRef.current(code);
              return;
            }
          } catch {
            /* The next frame may not be ready. */
          }
          if (!stopped) window.setTimeout(() => void tick(), 300);
        };
        void tick();
      })
      .catch(() => {
        if (!stopped) setError("The camera is not available. Type the code instead.");
        setOpen(false);
      });
    return () => {
      stopped = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [open]);

  if (!supported) return null;
  return (
    <div className="space-y-2">
      <button
        type="button"
        className="min-h-[44px] rounded-md border px-3 text-sm"
        onClick={() => {
          setError("");
          setOpen((value) => !value);
        }}
      >
        {open ? "Close camera" : "Scan"}
      </button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {open ? <video ref={videoRef} muted playsInline className="w-full max-w-sm rounded-xl bg-black" /> : null}
    </div>
  );
}
