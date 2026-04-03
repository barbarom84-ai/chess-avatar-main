"use client";

import { useLanguage } from "@/lib/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Lightbulb, 
  Award,
  Users,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import type { AIAnalysis } from "@/lib/ai-analysis";

interface AIAnalysisCardProps {
  analysis: AIAnalysis | null;
  loading?: boolean;
  onRefresh?: () => void;
}

export default function AIAnalysisCard({ analysis, loading, onRefresh }: AIAnalysisCardProps) {
  const { t } = useLanguage();
  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-purple-500/20 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-100">
            <Brain className="h-5 w-5 text-purple-400 animate-pulse" />
            Analyse IA en cours...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/20 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">
              Aucune analyse IA disponible. Ajoutez des informations au profil pour générer une analyse.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Déterminer la couleur du badge de confiance
  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) {
      return <Badge className="bg-green-600 text-white">Confiance: {confidence}%</Badge>;
    } else if (confidence >= 60) {
      return <Badge className="bg-amber-600 text-white">Confiance: {confidence}%</Badge>;
    } else {
      return <Badge className="bg-slate-600 text-white">Confiance: {confidence}%</Badge>;
    }
  };

  return (
    <Card className="bg-gradient-to-br from-slate-900/80 via-purple-950/20 to-slate-900/80 border-purple-500/30 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-purple-100">
            <Brain className="h-5 w-5 text-purple-400" />
            Analyse IA du Profil
          </CardTitle>
          <div className="flex items-center gap-2">
            {getConfidenceBadge(analysis.confidence)}
            {onRefresh && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRefresh}
                className="border-purple-500/50 text-purple-300 hover:bg-purple-500/10"
                title={t.ui.regenerateAnalysis}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Résumé */}
        <div>
          <h3 className="text-sm font-semibold text-purple-300 mb-2 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Résumé
          </h3>
          <p className="text-slate-300 leading-relaxed">
            {analysis.summary}
          </p>
        </div>

        {/* Description du style */}
        <div>
          <h3 className="text-sm font-semibold text-purple-300 mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {t.ui.playingStyle}
          </h3>
          <p className="text-slate-300 leading-relaxed whitespace-pre-line">
            {analysis.styleDescription}
          </p>
        </div>

        {/* Points forts */}
        {analysis.strengths.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-green-300 mb-2 flex items-center gap-2">
              <Award className="h-4 w-4" />
              Points Forts
            </h3>
            <div className="flex flex-wrap gap-2">
              {analysis.strengths.map((strength, index) => (
                <Badge
                  key={index}
                  className="bg-green-600/20 text-green-300 border-green-500/50"
                >
                  {strength}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Axes d'amélioration */}
        {analysis.improvementAreas.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-amber-300 mb-2 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Axes d&apos;Amélioration
            </h3>
            <div className="flex flex-wrap gap-2">
              {analysis.improvementAreas.map((area, index) => (
                <Badge
                  key={index}
                  className="bg-amber-600/20 text-amber-300 border-amber-500/50"
                >
                  {area}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recommandations */}
        <div>
          <h3 className="text-sm font-semibold text-cyan-300 mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Recommandations
          </h3>
          <ul className="space-y-2">
            {analysis.recommendations.map((rec, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-slate-300 text-sm"
              >
                <span className="text-cyan-400 mt-0.5">→</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Comparaisons avec joueurs célèbres */}
        {analysis.famousComparisons.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-purple-300 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t.aiAnalysisCard.similarPlayers}
            </h3>
            <div className="space-y-3">
              {analysis.famousComparisons.map((comparison, index) => (
                <div
                  key={index}
                  className="p-3 bg-slate-950/50 rounded-lg border border-purple-500/20"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-purple-200">
                      {comparison.player}
                    </span>
                    <Badge className="bg-purple-600/30 text-purple-300">
                      {comparison.similarity}% {t.aiAnalysisCard.percentSimilar}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-400">
                    {comparison.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer avec date */}
        <div className="text-xs text-slate-500 text-center pt-4 border-t border-slate-800">
          Analyse générée le {new Date(analysis.generatedAt).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </CardContent>
    </Card>
  );
}
