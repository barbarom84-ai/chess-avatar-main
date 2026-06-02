"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Swords, Shield, Activity, Cpu, Clock, Target, BookOpen, TrendingUp, 
  Zap, BarChart, Play, Pencil, User
} from "lucide-react";
import type { DbProfile } from "@/lib/supabase";
import type { EngineConfig, PersonaStats } from "@/lib/analysis";
import EngineConfigPanel from "./EngineConfigPanel";
import AvatarTradingCard from "./AvatarTradingCard";
import { useLanguage } from "@/lib/language-context";
import { getProfileMetadata } from "@/lib/profile-metadata";
import type { ProfileMetadata } from "@/types/chess";
import { buildAvatarCardModel } from "@/lib/avatar-card-model";
import { getAvatarCardLabels } from "@/lib/avatar-card-labels";

interface ProfileDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: DbProfile | null;
  onUpdate?: (id: string, updates: Partial<DbProfile>) => void | Promise<boolean>;
  onPlay?: (profile: DbProfile) => void;
}

const playStyleIcons = {
  agressif: { icon: Swords, color: "text-red-400" },
  solide: { icon: Shield, color: "text-blue-400" },
  équilibré: { icon: Activity, color: "text-green-400" },
  positionnel: { icon: Target, color: "text-purple-400" },
  tactique: { icon: Zap, color: "text-yellow-400" },
};

