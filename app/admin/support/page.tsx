import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/controls";
import { SupportReplyForm } from "./reply-form";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage() {
  const tickets = await prisma.supportTicket.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      user: { select: { email: true, name: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { email: true, role: true } } } }
    }
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold font-display">Support</h1>
        <p className="text-sm text-muted-foreground">{tickets.length} threads</p>
      </div>
      {tickets.length === 0 && <p className="text-sm text-muted-foreground">No tickets yet.</p>}
      {tickets.map((ticket) => (
        <Card key={ticket.id}>
          <CardHeader>
            <CardTitle className="text-base">
              {ticket.subject} · {ticket.status.toLowerCase()} · {ticket.user.email}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ticket.messages.map((message) => (
              <div key={message.id} className="text-sm">
                <div className="text-xs text-muted-foreground">
                  {message.author.role === "ADMIN" ? "You" : message.author.email}
                </div>
                <p className="whitespace-pre-wrap">{message.body}</p>
              </div>
            ))}
            <SupportReplyForm ticketId={ticket.id} status={ticket.status} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
