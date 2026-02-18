"use client";

import { Shield } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export default function PrivacyPage() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen theme-gradient theme-text-primary p-8 flex flex-col items-center">
      <div className="max-w-3xl w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="h-12 w-12 text-cyan-400" />
            <h1 className="text-4xl font-bold neon-cyan">{t.legal.privacyTitle}</h1>
          </div>
          <p className="text-sm text-slate-500">{t.legal.lastUpdated}: 2026-02-14</p>
        </div>

        <div className="prose prose-invert prose-cyan max-w-none space-y-6 text-slate-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">1. {t.legal.privacyDataCollected}</h2>
            <p>{t.legal.privacyDataCollectedText}</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>{t.legal.privacyDataItem1}</li>
              <li>{t.legal.privacyDataItem2}</li>
              <li>{t.legal.privacyDataItem3}</li>
              <li>{t.legal.privacyDataItem4}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">2. {t.legal.privacyUsage}</h2>
            <p>{t.legal.privacyUsageText}</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>{t.legal.privacyUsageItem1}</li>
              <li>{t.legal.privacyUsageItem2}</li>
              <li>{t.legal.privacyUsageItem3}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">3. {t.legal.privacyStorage}</h2>
            <p>{t.legal.privacyStorageText}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">4. {t.legal.privacyThirdParty}</h2>
            <p>{t.legal.privacyThirdPartyText}</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Supabase</strong> — {t.legal.privacyThirdPartySupabase}</li>
              <li><strong>Stripe</strong> — {t.legal.privacyThirdPartyStripe}</li>
              <li><strong>Vercel</strong> — {t.legal.privacyThirdPartyVercel}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">5. {t.legal.privacyRights}</h2>
            <p>{t.legal.privacyRightsText}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">6. {t.legal.privacyCookies}</h2>
            <p>{t.legal.privacyCookiesText}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">7. {t.legal.privacyContact}</h2>
            <p>{t.legal.privacyContact} <a href="/contact" className="text-cyan-400 hover:text-cyan-300">{t.contact.title}</a></p>
          </section>
        </div>
      </div>
    </main>
  );
}
