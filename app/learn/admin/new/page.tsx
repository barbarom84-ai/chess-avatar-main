"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/language-context";
import { useSuperUser } from "@/hooks/useSuperUser";
import { toast } from "sonner";

const SLUG_RE = /^[a-z0-9-]+$/;

export default function LearnAdminNewPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { isSuperUser, loading: superLoading } = useSuperUser();
  const [slug, setSlug] = useState("");

  if (superLoading) {
    return (
      <main className="min-h-screen theme-gradient theme-text-primary p-8 flex items-center justify-center">
        <p className="text-slate-400">…</p>
      </main>
    );
  }

  if (!isSuperUser) {
    return (
      <main className="min-h-screen theme-gradient theme-text-primary p-8 flex flex-col items-center justify-center gap-4 max-w-lg mx-auto text-center">
        <p className="text-slate-300">{t.learn.admin.accessDenied}</p>
        <Button asChild variant="outline">
          <Link href="/learn/admin">{t.learn.admin.title}</Link>
        </Button>
      </main>
    );
  }

  function openEditor() {
    const s = slug.trim().toLowerCase();
    if (!SLUG_RE.test(s)) {
      toast.error(t.learn.admin.invalidSlug);
      return;
    }
    router.push(`/learn/admin/edit/${s}`);
  }

  return (
    <main className="min-h-screen theme-gradient theme-text-primary p-4 md:p-8">
      <div className="max-w-lg mx-auto space-y-6">
        <Button asChild variant="ghost" size="sm" className="text-cyan-400">
          <Link href="/learn/admin" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t.learn.admin.title}
          </Link>
        </Button>

        <Card className="theme-bg-secondary theme-border">
          <CardHeader>
            <CardTitle className="text-xl text-cyan-200">{t.learn.admin.newPageTitle}</CardTitle>
            <CardDescription className="theme-text-secondary">{t.learn.admin.newPageHint}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="slug">{t.learn.admin.newOpeningIdLabel}</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="ma-nouvelle-fiche"
                className="bg-slate-950 border-slate-700 font-mono"
              />
            </div>
            <Button type="button" onClick={openEditor} className="bg-amber-700 hover:bg-amber-600">
              {t.learn.admin.newOpenEditor}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
