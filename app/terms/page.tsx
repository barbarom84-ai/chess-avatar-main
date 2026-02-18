"use client";

import { FileText } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export default function TermsPage() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen theme-gradient theme-text-primary p-8 flex flex-col items-center">
      <div className="max-w-3xl w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <FileText className="h-12 w-12 text-cyan-400" />
            <h1 className="text-4xl font-bold neon-cyan">{t.legal.termsTitle}</h1>
          </div>
          <p className="text-sm text-slate-500">{t.legal.lastUpdated}: 2026-02-14</p>
        </div>

        <div className="prose prose-invert prose-cyan max-w-none space-y-6 text-slate-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">1. {t.legal.termsAcceptance}</h2>
            <p>{t.legal.termsAcceptanceText}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">2. {t.legal.termsService}</h2>
            <p>{t.legal.termsServiceText}</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>{t.legal.termsServiceItem1}</li>
              <li>{t.legal.termsServiceItem2}</li>
              <li>{t.legal.termsServiceItem3}</li>
              <li>{t.legal.termsServiceItem4}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">3. {t.legal.termsPremium}</h2>
            <p>{t.legal.termsPremiumText}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">4. {t.legal.termsAccount}</h2>
            <p>{t.legal.termsAccountText}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">5. {t.legal.termsIP}</h2>
            <p>{t.legal.termsIPText}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">6. {t.legal.termsLiability}</h2>
            <p>{t.legal.termsLiabilityText}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">7. {t.legal.termsChanges}</h2>
            <p>{t.legal.termsChangesText}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">8. {t.legal.termsContact}</h2>
            <p>{t.legal.termsContact} <a href="/contact" className="text-cyan-400 hover:text-cyan-300">{t.contact.title}</a></p>
          </section>
        </div>
      </div>
    </main>
  );
}
