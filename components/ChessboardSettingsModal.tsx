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
  Grid, Eye, RotateCcw, Check, Lock, Crown
} from "lucide-react";
import { 
  useChessboardSettings, 
  BOARD_THEMES, 
  PIECE_SETS,
  getPieceImagePath,
  type BoardTheme,
  type PieceSet
} from "@/contexts/ChessboardSettingsContext";
import { useLanguage } from "@/lib/language-context";
import { usePremium } from "@/hooks/usePremium";
import UpgradeModal from "@/components/UpgradeModal";

interface ChessboardSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ChessboardSettingsModal({ open, onOpenChange }: ChessboardSettingsModalProps) {
  const { settings, updateSettings, resetSettings } = useChessboardSettings();
  const [activeTab, setActiveTab] = useState("theme");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<'theme' | 'pieces' | 'profiles'>('theme');
  const { t, lang } = useLanguage();

  // Helpers for localized theme/piece names
  const themeName = (theme: { name: string; nameEn?: string }) =>
    lang === 'en' && theme.nameEn ? theme.nameEn : theme.name;
  const pieceSetName = (ps: { name: string; nameEn?: string }) =>
    lang === 'en' && ps.nameEn ? ps.nameEn : ps.name;
  const pieceSetDesc = (ps: { description?: string; descriptionEn?: string }) =>
    lang === 'en' && ps.descriptionEn ? ps.descriptionEn : ps.description;
  const { isPremium, userId, email } = usePremium();

  const handleThemeSelect = (theme: BoardTheme & { premium?: boolean }) => {
    if (theme.premium && !isPremium) {
      setUpgradeReason('theme');
      setUpgradeOpen(true);
      return;
    }
    updateSettings({ boardTheme: theme });
  };

