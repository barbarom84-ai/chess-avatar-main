"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Download, Bot, Swords, Shield, Activity, Cpu, Clock, Target, BookOpen, TrendingUp, Zap, Play, Settings, Save, Edit } from "lucide-react";
import type { PersonaStats, EngineConfig } from "@/lib/analysis";
import Image from "next/image";
import { useRouter } from "next/navigation";
import EngineConfigPanel from "./EngineConfigPanel";
import ProfileEditor from "./ProfileEditor";
import { saveRecentConfig } from "@/lib/storage";
import { toast } from "sonner";
import { saveProfileToCloud, isAuthenticated } from "@/lib/supabase-storage";
import { prepareConfigForExport } from "@/lib/forced-line-utils";
import { OPENINGS_DATABASE } from "@/lib/openings-library";
import AuthModal from "./AuthModal";
import UpgradeModal from "./UpgradeModal";
import { useLanguage } from "@/lib/language-context";
import { usePremium } from "@/hooks/usePremium";

interface PersonaCardProps {
  stats: PersonaStats;
  config: EngineConfig;
  profileId?: string;
}

const playStyleIcons = {
  agressif: { icon: Swords, color: "text-red-400" },
  solide: { icon: Shield, color: "text-blue-400" },
  équilibré: { icon: Activity, color: "text-green-400" },
  positionnel: { icon: Target, color: "text-purple-400" },
  tactique: { icon: Zap, color: "text-yellow-400" },
};

