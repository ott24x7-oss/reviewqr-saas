import { cursorQuery, isPageError, readPage } from "@/lib/api/cursor";
import { takePage } from "@/lib/api/page";
import { fail, ok } from "@/lib/api/result";
import { prisma } from "@/lib/db";
import { maskPhone } from "./mask";

export async function listAdminTickets(search: URLSearchParams) {
  const page = readPage(search);
  if (isPageError(page)) return fail(400, page.error);
  const status = (search.get("status") || "").trim();
  const listed = await takePage(
    () =>
      prisma.supportTicket.findMany({
        where: status ? { status } : {},
        orderBy: { id: "desc" },
        ...cursorQuery(page.cursorId, page.limit),
        select: {
          id: true,
          subject: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { name: true, email: true, phone: true } }
        }
      }),
    page.limit
  );
  if (!listed.ok) return listed;
  return ok({
    items: listed.data.items.map((row) => ({
      id: row.id,
      subject: row.subject,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      name: row.user.name,
      email: row.user.email,
      phone: maskPhone(row.user.phone)
    })),
    nextCursor: listed.data.nextCursor
  });
}

export async function loadAdminTicket(id: string) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      messages: { orderBy: { createdAt: "asc" }, select: { id: true, body: true, createdAt: true, authorId: true } }
    }
  });
  if (!ticket) return fail(404, "Ticket not found");
  return ok({
    id: ticket.id,
    subject: ticket.subject,
    status: ticket.status,
    user: {
      id: ticket.user.id,
      name: ticket.user.name,
      email: ticket.user.email,
      phone: maskPhone(ticket.user.phone)
    },
    messages: ticket.messages.map((message) => ({
      id: message.id,
      body: message.body,
      authorId: message.authorId,
      createdAt: message.createdAt.toISOString()
    }))
  });
}

export async function replyToTicket(opts: { ticketId: string; authorId: string; body?: string; status?: "OPEN" | "CLOSED" }) {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: opts.ticketId } });
  if (!ticket) return fail(404, "Ticket not found");
  const body = opts.body?.trim();
  if (!body && !opts.status) return fail(400, "Write a reply");
  const status = opts.status || "OPEN";
  await prisma.$transaction(async (tx) => {
    if (body) {
      await tx.supportMessage.create({ data: { ticketId: ticket.id, authorId: opts.authorId, body } });
      await tx.notification.create({
        data: {
          userId: ticket.userId,
          type: "support_reply",
          title: "Support replied",
          message: body.slice(0, 240),
          link: "/dashboard/help"
        }
      });
    }
    await tx.supportTicket.update({ where: { id: ticket.id }, data: { status } });
  });
  return ok({ before: { status: ticket.status }, after: { status } });
}
