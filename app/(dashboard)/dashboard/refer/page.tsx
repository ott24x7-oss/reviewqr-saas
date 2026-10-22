import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureOwnerReferral } from "@/lib/plans/owner-referral";
import { generateQrDataUrl } from "@/lib/qr";
import { absoluteUrl, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function statusLabel(status: string | null) {
  if (status === "APPLIED") return "Reward added";
  if (status === "PENDING") return "Paid";
  if (status === "REVERSED") return "Reversed";
  return "Signed up";
}

export default async function ReferPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const referral = await ensureOwnerReferral(user.id);
  const [signups, credit] = await Promise.all([
    prisma.signupAttribution.findMany({
      where: { referrerUserId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, createdAt: true, referralRewardReceived: true } }
      }
    }),
    prisma.referralCredit.findUnique({ where: { userId: user.id } })
  ]);
  const link = absoluteUrl(`/refer/${referral.code}`);
  const qr = await generateQrDataUrl(link, { size: 280 });
  const earned = signups.reduce((sum, row) => {
    const reward = row.user.referralRewardReceived;
    return sum + (reward?.status === "APPLIED" ? reward.months : 0);
  }, 0);
  const share = `https://wa.me/?text=${encodeURIComponent(`Get QR24x7 with my link: ${link}`)}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Refer & earn free months</h1>
        <p className="text-sm text-muted-foreground">
          When someone you refer buys a plan, free months are added after a short hold.
        </p>
      </div>
      <section className="grid gap-4 sm:grid-cols-[200px_1fr]">
        <img src={qr} alt="Referral QR" className="h-48 w-48 rounded-xl border bg-white p-2" />
        <div className="space-y-2">
          <p className="break-all text-sm" data-referral-link={link}>
            {link}
          </p>
          <p className="text-sm">Code {referral.code}</p>
          <a className="inline-flex h-10 items-center rounded-md bg-emerald-600 px-4 text-sm font-medium text-white" href={share} target="_blank" rel="noreferrer">
            Share on WhatsApp
          </a>
          <p className="text-sm">
            Months earned: {earned}. Credit waiting: {credit?.months || 0} months
            {credit?.days ? ` and ${credit.days} days` : ""}.
          </p>
        </div>
      </section>
      <section>
        <h2 className="font-display text-xl font-bold">People referred</h2>
        <ul className="mt-3 space-y-2">
          {signups.length === 0 ? <li className="text-sm text-muted-foreground">No referrals yet.</li> : null}
          {signups.map((row) => {
            const reward = row.user.referralRewardReceived;
            return (
              <li key={row.id} className="rounded-xl border p-3 text-sm">
                <span className="font-medium">{row.user.name || "New business"}</span>
                {" · "}
                {statusLabel(reward?.status || null)}
                {reward?.status === "APPLIED" ? ` · ${reward.months} months` : ""}
                {" · "}
                {formatDate(row.createdAt)}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
