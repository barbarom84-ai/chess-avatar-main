"use client";

import { useLanguage } from "@/lib/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer
} from "recharts";
import { TrendingUp, PieChart as PieChartIcon, Target, Activity } from "lucide-react";
import type { PersonaStats } from "@/lib/analysis";

interface PerformanceChartsProps {
  stats: PersonaStats;
}

export default function PerformanceCharts({ stats }: PerformanceChartsProps) {
  const { t } = useLanguage();
  
  // Translate style name
  const styleMap: Record<string, string> = {
    'Agressif': t.performanceCharts.styleAggressive,
    'Solide': t.performanceCharts.styleSolid,
    'Équilibré': t.performanceCharts.styleBalanced,
    'Chaotique': t.performanceCharts.styleChaotic,
  };
  const translatedStyle = styleMap[stats.style] || stats.style;

  // 1. Données pour le graphique Radar du style de jeu
  const calculateStyleMetrics = () => {
    // Calculer les métriques basées sur les stats
    const aggression = stats.avgMoves < 30 ? 80 : stats.avgMoves < 40 ? 60 : 40;
    const precision = 100 - (stats.lossRate * 0.8);
    const defense = stats.drawRate > 30 ? 80 : stats.drawRate > 20 ? 60 : 40;
    const tactical = stats.style === 'Agressif' || stats.style === 'Chaotique' ? 80 : 50;
    const positional = stats.style === 'Solide' || stats.style === 'Équilibré' ? 80 : 50;
    
    return [
      { metric: t.performanceCharts.aggressiveness, value: aggression, fullMark: 100 },
      { metric: t.performanceCharts.precision, value: precision, fullMark: 100 },
      { metric: t.performanceCharts.defense, value: defense, fullMark: 100 },
      { metric: t.performanceCharts.tactics, value: tactical, fullMark: 100 },
      { metric: t.performanceCharts.positional, value: positional, fullMark: 100 },
    ];
  };

              {t.performanceCharts.resultsTab}
  const resultsData = [
    { name: t.performanceCharts.wins, value: stats.winRate, color: '#22c55e' },
    { name: t.performanceCharts.draws, value: stats.drawRate, color: '#94a3b8' },
    { name: t.performanceCharts.losses, value: stats.lossRate, color: '#ef4444' },
  ];

  // 3. Données pour le graphique des ouvertures
  const openingsData = stats.topOpenings.map(op => ({
    name: op.name.length > 15 ? op.name.substring(0, 15) + '...' : op.name,
    parties: op.count,
    percentage: ((op.count / stats.gameCount) * 100).toFixed(1)
  }));

  // 4. Données pour l'analyse par phase de jeu (simulées pour démo)
  const phaseData = [
    { phase: t.performanceCharts.phaseOpening, performance: 75 },
    { phase: t.performanceCharts.phaseMiddlegame, performance: stats.winRate },
    { phase: t.performanceCharts.phaseEndgame, performance: stats.winRate + 5 },
  ];

  const styleMetrics = calculateStyleMetrics();

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-green-400" />
          {t.performanceCharts.title}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="style" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-950 border border-slate-800">
            <TabsTrigger value="style" className="data-[state=active]:bg-green-600">
              <Target className="h-4 w-4 mr-1" />
              {t.performanceCharts.styleTab}
            </TabsTrigger>
            <TabsTrigger value="results" className="data-[state=active]:bg-blue-600">
              <PieChartIcon className="h-4 w-4 mr-1" />
              {t.performanceCharts.resultsTab}
            </TabsTrigger>
            <TabsTrigger value="openings" className="data-[state=active]:bg-purple-600">
              <TrendingUp className="h-4 w-4 mr-1" />
              {t.performanceCharts.openingsTab}
            </TabsTrigger>
            <TabsTrigger value="phases" className="data-[state=active]:bg-orange-600">
              <Activity className="h-4 w-4 mr-1" />
              {t.performanceCharts.phasesTab}
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Graphique Radar du Style */}
          <TabsContent value="style" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-300">{t.performanceCharts.gameProfile}</h3>
                <Badge variant="outline" className="text-green-400 border-green-400 bg-green-400/10">
                  Style: {translatedStyle}
                </Badge>
              </div>
              
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={styleMetrics}>
                  <PolarGrid stroke="#475569" />
                  <PolarAngleAxis 
                    dataKey="metric" 
                    tick={{ fill: '#cbd5e1', fontSize: 12 }}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]} 
                    tick={{ fill: '#64748b' }}
                  />
                  <Radar
                    name={t.ui.yourStyle}
                    dataKey="value"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.6}
                  />
                </RadarChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-2 gap-3 mt-4">
                {styleMetrics.map((metric, idx) => (
                  <div key={idx} className="bg-slate-950 p-3 rounded border border-slate-800">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">{metric.metric}</span>
                      <span className="text-sm font-bold text-green-400">{metric.value}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

                <h3 className="text-sm font-semibold text-slate-300">{t.performanceCharts.resultDistribution}</h3>
          <TabsContent value="results" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-300">{t.performanceCharts.resultDistribution}</h3>
                <Badge variant="outline" className="text-blue-400 border-blue-400 bg-blue-400/10">
                  {stats.gameCount} parties
                </Badge>
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={resultsData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {resultsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#e2e8f0'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-950 p-3 rounded border border-green-800">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{stats.winRate}%</div>
                    <div className="text-xs text-slate-400 mt-1">{t.performanceCharts.wins}</div>
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded border border-slate-700">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-400">{stats.drawRate}%</div>
                    <div className="text-xs text-slate-400 mt-1">{t.performanceCharts.draws}</div>
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded border border-red-800">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">{stats.lossRate}%</div>
                    <div className="text-xs text-slate-400 mt-1">{t.performanceCharts.losses}</div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: Analyse des Ouvertures */}
          <TabsContent value="openings" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-300">{t.performanceCharts.openingRepertoire}</h3>
                <Badge variant="outline" className="text-purple-400 border-purple-400 bg-purple-400/10">
                  Top {openingsData.length}
                </Badge>
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={openingsData}>
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#cbd5e1', fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#e2e8f0'
                    }}
                    formatter={(value: any, name: string) => {
                      if (name === 'parties') return [`${value} ${t.performanceCharts.games}`, 'Count'];
                      return [value, name];
                    }}
                  />
                  <Bar dataKey="parties" fill="#a855f7" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <div className="space-y-2">
                {openingsData.map((opening, idx) => (
                  <div key={idx} className="bg-slate-950 p-3 rounded border border-slate-800">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={idx === 0 ? "text-amber-400 border-amber-400" : "text-slate-400 border-slate-700"}>
                          #{idx + 1}
                        </Badge>
                        <span className="text-sm text-slate-300">{stats.topOpenings[idx].name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-purple-400">{opening.parties} {t.performanceCharts.games}</div>
                        <div className="text-xs text-slate-500">{opening.percentage}%</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* TAB 4: Performance par Phase */}
          <TabsContent value="phases" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-300">{t.performanceCharts.phaseAnalysis}</h3>
                <Badge variant="outline" className="text-orange-400 border-orange-400 bg-orange-400/10">
                  {t.performanceCharts.phaseAnalysis}
                </Badge>
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={phaseData} layout="vertical">
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b' }} />
                  <YAxis dataKey="phase" type="category" tick={{ fill: '#cbd5e1' }} width={80} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#e2e8f0'
                    }}
                    formatter={(value: any) => [`${value}%`, 'Performance']}
                  />
                  <Bar dataKey="performance" fill="#fb923c" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-3 gap-3">
                {phaseData.map((phase, idx) => (
                  <div key={idx} className="bg-slate-950 p-4 rounded border border-slate-800">
                    <div className="text-center">
                      <div className="text-xs text-slate-400 mb-2">{phase.phase}</div>
                      <div className="text-2xl font-bold text-orange-400">{phase.performance}%</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gradient-to-r from-slate-950 to-slate-900 p-4 rounded-lg border border-slate-800">
                <h4 className="text-sm font-semibold text-slate-300 mb-2">{t.performanceCharts.title}</h4>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span>{t.performanceCharts.phaseAnalysis} : {phaseData.reduce((max, p) => p.performance > max.performance ? p : max).phase}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    <span>{t.performanceCharts.overallAverage} : {Math.round(phaseData.reduce((sum, p) => sum + p.performance, 0) / phaseData.length)}%</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span>{t.performanceCharts.styleTab} : {translatedStyle}</span>
                  </li>
                </ul>
              </div>
            </div>
          </TabsContent>

        </Tabs>
      </CardContent>
    </Card>
  );
}
