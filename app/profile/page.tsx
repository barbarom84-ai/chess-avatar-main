"use client";

import UserProfileDashboard from "@/components/UserProfileDashboard";
import { useLanguage } from "@/lib/language-context";

export default function ProfilePage() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-slate-100 px-4 py-5 md:p-8">
      <div className="max-w-6xl mx-auto space-y-4 md:space-y-5">
        <div className="space-y-0.5">
          <h1 className="text-2xl md:text-3xl font-bold neon-cyan">{t.profile.title}</h1>
          <p className="text-sm text-slate-400">{t.profileDashboard.subtitle}</p>
        </div>
        <UserProfileDashboard />
      </div>
    </main>
  );
}
