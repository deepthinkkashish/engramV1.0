import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../services/supabase';
import { getOAuthAppOrigin, isPreviewEnv } from '../utils/authEnv';
import { initGuestClock } from '../utils/guestLimit';
import { Capacitor } from '@capacitor/core';

// Minimal User Shim to replace Firebase User interface
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  continueAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    // Check if user selected Guest Mode previously
    const storedGuest = localStorage.getItem('engram_is_guest');
    if (storedGuest === 'true') {
        setIsGuest(true);
        setLoading(false);
    }

    // Supabase Auth State Listener
    if (!supabase) {
        console.error("Supabase client is not initialized.");
        setLoading(false);
        return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        console.debug("[AUTH] onAuthStateChange event", _event, { 
            hasSession: !!session, 
            userId: session?.user?.id, 
            email: session?.user?.email 
        });
        
        if (session?.user) {
            // Adapt Supabase user to match local User interface
            const adaptedUser: User = {
                uid: session.user.id,
                email: session.user.email || null,
                displayName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
                photoURL: session.user.user_metadata?.avatar_url || null,
            };
            setUser(adaptedUser);
            setIsGuest(false);
            localStorage.removeItem('engram_is_guest');
        } else {
            setUser(null);
        }
        setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!supabase) return;
    
    // 1) PREVIEW ENVIRONMENT CHECK (CRITICAL FOR PKCE)
    if (isPreviewEnv()) {
        const prodTarget = "https://engram-space.vercel.app/#/login?startGoogle=1";
        console.debug("[AUTH] Preview environment detected. Redirecting to production to start valid PKCE flow:", prodTarget);
        (window.top || window).location.href = prodTarget;
        return;
    }

    // 2) Compute safe redirect URL
    // Defaulting to standard web URL for compatibility across all devices
    let redirectTo = `${getOAuthAppOrigin()}/auth/callback`;
    
    console.debug("[AUTH] signInWithOAuth start", { 
        redirectTo, 
        origin: window.location.origin, 
    });
    
    // 3) Use skipBrowserRedirect: true to manually handle the navigation (mainly for web control)
    const { data, error } = await supabase.auth.signInWithOAuth({ 
        provider: 'google',
        options: { 
            redirectTo,
            skipBrowserRedirect: true
        }
    });

    // 4) Log result
    console.debug("[AUTH] signInWithGoogle result", { hasUrl: !!data?.url, error });

    if (error) {
        alert("Login Error: " + error.message);
        return;
    }

    if (data?.url) {
        console.debug("[AUTH] Redirecting top window to:", data.url);
        // Force top window navigation
        (window.top || window).location.href = data.url;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
      if (!supabase) throw new Error("Auth service unavailable");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
      if (!supabase) throw new Error("Auth service unavailable");
      const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { data: { full_name: name } }
      });
      if (error) throw error;
  };

  const logout = async () => {
    console.debug("[AUTH] Logout requested");
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setIsGuest(false);
    localStorage.removeItem('engram_is_guest');
  };

  const continueAsGuest = () => {
      console.debug("[AUTH] Continuing as guest");
      initGuestClock();
      setIsGuest(true);
      localStorage.setItem('engram_is_guest', 'true');
  };

  return (
    <AuthContext.Provider value={{ user, loading, isGuest, signInWithGoogle, signInWithEmail, signUpWithEmail, logout, continueAsGuest }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};