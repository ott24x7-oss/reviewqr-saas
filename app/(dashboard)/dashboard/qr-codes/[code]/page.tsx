import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { absoluteUrl } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer, ExternalLink, Star } from "lucide-react";
import { QrPosterActions } from "./poster-actions";

export const dynamic = "force-dynamic";

export default async function QrDetailPage({ params }: { params: { code: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const qr = await prisma.qRCode.findFirst({
    where: { shortCode: params.code, business: { ownerId: user.id } },
    include: {
      business: { select: { name: true, slug: true, primaryColor: true } },
      location: { select: { name: true } },
      staff: { select: { name: true } }
    }
  });
  if (!qr) notFound();

  const targetUrl = absoluteUrl(`/q/${qr.shortCode}`);
  const directUrl = absoluteUrl(`/r/${qr.business.slug}?q=${qr.shortCode}`);
  const svgUrl = `/api/qr/${qr.shortCode}/image?format=svg`;
  const pngUrl = `/api/qr/${qr.shortCode}/image?format=png`;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">{qr.label}</h1>
        <p className="text-sm text-muted-foreground">
          {qr.business.name}
          {qr.location && ` · ${qr.location.name}`}
          {qr.staff && ` · ${qr.staff.name}`}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div
              className="aspect-square bg-white rounded-xl border-2 p-6 flex items-center justify-center"
              style={{ borderColor: qr.business.primaryColor }}
            >
              <img src={svgUrl} alt={qr.label} className="w-full h-full object-contain" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button asChild variant="outline" size="sm">
                <a href={pngUrl} download={`${qr.business.slug}-${qr.shortCode}.png`}>
                  <Download className="h-3.5 w-3.5" /> PNG
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href={svgUrl} download={`${qr.business.slug}-${qr.shortCode}.svg`}>
                  <Download className="h-3.5 w-3.5" /> SVG
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <div className="text-xs text-muted-foreground">Total scans</div>
              <div className="text-3xl font-bold">{qr.scans}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">Short URL</div>
              <code className="text-xs bg-secondary px-2 py-1 rounded font-mono break-all">{targetUrl}</code>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">Direct review URL</div>
              <code className="text-xs bg-secondary px-2 py-1 rounded font-mono break-all">{directUrl}</code>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button asChild variant="outline" size="sm">
                <a href={targetUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" /> Test
                </a>
              </Button>
              <QrPosterActions code={qr.shortCode} />
            </div>
          </CardContent>
        </Card>
      </div>

      <PosterPreview
        businessName={qr.business.name}
        primaryColor={qr.business.primaryColor}
        svgUrl={svgUrl}
      />
    </div>
  );
}

function PosterPreview({
  businessName,
  primaryColor,
  svgUrl
}: {
  businessName: string;
  primaryColor: string;
  svgUrl: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="font-semibold mb-3">Print-ready poster</h3>
        <div
          id="qr-poster"
          className="mx-auto max-w-md aspect-[3/4] rounded-2xl shadow-card overflow-hidden bg-white border-4"
          style={{ borderColor: primaryColor }}
        >
          <div className="h-full flex flex-col">
            <div
              className="text-white text-center py-5"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, #34a853)` }}
            >
              <div className="text-sm font-medium opacity-90">Loved your visit?</div>
              <div className="text-2xl font-bold mt-1">Leave us a review!</div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="bg-white rounded-xl p-3 border-2" style={{ borderColor: primaryColor }}>
                <img src={svgUrl} alt={businessName} className="w-48 h-48" />
              </div>
              <div className="mt-4 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="mt-3 text-xs text-center text-muted-foreground max-w-xs">
                Scan with your phone camera. It only takes 30 seconds.
              </p>
            </div>
            <div className="text-center py-3 text-xs text-muted-foreground">
              {businessName}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
