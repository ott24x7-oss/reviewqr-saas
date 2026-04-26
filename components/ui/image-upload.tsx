"use client";
import * as React from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Variant = "logo" | "cover";

const PRESET = {
  logo: { maxSide: 512, thumbSide: 256, quality: 0.85, aspect: "1 / 1" },
  cover: { maxSide: 1600, thumbSide: 1200, quality: 0.82, aspect: "16 / 9" }
} as const;

async function resizeImage(file: File, variant: Variant): Promise<string> {
  const preset = PRESET[variant];
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Could not decode image"));
    i.src = dataUrl;
  });

  const max = preset.maxSide;
  let { width, height } = img;

  if (variant === "logo") {
    // Center-crop to square, then scale to thumbSide
    const side = Math.min(width, height);
    const sx = (width - side) / 2;
    const sy = (height - side) / 2;
    const out = preset.thumbSide;
    const canvas = document.createElement("canvas");
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);
    return canvas.toDataURL("image/jpeg", preset.quality);
  }

  // cover: preserve aspect ratio, scale longest side to maxSide
  if (width > max || height > max) {
    const scale = max / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", preset.quality);
}

export function ImageUpload({
  value,
  onChange,
  variant = "logo",
  label,
  hint,
  className
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  variant?: Variant;
  label?: string;
  hint?: string;
  className?: string;
}) {
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const aspect = PRESET[variant].aspect;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please pick an image file");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image too large (max 8MB before resize)");
      return;
    }
    setBusy(true);
    try {
      const out = await resizeImage(file, variant);
      onChange(out);
    } catch (err: any) {
      toast.error(err.message || "Couldn't process image");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <div className="text-sm font-medium">{label}</div>}
      <div
        className={cn(
          "relative rounded-xl border-2 border-dashed bg-secondary/30 overflow-hidden",
          variant === "logo" ? "w-32" : "w-full"
        )}
        style={{ aspectRatio: aspect }}
      >
        {value ? (
          <>
            <img src={value} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-black/60 text-white hover:bg-black/80 inline-flex items-center justify-center"
              aria-label="Remove image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition"
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Upload className="h-5 w-5" />
                <span className="text-xs font-medium">Upload</span>
              </>
            )}
          </button>
        )}
        {value && !busy && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-1.5 right-1.5 h-7 px-2.5 rounded-full bg-black/60 text-white text-[11px] font-medium hover:bg-black/80"
          >
            Change
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="sr-only"
        onChange={onFile}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
