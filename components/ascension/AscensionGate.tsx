"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Crown, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AuthModal from "@/components/AuthModal";
import UpgradeModal from "@/components/UpgradeModal";
import { useLanguage } from "@/lib/language-context";
import { usePremium } from "@/hooks/usePremium";
import { isSupabaseConfigured } from "@/lib/supabase";

interface AscensionGateProps {
  children: ReactNode;
}

export default function AscensionGate({ children }: AscensionGateProps) {
  const { t } = useLanguage();
  const { isPremium, loading, userId, email } = usePremium();
  const [showAuth, setShowAuth] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    if (!loading && userId && !isPremium) {
      setShowUpgrade(true);
    }
  }, [loading, userId, isPremium]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <Card className="max-w-md mx-auto theme-bg-secondary border-cyan-500/20">
        <CardContent className="pt-6 text-center text-slate-300">
          {t.ascension.notConfigured}
        </CardContent>
      </Card>
    );
  }

  if (!userId) {
    return (
      <>
        <Card className="max-w-lg mx-auto theme-bg-secondary border-cyan-500/20">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <LogIn className="h-10 w-10 mx-auto text-cyan-400" />
            <h2 className="text-xl font-semibold text-slate-100">{t.ascension.signInTitle}</h2>
            <p className="text-slate-400 text-sm">{t.ascension.signInDesc}</p>
            <Button onClick={() => setShowAuth(true)} className="bg-cyan-600 hover:bg-cyan-500">
              {t.profile.signIn}
            </Button>
          </CardContent>
        </Card>
        <AuthModal open={showAuth} onOpenChange={setShowAuth} />
      </>
    );
  }

  if (!isPremium) {
    return (
      <>
        <Card className="max-w-lg mx-auto theme-bg-secondary border-amber-500/30">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <Crown className="h-10 w-10 mx-auto text-amber-400" />
            <h2 className="text-xl font-semibold text-slate-100">{t.ascension.premiumTitle}</h2>
            <p className="text-slate-400 text-sm">{t.ascension.premiumDesc}</p>
            <Button onClick={() => setShowUpgrade(true)} className="bg-amber-600 hover:bg-amber-500">
              {t.ascension.upgradeCta}
            </Button>
          </CardContent>
        </Card>
        <UpgradeModal
          open={showUpgrade}
          onOpenChange={setShowUpgrade}
          userId={userId}
          email={email}
          reason="ascension"
        />
      </>
    );
  }

  return <>{children}</>;
}
