"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, MessageSquare, Send, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useState } from "react";
import { toast } from "sonner";

export default function ContactPage() {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });

      if (!res.ok) throw new Error();

      toast.success(t.contact.successMessage);
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      toast.error(t.contact.errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen theme-gradient theme-text-primary p-8 flex flex-col items-center">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <MessageSquare className="h-12 w-12 text-cyan-400" />
            <h1 className="text-4xl font-bold neon-cyan">{t.contact.title}</h1>
          </div>
          <p className="text-cyan-400/70">{t.contact.subtitle}</p>
        </div>

        <Card className="bg-slate-900/80 border-slate-700">
          <CardHeader>
            <CardTitle className="text-xl text-slate-200 flex items-center gap-2">
              <Mail className="h-5 w-5 text-cyan-400" />
              {t.contact.formTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">{t.contact.nameLabel}</label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-slate-950 border-slate-700 text-slate-100"
                  placeholder={t.contact.namePlaceholder}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">{t.contact.emailLabel}</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-slate-950 border-slate-700 text-slate-100"
                  placeholder={t.contact.emailPlaceholder}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">{t.contact.messageLabel}</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={5}
                  className="w-full rounded-md bg-slate-950 border border-slate-700 text-slate-100 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder={t.contact.messagePlaceholder}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold"
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t.contact.sending}</>
                ) : (
                  <><Send className="mr-2 h-4 w-4" /> {t.contact.sendButton}</>
                )}
              </Button>
            </form>

            
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
