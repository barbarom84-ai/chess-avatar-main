"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Settings, Palette, Image as ImageIcon, Zap, Volume2, VolumeX,
  Grid, Eye, RotateCcw, Check
} from "lucide-react";
import { 
  useChessboardSettings, 
  BOARD_THEMES, 
  PIECE_SETS,
  type BoardTheme 
} from "@/contexts/ChessboardSettingsContext";
import { useLanguage } from "@/lib/language-context";

interface ChessboardSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ChessboardSettingsModal({ open, onOpenChange }: ChessboardSettingsModalProps) {
  const { settings, updateSettings, resetSettings } = useChessboardSettings();
  const [activeTab, setActiveTab] = useState("theme");
  const { t } = useLanguage();

  const handleThemeSelect = (theme: BoardTheme) => {
    updateSettings({ boardTheme: theme });
  };

  const handleReset = () => {
    if (confirm(t.chessboardSettings.resetConfirm)) {
      resetSettings();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-cyan-500/20">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <Settings className="h-6 w-6 text-cyan-400" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-cyan-100">
                  {t.chessboardSettings.title}
                </DialogTitle>
                <DialogDescription className="text-cyan-400/70">
                  {t.chessboardSettings.description}
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10"
            >
              <RotateCcw className="mr-2 h-3 w-3" />
              {t.chessboardSettings.reset}
            </Button>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800 border border-slate-700">
            <TabsTrigger value="theme">
              <Palette className="mr-2 h-4 w-4" />
              {t.chessboardSettings.theme}
            </TabsTrigger>
            <TabsTrigger value="pieces">
              <ImageIcon className="mr-2 h-4 w-4" />
              {t.chessboardSettings.pieces}
            </TabsTrigger>
            <TabsTrigger value="options">
              <Zap className="mr-2 h-4 w-4" />
              {t.chessboardSettings.options}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="theme" className="space-y-4">
            <Card className="bg-slate-950 border-slate-800">
              <CardContent className="pt-6">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">{t.chessboardSettings.colorThemes}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {BOARD_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => handleThemeSelect(theme)}
                      className={`relative group p-3 rounded-lg border-2 transition-all duration-200 ${
                        settings.boardTheme.id === theme.id
                          ? 'border-cyan-500 bg-cyan-500/10'
                          : 'border-slate-700 hover:border-cyan-500/50 bg-slate-900'
                      }`}
                    >
                      {/* Aperçu de l'échiquier */}
                      <div className="grid grid-cols-4 gap-0 mb-2 rounded overflow-hidden">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((i) => (
                          <div
                            key={i}
                            className="aspect-square"
                            style={{
                              backgroundColor: (Math.floor(i / 4) + i) % 2 === 0 
                                ? theme.lightSquare 
                                : theme.darkSquare
                            }}
                          />
                        ))}
                      </div>
                      
                      <div className="text-center">
                        <p className="text-xs font-semibold text-slate-200">{theme.name}</p>
                        {settings.boardTheme.id === theme.id && (
                          <div className="absolute top-2 right-2 bg-cyan-500 rounded-full p-1">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Aperçu détaillé du thème sélectionné */}
                <div className="mt-6 p-4 bg-slate-900 rounded-lg border border-slate-800">
                  <h4 className="text-xs font-semibold text-slate-400 mb-3">Aperçu du Thème: {settings.boardTheme.name}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded border border-slate-700" style={{ backgroundColor: settings.boardTheme.lightSquare }} />
                        <span className="text-xs text-slate-400">Case claire</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded border border-slate-700" style={{ backgroundColor: settings.boardTheme.darkSquare }} />
                        <span className="text-xs text-slate-400">Case foncée</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded border border-slate-700" style={{ backgroundColor: settings.boardTheme.selectedSquare }} />
                        <span className="text-xs text-slate-400">Case sélectionnée</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded border border-slate-700" style={{ backgroundColor: settings.boardTheme.lastMoveLight }} />
                        <span className="text-xs text-slate-400">Dernier coup (claire)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded border border-slate-700" style={{ backgroundColor: settings.boardTheme.lastMoveDark }} />
                        <span className="text-xs text-slate-400">Dernier coup (foncée)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded border border-slate-700" style={{ backgroundColor: settings.boardTheme.legalMoveEmpty }} />
                        <span className="text-xs text-slate-400">Coup légal</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ONGLET PIÈCES */}
          <TabsContent value="pieces" className="space-y-4">
            <Card className="bg-slate-950 border-slate-800">
              <CardContent className="pt-6">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">Sets de Pièces</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {PIECE_SETS.map((pieceSet) => (
                    <button
                      key={pieceSet.id}
                      onClick={() => updateSettings({ pieceSet })}
                      className={`relative p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                        settings.pieceSet.id === pieceSet.id
                          ? 'border-cyan-500 bg-cyan-500/10'
                          : 'border-slate-700 hover:border-cyan-500/50 bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-slate-200">{pieceSet.name}</h4>
                        {settings.pieceSet.id === pieceSet.id && (
                          <div className="bg-cyan-500 rounded-full p-1">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mb-3">Style néon cyan avec circuits tech</p>
                      
                      {/* Aperçu de quelques pièces */}
                      <div className="flex gap-2 items-center justify-center bg-slate-800/50 p-3 rounded">
                        {['wK', 'wQ', 'wN', 'wB', 'wR', 'wP'].map((piece) => (
                          <div key={piece} className="w-8 h-8 relative">
                            <img 
                              src={`${pieceSet.path}/${piece}.png`} 
                              alt={piece}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-blue-900/10 border border-blue-700/50 rounded-lg">
                  <p className="text-xs text-blue-300">
                    💡 <strong>Prochainement :</strong> D'autres sets de pièces seront disponibles (classique, moderne, minimaliste...)
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ONGLET OPTIONS */}
          <TabsContent value="options" className="space-y-4">
            <Card className="bg-slate-950 border-slate-800">
              <CardContent className="pt-6 space-y-6">
                {/* Affichage */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Affichage
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                      <div>
                        <Label htmlFor="coordinates" className="text-slate-200 font-medium">
                          {t.chessboardSettings.showCoordinates}
                        </Label>
                        <p className="text-xs text-slate-400 mt-1">
                          Affiche les lettres et chiffres sur les bords de l'échiquier
                        </p>
                      </div>
                      <Switch
                        id="coordinates"
                        checked={settings.showCoordinates}
                        onCheckedChange={(checked) => updateSettings({ showCoordinates: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                      <div>
                        <Label htmlFor="legal-moves" className="text-slate-200 font-medium">
                          {t.chessboardSettings.showLegalMoves}
                        </Label>
                        <p className="text-xs text-slate-400 mt-1">
                          {t.chessboardSettings.showLegalMovesDescription}
                        </p>
                      </div>
                      <Switch
                        id="legal-moves"
                        checked={settings.showLegalMoves}
                        onCheckedChange={(checked) => updateSettings({ showLegalMoves: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                      <div>
                        <Label htmlFor="last-move" className="text-slate-200 font-medium">
                          Surligner le dernier coup
                        </Label>
                        <p className="text-xs text-slate-400 mt-1">
                          Affiche en surbrillance le dernier coup joué
                        </p>
                      </div>
                      <Switch
                        id="last-move"
                        checked={settings.highlightLastMove}
                        onCheckedChange={(checked) => updateSettings({ highlightLastMove: checked })}
                      />
                    </div>
                  </div>
                </div>

                {/* Animation */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Vitesse d'Animation
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: 'none', label: 'Aucune' },
                      { value: 'fast', label: 'Rapide' },
                      { value: 'normal', label: 'Normale' },
                      { value: 'slow', label: 'Lente' }
                    ].map((speed) => (
                      <button
                        key={speed.value}
                        onClick={() => updateSettings({ animationSpeed: speed.value as any })}
                        className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                          settings.animationSpeed === speed.value
                            ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                            : 'border-slate-700 hover:border-cyan-500/50 bg-slate-900 text-slate-400'
                        }`}
                      >
                        <p className="text-xs font-semibold">{speed.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Son */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                    {settings.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    Son
                  </h3>
                  <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                    <div>
                      <Label htmlFor="sound" className="text-slate-200 font-medium">
                        Effets sonores
                      </Label>
                      <p className="text-xs text-slate-400 mt-1">
                        Sons lors des coups, captures, échecs, etc.
                      </p>
                    </div>
                    <Switch
                      id="sound"
                      checked={settings.soundEnabled}
                      onCheckedChange={(checked) => updateSettings({ soundEnabled: checked })}
                    />
                  </div>
                  {!settings.soundEnabled && (
                    <div className="mt-2 p-2 bg-orange-900/10 border border-orange-700/50 rounded text-xs text-orange-300">
                      Les effets sonores sont actuellement désactivés
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-800">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-600 text-slate-200 hover:bg-slate-800"
          >
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