  const handlePieceSetSelect = (pieceSet: PieceSet) => {
    if (pieceSet.premium && !isPremium) {
      setUpgradeReason('pieces');
      setUpgradeOpen(true);
      return;
    }
    updateSettings({ pieceSet });
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
                        <p className="text-xs font-semibold text-slate-200">{themeName(theme)}</p>
                        {settings.boardTheme.id === theme.id && (
                          <div className="absolute top-2 right-2 bg-cyan-500 rounded-full p-1">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                        {theme.premium && !isPremium && (
                          <div className="absolute top-2 left-2 bg-amber-500/80 rounded-full p-1">
                            <Lock className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Aperçu détaillé du thème sélectionné */}
                <div className="mt-6 p-4 bg-slate-900 rounded-lg border border-slate-800">
                  <h4 className="text-xs font-semibold text-slate-400 mb-3">{t.chessboardSettings.themePreview}: {themeName(settings.boardTheme)}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded border border-slate-700" style={{ backgroundColor: settings.boardTheme.lightSquare }} />
                        <span className="text-xs text-slate-400">{t.chessboardSettings.lightSquare}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded border border-slate-700" style={{ backgroundColor: settings.boardTheme.darkSquare }} />
                        <span className="text-xs text-slate-400">{t.chessboardSettings.darkSquare}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded border border-slate-700" style={{ backgroundColor: settings.boardTheme.selectedSquare }} />
                        <span className="text-xs text-slate-400">{t.chessboardSettings.selectedSquare}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded border border-slate-700" style={{ backgroundColor: settings.boardTheme.lastMoveLight }} />
                        <span className="text-xs text-slate-400">{t.chessboardSettings.lastMoveLight}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded border border-slate-700" style={{ backgroundColor: settings.boardTheme.lastMoveDark }} />
                        <span className="text-xs text-slate-400">{t.chessboardSettings.lastMoveDark}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded border border-slate-700" style={{ backgroundColor: settings.boardTheme.legalMoveEmpty }} />
                        <span className="text-xs text-slate-400">{t.chessboardSettings.legalMove}</span>
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
                <h3 className="text-sm font-semibold text-slate-300 mb-4">{t.chessboardSettings.pieceSets}</h3>
                
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Liste des sets de pièces */}
                  <div className="flex-1">
                    <div className="grid grid-cols-2 gap-3">
                      {PIECE_SETS.map((pieceSet) => (
                        <button
                          key={pieceSet.id}
                          onClick={() => handlePieceSetSelect(pieceSet)}
                          className={`relative p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                            settings.pieceSet.id === pieceSet.id
                              ? 'border-cyan-500 bg-cyan-500/10'
                              : pieceSet.premium && !isPremium
                                ? 'border-amber-500/30 hover:border-amber-500/50 bg-slate-900'
                                : 'border-slate-700 hover:border-cyan-500/50 bg-slate-900'
                          }`}
                        >
                          {settings.pieceSet.id === pieceSet.id && (
                            <div className="absolute top-2 right-2 bg-cyan-500 rounded-full p-1">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                          {pieceSet.premium && !isPremium && (
                            <div className="absolute top-2 right-2 bg-amber-500/80 rounded-full p-1">
                              <Lock className="h-3 w-3 text-white" />
                            </div>
                          )}

                          <h4 className="font-semibold text-sm text-slate-200 mb-1">
                            {pieceSetName(pieceSet)}
                            {pieceSet.premium && !isPremium && (
                              <Crown className="inline ml-1.5 h-3 w-3 text-amber-400" />
                            )}
                          </h4>
                          {pieceSet.description && (
                            <p className="text-[10px] text-slate-400 mb-2">{pieceSetDesc(pieceSet)}</p>
                          )}
                          
                          {/* Aperçu des pièces en mini-grille */}
                          <div className="flex gap-1 items-center justify-center bg-slate-800/60 p-2 rounded">
                            {['wK', 'wQ', 'wR', 'wB', 'wN', 'wP'].map((piece) => (
                              <img 
                                key={piece}
                                src={`${pieceSet.path}/${piece}.${pieceSet.ext}`}
                                alt={piece}
                                width={24}
                                height={24}
                                className="w-6 h-6 object-contain"
                              />
                            ))}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Aperçu sur échiquier */}
                  <div className="md:w-[220px] flex-shrink-0">
                    <h4 className="text-xs font-semibold text-slate-400 mb-2">
                      {t.chessboardSettings.preview}: {pieceSetName(settings.pieceSet)}
                    </h4>
                    <div className="rounded-lg overflow-hidden border border-slate-700">
                      {/* Mini échiquier 4x4 avec des pièces */}
                      <div className="grid grid-cols-4 gap-0">
                        {[
                          // Row 1: Black pieces (top row)
                          { piece: 'bR', light: true },
                          { piece: 'bN', light: false },
                          { piece: 'bB', light: true },
                          { piece: 'bQ', light: false },
                          // Row 2: Black pawns
                          { piece: 'bP', light: false },
                          { piece: 'bP', light: true },
                          { piece: 'bP', light: false },
                          { piece: 'bP', light: true },
                          // Row 3: White pawns
                          { piece: 'wP', light: true },
                          { piece: 'wP', light: false },
                          { piece: 'wP', light: true },
                          { piece: 'wP', light: false },
                          // Row 4: White pieces (bottom row)
                          { piece: 'wR', light: false },
                          { piece: 'wN', light: true },
                          { piece: 'wB', light: false },
                          { piece: 'wQ', light: true },
                        ].map((cell, i) => (
                          <div
                            key={i}
                            className="aspect-square flex items-center justify-center"
                            style={{
                              backgroundColor: cell.light 
                                ? settings.boardTheme.lightSquare 
                                : settings.boardTheme.darkSquare
                            }}
                          >
                            <img
                              src={`${settings.pieceSet.path}/${cell.piece}.${settings.pieceSet.ext}`}
                              alt={cell.piece}
                              className="w-[85%] h-[85%] object-contain"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Toutes les pièces du set sélectionné */}
                    <div className="mt-3 p-3 bg-slate-900 rounded-lg border border-slate-800">
                      <p className="text-[10px] text-slate-500 mb-2 uppercase tracking-wider font-semibold">
                        {t.chessboardSettings.whitePieces}
                      </p>
                      <div className="flex gap-1.5 mb-3">
                        {['wK', 'wQ', 'wR', 'wB', 'wN', 'wP'].map((piece) => (
                          <img 
                            key={piece}
                            src={`${settings.pieceSet.path}/${piece}.${settings.pieceSet.ext}`}
                            alt={piece}
                            width={32}
                            height={32}
                            className="w-8 h-8 object-contain drop-shadow"
                          />
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-500 mb-2 uppercase tracking-wider font-semibold">
                        {t.chessboardSettings.blackPieces}
                      </p>
                      <div className="flex gap-1.5">
                        {['bK', 'bQ', 'bR', 'bB', 'bN', 'bP'].map((piece) => (
                          <img 
                            key={piece}
                            src={`${settings.pieceSet.path}/${piece}.${settings.pieceSet.ext}`}
                            alt={piece}
                            width={32}
                            height={32}
                            className="w-8 h-8 object-contain drop-shadow"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
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
                    {t.chessboardSettings.display}
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                      <div>
                        <Label htmlFor="coordinates" className="text-slate-200 font-medium">
                          {t.chessboardSettings.showCoordinates}
                        </Label>
                        <p className="text-xs text-slate-400 mt-1">
                          {t.chessboardSettings.showCoordinatesDesc}
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
                          {t.chessboardSettings.highlightLastMove}
                        </Label>
                        <p className="text-xs text-slate-400 mt-1">
                          {t.chessboardSettings.highlightLastMoveDesc}
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
                    {t.chessboardSettings.animationSpeed}
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: 'none', label: t.chessboardSettings.animNone },
                      { value: 'fast', label: t.chessboardSettings.animFast },
                      { value: 'normal', label: t.chessboardSettings.animNormal },
                      { value: 'slow', label: t.chessboardSettings.animSlow }
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
                    {t.chessboardSettings.sound}
                  </h3>
                  <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                    <div>
                      <Label htmlFor="sound" className="text-slate-200 font-medium">
                        {t.chessboardSettings.soundEffects}
                      </Label>
                      <p className="text-xs text-slate-400 mt-1">
                        {t.chessboardSettings.soundEffectsDesc}
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
                      {t.chessboardSettings.soundDisabled}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-800">
          {!isPremium && (
            <Button
              variant="outline"
              onClick={() => { setUpgradeReason('theme'); setUpgradeOpen(true); }}
              className="border-amber-500/50 text-amber-300 hover:bg-amber-500/10 mr-auto"
            >
              <Crown className="mr-2 h-4 w-4" />
              Premium
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-600 text-slate-200 hover:bg-slate-800"
          >
            {t.chessboardSettings.close}
          </Button>
        </div>

        <UpgradeModal
          open={upgradeOpen}
          onOpenChange={setUpgradeOpen}
          userId={userId}
          email={email}
          reason={upgradeReason}
        />
      </DialogContent>
    </Dialog>
  );
}