export default function ProfileDetailsModal({
  open,
  onOpenChange,
  profile,
  onUpdate,
  onPlay
}: ProfileDetailsModalProps) {
  const { t, lang } = useLanguage();
  const styleMap: Record<string, string> = {
    'Agressif': t.performanceCharts.styleAggressive,
    'Solide': t.performanceCharts.styleSolid,
    'Équilibré': t.performanceCharts.styleBalanced,
    'Chaotique': t.performanceCharts.styleChaotic,
  };
  const playStyleMap: Record<string, string> = {
    'agressif': t.engineConfig.playStyleAggressive,
    'solide': t.engineConfig.playStyleSolid,
    'équilibré': t.engineConfig.playStyleBalanced,
    'positionnel': t.engineConfig.playStylePositional,
    'tactique': t.engineConfig.playStyleTactical,
  };

  const difficultyLabels: Record<number, { label: string; color: string }> = {
    1: { label: t.engineConfig.difficultyBeginner, color: "text-green-400 border-green-400 bg-green-400/10" },
    2: { label: t.engineConfig.difficultyIntermediate, color: "text-blue-400 border-blue-400 bg-blue-400/10" },
    3: { label: t.engineConfig.difficultyAdvanced, color: "text-purple-400 border-purple-400 bg-purple-400/10" },
    4: { label: t.engineConfig.difficultyExpert, color: "text-orange-400 border-orange-400 bg-orange-400/10" },
    5: { label: t.engineConfig.difficultyGrandmaster, color: "text-red-400 border-red-400 bg-red-400/10" },
  };
  const [activeTab, setActiveTab] = useState("stats");
  const [isEditing, setIsEditing] = useState(false);
  const [editedConfig, setEditedConfig] = useState<EngineConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [metadata, setMetadata] = useState<ProfileMetadata | null>(null);
  const labels = useMemo(() => getAvatarCardLabels(t), [t]);

  const profileIdForEffect = profile?.id;

  useEffect(() => {
    if (!open || !profileIdForEffect) return;
    setActiveTab("stats");
    setIsEditing(false);
    setEditedConfig(null);
    void getProfileMetadata(profileIdForEffect).then(setMetadata);
  }, [open, profileIdForEffect]);

  const stats = profile?.stats as PersonaStats | undefined;
  const config = profile
    ? editedConfig || (profile.config as EngineConfig)
    : null;

  const cardModel = useMemo(() => {
    if (!profile || !stats || !config) return null;
    return buildAvatarCardModel({
      stats,
      config,
      metadata: metadata ?? undefined,
      labels,
      lang,
    });
  }, [profile, stats, config, metadata, labels, lang]);

  if (!profile || !stats || !config || !cardModel) return null;

  const difficultyInfo = difficultyLabels[config.difficulty];
  const styleIcon = playStyleIcons[config.playStyle];
  const StyleIcon = styleIcon?.icon || Activity;

  const handleSaveChanges = async () => {
    if (!onUpdate || saving) return;
    setSaving(true);
    try {
      const toSave = editedConfig ?? config;
      const result = await Promise.resolve(onUpdate(profile.id, { config: toSave }));
      // Treat explicit false as failure; true or void (legacy handlers) as success
      if (result !== false) {
        setIsEditing(false);
        setEditedConfig(null);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <div className="flex flex-col lg:flex-row gap-4 items-start justify-between">
            <div className="flex flex-col sm:flex-row gap-4 items-start flex-1 min-w-0">
              <AvatarTradingCard
                model={cardModel}
                labels={labels}
                size="lg"
                flippable
                exportable
                className="shrink-0 mx-auto sm:mx-0"
              />
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-2xl font-bold flex items-center gap-2 flex-wrap">
                  {profile.username}
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      profile.platform === "chesscom"
                        ? "border-green-500 text-green-300 bg-green-500/10"
                        : "border-blue-500 text-blue-300 bg-blue-500/10"
                    }`}
                  >
                    {profile.platform === "chesscom" ? t.platform.chesscom : t.platform.lichess}
                  </Badge>
                </DialogTitle>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="outline" className={difficultyInfo.color}>
                    {difficultyInfo.label}
                  </Badge>
                  {profile.is_public && (
                    <Badge variant="outline" className="text-green-400 border-green-400 bg-green-400/10">
                      {t.profile.public}
                    </Badge>
                  )}
                </div>
                <DialogDescription className="mt-2 text-slate-400 flex items-center gap-2 flex-wrap">
                  {config.creatorName && (
                    <span className="inline-flex items-center gap-1 text-slate-300">
                      <User className="h-3 w-3" />
                      {config.creatorName}
                      <span className="text-slate-600">·</span>
                    </span>
                  )}
                  {t.profileDetails.createdOn}{" "}
                  {new Date(profile.created_at).toLocaleDateString()}{" "}
                  {new Date(profile.created_at).toLocaleTimeString()}
                </DialogDescription>
              </div>
            </div>

            <Button
              onClick={() => onPlay?.(profile)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold shadow-lg shrink-0 w-full sm:w-auto"
            >
              <Play className="mr-2 h-4 w-4" />
              {t.profileDetails.play}
            </Button>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800 border border-slate-700">
            <TabsTrigger value="stats">
              <BarChart className="mr-2 h-4 w-4" />
              {t.profileDetails.statsTab}
            </TabsTrigger>
            <TabsTrigger value="config">
              <Cpu className="mr-2 h-4 w-4" />
              {t.profileDetails.configTab}
            </TabsTrigger>
          </TabsList>

          {/* ONGLET STATISTIQUES */}
          <TabsContent value="stats" className="space-y-4">
            {/* Win/Draw/Loss */}
            <Card className="bg-slate-950 border-slate-800">
              <CardContent className="pt-6">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">{t.profileDetails.overallResults}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-400 font-semibold">{t.games.victories}</span>
                    <span className="text-slate-300">{stats.winRate}%</span>
                  </div>
                  <div className="flex h-4 w-full rounded-full overflow-hidden bg-slate-800">
                    <div style={{ width: `${stats.winRate}%` }} className="bg-green-500" />
                    <div style={{ width: `${stats.drawRate}%` }} className="bg-slate-500" />
                    <div style={{ width: `${stats.lossRate}%` }} className="bg-red-500" />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>{t.games.draws} {stats.drawRate}%</span>
                    <span>{t.games.losses} {stats.lossRate}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-slate-900 p-3 rounded border border-slate-800">
                    <p className="text-xs text-slate-400 mb-1">{t.profileDetails.gamesAnalyzed}</p>
                    <p className="text-2xl font-bold text-slate-200">{stats.gameCount}</p>
                  </div>
                  <div className="bg-slate-900 p-3 rounded border border-slate-800">
                    <p className="text-xs text-slate-400 mb-1">{t.profileDetails.averageMoves}</p>
                    <p className="text-2xl font-bold text-slate-200">{stats.avgMoves}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Style de jeu */}
            <Card className="bg-slate-950 border-slate-800">
              <CardContent className="pt-6">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">{t.profileDetails.playStyleDetected}</h3>
                <div className="flex items-center gap-3 bg-slate-900 p-4 rounded-lg border border-slate-800">
                  <div className={`p-3 rounded-lg bg-${styleIcon.color.split('-')[1]}-500/20`}>
                    <StyleIcon className={`h-6 w-6 ${styleIcon.color}`} />
                  </div>
                  <div>
                    <p className="font-bold text-lg capitalize text-slate-200">{styleMap[stats.style] || stats.style}</p>
                    <p className="text-sm text-slate-400">{t.profileDetails.mainStyle}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs text-slate-400 mb-2">{t.profileDetails.aggressiveness}</p>
                  <div className="flex items-center gap-3">
                    <Progress value={config.aggressiveness} className="h-3" />
                    <span className="text-sm font-bold text-slate-200">{config.aggressiveness}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ouvertures */}
            <Card className="bg-slate-950 border-slate-800">
              <CardContent className="pt-6">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">
                  <BookOpen className="inline-block mr-2 h-4 w-4 text-amber-400" />
                  {t.profileDetails.openingRepertoire}
                </h3>
                
                <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 p-4 rounded-lg border border-amber-500/50 mb-4">
                  <p className="text-xs text-amber-400 mb-1">{t.profileDetails.favoriteOpening}</p>
                  <p className="font-bold text-amber-300 text-lg">{config.favoriteOpening}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {stats.topOpenings.map((op, i) => (
                    <Badge 
                      key={i} 
                      className={i === 0 
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/50 text-sm" 
                        : "bg-slate-800 hover:bg-slate-700 text-sm"
                      }
                    >
                      {op.name} <span className="ml-1 opacity-50">({op.count})</span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ONGLET CONFIGURATION */}
          <TabsContent value="config" className="space-y-4">
            {!isEditing ? (
              <>
                <Card className="bg-slate-950 border-slate-800">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-slate-300">{t.engineConfig.engineParams}</h3>
                      {onUpdate && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setEditedConfig(config);
                            setIsEditing(true);
                          }}
                          className="bg-purple-600 hover:bg-purple-500 text-white font-semibold"
                        >
                          <Pencil className="mr-2 h-3 w-3" />
                          {t.profileDetails.edit}
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Style de jeu */}
                      <div className="bg-slate-900 p-4 rounded border border-slate-800">
                        <div className="flex items-center gap-2 mb-2">
                          <StyleIcon className={`h-4 w-4 ${styleIcon.color}`} />
                          <p className="text-xs text-slate-400">{t.profileDetails.playStyle}</p>
                        </div>
                        <p className="font-bold text-slate-200 capitalize">{playStyleMap[config.playStyle] || config.playStyle}</p>
                      </div>

                      {/* Threads */}
                      <div className="bg-slate-900 p-4 rounded border border-slate-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Cpu className="h-4 w-4 text-cyan-400" />
                          <p className="text-xs text-slate-400">{t.profileDetails.cpuThreads}</p>
                        </div>
                        <p className="font-bold text-slate-200">{config.threads}</p>
                      </div>

                      {/* Profondeur */}
                      <div className="bg-slate-900 p-4 rounded border border-slate-800">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-purple-400" />
                          <p className="text-xs text-slate-400">{t.profileDetails.depth}</p>
                        </div>
                        <p className="font-bold text-slate-200">{t.profileDetails.levelLabel} {config.depth}</p>
                      </div>

                      {/* Temps de réflexion */}
                      <div className="bg-slate-900 p-4 rounded border border-slate-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-blue-400" />
                          <p className="text-xs text-slate-400">{t.profileDetails.thinkingTime}</p>
                        </div>
                        <p className="font-bold text-slate-200">{config.timeControl}ms</p>
                      </div>

                      {/* ELO */}
                      <div className="bg-slate-900 p-4 rounded border border-slate-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="h-4 w-4 text-amber-400" />
                          <p className="text-xs text-slate-400">{t.profileDetails.estimatedElo}</p>
                        </div>
                        <p className="font-bold text-slate-200">{config.elo}</p>
                      </div>

                      {/* Agressivité */}
                      <div className="bg-slate-900 p-4 rounded border border-slate-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Swords className="h-4 w-4 text-red-400" />
                          <p className="text-xs text-slate-400">{t.profileDetails.aggressiveness}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={config.aggressiveness} className="h-2" />
                          <span className="text-xs font-bold text-slate-200">{config.aggressiveness}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="bg-slate-950 border-slate-800">
                <CardContent className="pt-6">
                  <h3 className="text-sm font-semibold text-slate-300 mb-4">{t.engineConfig.configEditing}</h3>
                  <EngineConfigPanel
                    initialConfig={config}
                    onConfigChange={setEditedConfig}
                    onSave={handleSaveChanges}
                    showApplyButton={false}
                  />
                  <div className="flex gap-2 mt-4">
                    <Button
                      type="button"
                      onClick={handleSaveChanges}
                      disabled={saving}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold shadow-lg border border-green-700"
                    >
                      <Zap className="mr-2 h-4 w-4 shrink-0" />
                      {saving ? t.profileDetails.saving : t.profileDetails.saveAndApply}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setEditedConfig(null);
                      }}
                      variant="outline"
                      className="border-2 border-slate-600 bg-slate-900 text-slate-200 hover:bg-slate-800"
                    >
                      {t.profileDetails.cancel}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
