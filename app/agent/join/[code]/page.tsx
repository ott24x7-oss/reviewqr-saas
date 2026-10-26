import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { JoinButton } from "./join-button";

export const dynamic = "force-dynamic";

export default async function JoinTeamPage({ params }: { params: { code: string } }) {
  const user = await getCurrentUser();
  const code = params.code.toUpperCase();
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6 py-16">
      <h1 className="font-display text-3xl font-bold">Join a QR24x7 team</h1>
      <p className="text-sm text-muted-foreground">
        Code {code}. There is no joining fee. You earn only when a business you bring in pays for a plan or a device. Inviting people does not pay anyone.
      </p>
      {user ? (
        <JoinButton code={code} />
      ) : (
        <Link href={`/login?callbackUrl=${encodeURIComponent(`/agent/join/${code}`)}`} className="text-sm underline">
          Sign in to join
        </Link>
      )}
    </main>
  );
}