export default function PersonaCard({ stats, config, profileId }: PersonaCardProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const difficultyLabels: Record<number, { label: string; color: string }> = {
    1: { label: t.engineConfig.difficultyBeginner, color: "text-green-400 border-green-400 bg-green-400/10" },
    2: { label: t.engineConfig.difficultyIntermediate, color: "text-blue-400 border-blue-400 bg-blue-400/10" },
    3: { label: t.engineConfig.difficultyAdvanced, color: "text-purple-400 border-purple-400 bg-purple-400/10" },
    4: { label: t.engineConfig.difficultyExpert, color: "text-orange-400 border-orange-400 bg-orange-400/10" },
    5: { label: t.engineConfig.difficultyGrandmaster, color: "text-red-400 border-red-400 bg-red-400/10" },
  };
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [configPanelNonce, setConfigPanelNonce] = useState(0);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [customConfig, setCustomConfig] = useState<EngineConfig>(config);
  const [isAuth, setIsAuth] = useState(false);
  const [savingCloud, setSavingCloud] = useState(false);
  const [downloadingPack, setDownloadingPack] = useState(false);
  const { userId, email } = usePremium();

  useEffect(() => {
    setCustomConfig(config);
  }, [config]);
  
  // Sauvegarder automatiquement dans les récents
  useEffect(() => {
    saveRecentConfig(customConfig);
  }, [customConfig]);

  // Vérifier l'authentification
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const auth = await isAuthenticated();
    setIsAuth(auth);
  };
  
  const buildExportData = () => {
    const exportConfig = prepareConfigForExport(customConfig, {
      openingsDatabase: OPENINGS_DATABASE,
    });
    return {
      ...exportConfig,
      openingsDatabase: OPENINGS_DATABASE,
    };
  };

  const handleDownloadJson = () => {
    const exportData = buildExportData();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `Bot_${customConfig.name}.profile.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleDownloadPack = async () => {
    if (downloadingPack) return;
    setDownloadingPack(true);
    try {
      const exportData = buildExportData();
      const res = await fetch("/api/engine-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exportData),
      });

      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const j = await res.json();
          if (j && typeof j === "object" && "error" in j) {
            detail = String((j as { error: unknown }).error);
          }
        } catch {
          // ignore JSON parse error on non-JSON body
        }
        toast.error(`${t.personaCard.packDownloadError} (${detail})`);
        return;
      }

      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const match = cd.match(/filename="([^"]+)"/);
      const filename = match?.[1] || `ChessAvatar_${customConfig.name}_Pack.zip`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      toast.success(t.personaCard.packDownloadSuccess);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(`${t.personaCard.packDownloadError} (${message})`);
    } finally {
      setDownloadingPack(false);
    }
  };

  const handlePlayAgainst = () => {
    // Encoder la config et naviguer vers la page de jeu
    const configParam = encodeURIComponent(JSON.stringify(customConfig));
    router.push(`/play?config=${configParam}`);
  };

  const handleConfigSave = () => {
    setShowConfigDialog(false);
    // La config est déjà mise à jour via onConfigChange
  };

  const handleSaveToCloud = async () => {
    // Vérifier si Supabase est configuré
    const { isSupabaseConfigured } = await import('@/lib/supabase');
    if (!isSupabaseConfigured) {
      toast.error(t.personaCard.supabaseNotConfigured);
      return;
    }

    if (!isAuth) {
      setShowAuthModal(true);
      return;
    }

    setSavingCloud(true);
    try {
      const result = await saveProfileToCloud(customConfig, stats, false);
      setSavingCloud(false);

      if (result) {
        toast.success(t.personaCard.savedSuccess);
      } else {
        toast.error(t.personaCard.saveError);
      }
    } catch (error: unknown) {
      setSavingCloud(false);
      const msg = error instanceof Error ? error.message : String(error);
      if (msg === "PROFILE_LIMIT_REACHED") {
        setShowUpgradeModal(true);
      } else {
        toast.error(`${t.personaCard.unknownSaveError}: ${msg}`);
      }
      console.error("Erreur complète:", error);
    }
  };

  const difficultyInfo = difficultyLabels[customConfig.difficulty];
  const styleIcon = playStyleIcons[customConfig.playStyle];
  const StyleIcon = styleIcon.icon;

  return (
    <>
    <Card className="bg-slate-900 border-slate-800 text-slate-100">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            {customConfig.avatarUrl ? (
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-green-500 shadow-lg">
                <Image 
                  src={customConfig.avatarUrl} 
                  alt={stats.username} 
                  width={64} 
                  height={64}
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <Bot className="h-8 w-8 text-white" />
              </div>
            )}
            
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                {stats.username}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={difficultyInfo.color}>
                  {difficultyInfo.label}
                </Badge>
                <Badge variant="outline" className="text-amber-400 border-amber-400 bg-amber-400/10">
                  ELO {customConfig.elo}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        
        {/* Barre de Win/Draw/Loss */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-slate-400">
            <span className="text-green-400">{t.personaCard.winsPercent} {stats.winRate}%</span>
            <span className="text-slate-400">{t.personaCard.drawsPercent} {stats.drawRate}%</span>
            <span className="text-red-400">{t.personaCard.lossesPercent} {stats.lossRate}%</span>
          </div>
          <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-800">
            <div style={{ width: `${stats.winRate}%` }} className="bg-green-500" />
            <div style={{ width: `${stats.drawRate}%` }} className="bg-slate-500" />
            <div style={{ width: `${stats.lossRate}%` }} className="bg-red-500" />
          </div>
        </div>

        {/* Configuration du Moteur */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            {t.engineConfig.engineConfig}
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Style de jeu */}
            <div className="bg-slate-950 p-3 rounded border border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <StyleIcon className={`h-4 w-4 ${styleIcon.color}`} />
                <p className="text-xs text-slate-400">{t.personaCard.playStyle}</p>
              </div>
              <p className="font-bold capitalize">{customConfig.playStyle}</p>
            </div>

            {/* Agressivité */}
            <div className="bg-slate-950 p-3 rounded border border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <Swords className="h-4 w-4 text-red-400" />
                <p className="text-xs text-slate-400">{t.personaCard.aggressiveness}</p>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={customConfig.aggressiveness} className="h-2" />
                <span className="text-xs font-bold">{customConfig.aggressiveness}</span>
              </div>
            </div>

            {/* Threads */}
            <div className="bg-slate-950 p-3 rounded border border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="h-4 w-4 text-cyan-400" />
                <p className="text-xs text-slate-400">{t.personaCard.cpuThreads}</p>
              </div>
              <p className="font-bold">{customConfig.threads} thread{customConfig.threads > 1 ? 's' : ''}</p>
            </div>

            {/* Profondeur */}
            <div className="bg-slate-950 p-3 rounded border border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-purple-400" />
                <p className="text-xs text-slate-400">{t.personaCard.depth}</p>
              </div>
              <p className="font-bold">{t.personaCard.depthLevel} {customConfig.depth}</p>
            </div>

            {/* Temps de réflexion */}
            <div className="bg-slate-950 p-3 rounded border border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-blue-400" />
                <p className="text-xs text-slate-400">{t.personaCard.thinkingTime}</p>
              </div>
              <p className="font-bold">{customConfig.timeControl}ms</p>
            </div>

            {/* Moyenne de coups */}
            <div className="bg-slate-950 p-3 rounded border border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-green-400" />
                <p className="text-xs text-slate-400">{t.personaCard.avgMoves}</p>
              </div>
              <p className="font-bold">{stats.avgMoves}</p>
            </div>
          </div>
        </div>

        {/* Ouverture Favorite */}
        <div className="bg-gradient-to-r from-slate-950 to-slate-900 p-4 rounded-lg border border-slate-800">
          <div className="flex items-start gap-3">
            <div className="bg-amber-500/20 p-2 rounded">
              <BookOpen className="h-5 w-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-1">{t.personaCard.favoriteOpening}</p>
              <p className="font-bold text-amber-300">{customConfig.favoriteOpening}</p>
            </div>
          </div>
        </div>

        {/* Ouvertures du répertoire */}
        <div>
          <p className="text-sm text-slate-400 mb-2">{t.personaCard.openingRepertoire}</p>
          {stats.topOpenings.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {stats.topOpenings.map((op, i) => (
                <Badge 
                  key={i} 
                  className={i === 0 ? "bg-amber-500/20 text-amber-300 border-amber-500/50" : "bg-slate-800 hover:bg-slate-700"}
                >
                  {op.name} <span className="ml-1 opacity-50">({op.count})</span>
                </Badge>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-500">{t.openingEditor.noOpeningsFound}</div>
          )}
        </div>

        {/* Boutons d'action */}
        <div className="space-y-2">
          <Button 
            onClick={handlePlayAgainst} 
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold shadow-lg border border-blue-800"
          >
            <Play className="mr-2 h-4 w-4" />
            {t.personaCard.playAgainst}
          </Button>

          <div className="grid grid-cols-3 gap-2">
            <Button 
              onClick={() => {
                setConfigPanelNonce((n) => n + 1);
                setShowConfigDialog(true);
              }} 
              variant="outline"
              className="border-2 border-purple-500 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 hover:text-purple-200 hover:border-purple-400 font-semibold shadow-md"
            >
              <Settings className="mr-2 h-4 w-4" />
              Config
            </Button>

            {/* 🆕 Bouton Éditer (si profileId disponible) */}
            {profileId ? (
              <Button 
                onClick={() => setShowProfileEditor(true)}
                variant="outline"
                className="border-2 border-amber-500 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 hover:border-amber-400 font-semibold shadow-md"
                title={t.engineConfig.editProfile}
              >
                <Edit className="mr-2 h-4 w-4" />
                {t.engineConfig.edit}
              </Button>
            ) : (
              <Button 
                onClick={handleSaveToCloud}
                disabled={savingCloud}
                variant="outline"
                className="border-2 border-cyan-500 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-200 hover:border-cyan-400 font-semibold shadow-md"
              >
                <Save className="mr-2 h-4 w-4" />
                {t.personaCard.save}
              </Button>
            )}

            <Button
              onClick={handleDownloadPack}
              disabled={downloadingPack}
              variant="outline"
              className="border-2 border-green-500 bg-green-500/10 text-green-300 hover:bg-green-500/20 hover:text-green-200 hover:border-green-400 font-semibold shadow-md"
            >
              <Download className="mr-2 h-4 w-4" />
              {downloadingPack ? t.personaCard.packDownloading : t.personaCard.packDownload}
            </Button>

            <Button
              onClick={handleDownloadJson}
              variant="outline"
              size="sm"
              className="border border-cyan-500/50 bg-transparent text-cyan-300/80 hover:bg-cyan-500/10 hover:text-cyan-200 text-xs"
              title={t.personaCard.jsonOnlyTooltip}
            >
              {t.personaCard.jsonOnly}
            </Button>
          </div>
        </div>

      </CardContent>
    </Card>

    {/* Dialog de Configuration */}
    <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.engineConfig.engineConfigAdvanced}</DialogTitle>
          <DialogDescription>
            {t.engineConfig.advancedConfigDescription}
          </DialogDescription>
        </DialogHeader>
        <EngineConfigPanel 
          key={configPanelNonce}
          initialConfig={customConfig}
          onConfigChange={setCustomConfig}
          onSave={handleConfigSave}
        />
      </DialogContent>
    </Dialog>

    {/* Modal d'authentification */}
    <AuthModal 
      open={showAuthModal}
      onOpenChange={setShowAuthModal}
      onSuccess={() => {
        checkAuth();
        handleSaveToCloud();
      }}
    />

    {/* 🆕 Profile Editor Modal */}
    {profileId && (
      <ProfileEditor
        open={showProfileEditor}
        onOpenChange={setShowProfileEditor}
        profileId={profileId}
        profileName={customConfig.name}
        personaStats={stats}
      />
    )}

    {/* Premium Upgrade Modal */}
    <UpgradeModal
      open={showUpgradeModal}
      onOpenChange={setShowUpgradeModal}
      userId={userId}
      email={email}
      reason="profiles"
    />
    </>
  );
}