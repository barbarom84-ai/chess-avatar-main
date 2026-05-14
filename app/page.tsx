"use client";

import Link from "next/link";
import Image from "next/image";
import { Sparkles, Gamepad2, User, Search, BookOpen, Trophy, Zap, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/lib/language-context";

export default function HomePage() {
  const { lang, t } = useLanguage();

  const features = [
    {
      icon: <Search className="h-8 w-8 text-cyan-400" />,
      title: lang === "fr" ? "Analyse Intelligente" : "Smart Analysis",
      description: lang === "fr" 
        ? "Analysez votre profil Lichess ou Chess.com en quelques secondes" 
        : "Analyze your Lichess or Chess.com profile in seconds"
    },
    {
      icon: <Sparkles className="h-8 w-8 text-purple-400" />,
      title: lang === "fr" ? "Game Review" : "Game Review",
      description: lang === "fr"
        ? "Classification coup-par-coup, ACPL, moments clés et meilleures lignes"
        : "Move-by-move classification, ACPL, key moments and best lines"
    },
    {
      icon: <Sparkles className="h-8 w-8 text-purple-400" />,
      title: lang === "fr" ? "IA Personnalisée" : "Personalized AI",
      description: lang === "fr"
        ? "Créez un bot qui joue exactement comme vous"
        : "Create a bot that plays exactly like you"
    },
    {
      icon: <Gamepad2 className="h-8 w-8 text-green-400" />,
      title: lang === "fr" ? "Jeu en Ligne" : "Online Play",
      description: lang === "fr"
        ? "Affrontez votre clone IA directement sur le site"
        : "Challenge your AI clone directly on the site"
    },
    {
      icon: <Target className="h-8 w-8 text-orange-400" />,
      title: lang === "fr" ? "Lignes Forcées" : "Forced Lines",
      description: lang === "fr"
        ? "Programmez des ouvertures spécifiques pour votre bot"
        : "Program specific openings for your bot"
    },
    {
      icon: <BookOpen className="h-8 w-8 text-blue-400" />,
      title: lang === "fr" ? "Export UCI" : "UCI Export",
      description: lang === "fr"
        ? "Compatible avec Fritz 20, ChessBase et Arena"
        : "Compatible with Fritz 20, ChessBase and Arena"
    },
    {
      icon: <Trophy className="h-8 w-8 text-yellow-400" />,
      title: lang === "fr" ? "Sauvegarde Cloud" : "Cloud Save",
      description: lang === "fr"
        ? "Sauvegardez et partagez vos bots (inscription optionnelle)"
        : "Save and share your bots (optional registration)"
    }
  ];

  return (
    <main className="min-h-screen theme-gradient theme-text-primary">
      
      {/* HERO SECTION */}
      <div className="relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 -top-48 -left-48 bg-cyan-500/10 rounded-full blur-3xl"></div>
          <div className="absolute w-96 h-96 -bottom-48 -right-48 bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
          
          {/* Logo & Title */}
          <div className="text-center space-y-6 mb-12">
            <div className="flex justify-center mb-6">
              <div className="relative w-24 h-24">
                <Image
                  src="/knight-logo.png"
                  alt="Chess Avatar"
                  width={96}
                  height={96}
                  className="drop-shadow-2xl w-auto h-auto"
                />
              </div>
            </div>

            <h1 className="text-6xl md:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Chess Avatar
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-cyan-300/80 max-w-3xl mx-auto">
              {lang === "fr" 
                ? "Créez une IA qui joue exactement comme vous"
                : "Create an AI that plays exactly like you"}
            </p>

            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              {lang === "fr"
                ? "Analysez vos parties, personnalisez votre bot et affrontez votre clone aux échecs"
                : "Analyze your games, customize your bot and challenge your chess clone"}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 justify-center pt-8">
              <Link href="/analyze">
                <Button size="lg" className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-lg px-8 py-6 shadow-2xl shadow-cyan-900/50 border-2 border-cyan-400/30">
                  <Search className="mr-2 h-6 w-6" />
                  {lang === "fr" ? "Analyser mon Profil" : "Analyze my Profile"}
                </Button>
              </Link>

              <Link href="/games">
                <Button size="lg" variant="outline" className="border-2 border-purple-500/50 text-purple-300 hover:bg-purple-500/10 hover:border-purple-400 font-bold text-lg px-8 py-6">
                  <Sparkles className="mr-2 h-6 w-6" />
                  {lang === "fr" ? "Analyser une partie" : "Review a Game"}
                </Button>
              </Link>

              <Link href="/play">
                <Button size="lg" variant="outline" className="border-2 border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10 hover:border-cyan-400 font-bold text-lg px-8 py-6">
                  <Gamepad2 className="mr-2 h-6 w-6" />
                  {lang === "fr" ? "Jouer en Ligne" : "Play Online"}
                </Button>
              </Link>

              <Link href="/profile">
                <Button size="lg" variant="ghost" className="text-slate-300 hover:text-cyan-300 text-lg px-8 py-6">
                  <User className="mr-2 h-6 w-6" />
                  {t.myProfile}
                </Button>
              </Link>
            </div>

            {/* Info Badge */}
            <div className="pt-4">
              <Card className="bg-blue-900/30 border-cyan-500/30 backdrop-blur-sm inline-block">
                <CardContent className="py-3 px-6">
                  <p className="text-sm text-cyan-200">
                    ✨ {lang === "fr" 
                      ? "Aucune inscription requise pour tester" 
                      : "No registration required to try"}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURES SECTION */}
      <div className="bg-slate-950/50 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-cyan-400">
            {lang === "fr" ? "Fonctionnalités" : "Features"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <Card key={idx} className="bg-slate-900/50 border-slate-800 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-900/20">
                <CardContent className="pt-6 pb-6 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="bg-slate-800/50 p-4 rounded-full">
                      {feature.icon}
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-100">
                    {feature.title}
                  </h3>
                  <p className="text-slate-400 text-sm">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-cyan-400">
            {lang === "fr" ? "Comment ça marche ?" : "How does it work?"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { num: "1", emoji: "📊", text: lang === "fr" ? "Analysez" : "Analyze" },
              { num: "2", emoji: "⚙️", text: lang === "fr" ? "Personnalisez" : "Customize" },
              { num: "3", emoji: "💾", text: lang === "fr" ? "Sauvegardez" : "Save" },
              { num: "4", emoji: "📥", text: lang === "fr" ? "Installez" : "Install" },
              { num: "5", emoji: "🎮", text: lang === "fr" ? "Jouez !" : "Play!" }
            ].map((step, idx) => (
              <div key={idx} className="text-center">
                <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-2 border-cyan-500/30 rounded-xl p-6 hover:scale-105 transition-transform">
                  <div className="text-5xl mb-3">{step.emoji}</div>
                  <div className="text-cyan-400 font-bold text-lg">{step.text}</div>
                </div>
                {idx < 4 && (
                  <div className="hidden md:block text-cyan-500/30 text-2xl mt-4">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA SECTION */}
      <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-4xl font-bold text-cyan-300">
            {lang === "fr" ? "Prêt à créer votre avatar ?" : "Ready to create your avatar?"}
          </h2>
          <p className="text-xl text-slate-300">
            {lang === "fr"
              ? "Commencez en quelques secondes, aucune inscription requise"
              : "Get started in seconds, no registration required"}
          </p>
          <Link href="/analyze">
            <Button size="lg" className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xl px-12 py-7 shadow-2xl">
              <Zap className="mr-2 h-6 w-6" />
              {lang === "fr" ? "Commencer Maintenant" : "Get Started Now"}
            </Button>
          </Link>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-slate-950/80 py-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
            {/* Navigation */}
            <div>
              <h4 className="font-semibold text-slate-300 mb-3">{lang === "fr" ? "Navigation" : "Navigation"}</h4>
              <div className="flex flex-col gap-2 text-slate-500">
                <Link href="/analyze" className="hover:text-cyan-400 transition-colors">
                  {t.pages.analyze.nav}
                </Link>
                <Link href="/play" className="hover:text-cyan-400 transition-colors">
                  {t.pages.play.nav}
                </Link>
                <Link href="/profile" className="hover:text-cyan-400 transition-colors">
                  {t.pages.profile.title}
                </Link>
                <Link href="/avatars" className="hover:text-cyan-400 transition-colors">
                  {t.pages.avatars.nav}
                </Link>
                <Link href="/guide" className="hover:text-cyan-400 transition-colors">
                  {t.pages.guide.nav}
                </Link>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-slate-300 mb-3">{lang === "fr" ? "Légal" : "Legal"}</h4>
              <div className="flex flex-col gap-2 text-slate-500">
                <Link href="/terms" className="hover:text-cyan-400 transition-colors">
                  {lang === "fr" ? "Conditions générales" : "Terms of Service"}
                </Link>
                <Link href="/privacy" className="hover:text-cyan-400 transition-colors">
                  {lang === "fr" ? "Politique de confidentialité" : "Privacy Policy"}
                </Link>
                <Link href="/refund" className="hover:text-cyan-400 transition-colors">
                  {lang === "fr" ? "Politique de remboursement" : "Refund Policy"}
                </Link>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-slate-300 mb-3">Contact</h4>
              <div className="flex flex-col gap-2 text-slate-500">
                <Link href="/contact" className="hover:text-cyan-400 transition-colors">
                  {lang === "fr" ? "Nous contacter" : "Contact Us"}
                </Link>
                <a
                  href="https://www.youtube.com/@ChessAvatarDotNet/videos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-cyan-400 transition-colors inline-flex items-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4 h-4 text-red-500"
                    aria-hidden="true"
                  >
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.546 15.568V8.432L15.818 12l-6.272 3.568z" />
                  </svg>
                  {lang === "fr" ? "Chaîne YouTube" : "YouTube Channel"}
                </a>
              </div>
            </div>
          </div>

          <div className="text-center mt-8 pt-6 border-t border-slate-800 text-slate-600 text-xs">
            © 2025 Chess Avatar • {lang === "fr" ? "Créez votre clone IA aux échecs" : "Create your chess AI clone"}
          </div>
        </div>
      </footer>

    </main>
  );
}
