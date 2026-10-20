import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { hashToken } from "@/lib/tokens";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AcceptInvite } from "./accept";
import { AuthFrame } from "@/components/brand/auth-frame";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: { token: string } }) {
  const invite = await prisma.businessInvite.findUnique({
    where: { tokenHash: hashToken(params.token) },
    include: { business: { select: { name: true } } }
  });
  const valid = invite && !invite.acceptedAt && invite.expiresAt.getTime() > Date.now();
  if (!valid || !invite) {
    return (
      <AuthFrame>
        <Card>
          <CardHeader>
            <CardTitle>Invite unavailable</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This invite was already used or it has expired. Ask the owner to send a new one.
          </CardContent>
        </Card>
      </AuthFrame>
    );
  }

  const user = await getSessionUser();
  const callback = `/invite/${params.token}`;
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(callback)}`);

  const matches = user.email.toLowerCase() === invite.email;
  return (
    <AuthFrame>
      <Card>
        <CardHeader>
          <CardTitle>Join {invite.business.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            You were invited as {invite.role.toLowerCase()} at {invite.email}.
          </p>
          {matches ? (
            <AcceptInvite token={params.token} />
          ) : (
            <p>
              You are signed in as {user.email}.{" "}
              <Link className="underline" href={`/login?callbackUrl=${encodeURIComponent(callback)}`}>
                Switch account
              </Link>{" "}
              or{" "}
              <Link className="underline" href={`/register?callbackUrl=${encodeURIComponent(callback)}`}>
                create the invited account
              </Link>
              .
            </p>
          )}
        </CardContent>
      </Card>
    </AuthFrame>
  );
}
