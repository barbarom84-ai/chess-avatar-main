"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Trophy, 
  Swords, 
  RotateCcw, 
  Settings, 
  Home, 
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  Crown,
  Flag,
  ChevronRight,
  BarChart3
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/language-context";

interface GameStats {
  totalMoves: number;
  captures: number;
  checks: number;
  duration?: string;
  bestEval: number | null;
  worstEval: number | null;
  averageEval: number | null;
  precisionWhite: number | null;
  precisionBlack: number | null;
  eloWhite: number | null;
  eloBlack: number | null;
}

interface GameResultModalProps {
  open: boolean;
  result: 'win' | 'loss' | 'draw';
  resultMessage: string;
  stats: GameStats;
  playerColor: 'white' | 'black';
  configName: string;
  onRematch: () => void;
  onSwitchColor: () => void;
  onConfigure: () => void;
  onDownloadPGN: () => void;
}

export default function GameResultModal({
  open,
  result,
  resultMessage,
  stats,
  onRematch,
  onSwitchColor,
  onConfigure,
  onDownloadPGN,
}: GameResultModalProps) {
  const router = useRouter();
  const { t } = useLanguage();

  const resultConfig = {
    win: {
      color: 'text-green-400',
      borderColor: 'border-green-500',
      bgColor: 'bg-green-500/10',
      icon: Trophy,
      title: t.gameResult.titleWin,
      subtitle: t.gameResult.subtitleWin
    },
    loss: {
      color: 'text-red-400',
      borderColor: 'border-red-500',
      bgColor: 'bg-red-500/10',
      icon: Flag,
      title: t.gameResult.titleLoss,
      subtitle: t.gameResult.subtitleLoss
    },
    draw: {
      color: 'text-slate-400',
      borderColor: 'border-slate-500',
      bgColor: 'bg-slate-500/10',
      icon: Minus,
      title: t.gameResult.titleDraw,
      subtitle: t.gameResult.subtitleDraw
    }
  };

  const config = resultConfig[result];
  const ResultIcon = config.icon;

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        onRematch(); // Ferme le modal
      }
    }}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto bg-slate-900 border-slate-800">
        <DialogHeader>
          {/* Header avec résultat - COMPACT */}
          <div className={`text-center py-4 rounded-lg border-2 ${config.borderColor} ${config.bgColor}`}>
            <ResultIcon className={`h-12 w-12 ${config.color} mx-auto mb-2`} />
            <DialogTitle className={`text-2xl font-bold ${config.color} mb-1`}>
              {config.title}
            </DialogTitle>
            <p className={`text-sm font-semibold ${config.color}`}>
              {resultMessage}
            </p>
          </div>
          <DialogDescription className="sr-only">
            {t.gameResult.summaryA11y}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-3">
          
          <Card className="bg-slate-950 border-slate-800">
            <CardContent className="pt-4 pb-4">
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-center">
                  <p className="text-xs text-slate-500 mb-0.5">{t.gameResult.moves}</p>
                  <p className="font-bold text-slate-200 text-lg">{stats.totalMoves}</p>
                </div>

                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-center">
                  <p className="text-xs text-slate-500 mb-0.5 flex items-center justify-center gap-1">
                    <Swords className="h-3 w-3" />
                    {t.gameResult.captures}
                  </p>
                  <p className="font-bold text-slate-200 text-lg">{stats.captures}</p>
                </div>

                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-center">
                  <p className="text-xs text-slate-500 mb-0.5 flex items-center justify-center gap-1">
                    <Crown className="h-3 w-3" />
                    {t.gameResult.checks}
                  </p>
                  <p className="font-bold text-slate-200 text-lg">{stats.checks}</p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <h4 className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" />
                  {t.gameResult.precisionAndElo}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <p className="text-[10px] text-slate-500 mb-1">⚪ {t.gameResult.whiteSide}</p>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">{t.gameResult.precision}</span>
                      <span className="font-bold text-cyan-400">
                        {stats.precisionWhite != null ? `${stats.precisionWhite}%` : '…'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs mt-0.5">
                      <span className="text-slate-400">ELO</span>
                      <span className="font-bold text-amber-400">
                        {stats.eloWhite != null ? stats.eloWhite : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <p className="text-[10px] text-slate-500 mb-1">⚫ {t.gameResult.blackSide}</p>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">{t.gameResult.precision}</span>
                      <span className="font-bold text-cyan-400">
                        {stats.precisionBlack != null ? `${stats.precisionBlack}%` : '…'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs mt-0.5">
                      <span className="text-slate-400">ELO</span>
                      <span className="font-bold text-amber-400">
                        {stats.eloBlack != null ? stats.eloBlack : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {stats.bestEval !== null && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <h4 className="text-xs font-semibold text-slate-400">{t.gameResult.evaluations}</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-900 p-2 rounded border border-slate-800 text-center">
                      <TrendingUp className="h-3 w-3 text-green-400 mx-auto mb-0.5" />
                      <p className="font-bold text-green-400 text-sm">
                        {stats.bestEval > 0 ? '+' : ''}{stats.bestEval.toFixed(1)}
                      </p>
                    </div>
                    
                    <div className="bg-slate-900 p-2 rounded border border-slate-800 text-center">
                      <Minus className="h-3 w-3 text-blue-400 mx-auto mb-0.5" />
                      <p className="font-bold text-blue-400 text-sm">
                        {stats.averageEval && (stats.averageEval > 0 ? '+' : '')}{stats.averageEval?.toFixed(1) || '0.0'}
                      </p>
                    </div>
                    
                    <div className="bg-slate-900 p-2 rounded border border-slate-800 text-center">
                      <TrendingDown className="h-3 w-3 text-red-400 mx-auto mb-0.5" />
                      <p className="font-bold text-red-400 text-sm">
                        {stats.worstEval && (stats.worstEval > 0 ? '+' : '')}{stats.worstEval?.toFixed(1) || '0.0'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Button 
              onClick={onRematch}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold"
              size="sm"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {t.gameResult.rematch}
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={onSwitchColor}
                variant="outline"
                size="sm"
                className="border-2 border-blue-500 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20"
              >
                <ChevronRight className="mr-1 h-3 w-3" />
                {t.gameResult.switchColor}
              </Button>

              <Button 
                onClick={onConfigure}
                variant="outline"
                size="sm"
                className="border-2 border-purple-500 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20"
              >
                <Settings className="mr-1 h-3 w-3" />
                {t.gameResult.configure}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={onDownloadPGN}
                variant="outline"
                size="sm"
                className="border-2 border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
              >
                <Download className="mr-1 h-3 w-3" />
                PGN
              </Button>

              <Button 
                onClick={() => router.push('/')}
                variant="outline"
                size="sm"
                className="border-2 border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
              >
                <Home className="mr-1 h-3 w-3" />
                {t.gameResult.home}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
