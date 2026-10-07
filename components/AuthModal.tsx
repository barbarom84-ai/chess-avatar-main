"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LogIn, UserPlus, Mail, Lock, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function AuthModal({ open, onOpenChange, onSuccess }: AuthModalProps) {
  const { t } = useLanguage();
  const a = t.authModal;
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError(a.notConfigured);
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      setSuccess(a.signInSuccess);
      setTimeout(() => {
        onOpenChange(false);
        onSuccess?.();
      }, 1000);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : a.signInError
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError(a.notConfigured);
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      const session = data?.session ?? null;
      if (session) {
        setSuccess(a.signUpSuccess);
        setTimeout(() => {
          onOpenChange(false);
          onSuccess?.();
        }, 1000);
      } else {
        setSuccess(a.confirmEmailSent);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : a.signUpError
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setError('');
    setSuccess('');
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <LogIn className="h-6 w-6 text-green-400" />
            {a.title}
          </DialogTitle>
          <DialogDescription>
            {a.description}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => {
          setMode(v as 'signin' | 'signup');
          resetForm();
        }} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-950 border border-slate-800">
            <TabsTrigger value="signin" className="data-[state=active]:bg-green-600">
              <LogIn className="h-4 w-4 mr-2" />
              {a.signInTab}
            </TabsTrigger>
            <TabsTrigger value="signup" className="data-[state=active]:bg-blue-600">
              <UserPlus className="h-4 w-4 mr-2" />
              {a.signUpTab}
            </TabsTrigger>
          </TabsList>

          {/* TAB CONNEXION */}
          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">{a.email}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    type="email"
                    placeholder={a.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">{a.password}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pl-10 bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500"
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="bg-red-900/20 border-red-900">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="bg-green-900/20 border-green-500">
                  <AlertDescription className="text-green-300">{success}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold shadow-lg border border-green-700"
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {a.signingIn}</>
                ) : (
                  <><LogIn className="mr-2 h-4 w-4" /> {a.signIn}</>
                )}
              </Button>
            </form>
          </TabsContent>

          {/* TAB INSCRIPTION */}
          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">{a.email}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    type="email"
                    placeholder={a.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">{a.password}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pl-10 bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500"
                  />
                </div>
                <p className="text-xs text-slate-500">{a.passwordHint}</p>
              </div>

              {error && (
                <Alert variant="destructive" className="bg-red-900/20 border-red-900">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="bg-green-900/20 border-green-500">
                  <AlertDescription className="text-green-300">{success}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold shadow-lg border border-blue-800"
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {a.signingUp}</>
                ) : (
                  <><UserPlus className="mr-2 h-4 w-4" /> {a.signUp}</>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="pt-4 border-t border-slate-800">
          <p className="text-xs text-center text-slate-500">
            {a.footer}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
