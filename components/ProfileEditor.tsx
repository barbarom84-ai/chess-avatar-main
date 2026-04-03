"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Sliders, Trophy, BookOpen, Save, X, Brain, Lightbulb } from 'lucide-react';
import StyleRadarChart from './StyleRadarChart';
import AIAnalysisCard from './AIAnalysisCard';
import SuggestionsPanel from './SuggestionsPanel';
import { useLanguage } from "@/lib/language-context";
import {
  getProfileMetadata,
  saveProfileMetadata,
  getFavoriteOpenings,
  addFavoriteOpening,
  deleteFavoriteOpening,
  createDefaultPlayingStyle
} from '@/lib/profile-metadata';
import { generateAIAnalysis, shouldUpdateAIAnalysis } from '@/lib/ai-analysis';
import { recommendOpenings, suggestOptimalConfig } from '@/lib/profile-suggestions';
import type { AIAnalysis } from '@/lib/ai-analysis';
import type { OpeningRecommendation, ConfigSuggestion } from '@/lib/profile-suggestions';
import {
  AVAILABLE_TAGS,
  AVAILABLE_STRENGTHS,
  AVAILABLE_WEAKNESSES,
  type ProfileMetadata,
  type FavoriteOpening,
  type PlayingStyle
} from '@/types/chess';
import { toast } from 'sonner';

interface ProfileEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  profileName: string;
}

