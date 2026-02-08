"use client";

import { useLanguage } from "@/lib/language-context";

interface EvaluationBarProps {
  evaluation: number | null;  // TOUJOURS du point de vue des blancs (Stockfish)
  playerColor: 'white' | 'black';
}

export default function EvaluationBar({ evaluation, playerColor }: EvaluationBarProps) {
  const { t } = useLanguage();

  if (evaluation === null) {
    return (
      <div className="w-full h-6 bg-slate-800 rounded-lg flex items-center justify-center">
        <span className="text-xs text-slate-500">{t.evaluationBar.evaluating}</span>
      </div>
    );
  }

  // L'évaluation de Stockfish est TOUJOURS du point de vue des blancs
  // Pour l'affichage, on garde cette évaluation telle quelle
  const displayEval = evaluation;
  
  // Pour déterminer l'avantage du JOUEUR, on doit inverser si le joueur est noir
  const playerEval = playerColor === 'white' ? evaluation : -evaluation;
  
  // Limiter l'évaluation entre -10 et +10 pour l'affichage
  const clampedEval = Math.max(-10, Math.min(10, displayEval));
  
  // Calculer le pourcentage (50% = égalité)
  // -10 → 0%, 0 → 50%, +10 → 100%
  const percentage = ((clampedEval + 10) / 20) * 100;
  
  // Déterminer qui a l'avantage (du point de vue du joueur)
  const playerAdvantage = playerEval > 0.5 ? 'player' : playerEval < -0.5 ? 'opponent' : 'equal';
  
  return (
    <div className="space-y-2">
      {/* Barre d'évaluation */}
      <div className="relative w-full h-8 bg-slate-950 rounded-lg overflow-hidden border border-slate-700">
        {/* Partie avantage blanc */}
        <div 
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
        
        {/* Partie avantage noir */}
        <div 
          className="absolute top-0 right-0 h-full bg-gradient-to-l from-slate-800 to-slate-700"
          style={{ width: `${100 - percentage}%` }}
        />
        
        {/* Ligne centrale (égalité) */}
        <div className="absolute top-0 left-1/2 w-0.5 h-full bg-amber-500/50 -ml-0.5" />
        
        {/* Valeur de l'évaluation (toujours du point de vue blanc pour cohérence) */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xs font-bold ${
            Math.abs(evaluation) < 0.3 ? 'text-amber-300' :
            evaluation > 0 ? 'text-white drop-shadow-[0_0_8px_rgba(0,217,255,0.8)]' :
            'text-slate-300'
          }`}>
            {evaluation > 0 ? '+' : ''}{evaluation.toFixed(2)}
          </span>
        </div>
      </div>
      
      {/* Légende */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-slate-700 border border-slate-600" />
          <span className="text-slate-400">{t.evaluationBar.black}</span>
        </div>
        
        <div className="flex items-center gap-1">
          {playerAdvantage === 'player' && (
            <span className="text-cyan-400 font-semibold">
              {playerColor === 'white' ? t.evaluationBar.youDominatingWhite : t.evaluationBar.youDominatingBlack}
            </span>
          )}
          {playerAdvantage === 'opponent' && (
            <span className="text-red-400 font-semibold">
              {playerColor === 'white' ? t.evaluationBar.blackDominating : t.evaluationBar.whiteDominating}
            </span>
          )}
          {playerAdvantage === 'equal' && (
            <span className="text-amber-400 font-semibold">{t.evaluationBar.equalPosition}</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-slate-400">{t.evaluationBar.white}</span>
          <div className="w-3 h-3 rounded-full bg-cyan-500 border border-cyan-400" />
        </div>
      </div>
      
      {/* Indicateur de domination (du point de vue du JOUEUR) */}
      {Math.abs(playerEval) > 3 && (
        <div className={`text-center text-xs py-1.5 px-3 rounded ${
          playerEval > 3 
            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' 
            : 'bg-red-500/20 text-red-300 border border-red-500/50'
        }`}>
          {playerEval > 3 ? (
            <>🔥 {Math.abs(playerEval) > 8 ? `${t.evaluationBar.youDominateWidely} !` : Math.abs(playerEval) > 5 ? t.evaluationBar.youDominateWidely : t.evaluationBar.youDominate}</>
          ) : (
            <>⚡ {Math.abs(playerEval) > 8 ? `${t.evaluationBar.opponentDominatesWidely} !` : Math.abs(playerEval) > 5 ? t.evaluationBar.opponentDominatesWidely : t.evaluationBar.opponentDominates}</>
          )}
        </div>
      )}
    </div>
  );
}
