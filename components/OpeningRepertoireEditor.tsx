"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/lib/language-context";
import { 
  BookOpen, 
  Swords, 
  Shield, 
  Zap, 
  Crown, 
  Target,
  TrendingUp,
  Users,
  Flame,
  X,
  Plus,
  Sparkles
} from "lucide-react";
import { 
  OPENINGS_DATABASE, 
  REPERTOIRE_PRESETS,
  getOpeningById,
  getOpeningsByColor,
  getOpeningName,
  getOpeningDescription,
  getPresetName,
  type Opening 
} from "@/lib/openings-library";

interface OpeningRepertoireEditorProps {
  whiteOpenings: { id: string; weight: number }[];
  blackOpenings: { id: string; weight: number }[];
  onChange: (white: { id: string; weight: number }[], black: { id: string; weight: number }[]) => void;
}

export default function OpeningRepertoireEditor({
  whiteOpenings,
  blackOpenings,
  onChange
}: OpeningRepertoireEditorProps) {
  const { t, lang } = useLanguage();
  const [activeColor, setActiveColor] = useState<'white' | 'black'>('white');
  const [searchQuery, setSearchQuery] = useState('');

  const currentOpenings = activeColor === 'white' ? whiteOpenings : blackOpenings;
  
  // Calculer le poids total
  const totalWeight = currentOpenings.reduce((sum, o) => sum + o.weight, 0);

  // Filtrer les ouvertures disponibles
  const availableOpenings = getOpeningsByColor(activeColor).filter(opening => {
    const matchesSearch = opening.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         opening.eco.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         opening.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const notAlreadyAdded = !currentOpenings.some(o => o.id === opening.id);
    return matchesSearch && notAlreadyAdded;
  });

  // Ajouter une ouverture
  const addOpening = (id: string, weight: number = 25) => {
    if (activeColor === 'white') {
      onChange([...whiteOpenings, { id, weight }], blackOpenings);
    } else {
      onChange(whiteOpenings, [...blackOpenings, { id, weight }]);
    }
  };

  // Retirer une ouverture
  const removeOpening = (id: string) => {
    if (activeColor === 'white') {
      onChange(whiteOpenings.filter(o => o.id !== id), blackOpenings);
    } else {
      onChange(whiteOpenings, blackOpenings.filter(o => o.id !== id));
    }
  };

  // Modifier le poids
  const updateWeight = (id: string, weight: number) => {
    if (activeColor === 'white') {
      onChange(
        whiteOpenings.map(o => o.id === id ? { ...o, weight } : o),
        blackOpenings
      );
    } else {
      onChange(
        whiteOpenings,
        blackOpenings.map(o => o.id === id ? { ...o, weight } : o)
      );
    }
  };

  // Appliquer un preset
  const applyPreset = (presetName: string) => {
    const preset = REPERTOIRE_PRESETS.find(p => p.name === presetName);
    if (preset) {
      onChange(preset.whiteOpenings, preset.blackOpenings);
    }
  };

  // Icône selon le caractère
  const getCharacterIcon = (character: Opening['character']) => {
    switch (character) {
      case 'aggressive': return <Swords className="h-4 w-4 text-red-400" />;
      case 'defensive': return <Shield className="h-4 w-4 text-blue-400" />;
      case 'gambit': return <Flame className="h-4 w-4 text-orange-400" />;
      case 'tactical': return <Zap className="h-4 w-4 text-yellow-400" />;
      case 'positional': return <Target className="h-4 w-4 text-green-400" />;
      case 'hypermodern': return <TrendingUp className="h-4 w-4 text-purple-400" />;
      case 'classical': return <Crown className="h-4 w-4 text-amber-400" />;
      default: return <BookOpen className="h-4 w-4 text-slate-400" />;
    }
  };

  // Couleur du badge selon le caractère
  const getCharacterColor = (character: Opening['character']) => {
    switch (character) {
      case 'aggressive': return 'bg-red-500/20 text-red-300 border-red-500/50';
      case 'defensive': return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
      case 'gambit': return 'bg-orange-500/20 text-orange-300 border-orange-500/50';
      case 'tactical': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      case 'positional': return 'bg-green-500/20 text-green-300 border-green-500/50';
      case 'hypermodern': return 'bg-purple-500/20 text-purple-300 border-purple-500/50';
      case 'classical': return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/50';
    }
  };

  return (
    <div className="space-y-4">
      {/* Titre */}
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-cyan-400" />
        <h3 className="text-lg font-semibold text-slate-200">{t.openingEditor.title}</h3>
      </div>
      <p className="text-sm text-slate-400">
        {t.openingEditor.description}
      </p>

      {/* Présets thématiques */}
      <Card className="bg-slate-900/50 border-cyan-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            {t.openingEditor.quickPresets}
          </CardTitle>
          <CardDescription className="text-xs">
            {t.openingEditor.quickPresetsDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {REPERTOIRE_PRESETS.map(preset => (
              <Button
                key={preset.name}
                variant="outline"
                size="sm"
                onClick={() => applyPreset(preset.name)}
                className="border-slate-700 hover:border-cyan-500/50 hover:bg-cyan-500/10 justify-start"
              >
                {preset.style === 'aggressive' && <Swords className="h-3 w-3 mr-2 text-red-400" />}
                {preset.style === 'defensive' && <Shield className="h-3 w-3 mr-2 text-blue-400" />}
                {preset.style === 'hypermodern' && <TrendingUp className="h-3 w-3 mr-2 text-purple-400" />}
                {preset.style === 'classical' && <Crown className="h-3 w-3 mr-2 text-amber-400" />}
                {preset.style === 'balanced' && <Target className="h-3 w-3 mr-2 text-green-400" />}
                {preset.style === 'grandmaster' && <Sparkles className="h-3 w-3 mr-2 text-cyan-400" />}
                <span className="text-xs">{getPresetName(preset, lang)}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs Blanc/Noir */}
      <Tabs value={activeColor} onValueChange={(v) => setActiveColor(v as 'white' | 'black')}>
        <TabsList className="grid w-full grid-cols-2 bg-slate-900">
          <TabsTrigger value="white" className="data-[state=active]:bg-slate-800">
            ⚪ {t.openingEditor.whiteTab} ({whiteOpenings.length})
          </TabsTrigger>
          <TabsTrigger value="black" className="data-[state=active]:bg-slate-800">
            ⚫ {t.openingEditor.blackTab} ({blackOpenings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeColor} className="space-y-4 mt-4">
          {/* Ouvertures sélectionnées */}
          {currentOpenings.length > 0 && (
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{t.openingEditor.selectedOpenings}</CardTitle>
                  <Badge variant="outline" className="text-xs border-cyan-500/50 text-cyan-300">
                    Total: {totalWeight}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-3">
                    {currentOpenings.map(({ id, weight }) => {
                      const opening = getOpeningById(id);
                      if (!opening) return null;

                      const percentage = totalWeight > 0 ? ((weight / totalWeight) * 100).toFixed(1) : 0;

                      return (
                        <Card key={id} className="bg-slate-800/50 border-slate-700">
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {getCharacterIcon(opening.character)}
                                  <span className="text-sm font-semibold text-slate-200">
                                    {getOpeningName(opening, lang)}
                                  </span>
                                  <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">
                                    {opening.eco}
                                  </Badge>
                                </div>
                                <p className="text-xs text-slate-400 mb-2">{getOpeningDescription(opening, lang)}</p>
                                <div className="flex flex-wrap gap-1">
                                  <Badge className={`text-[10px] ${getCharacterColor(opening.character)}`}>
                                    {opening.character}
                                  </Badge>
                                  <Badge variant="outline" className="text-[10px] border-slate-600">
                                    {'⭐'.repeat(opening.difficulty)}
                                  </Badge>
                                  {opening.famousPlayers && opening.famousPlayers.length > 0 && (
                                    <Badge variant="outline" className="text-[10px] border-slate-600">
                                      <Users className="h-2 w-2 mr-1" />
                                      {opening.famousPlayers[0]}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeOpening(id)}
                                className="h-6 w-6 p-0 hover:bg-red-500/20 hover:text-red-400"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>

                            {/* Slider de poids */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <Label className="text-slate-400">{t.openingEditor.frequency}</Label>
                                <span className="font-semibold text-cyan-400">{percentage}%</span>
                              </div>
                              <Slider
                                value={[weight]}
                                onValueChange={([v]) => updateWeight(id, v)}
                                min={5}
                                max={100}
                                step={5}
                                className="w-full"
                              />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Ajouter des ouvertures */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t.openingEditor.addOpening}</CardTitle>
              <div className="pt-2">
                <Input
                  placeholder={t.openingEditor.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {availableOpenings.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-sm">
                      {searchQuery ? t.openingEditor.noOpeningsFound : t.openingEditor.allOpeningsAdded}
                    </div>
                  ) : (
                    availableOpenings.map(opening => (
                      <Card key={opening.id} className="bg-slate-800/30 border-slate-700 hover:border-cyan-500/50 transition-colors">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {getCharacterIcon(opening.character)}
                                <span className="text-sm font-semibold text-slate-200">
                                  {getOpeningName(opening, lang)}
                                </span>
                                <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">
                                  {opening.eco}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-400 mb-2">{getOpeningDescription(opening, lang)}</p>
                              <div className="flex flex-wrap gap-1">
                                <Badge className={`text-[10px] ${getCharacterColor(opening.character)}`}>
                                  {opening.character}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] border-slate-600">
                                  {t.openingEditor.difficulty}: {'⭐'.repeat(opening.difficulty)}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] border-slate-600">
                                  {t.openingEditor.popularity}: {'❤️'.repeat(opening.popularity)}
                                </Badge>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addOpening(opening.id)}
                              className="h-7 border-cyan-500/50 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