export default function ProfileEditor({
  open,
  onOpenChange,
  profileId,
  profileName
}: ProfileEditorProps) {
  const { t, lang } = useLanguage();
  // États
  const [saving, setSaving] = useState(false);
  
  // Informations générales
  const [biography, setBiography] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // Style de jeu
  const [playingStyle, setPlayingStyle] = useState<PlayingStyle>(createDefaultPlayingStyle());
  
  // Forces et faiblesses
  const [strengths, setStrengths] = useState<string[]>([]);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  
  // Ouvertures favorites
  const [favoriteOpenings, setFavoriteOpenings] = useState<FavoriteOpening[]>([]);
  const [newOpeningName, setNewOpeningName] = useState('');
  const [newOpeningEco, setNewOpeningEco] = useState('');
  
  // Analyse IA
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  
  // Suggestions
  const [openingRecommendations, setOpeningRecommendations] = useState<OpeningRecommendation[]>([]);
  const [configSuggestion, setConfigSuggestion] = useState<ConfigSuggestion | null>(null);

  // Charger les données au montage
  useEffect(() => {
    if (open && profileId) {
      loadMetadata();
      loadOpenings();
      generateSuggestions();
    }
  }, [open, profileId]);

  const loadMetadata = async () => {
    try {
      const metadata = await getProfileMetadata(profileId);
      if (metadata) {
        setBiography(metadata.biography || '');
        setNotes(metadata.notes || '');
        setSelectedTags(metadata.tags || []);
        setPlayingStyle(metadata.playingStyle || createDefaultPlayingStyle());
        setStrengths(metadata.strengths || []);
        setWeaknesses(metadata.weaknesses || []);
        
        // Charger l'analyse IA si disponible
        if (metadata.aiSummary && metadata.aiStyleDescription) {
          setAiAnalysis({
            summary: metadata.aiSummary,
            styleDescription: metadata.aiStyleDescription,
            recommendations: [],
            improvementAreas: [],
            strengths: [],
            famousComparisons: [],
            confidence: metadata.aiConfidence || 0,
            generatedAt: metadata.aiUpdatedAt || new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des métadonnées:', error);
    }
  };

  const loadOpenings = async () => {
    try {
      const openings = await getFavoriteOpenings(profileId);
      setFavoriteOpenings(openings);
    } catch (error) {
      console.error('Erreur lors du chargement des ouvertures:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Générer une nouvelle analyse IA si nécessaire
      const metadata = await getProfileMetadata(profileId);
      let aiData = {};
      
      if (shouldUpdateAIAnalysis(metadata)) {
        const analysis = generateAIAnalysis(playingStyle, undefined, favoriteOpenings.length);
        setAiAnalysis(analysis);
        aiData = {
          aiSummary: analysis.summary,
          aiStyleDescription: analysis.styleDescription,
          aiConfidence: analysis.confidence,
          aiUpdatedAt: analysis.generatedAt
        };
      }
      
      const saved = await saveProfileMetadata(profileId, {
        biography,
        notes,
        tags: selectedTags,
        playingStyle,
        strengths,
        weaknesses,
        ...aiData
      } as Partial<ProfileMetadata>);

      if (saved) {
        toast.success(t.profileEditor.saveSuccess);
        onOpenChange(false);
      } else {
        toast.error(t.profileEditor.saveFailed);
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error(t.profileEditor.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateAI = async () => {
    setGeneratingAI(true);
    try {
      const analysis = generateAIAnalysis(playingStyle, undefined, favoriteOpenings.length);
      setAiAnalysis(analysis);
    } catch (error) {
      console.error('Erreur lors de la génération de l\'analyse IA:', error);
    } finally {
      setGeneratingAI(false);
    }
  };
  
  const generateSuggestions = () => {
    // Recommandations d'ouvertures
    const existingOpeningNames = favoriteOpenings.map(o => o.name);
    const recommendations = recommendOpenings(playingStyle, existingOpeningNames, 5, lang);
    setOpeningRecommendations(recommendations);
    
    // Configuration moteur suggérée
    const config = suggestOptimalConfig(playingStyle);
    setConfigSuggestion(config);
  };
  
  const handleAddRecommendedOpening = async (opening: OpeningRecommendation) => {
    try {
      const added = await addFavoriteOpening(profileId, {
        name: opening.name,
        eco: opening.eco,
        description: opening.description,
        preferenceOrder: favoriteOpenings.length
      });

      if (added) {
        setFavoriteOpenings([...favoriteOpenings, added]);
        // Régénérer les suggestions après ajout
        generateSuggestions();
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'ouverture:', error);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const toggleStrength = (strength: string) => {
    setStrengths(prev =>
      prev.includes(strength)
        ? prev.filter(s => s !== strength)
        : [...prev, strength]
    );
  };

  const toggleWeakness = (weakness: string) => {
    setWeaknesses(prev =>
      prev.includes(weakness)
        ? prev.filter(w => w !== weakness)
        : [...prev, weakness]
    );
  };

  const handleAddOpening = async () => {
    if (!newOpeningName.trim()) return;

    try {
      const opening = await addFavoriteOpening(profileId, {
        name: newOpeningName,
        eco: newOpeningEco || undefined,
        preferenceOrder: favoriteOpenings.length
      });

      if (opening) {
        setFavoriteOpenings([...favoriteOpenings, opening]);
        setNewOpeningName('');
        setNewOpeningEco('');
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'ouverture:', error);
    }
  };

  const handleDeleteOpening = async (openingId: string) => {
    const success = await deleteFavoriteOpening(openingId);
    if (success) {
      setFavoriteOpenings(favoriteOpenings.filter(o => o.id !== openingId));
    }
  };

  const updateStyleValue = (key: keyof PlayingStyle, value: number) => {
    setPlayingStyle(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-slate-900 border-cyan-500/20">
        <DialogHeader>
          <DialogTitle className="text-2xl neon-cyan flex items-center gap-2">
            <User className="h-6 w-6" />
            Éditer le Profil - {profileName}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Personnalisez les informations, le style de jeu et les préférences de ce profil
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid grid-cols-6 w-full bg-slate-950">
            <TabsTrigger value="info" className="data-[state=active]:bg-cyan-600">
              <User className="h-4 w-4 mr-2" />
              Infos
            </TabsTrigger>
            <TabsTrigger value="style" className="data-[state=active]:bg-cyan-600">
              <Sliders className="h-4 w-4 mr-2" />
              {t.profileEditor.playStyle}
            </TabsTrigger>
            <TabsTrigger value="skills" className="data-[state=active]:bg-cyan-600">
              <Trophy className="h-4 w-4 mr-2" />
              {t.profileEditor.strengthsWeaknesses}
            </TabsTrigger>
            <TabsTrigger value="openings" className="data-[state=active]:bg-cyan-600">
              <BookOpen className="h-4 w-4 mr-2" />
              {t.profileEditor.openings}
            </TabsTrigger>
            <TabsTrigger value="ai" className="data-[state=active]:bg-purple-600">
              <Brain className="h-4 w-4 mr-2" />
              {t.profileEditor.aiAnalysis}
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="data-[state=active]:bg-green-600">
              <Lightbulb className="h-4 w-4 mr-2" />
              Suggestions
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[500px] mt-4">
            {/* Onglet Informations */}
            <TabsContent value="info" className="space-y-4 px-2">
              <div>
                <Label htmlFor="biography" className="text-cyan-100">{t.profileEditor.biography}</Label>
                <textarea
                  id="biography"
                  value={biography}
                  onChange={(e) => setBiography(e.target.value)}
                  placeholder={t.profileEditor.biographyPlaceholder}
                  className="w-full mt-2 p-3 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 min-h-[100px] focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  maxLength={500}
                />
                <p className="text-xs text-slate-500 mt-1">{biography.length}/500 chars</p>
              </div>

              <div>
                <Label htmlFor="notes" className="text-cyan-100">{t.profileEditor.privateNotes}</Label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t.profileEditor.privateNotesPlaceholder}
                  className="w-full mt-2 p-3 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 min-h-[80px] focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  maxLength={300}
                />
                <p className="text-xs text-slate-500 mt-1">{notes.length}/300 chars</p>
              </div>

              <div>
                <Label className="text-cyan-100 mb-2 block">{t.profileEditor.tags}</Label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_TAGS.map(tag => (
                    <Badge
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`cursor-pointer transition-all ${
                        selectedTags.includes(tag)
                          ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {selectedTags.length} {t.profileEditor.tagsSelected}
                </p>
              </div>
            </TabsContent>

            {/* Onglet Style de Jeu */}
            <TabsContent value="style" className="space-y-6 px-2">
              <div>
                <h3 className="text-lg font-semibold text-cyan-100 mb-4">{t.profileEditor.playStyle}</h3>
                <StyleRadarChart style={playingStyle} />
              </div>

              <div className="space-y-4">
                {Object.entries(playingStyle).map(([key, value]) => {
                  const labels: Record<string, string> = {
                    aggression: t.profileEditor.aggressiveness,
                    tactical: t.profileEditor.tactics,
                    positional: t.profileEditor.positional,
                    endgame: t.profileEditor.endgames,
                    openingTheory: t.profileEditor.openingTheory,
                    timeManagement: t.profileEditor.timeManagement
                  };

                  return (
                    <div key={key}>
                      <div className="flex justify-between items-center mb-2">
                        <Label className="text-slate-300">{labels[key]}</Label>
                        <span className="text-cyan-400 font-bold">{value}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={value}
                        onChange={(e) => updateStyleValue(key as keyof PlayingStyle, parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>0</span>
                        <span>50</span>
                        <span>100</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Onglet {t.profileEditor.strengthsWeaknesses} */}
            <TabsContent value="skills" className="space-y-6 px-2">
              <div>
                <Label className="text-cyan-100 mb-2 block flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-green-500" />
                  Points Forts
                </Label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_STRENGTHS.map(strength => (
                    <Badge
                      key={strength}
                      onClick={() => toggleStrength(strength)}
                      className={`cursor-pointer transition-all ${
                        strengths.includes(strength)
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {strength}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {strengths.length} {t.profileEditor.tagsSelected}
                </p>
              </div>

              <div>
                <Label className="text-cyan-100 mb-2 block flex items-center gap-2">
                  <X className="h-4 w-4 text-red-500" />
                  Points Faibles
                </Label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_WEAKNESSES.map(weakness => (
                    <Badge
                      key={weakness}
                      onClick={() => toggleWeakness(weakness)}
                      className={`cursor-pointer transition-all ${
                        weaknesses.includes(weakness)
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {weakness}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {weaknesses.length} {t.profileEditor.weaknessesSelected}
                </p>
              </div>
            </TabsContent>

            {/* Onglet Ouvertures */}
            <TabsContent value="openings" className="space-y-4 px-2">
              <div>
                <Label className="text-cyan-100 mb-2 block">{t.profileEditor.addOpening}</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder={t.profileEditor.openingName}
                    value={newOpeningName}
                    onChange={(e) => setNewOpeningName(e.target.value)}
                    className="flex-1 bg-slate-950 border-slate-700 text-slate-200"
                  />
                  <Input
                    placeholder="ECO (ex: E4)"
                    value={newOpeningEco}
                    onChange={(e) => setNewOpeningEco(e.target.value)}
                    className="w-24 bg-slate-950 border-slate-700 text-slate-200"
                  />
                  <Button
                    onClick={handleAddOpening}
                    className="bg-cyan-600 hover:bg-cyan-700"
                  >
                    Ajouter
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-cyan-100">{t.profileEditor.favoriteOpenings} ({favoriteOpenings.length})</Label>
                {favoriteOpenings.length === 0 ? (
                  <p className="text-slate-500 text-sm py-4 text-center">
                  {t.profileEditor.noFavoriteOpenings}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {favoriteOpenings.map((opening, index) => (
                      <div
                        key={opening.id}
                        className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-slate-500 font-mono text-sm">#{index + 1}</span>
                          <div>
                            <p className="text-slate-200 font-medium">{opening.name}</p>
                            {opening.eco && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                {opening.eco}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteOpening(opening.id)}
                          className="border-red-500/50 text-red-300 hover:bg-red-500/10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Onglet Analyse IA */}
            <TabsContent value="ai" className="space-y-4 px-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-400">
                    {t.profileEditor.aiAnalysisDesc}
                  </p>
                  <Button
                    onClick={handleGenerateAI}
                    disabled={generatingAI}
                    variant="outline"
                    className="border-purple-500/50 text-purple-300 hover:bg-purple-500/10"
                  >
                    {generatingAI ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-300 mr-2"></div>
                        {t.profileEditor.generating}
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        {t.profileEditor.generateAnalysis}
                      </>
                    )}
                  </Button>
                </div>
                
                <AIAnalysisCard
                  analysis={aiAnalysis}
                  loading={generatingAI}
                  onRefresh={handleGenerateAI}
                />
              </div>
            </TabsContent>

            {/* Onglet Suggestions */}
            <TabsContent value="suggestions" className="space-y-4 px-2">
              <div className="mb-4">
                <p className="text-sm text-slate-400">
                  {t.profileEditor.suggestionsDesc}
                </p>
              </div>
              
              <SuggestionsPanel
                openingRecommendations={openingRecommendations}
                configSuggestion={configSuggestion || undefined}
                onAddOpening={handleAddRecommendedOpening}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-800">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            {t.profileEditor.cancel}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-cyan-600 hover:bg-cyan-700 text-white glow-cyan"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {t.profileEditor.save}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
