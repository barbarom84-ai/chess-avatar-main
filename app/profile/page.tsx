"use client";

import UserProfile from "@/components/UserProfile";
import PublicProfiles from "@/components/PublicProfiles";
import { useLanguage } from "@/lib/language-context";

export default function ProfilePage() {
  const { t } = useLanguage();
  
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold neon-cyan">
            {t.profile.title}
          </h1>
        </div>

        {/* Contenu */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Profil utilisateur */}
          <div className="lg:col-span-1">
            <UserProfile />
          </div>

          {/* Bibliothèque publique */}
          <div className="lg:col-span-2">
            <PublicProfiles />
          </div>

        </div>

      </div>
    </main>
  );
}
