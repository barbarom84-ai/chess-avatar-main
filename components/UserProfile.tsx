"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Save, Database, Loader2, Trash2, Eye, EyeOff, Play, Download, Settings } from "lucide-react";
import { supabase, isSupabaseConfigured, type DbProfile } from "@/lib/supabase";
import { getUserProfiles, deleteProfile, updateProfile } from "@/lib/supabase-storage";
import { prepareConfigForExport } from "@/lib/forced-line-utils";
import { OPENINGS_DATABASE } from "@/lib/openings-library";
import { useLanguage } from "@/lib/language-context";
import ProfileDetailsModal from "./ProfileDetailsModal";
import { toast } from "sonner";

export default function UserProfile() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [profiles, setProfiles] = useState<DbProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<DbProfile | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Charger l'utilisateur et ses profils
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    loadUser();
    loadProfiles();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfiles();
      } else {
        setProfiles([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUser = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    setLoading(false);
  };

  const loadProfiles = async () => {
    const data = await getUserProfiles();
    setProfiles(data);
  };


  const handleDelete = async (id: string) => {
    if (confirm(t.profile.confirmDelete)) {
      const success = await deleteProfile(id);
      if (success) {
        loadProfiles();
      }
    }
  };

  const handleTogglePublic = async (profile: DbProfile) => {
    const res = await updateProfile(profile.id, { is_public: !profile.is_public });
    if (res.success) {
      loadProfiles();
    } else {
      toast.error(res.error || 'Erreur lors de la mise à jour.');
    }
  };

  const handlePlayAgainst = (profile: DbProfile) => {
    const configParam = encodeURIComponent(JSON.stringify(profile.config));
    router.push(`/play?config=${configParam}`);
  };

  const handleDownload = (profile: DbProfile) => {
    const exportConfig = prepareConfigForExport(profile.config, {
      openingsDatabase: OPENINGS_DATABASE,
    });
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportConfig, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${profile.config.name}_profile.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleViewDetails = (profile: DbProfile) => {
    setSelectedProfile(profile);
    setShowDetailsModal(true);
  };

  const handleUpdateProfile = async (id: string, updates: Partial<DbProfile>): Promise<boolean> => {
    const res = await updateProfile(id, updates);
    if (res.success) {
      setSelectedProfile((prev) => {
        if (!prev || prev.id !== id) return prev;
        return {
          ...prev,
          ...updates,
          config: updates.config !== undefined ? updates.config : prev.config,
          stats: updates.stats !== undefined ? updates.stats : prev.stats,
          is_public: updates.is_public !== undefined ? updates.is_public : prev.is_public,
          updated_at: new Date().toISOString(),
        };
      });
      await loadProfiles();
      toast.success(t.profile.profileUpdated);
      return true;
    }
    toast.error(res.error || 'Erreur lors de la sauvegarde du profil.');
    return false;
  };

  if (loading) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-slate-500" />
            {t.profile.databaseNotConfigured}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-orange-900/10 border-orange-700">
            <AlertDescription className="text-orange-300 text-sm">
              {t.profile.databaseWarning}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-slate-500" />
            {t.profile.notConnected}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-blue-900/10 border-blue-700">
            <AlertDescription className="text-blue-300 text-sm">
              {t.profile.signInPrompt}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Save className="h-5 w-5 text-green-400" />
          {t.profile.myAccount}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Info utilisateur */}
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-slate-400">{t.profile.email}</p>
              <p className="font-semibold text-slate-200">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Liste des profils sauvegardés */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300">{t.profile.savedProfiles}</h3>
            <Badge variant="outline" className="text-slate-400 border-slate-700">
              {profiles.length}
            </Badge>
          </div>

          {profiles.length === 0 ? (
            <Alert className="bg-slate-950 border-slate-800">
              <AlertDescription className="text-slate-400 text-sm">
                {t.profile.noProfiles}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              {profiles.map((profile) => (
                <div 
                  key={profile.id}
                  className="bg-slate-950 p-3 rounded border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{profile.username}</span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          profile.platform === 'chesscom' 
                            ? 'border-green-500 text-green-300 bg-green-500/10' 
                            : 'border-blue-500 text-blue-300 bg-blue-500/10'
                        }`}
                      >
                        {profile.platform === 'chesscom' ? 'Chess.com' : 'Lichess'}
                      </Badge>
                      {profile.is_public && (
                        <Badge variant="outline" className="text-xs text-green-400 border-green-400">
                          {t.profile.public}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleTogglePublic(profile)}
                        className="h-8 w-8 hover:bg-slate-800"
                        aria-label={profile.is_public ? t.profile.makePrivate : t.profile.makePublic}
                        title={profile.is_public ? t.profile.makePrivate : t.profile.makePublic}
                      >
                        {profile.is_public ? (
                          <Eye className="h-4 w-4 text-green-400" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-slate-500" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(profile.id)}
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        aria-label={t.profile.deleteProfile}
                        title={t.profile.deleteProfile}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
                    <span>{t.profile.elo}: {profile.config.elo}</span>
                    <span>{t.profile.level}: {profile.config.difficulty}/5</span>
                    <span>{t.profile.style}: {
                      ({
                        'agressif': t.engineConfig.playStyleAggressive,
                        'solide': t.engineConfig.playStyleSolid,
                        'équilibré': t.engineConfig.playStyleBalanced,
                        'positionnel': t.engineConfig.playStylePositional,
                        'tactique': t.engineConfig.playStyleTactical,
                      } as Record<string, string>)[profile.config.playStyle] || profile.config.playStyle
                    }</span>
                  </div>
                  
                  {/* Boutons d'action */}
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={() => handlePlayAgainst(profile)}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md border border-blue-700"
                      title={t.profile.playAgainst}
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleViewDetails(profile)}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-md border border-purple-700"
                      title={t.profile.viewDetails}
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(profile)}
                      className="border-2 border-green-500 bg-green-500/10 text-green-300 hover:bg-green-500/20 font-semibold shadow-sm"
                      title={t.profile.exportJson}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <div className="text-xs text-slate-600 mt-2">
                    {t.profile.createdOn} {new Date(profile.created_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      <ProfileDetailsModal
        open={showDetailsModal}
        onOpenChange={setShowDetailsModal}
        profile={selectedProfile}
        onUpdate={handleUpdateProfile}
        onPlay={handlePlayAgainst}
      />
    </Card>
  );
}
