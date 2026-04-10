"use client";

import { useState, useEffect } from 'react';
import { useLanguage } from "@/lib/language-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Download, 
  Settings, 
  FileText, 
  Zap,
  Copy,
  CheckCircle
} from 'lucide-react';
import {
  type UCIOptions,
  type UCIPreset,
  UCI_PRESETS,
  UCI_OPTION_LIMITS,
  generateUCIFile,
  downloadUCIFile,
  validateUCIOptions,
  playingStyleToUCI
} from '@/lib/uci-export';
import type { PlayingStyle } from '@/types/chess';
import { UciConfigPreview } from '@/components/UciConfigPreview';

interface UCIExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName: string;
  playingStyle?: PlayingStyle;
}

export default function UCIExportDialog({
  open,
  onOpenChange,
  defaultName,
  playingStyle
}: UCIExportDialogProps) {
  const { t } = useLanguage();
  
  const [options, setOptions] = useState<UCIOptions>({
    name: defaultName,
    threads: 4,
    hash: 128,
    depth: 16,
    skillLevel: 15,
    limitStrength: true,
    uciElo: 2000,
    contempt: 0,
    moveOverhead: 30,
    ponder: true,
    multiPV: 1,
    slowMover: 100
  });
  
  const [preview, setPreview] = useState('');
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  
  // Générer options depuis le style
  useEffect(() => {
    if (playingStyle && open) {
      const generated = playingStyleToUCI(playingStyle, defaultName);
      setOptions(generated);
    }
  }, [playingStyle, defaultName, open]);
  
  // Mettre à jour la prévisualisation
  useEffect(() => {
    if (open) {
      const previewText = generateUCIFile(options);
      setPreview(previewText);
      
      const validation = validateUCIOptions(options);
      setErrors(validation.errors);
    }
  }, [options, open]);
  
  const handlePresetSelect = (preset: UCIPreset) => {
    setOptions({
      ...options,
      ...preset.options,
      name: defaultName
    });
  };
  
  const updateOption = <K extends keyof UCIOptions>(
    key: K,
    value: UCIOptions[K]
  ) => {
    setOptions({ ...options, [key]: value });
  };
  
  const handleDownload = () => {
    downloadUCIFile(options);
  };
  
  const handleCopy = () => {
    navigator.clipboard.writeText(preview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-600/20 text-green-300 border-green-500/50';
      case 'intermediate': return 'bg-blue-600/20 text-blue-300 border-blue-500/50';
      case 'advanced': return 'bg-purple-600/20 text-purple-300 border-purple-500/50';
      case 'expert': return 'bg-red-600/20 text-red-300 border-red-500/50';
      case 'master': return 'bg-amber-600/20 text-amber-300 border-amber-500/50';
      default: return 'bg-slate-600/20 text-slate-300 border-slate-500/50';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] bg-slate-900 border-cyan-500/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-cyan-100">
            <FileText className="h-5 w-5 text-cyan-400" />
            Export UCI - {defaultName}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Configurez et exportez un fichier UCI compatible avec Arena, Fritz, ChessBase, etc.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="presets" className="w-full">
          <TabsList className="grid grid-cols-3 w-full bg-slate-950">
            <TabsTrigger value="presets" className="data-[state=active]:bg-cyan-600">
              <Zap className="h-4 w-4 mr-2" />
              Presets
            </TabsTrigger>
            <TabsTrigger value="advanced" className="data-[state=active]:bg-cyan-600">
              <Settings className="h-4 w-4 mr-2" />
              Avancé
            </TabsTrigger>
            <TabsTrigger value="preview" className="data-[state=active]:bg-cyan-600">
              <FileText className="h-4 w-4 mr-2" />
              Prévisualisation
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[500px] mt-4">
            {/* Onglet Presets */}
            <TabsContent value="presets" className="space-y-3 px-2">
              <div className="grid grid-cols-2 gap-3">
                {UCI_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetSelect(preset)}
                    className="p-4 bg-slate-950/50 rounded-lg border border-cyan-500/20 hover:border-cyan-500/50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{preset.icon}</span>
                      <div className="flex-1">
                        <h4 className="font-semibold text-cyan-200 group-hover:text-cyan-100">
                          {preset.name}
                        </h4>
                        {preset.options.difficulty && (
                          <Badge className={`text-xs ${getDifficultyColor(preset.options.difficulty)}`}>
                            {preset.options.difficulty}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-slate-400 mb-3">
                      {preset.description}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {preset.options.skillLevel !== undefined && (
                        <div className="flex justify-between text-slate-500">
                          <span>Skill:</span>
                          <span className="text-cyan-400">{preset.options.skillLevel}/20</span>
                        </div>
                      )}
                      {preset.options.uciElo !== undefined && (
                        <div className="flex justify-between text-slate-500">
                          <span>ELO:</span>
                          <span className="text-cyan-400">{preset.options.uciElo}</span>
                        </div>
                      )}
                      {preset.options.depth !== undefined && (
                        <div className="flex justify-between text-slate-500">
                          <span>Depth:</span>
                          <span className="text-cyan-400">{preset.options.depth}</span>
                        </div>
                      )}
                      {preset.options.threads !== undefined && (
                        <div className="flex justify-between text-slate-500">
                          <span>Threads:</span>
                          <span className="text-cyan-400">{preset.options.threads}</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </TabsContent>

            {/* Onglet Avancé */}
            <TabsContent value="advanced" className="space-y-4 px-2">
              {/* Identité */}
              <div className="space-y-3 p-4 bg-slate-950/50 rounded-lg border border-cyan-500/20">
                <h3 className="font-semibold text-cyan-200 mb-3">Identité</h3>
                
                <div className="space-y-2">
                  <Label>Nom du moteur</Label>
                  <Input
                    value={options.name}
                    onChange={(e) => updateOption('name', e.target.value)}
                    className="bg-slate-900 border-slate-700"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Auteur (optionnel)</Label>
                  <Input
                    value={options.author || ''}
                    onChange={(e) => updateOption('author', e.target.value)}
                    placeholder="Votre nom"
                    className="bg-slate-900 border-slate-700"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Description (optionnel)</Label>
                  <Input
                    value={options.description || ''}
                    onChange={(e) => updateOption('description', e.target.value)}
                    placeholder="Description de la configuration"
                    className="bg-slate-900 border-slate-700"
                  />
                </div>
              </div>

              {/* Force */}
              <div className="space-y-3 p-4 bg-slate-950/50 rounded-lg border border-purple-500/20">
                <h3 className="font-semibold text-purple-200 mb-3">Force du moteur</h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Skill Level (0-20)</Label>
                    <span className="text-sm text-cyan-400">{options.skillLevel || 20}</span>
                  </div>
                  <input
                    type="range"
                    min={UCI_OPTION_LIMITS.skillLevel.min}
                    max={UCI_OPTION_LIMITS.skillLevel.max}
                    value={options.skillLevel || 20}
                    onChange={(e) => updateOption('skillLevel', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-slate-500">
                    Plus élevé = plus fort (20 = force maximale)
                  </p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Limiter la force</Label>
                    <p className="text-xs text-slate-500">Utiliser UCI_Elo pour limiter</p>
                  </div>
                  <Switch
                    checked={options.limitStrength || false}
                    onCheckedChange={(checked) => updateOption('limitStrength', checked)}
                  />
                </div>
                
                {options.limitStrength && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>UCI ELO (1320-3190)</Label>
                      <span className="text-sm text-cyan-400">{options.uciElo || 2000}</span>
                    </div>
                    <input
                      type="range"
                      min={UCI_OPTION_LIMITS.uciElo.min}
                      max={UCI_OPTION_LIMITS.uciElo.max}
                      step={10}
                      value={options.uciElo || 2000}
                      onChange={(e) => updateOption('uciElo', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              {/* Performance */}
              <div className="space-y-3 p-4 bg-slate-950/50 rounded-lg border border-green-500/20">
                <h3 className="font-semibold text-green-200 mb-3">Performance</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Threads</Label>
                      <span className="text-sm text-cyan-400">{options.threads}</span>
                    </div>
                    <input
                      type="range"
                      min={UCI_OPTION_LIMITS.threads.min}
                      max={Math.min(16, UCI_OPTION_LIMITS.threads.max)}
                      value={options.threads}
                      onChange={(e) => updateOption('threads', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Hash (MB)</Label>
                      <span className="text-sm text-cyan-400">{options.hash}</span>
                    </div>
                    <input
                      type="range"
                      min={UCI_OPTION_LIMITS.hash.min}
                      max={Math.min(2048, UCI_OPTION_LIMITS.hash.max)}
                      step={64}
                      value={options.hash}
                      onChange={(e) => updateOption('hash', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>{t.uciExport.depth}</Label>
                    <span className="text-sm text-cyan-400">{options.depth || 'Illimité'}</span>
                  </div>
                  <input
                    type="range"
                    min={UCI_OPTION_LIMITS.depth.min}
                    max={30}
                    value={options.depth || 16}
                    onChange={(e) => updateOption('depth', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Style de jeu */}
              <div className="space-y-3 p-4 bg-slate-950/50 rounded-lg border border-amber-500/20">
                <h3 className="font-semibold text-amber-200 mb-3">Style de jeu</h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Contempt (-100 à 100)</Label>
                    <span className="text-sm text-cyan-400">{options.contempt || 0}</span>
                  </div>
                  <input
                    type="range"
                    min={UCI_OPTION_LIMITS.contempt.min}
                    max={UCI_OPTION_LIMITS.contempt.max}
                    value={options.contempt || 0}
                    onChange={(e) => updateOption('contempt', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-slate-500">
                    Positif = joue pour gagner • Négatif = accepte les nulles
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Move Overhead (ms)</Label>
                      <span className="text-sm text-cyan-400">{options.moveOverhead || 30}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={500}
                      step={10}
                      value={options.moveOverhead || 30}
                      onChange={(e) => updateOption('moveOverhead', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Slow Mover</Label>
                      <span className="text-sm text-cyan-400">{options.slowMover || 100}</span>
                    </div>
                    <input
                      type="range"
                      min={UCI_OPTION_LIMITS.slowMover.min}
                      max={200}
                      step={10}
                      value={options.slowMover || 100}
                      onChange={(e) => updateOption('slowMover', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Options avancées */}
              <div className="space-y-3 p-4 bg-slate-950/50 rounded-lg border border-red-500/20">
                <h3 className="font-semibold text-red-200 mb-3">Options avancées</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Ponder (réflexion pendant le tour adverse)</Label>
                      <p className="text-xs text-slate-500">Consomme plus de CPU</p>
                    </div>
                    <Switch
                      checked={options.ponder || false}
                      onCheckedChange={(checked) => updateOption('ponder', checked)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>MultiPV (variantes)</Label>
                      <span className="text-sm text-cyan-400">{options.multiPV || 1}</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={options.multiPV || 1}
                      onChange={(e) => updateOption('multiPV', parseInt(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-xs text-slate-500">
                      Nombre de meilleures variantes à analyser
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Mode Analyse UCI</Label>
                      <p className="text-xs text-slate-500">
                        Optimisé pour l&apos;analyse
                      </p>
                    </div>
                    <Switch
                      checked={options.uciAnalyseMode || false}
                      onCheckedChange={(checked) => updateOption('uciAnalyseMode', checked)}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Onglet Prévisualisation */}
            <TabsContent value="preview" className="space-y-3 px-2">
              <UciConfigPreview
                content={preview}
                windowTitle={t.uciExport.previewWindowTitle}
                subtitle={t.uciExport.previewSubtitle}
              />
              
              {errors.length > 0 && (
                <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
                  <h4 className="text-red-300 font-semibold mb-2">Erreurs de validation :</h4>
                  <ul className="list-disc list-inside text-red-400 text-sm space-y-1">
                    {errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
          <Button
            onClick={handleCopy}
            variant="outline"
            className="flex-1"
            disabled={errors.length > 0}
          >
            {copied ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Copié !
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copier
              </>
            )}
          </Button>
          <Button
            onClick={handleDownload}
            className="flex-1 bg-cyan-600 hover:bg-cyan-700"
            disabled={errors.length > 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Télécharger UCI
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
