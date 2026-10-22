"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCenter } from "@/components/help/help-center";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  messages: Array<{ id: string; body: string; createdAt: string; author: { email: string; role: string } }>;
};

export default function HelpPage() {
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [reply, setReply] = React.useState<Record<string, string>>({});

  async function load() {
    const res = await fetch("/api/support");
    if (!res.ok) return;
    const json = await res.json();
    setTickets(json.tickets || []);
  }

  React.useEffect(() => {
    load().catch(() => {});
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subject, body })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error || "Could not send");
      return;
    }
    setSubject("");
    setBody("");
    toast.success("Message sent");
    await load();
  }

  async function sendReply(id: string) {
    const text = reply[id]?.trim();
    if (!text) return;
    const res = await fetch(`/api/support/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: text })
    });
    if (!res.ok) {
      toast.error("Could not send");
      return;
    }
    setReply((current) => ({ ...current, [id]: "" }));
    await load();
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold font-display">Help</h1>
        <p className="text-sm text-muted-foreground">We reply in this thread. It is not a live chat.</p>
      </div>
      <HelpCenter />
      <Card>
        <CardHeader>
          <CardTitle>New message</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="space-y-3">
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" required />
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="How can we help?" required />
            <Button type="submit">Send</Button>
          </form>
        </CardContent>
      </Card>
      {tickets.map((ticket) => (
        <Card key={ticket.id}>
          <CardHeader>
            <CardTitle className="text-base">
              {ticket.subject} · {ticket.status.toLowerCase()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ticket.messages.map((message) => (
              <div key={message.id} className="text-sm">
                <div className="text-xs text-muted-foreground">
                  {message.author.role === "ADMIN" ? "Support" : message.author.email}
                </div>
                <p className="whitespace-pre-wrap">{message.body}</p>
              </div>
            ))}
            {ticket.status !== "CLOSED" && (
              <div className="flex gap-2">
                <Input
                  value={reply[ticket.id] || ""}
                  onChange={(e) => setReply((current) => ({ ...current, [ticket.id]: e.target.value }))}
                  placeholder="Reply"
                />
                <Button type="button" variant="outline" onClick={() => sendReply(ticket.id)}>
                  Reply
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
