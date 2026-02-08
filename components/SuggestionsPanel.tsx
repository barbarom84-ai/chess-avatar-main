"use client";

import { useLanguage } from "@/lib/language-context";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  BookOpen, 
  Settings,
  ExternalLink,
  TrendingUp,
  Target,
  Zap,
  Shield,
  Plus
} from "lucide-react";
import type { 
  SimilarProfile, 
  OpeningRecommendation, 
  ConfigSuggestion 
} from "@/lib/profile-suggestions";

interface SuggestionsPanelProps {
  similarProfiles?: SimilarProfile[];
  openingRecommendations?: OpeningRecommendation[];
  configSuggestion?: ConfigSuggestion;
  onAddOpening?: (opening: OpeningRecommendation) => void;
  onApplyConfig?: (config: ConfigSuggestion) => void;
}

export default function SuggestionsPanel({
  similarProfiles = [],
  openingRecommendations = [],
  configSuggestion,
  onAddOpening,
  onApplyConfig
}: SuggestionsPanelProps) {
  const { t } = useLanguage();
  
  // Icône de difficulté
  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return <Shield className="h-3 w-3 text-green-400" />;
      case 'medium':
        return <Target className="h-3 w-3 text-amber-400" />;
      case 'hard':
        return <Zap className="h-3 w-3 text-red-400" />;
      default:
        return null;
    }
  };

  // Badge de difficulté
  const getDifficultyBadge = (difficulty: string) => {
    const colors = {
      easy: 'bg-green-600/20 text-green-300 border-green-500/50',
      medium: 'bg-amber-600/20 text-amber-300 border-amber-500/50',
      hard: 'bg-red-600/20 text-red-300 border-red-500/50'
    };
    const labels = {
      easy: 'Facile',
      medium: 'Moyen',
      hard: 'Difficile'
    };
    return (
      <Badge className={colors[difficulty as keyof typeof colors]}>
        {getDifficultyIcon(difficulty)}
        <span className="ml-1">{labels[difficulty as keyof typeof labels]}</span>
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Ouvertures Recommandées */}
      {openingRecommendations.length > 0 && (
        <Card className="bg-slate-900/50 border-cyan-500/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-cyan-100">
              <BookOpen className="h-5 w-5 text-cyan-400" />
              Ouvertures Recommandées ({openingRecommendations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {openingRecommendations.map((opening, index) => (
              <div
                key={index}
                className="p-4 bg-slate-950/50 rounded-lg border border-cyan-500/20 hover:border-cyan-500/40 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-cyan-200">{opening.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {opening.eco}
                      </Badge>
                      {getDifficultyBadge(opening.difficulty)}
                    </div>
                    <p className="text-sm text-slate-400 mb-2">
                      {opening.description}
                    </p>
                  </div>
                  {onAddOpening && (
                    <Button
                      size="sm"
                      onClick={() => onAddOpening(opening)}
                      className="ml-2 bg-cyan-600 hover:bg-cyan-700"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                {/* Raisons */}
                <div className="space-y-1 mb-3">
                  {opening.reasons.map((reason, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-cyan-300">
                      <span className="text-cyan-500">✓</span>
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
                
                {/* Stats */}
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-400" />
                    <span className="text-slate-400">
                      Adéquation: <span className="text-green-400 font-semibold">{opening.suitability}%</span>
                    </span>
                  </div>
                  {opening.successRate && (
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3 text-amber-400" />
                      <span className="text-slate-400">
                        Succès estimé: <span className="text-amber-400 font-semibold">{opening.successRate}%</span>
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Ressources */}
                {opening.resources && opening.resources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800">
                    <p className="text-xs text-slate-500 mb-2">Apprendre :</p>
                    <div className="flex flex-wrap gap-2">
                      {opening.resources.map((resource, i) => (
                        <a
                          key={i}
                          href={resource}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {resource.includes('chess.com') ? 'Chess.com' : 'Lichess'}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Configuration Moteur Suggérée */}
      {configSuggestion && (
        <Card className="bg-slate-900/50 border-purple-500/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-100">
              <Settings className="h-5 w-5 text-purple-400" />
              Configuration Moteur Optimale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400 mb-4">
              {configSuggestion.reason}
            </p>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-slate-950/50 rounded border border-purple-500/20">
                <p className="text-xs text-slate-500 mb-1">Difficulté</p>
                <p className="text-xl font-bold text-purple-300">
                  {configSuggestion.difficulty}/5
                </p>
              </div>
              
              <div className="p-3 bg-slate-950/50 rounded border border-purple-500/20">
                <p className="text-xs text-slate-500 mb-1">Threads CPU</p>
                <p className="text-xl font-bold text-purple-300">
                  {configSuggestion.threads}
                </p>
              </div>
              
              <div className="p-3 bg-slate-950/50 rounded border border-purple-500/20">
                <p className="text-xs text-slate-500 mb-1">Profondeur</p>
                <p className="text-xl font-bold text-purple-300">
                  {configSuggestion.depth}
                </p>
              </div>
              
              <div className="p-3 bg-slate-950/50 rounded border border-purple-500/20">
                <p className="text-xs text-slate-500 mb-1">Temps (ms)</p>
                <p className="text-xl font-bold text-purple-300">
                  {configSuggestion.thinkingTime}
                </p>
              </div>
            </div>
            
            <div className="p-3 bg-slate-950/50 rounded border border-purple-500/20 mb-4">
              <p className="text-xs text-slate-500 mb-1">Contempt</p>
              <p className="text-lg font-bold text-purple-300">
                {configSuggestion.contempt > 0 ? '+' : ''}{configSuggestion.contempt}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {configSuggestion.contempt > 0 ? t.ui.prefersWin : 
                 configSuggestion.contempt < 0 ? t.ui.acceptsDraws :
                 t.ui.neutralEval}
              </p>
            </div>
            
            {onApplyConfig && (
              <Button
                onClick={() => onApplyConfig(configSuggestion)}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Settings className="mr-2 h-4 w-4" />
                Appliquer Cette Configuration
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Adversaires Similaires */}
      {similarProfiles.length > 0 && (
        <Card className="bg-slate-900/50 border-green-500/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-100">
              <Users className="h-5 w-5 text-green-400" />
              Profils Similaires ({similarProfiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {similarProfiles.map((similar, index) => (
              <div
                key={index}
                className="p-4 bg-slate-950/50 rounded-lg border border-green-500/20 hover:border-green-500/40 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold">
                      {similar.profile.username.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-green-200">
                        {similar.profile.username}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {similar.profile.platform || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-green-600/30 text-green-300">
                    {similar.matchScore}% match
                  </Badge>
                </div>
                
                <div className="space-y-1">
                  {similar.matchReasons.map((reason, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-green-300">
                      <span className="text-green-500">✓</span>
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
                
                {similar.styleSimilarity > 0 && (
                  <div className="mt-2 text-xs text-slate-400">
                    Similarité de style: <span className="text-green-400 font-semibold">{similar.styleSimilarity}%</span>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Message si aucune suggestion */}
      {openingRecommendations.length === 0 && !configSuggestion && similarProfiles.length === 0 && (
        <Card className="bg-slate-900/50 border-slate-700/20 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400 mb-2">
                Complétez votre profil pour recevoir des suggestions personnalisées
              </p>
              <p className="text-sm text-slate-500">
                Ajustez votre style de jeu, ajoutez des ouvertures favorites et des tags
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
