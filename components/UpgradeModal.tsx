"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Crown, Palette, ImageIcon, Users, Loader2, CreditCard, Sparkles, BarChart3, Brain } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { supabase } from "@/lib/supabase";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  email: string | null;
  reason?: 'theme' | 'pieces' | 'profiles' | 'coach' | 'review';
}

export default function UpgradeModal({ open, onOpenChange, userId, email, reason }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<'eur' | 'chf' | 'usd'>('eur');
  const [error, setError] = useState('');
  const { t } = useLanguage();

  const handleCheckout = async () => {
    if (!userId || !email) {
      setError(t.upgrade.pleaseLogin);
      return;
    }
    if (!supabase) {
      setError(t.upgrade.notAuthenticated);
      return;
    }

    setLoading(true);
    setError('');

    const errorMessages: Record<string, string> = {
      NOT_AUTHENTICATED: t.upgrade.notAuthenticated,
      PRICE_NOT_CONFIGURED: t.upgrade.priceNotConfigured,
      CHECKOUT_ERROR: t.upgrade.checkoutError,
    };

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error(errorMessages.NOT_AUTHENTICATED);
      }

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ currency: selectedCurrency }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(errorMessages[data.error] || t.upgrade.paymentError);
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : t.upgrade.unexpectedError
      );
    } finally {
      setLoading(false);
    }
  };

  const currencySymbol = {
    eur: '€',
    chf: 'CHF',
    usd: '$',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-slate-900 border-amber-500/30">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Crown className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-amber-100">
                ChessAvatar Premium
              </DialogTitle>
              <DialogDescription className="text-amber-400/70">
                {t.upgrade.unlockAllFeatures}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Benefits */}
          <div className="space-y-3 max-h-[min(22rem,50vh)] overflow-y-auto pr-1">
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${
              reason === 'theme' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-800/50 border-slate-700'
            }`}>
              <Palette className="h-5 w-5 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-200">{t.upgrade.allBoardThemes}</p>
                <p className="text-xs text-slate-400">{t.upgrade.themesCount}</p>
              </div>
              <Badge className="ml-auto bg-amber-500/20 text-amber-300 border-amber-500/30">Premium</Badge>
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-lg border ${
              reason === 'pieces' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-800/50 border-slate-700'
            }`}>
              <ImageIcon className="h-5 w-5 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-200">{t.upgrade.exclusivePieceSets}</p>
                <p className="text-xs text-slate-400">{t.upgrade.pieceSetsDetail}</p>
              </div>
              <Badge className="ml-auto bg-amber-500/20 text-amber-300 border-amber-500/30">Premium</Badge>
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-lg border ${
              reason === 'profiles' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-800/50 border-slate-700'
            }`}>
              <Users className="h-5 w-5 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-200">{t.upgrade.unlimitedProfiles}</p>
                <p className="text-xs text-slate-400">{t.upgrade.profilesLimit}</p>
              </div>
              <Badge className="ml-auto bg-amber-500/20 text-amber-300 border-amber-500/30">Premium</Badge>
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-lg border ${
              reason === 'review' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-800/50 border-slate-700'
            }`}>
              <BarChart3 className="h-5 w-5 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-200">{t.upgrade.fullGameReview}</p>
                <p className="text-xs text-slate-400">{t.upgrade.fullGameReviewDetail}</p>
              </div>
              <Badge className="ml-auto bg-amber-500/20 text-amber-300 border-amber-500/30">Premium</Badge>
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-lg border ${
              reason === 'coach' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-800/50 border-slate-700'
            }`}>
              <Brain className="h-5 w-5 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-200">{t.upgrade.unlimitedCoach}</p>
                <p className="text-xs text-slate-400">{t.upgrade.coachLimit}</p>
              </div>
              <Badge className="ml-auto bg-amber-500/20 text-amber-300 border-amber-500/30">Premium</Badge>
            </div>
          </div>

          {/* Price + Currency */}
          <div className="text-center p-4 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-amber-500/10 rounded-lg border border-amber-500/20">
            <div className="flex items-center justify-center gap-1 mb-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-amber-400 uppercase tracking-wider font-semibold">{t.upgrade.oneTimePayment}</span>
              <Sparkles className="h-4 w-4 text-amber-400" />
            </div>
            <p className="text-3xl font-bold text-amber-100">
              10 {currencySymbol[selectedCurrency]}
            </p>
            <p className="text-xs text-slate-400 mt-1">{t.upgrade.lifetimeAccess}</p>

            <div className="flex justify-center gap-2 mt-3">
              {(['eur', 'chf', 'usd'] as const).map((cur) => (
                <button
                  key={cur}
                  onClick={() => setSelectedCurrency(cur)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    selectedCurrency === cur
                      ? 'bg-amber-500 text-slate-900'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {cur.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Payment methods info */}
          <div className="flex items-center justify-center gap-3 text-xs text-slate-500">
            <CreditCard className="h-4 w-4" />
            <span>Visa, Mastercard</span>
          </div>

          {error && (
            <Alert variant="destructive" className="bg-red-900/20 border-red-700/50 text-red-200">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* CTA */}
          <Button
            onClick={handleCheckout}
            disabled={loading || !userId}
            className="w-full h-12 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-bold text-lg shadow-lg"
          >
            {loading ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t.upgrade.redirecting}</>
            ) : !userId ? (
              t.upgrade.loginFirst
            ) : (
              <><Crown className="mr-2 h-5 w-5" /> {t.upgrade.upgradeToPremium}</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
