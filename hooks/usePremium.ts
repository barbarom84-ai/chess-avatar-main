"use client";

import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface PremiumState {
  isPremium: boolean;
  loading: boolean;
  userId: string | null;
  email: string | null;
}

export function usePremium(): PremiumState {
  const [state, setState] = useState<PremiumState>({
    isPremium: false,
    loading: true,
    userId: null,
    email: null,
  });

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    let mounted = true;

    async function checkPremium() {
      try {
        const { data: { user } } = await supabase!.auth.getUser();

        if (!user) {
          if (mounted) setState({ isPremium: false, loading: false, userId: null, email: null });
          return;
        }

        const { data } = await supabase!
          .from('subscriptions')
          .select('plan, status')
          .eq('user_id', user.id)
          .single();

        const isPremium = data?.plan === 'premium' && data?.status === 'active';

        if (mounted) {
          setState({
            isPremium,
            loading: false,
            userId: user.id,
            email: user.email || null,
          });
        }
      } catch {
        if (mounted) {
          setState(prev => ({ ...prev, loading: false }));
        }
      }
    }

    checkPremium();

    // Listen for auth changes to re-check premium
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkPremium();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}

// Constants for free tier limits
export const FREE_PROFILE_LIMIT = 3;

// Free piece set IDs
export const FREE_PIECE_SETS = ['neon-cyan', 'classic', 'cburnett', 'merida', 'alpha', 'pirouetti'];

// Free board theme IDs
export const FREE_BOARD_THEMES = ['blue-ocean'];
