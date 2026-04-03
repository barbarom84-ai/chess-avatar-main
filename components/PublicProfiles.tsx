"use client";

import { useLanguage } from "@/lib/language-context";
import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Library, Search, Play, Download, Loader2, Globe, Database, Settings, Filter, ArrowUpDown, Lock, Unlock, Users, User } from "lucide-react";
import { getFilteredProfiles, updateProfile, type ProfileFilter, type ProfileSort } from "@/lib/supabase-storage";
import { isSupabaseConfigured, supabase, type DbProfile } from "@/lib/supabase";
import { prepareConfigForExport } from "@/lib/forced-line-utils";
import { OPENINGS_DATABASE } from "@/lib/openings-library";
import { useRouter } from "next/navigation";
import ProfileDetailsModal from "./ProfileDetailsModal";
import { toast } from "sonner";

export default function PublicProfiles() {
  const { lang, t } = useLanguage();
  const router = useRouter();
  const [profiles, setProfiles] = useState<DbProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<ProfileFilter>('all');
  const [sort, setSort] = useState<ProfileSort>('date');
  const [selectedProfile, setSelectedProfile] = useState<DbProfile | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const searchQueryRef = useRef(searchQuery);

  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    const data = await getFilteredProfiles(
      filter,
      sort,
      50,
      searchQueryRef.current
    );
    setProfiles(data);
    setLoading(false);
  }, [filter, sort]);

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      void loadProfiles();
      supabase.auth.getUser().then(({ data }) => {
        setCurrentUserId(data.user?.id ?? null);
      });
    } else {
      setLoading(false);
    }
  }, [filter, sort, loadProfiles]);

  const handleSearch = async () => {
    loadProfiles();
  };

  const handleFilterChange = (newFilter: ProfileFilter) => {
    setFilter(newFilter);
  };

  const handleSortChange = (newSort: ProfileSort) => {
    setSort(newSort);
  };

  const handlePlayAgainst = (profile: DbProfile) => {
    const configParam = encodeURIComponent(JSON.stringify(profile.config));
    router.push(`/play?config=${configParam}`);
  };

  const handleDownload = (profile: DbProfile) => {
    const exportConfig = prepareConfigForExport(profile.config, {
      openingsDatabase: OPENINGS_DATABASE,
    });
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportConfig, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${profile.username}_profile.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleViewDetails = (profile: DbProfile) => {
    setSelectedProfile(profile);
    setShowDetailsModal(true);
  };

  const handleUpdateProfile = async (id: string, updates: Partial<DbProfile>): Promise<boolean> => {
    const res = await updateProfile(id, updates);
    if (res.success) {
      await loadProfiles();
      return true;
    }
    toast.error(res.error || 'Error');
    return false;
  };

  const isOwner = (profile: DbProfile) => currentUserId === profile.user_id;

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Library className="h-5 w-5 text-purple-400" />
            {t.library.title}
          </CardTitle>
          <Badge variant="outline" className="text-purple-400 border-purple-400">
            {profiles.length} {t.library.profiles}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Barre de recherche */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <Input
              placeholder={t.library.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10 bg-slate-950 border-slate-700 text-slate-100"
            />
          </div>
          <Button 
            onClick={handleSearch}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-lg border border-purple-700"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Filtres et Tri */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Filtres de visibilité */}
          <div className="flex-1">
            <div className="flex items-center gap-1 mb-1">
              <Filter className="h-3 w-3 text-slate-400" />
              <span className="text-xs text-slate-400">{t.library.visibility}</span>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => handleFilterChange('all')}
                className={filter === 'all' 
                  ? 'bg-purple-600 text-white border-purple-700' 
                  : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-purple-500'
                }
              >
                <Users className="h-3 w-3 mr-1" />
                {t.library.all}
              </Button>
              <Button
                size="sm"
                variant={filter === 'public' ? 'default' : 'outline'}
                onClick={() => handleFilterChange('public')}
                className={filter === 'public' 
                  ? 'bg-purple-600 text-white border-purple-700' 
                  : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-purple-500'
                }
              >
                <Unlock className="h-3 w-3 mr-1" />
                {t.library.public}
              </Button>
              <Button
                size="sm"
                variant={filter === 'private' ? 'default' : 'outline'}
                onClick={() => handleFilterChange('private')}
                className={filter === 'private' 
                  ? 'bg-purple-600 text-white border-purple-700' 
                  : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-purple-500'
                }
              >
                <Lock className="h-3 w-3 mr-1" />
                {t.library.private}
              </Button>
              <Button
                size="sm"
                variant={filter === 'my' ? 'default' : 'outline'}
                onClick={() => handleFilterChange('my')}
                className={filter === 'my' 
                  ? 'bg-purple-600 text-white border-purple-700' 
                  : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-purple-500'
                }
              >
                {t.library.myProfiles}
              </Button>
            </div>
          </div>

          {/* Tri */}
          <div className="flex-1">
            <div className="flex items-center gap-1 mb-1">
              <ArrowUpDown className="h-3 w-3 text-slate-400" />
              <span className="text-xs text-slate-400">{t.library.sortBy}</span>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={sort === 'date' ? 'default' : 'outline'}
                onClick={() => handleSortChange('date')}
                className={sort === 'date' 
                  ? 'bg-cyan-600 text-white border-cyan-700' 
                  : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-cyan-500'
                }
              >
                {t.library.date}
              </Button>
              <Button
                size="sm"
                variant={sort === 'elo' ? 'default' : 'outline'}
                onClick={() => handleSortChange('elo')}
                className={sort === 'elo' 
                  ? 'bg-cyan-600 text-white border-cyan-700' 
                  : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-cyan-500'
                }
              >
                {t.library.elo}
              </Button>
              <Button
                size="sm"
                variant={sort === 'name' ? 'default' : 'outline'}
                onClick={() => handleSortChange('name')}
                className={sort === 'name' 
                  ? 'bg-cyan-600 text-white border-cyan-700' 
                  : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-cyan-500'
                }
              >
                {t.library.name}
              </Button>
              <Button
                size="sm"
                variant={sort === 'difficulty' ? 'default' : 'outline'}
                onClick={() => handleSortChange('difficulty')}
                className={sort === 'difficulty' 
                  ? 'bg-cyan-600 text-white border-cyan-700' 
                  : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-cyan-500'
                }
              >
                {t.library.difficulty}
              </Button>
            </div>
          </div>
        </div>

        {/* Liste des profils */}
        {!isSupabaseConfigured ? (
          <Alert className="bg-orange-900/10 border-orange-700">
            <Database className="h-4 w-4 text-orange-400" />
            <AlertDescription className="text-orange-300 text-sm">
              {t.library.needsSupabase}
              {' '}{t.library.checkDocs}
            </AlertDescription>
          </Alert>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : profiles.length === 0 ? (
          <Alert className="bg-slate-950 border-slate-800">
            <AlertDescription className="text-slate-400 text-sm">
              {searchQuery ? t.library.noProfiles : t.library.noPublicProfiles}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto">
            {profiles.map((profile) => (
              <Card 
                key={profile.id}
                className="bg-slate-950 border-slate-800 hover:border-purple-700 transition-colors"
              >
                <CardContent className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-200">{profile.username}</h3>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            profile.platform === 'chesscom' 
                              ? 'border-green-500 text-green-300 bg-green-500/10' 
                              : 'border-blue-500 text-blue-300 bg-blue-500/10'
                          }`}
                        >
                          {profile.platform === 'chesscom' ? 'Chess.com' : 'Lichess'}
                        </Badge>
                        {profile.is_public ? (
                          <Unlock className="h-3 w-3 text-green-400" />
                        ) : (
                          <Lock className="h-3 w-3 text-orange-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs text-amber-400 border-amber-400">
                          ELO {profile.config.elo}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {t.engineConfig.depthLevel} {profile.config.difficulty}
                        </Badge>
                      </div>
                    </div>
                    <Globe className="h-5 w-5 text-purple-400" />
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center bg-slate-900 p-2 rounded">
                      <div className="text-slate-400">{t.library.style}</div>
                      <div className="font-semibold text-slate-200 capitalize">{
                        ({
                          'agressif': t.engineConfig.playStyleAggressive,
                          'solide': t.engineConfig.playStyleSolid,
                          'équilibré': t.engineConfig.playStyleBalanced,
                          'positionnel': t.engineConfig.playStylePositional,
                          'tactique': t.engineConfig.playStyleTactical,
                        } as Record<string, string>)[profile.config.playStyle] || profile.config.playStyle
                      }</div>
                    </div>
                    <div className="text-center bg-slate-900 p-2 rounded">
                      <div className="text-slate-400">{t.library.aggression}</div>
                      <div className="font-semibold text-red-400">{profile.config.aggressiveness}%</div>
                    </div>
                    <div className="text-center bg-slate-900 p-2 rounded">
                      <div className="text-slate-400">{t.library.depth}</div>
                      <div className="font-semibold text-purple-400">{profile.config.depth}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      onClick={() => handlePlayAgainst(profile)}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md border border-blue-700"
                      title={t.engineConfig.playAgainstProfile}
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleViewDetails(profile)}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-md border border-purple-700"
                      title={t.engineConfig.viewDetails}
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(profile)}
                      className="border-2 border-green-500 bg-green-500/10 text-green-300 hover:bg-green-500/20 font-semibold shadow-sm"
                      title={t.engineConfig.exportJsonLabel}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Creator & Date */}
                  <div className="text-xs text-slate-600 text-center flex items-center justify-center gap-1">
                    {profile.config.creatorName && (
                      <>
                        <User className="h-3 w-3" />
                        <span className="text-slate-400">{profile.config.creatorName}</span>
                        <span>·</span>
                      </>
                    )}
                    {t.library.createdOn} {new Date(profile.created_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      <ProfileDetailsModal
        open={showDetailsModal}
        onOpenChange={setShowDetailsModal}
        profile={selectedProfile}
        onUpdate={selectedProfile && isOwner(selectedProfile) ? handleUpdateProfile : undefined}
        onPlay={handlePlayAgainst}
      />
    </Card>
  );
}
