
import React, { useEffect, useRef, useState } from 'react';
import { RotateCw, AlertTriangle, ArrowLeft } from 'lucide-react';
import { supabase } from '../services/supabase';
import { routeAfterAuth } from '../auth/routeAfterAuth';
import { UserProfile } from '../types';

interface AuthCallbackViewProps {
    navigateTo: (view: string) => void;
    setUserProfile: (profile: UserProfile) => void;
    setIsOnboarded: (isOnboarded: boolean) => void;
    themeColor: string;
}

export const AuthCallbackView: React.FC<AuthCallbackViewProps> = ({ 
    navigateTo, 
    setUserProfile, 
    setIsOnboarded, 
    themeColor 
}) => {
    const hasCalled = useRef(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isLongWait, setIsLongWait] = useState(false);

    useEffect(() => {
        if (hasCalled.current) return;
        hasCalled.current = true;

        const handleCallback = async () => {
            console.debug("[CALLBACK] mounted", { href: window.location.href });
            
            // Safe timeout to prevent infinite spinner
            const timeoutId = setTimeout(() => {
                setIsLongWait(true);
            }, 8000);

            try {
                const url = new URL(window.location.href);
                const searchParams = url.searchParams;
                
                // 1. Extract Params from Query String (PKCE Standard)
                let code = searchParams.get('code');
                let error = searchParams.get('error');
                let errorDescription = searchParams.get('error_description');
                let type = searchParams.get('type');

                // Fallback: Check Hash if missing in query (Implicit Flow or Legacy)
                if (!code && !error && url.hash.includes('?')) {
                    const hashParams = new URLSearchParams(url.hash.split('?')[1]);
                    code = hashParams.get('code');
                    error = hashParams.get('error');
                    errorDescription = hashParams.get('error_description');
                    if (!type) type = hashParams.get('type');
                }

                console.debug("[CALLBACK] exchange start", { hasCode: !!code, type, error });

                // 2. Handle Explicit Errors from Provider
                if (error) {
                    throw new Error(errorDescription || error || "Authentication failed.");
                }

                // 3. Handle Code Exchange
                if (code) {
                    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                    
                    if (exchangeError) {
                        throw exchangeError;
                    }

                    if (data.session) {
                        console.debug("[CALLBACK] session ok, routing", { type, target: "#/home" });
                        
                        // 4. Clean URL
                        const cleanUrl = new URL(window.location.href);
                        ['code', 'error', 'error_description', 'type'].forEach(p => cleanUrl.searchParams.delete(p));
                        if (cleanUrl.hash.includes('?')) cleanUrl.hash = cleanUrl.hash.split('?')[0];
                        window.history.replaceState({}, document.title, cleanUrl.toString());

                        // 5. Route based on Type
                        // ✅ Recovery routing with safe fallbacks
                        const currentHash = window.location.hash;

                        if (type === 'recovery') {
                          console.debug("[CALLBACK] recovery → resetPassword (type param)");
                          navigateTo('resetPassword');
                        } else if (currentHash === '#/resetPassword') {
                          console.debug("[CALLBACK] recovery → resetPassword (hash fallback)");
                          navigateTo('resetPassword');
                        } else {
                          console.debug("[CALLBACK] login → routeAfterAuth");
                          await routeAfterAuth(data.session, { navigateTo, setUserProfile, setIsOnboarded });
                        }
                        return; // Success exit
                    } else {
                        throw new Error("Session creation failed. Please try logging in again.");
                    }
                } 
                
                // 6. Fallback: Check for Existing Session
                console.debug("[CALLBACK] no code, checking active session...");
                const { data: { session } } = await supabase.auth.getSession();
                
                if (session) {
                    console.debug("[CALLBACK] active session found. routing.");
                    await routeAfterAuth(session, { navigateTo, setUserProfile, setIsOnboarded });
                } else {
                    console.warn("[CALLBACK] no session found. defaulting to home.");
                    navigateTo('home'); 
                }

            } catch (err: any) {
                console.error("[CALLBACK] exchange fail", { name: err?.name, message: err?.message });
                setErrorMsg(err.message || "An unexpected error occurred.");
            } finally {
                clearTimeout(timeoutId);
            }
        };

        handleCallback();
    }, [navigateTo, setUserProfile, setIsOnboarded]);

    if (errorMsg) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-6 text-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-red-500">
                    <AlertTriangle size={32} />
                </div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Sign In Failed</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mb-6">
                    {errorMsg}
                </p>
                <button 
                    onClick={() => navigateTo('home')}
                    className={`flex items-center px-6 py-3 bg-${themeColor}-600 text-white rounded-xl font-bold shadow-md hover:bg-${themeColor}-700 transition`}
                >
                    <ArrowLeft size={20} className="mr-2" /> Return to Login
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 text-center">
            <RotateCw size={48} className={`animate-spin text-${themeColor}-600 mb-6`} />
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Verifying credentials...</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm max-w-xs">
                Securely connecting you to Engram.
            </p>
            {isLongWait && (
                <div className="mt-8 animate-in fade-in">
                    <p className="text-xs text-orange-500 mb-3">Taking longer than usual...</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="text-sm font-bold text-gray-600 dark:text-gray-300 underline hover:text-gray-900 dark:hover:text-white"
                    >
                        Retry
                    </button>
                </div>
            )}
        </div>
    );
};
