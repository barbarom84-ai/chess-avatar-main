"use client";

import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Download, BookOpen, Play, Settings, Save, Edit } from "lucide-react";
import type { PersonaStats, EngineConfig } from "@/lib/analysis";
import { useRouter } from "next/navigation";
import EngineConfigPanel from "./EngineConfigPanel";
import ProfileEditor from "./ProfileEditor";
import AvatarTradingCard from "./AvatarTradingCard";
import { saveRecentConfig } from "@/lib/storage";
import { toast } from "sonner";
import { saveProfileToCloud, isAuthenticated } from "@/lib/supabase-storage";
import { prepareConfigForExport } from "@/lib/forced-line-utils";
import { accountApiHeaders } from "@/lib/account-api-auth";
import { OPENINGS_DATABASE } from "@/lib/openings-library";
import AuthModal from "./AuthModal";
import UpgradeModal from "./UpgradeModal";
import { useLanguage } from "@/lib/language-context";
import { usePremium } from "@/hooks/usePremium";
import {
  buildAvatarCardModel,
} from "@/lib/avatar-card-model";
import { getAvatarCardLabels } from "@/lib/avatar-card-labels";

interface PersonaCardProps {
  stats: PersonaStats;
  config: EngineConfig;
  profileId?: string;
}

export default function PersonaCard({ stats, config, profileId }: PersonaCardProps) {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const labels = useMemo(() => getAvatarCardLabels(t), [t]);
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

  useEffect(() => {
    saveRecentConfig(customConfig);
  }, [customConfig]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const auth = await isAuthenticated();
    setIsAuth(auth);
  };

  const cardModel = useMemo(() => {
    return buildAvatarCardModel({
      stats,
      config: customConfig,
      labels,
      lang,
    });
  }, [stats, customConfig, labels, lang]);

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
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute(
      "download",
      `Bot_${customConfig.name}.profile.json`
    );
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
        headers: await accountApiHeaders(),
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
          /* ignore */
        }
        toast.error(`${t.personaCard.packDownloadError} (${detail})`);
        return;
      }

      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const match = cd.match(/filename="([^"]+)"/);
      const filename =
        match?.[1] || `ChessAvatar_${customConfig.name}_Pack.zip`;

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
    const configParam = encodeURIComponent(JSON.stringify(customConfig));
    router.push(`/play?config=${configParam}`);
  };

  const handleConfigSave = () => {
    setShowConfigDialog(false);
  };

  const handleSaveToCloud = async () => {
    const { isSupabaseConfigured } = await import("@/lib/supabase");
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

  const actionFooter = (
    <div className="space-y-2" data-card-action>
      <Button
        onClick={handlePlayAgainst}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-xs h-9"
      >
        <Play className="mr-2 h-3.5 w-3.5" />
        {t.personaCard.playAgainst}
      </Button>
      <div className="grid grid-cols-2 gap-1.5">
        <Button
          onClick={() => {
            setConfigPanelNonce((n) => n + 1);
            setShowConfigDialog(true);
          }}
          variant="outline"
          size="sm"
          className="border-purple-500/60 text-purple-300 text-xs h-8"
        >
          <Settings className="mr-1 h-3 w-3" />
          Config
        </Button>
        {profileId ? (
          <Button
            onClick={() => setShowProfileEditor(true)}
            variant="outline"
            size="sm"
            className="border-amber-500/60 text-amber-300 text-xs h-8"
          >
            <Edit className="mr-1 h-3 w-3" />
            {t.engineConfig.edit}
          </Button>
        ) : (
          <Button
            onClick={handleSaveToCloud}
            disabled={savingCloud}
            variant="outline"
            size="sm"
            className="border-cyan-500/60 text-cyan-300 text-xs h-8"
          >
            <Save className="mr-1 h-3 w-3" />
            {t.personaCard.save}
          </Button>
        )}
        <Button
          onClick={handleDownloadPack}
          disabled={downloadingPack}
          variant="outline"
          size="sm"
          className="border-green-500/60 text-green-300 text-xs h-8"
        >
          <Download className="mr-1 h-3 w-3" />
          {downloadingPack ? "…" : t.personaCard.packDownload}
        </Button>
        <Button
          onClick={handleDownloadJson}
          variant="outline"
          size="sm"
          className="text-cyan-300/80 text-xs h-8"
        >
          {t.personaCard.jsonOnly}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
        <AvatarTradingCard
          model={cardModel}
          labels={labels}
          size="lg"
          flippable
          className="mx-auto"
          footer={actionFooter}
        />

        <div className="flex-1 w-full max-w-md space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-slate-400">
              <span className="text-green-400">
                {t.personaCard.winsPercent} {stats.winRate}%
              </span>
              <span className="text-slate-400">
                {t.personaCard.drawsPercent} {stats.drawRate}%
              </span>
              <span className="text-red-400">
                {t.personaCard.lossesPercent} {stats.lossRate}%
              </span>
            </div>
            <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-800">
              <div
                style={{ width: `${stats.winRate}%` }}
                className="bg-green-500"
              />
              <div
                style={{ width: `${stats.drawRate}%` }}
                className="bg-slate-500"
              />
              <div
                style={{ width: `${stats.lossRate}%` }}
                className="bg-red-500"
              />
            </div>
          </div>

          <div>
            <p className="text-sm text-slate-400 mb-2 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-amber-400" />
              {t.personaCard.openingRepertoire}
            </p>
            {stats.topOpenings.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {stats.topOpenings.map((op, i) => (
                  <Badge
                    key={i}
                    className={
                      i === 0
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                        : "bg-slate-800 hover:bg-slate-700"
                    }
                  >
                    {op.name}{" "}
                    <span className="ml-1 opacity-50">({op.count})</span>
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500">
                {t.openingEditor.noOpeningsFound}
              </div>
            )}
          </div>
        </div>
      </div>

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

      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onSuccess={() => {
          checkAuth();
          handleSaveToCloud();
        }}
      />

      {profileId && (
        <ProfileEditor
          open={showProfileEditor}
          onOpenChange={setShowProfileEditor}
          profileId={profileId}
          profileName={customConfig.name}
          personaStats={stats}
          engineConfig={customConfig}
        />
      )}

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
