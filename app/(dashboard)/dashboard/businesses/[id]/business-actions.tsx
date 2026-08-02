"use client";
import * as React from "react";
import { Copy, Check, MessageCircle, Share2, Code, Star } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { absoluteUrl } from "@/lib/utils";

export function BusinessActions({
  business,
  reviewUrl
}: {
  business: { id: string; name: string; slug: string; whatsappNumber: string | null };
  reviewUrl: string;
}) {
  const [copied, setCopied] = React.useState<string | null>(null);

  function copy(value: string, label: string) {
    navigator.clipboard.writeText(value);
    setCopied(label);
    toast.success("Copied!");
    setTimeout(() => setCopied(null), 2000);
  }

  const widgetSnippet = `<script src="${absoluteUrl(`/widget.js`)}" data-business="${business.slug}" async></script>`;
  const waMessage = `Hi! Loved our service? It would mean a lot if you'd leave a quick review:\n👉 ${reviewUrl}\nThank you! ⭐`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(waMessage)}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick share</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <input
            readOnly
            value={reviewUrl}
            className="input font-mono text-sm flex-1"
            onFocus={(e) => e.currentTarget.select()}
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copy(reviewUrl, "url")}
              className="flex-1 sm:flex-initial"
            >
              {copied === "url" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              Copy
            </Button>
            <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-initial">
              <a href={waUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            </Button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-2 pt-2">
          <details className="rounded-lg border p-3">
            <summary className="text-sm font-medium cursor-pointer flex items-center gap-2">
              <Code className="h-4 w-4" /> Embed widget on your website
            </summary>
            <p className="mt-2 text-xs text-muted-foreground">
              Paste this snippet in your website's HTML to show your best reviews.
            </p>
            <textarea
              readOnly
              value={widgetSnippet}
              className="input mt-2 font-mono text-xs"
              rows={2}
            />
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => copy(widgetSnippet, "widget")}
            >
              {copied === "widget" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              Copy snippet
            </Button>
          </details>

          <details className="rounded-lg border p-3">
            <summary className="text-sm font-medium cursor-pointer flex items-center gap-2">
              <Share2 className="h-4 w-4" /> Email signature link
            </summary>
            <textarea
              readOnly
              value={`Loved our service? Leave us a quick review: ${reviewUrl}`}
              className="input mt-2 font-mono text-xs"
              rows={2}
            />
          </details>
        </div>
      </CardContent>
    </Card>
  );
}
