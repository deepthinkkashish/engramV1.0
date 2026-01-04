
import React, { useState, useEffect, useRef } from 'react';
import { LogIn, ChevronRight, Plus, Camera, Mail, Lock, User, ArrowLeft, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { getOAuthAppOrigin } from '../utils/authEnv';
import { EngramLogo } from '../components/EngramLogo';

interface LoginViewProps {
    onComplete: (name: string, avatar: string | null) => void;
    onSignInSuccess?: () => void; // New callback for email sign in
}

export const LoginView: React.FC<LoginViewProps> = ({ onComplete, onSignInSuccess }) => {
    const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
    
    const [step, setStep] = useState<'intro' | 'auth' | 'guest-setup'>('intro');
    const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
    
    // Auth Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authName, setAuthName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Guest Profile State
    const [name, setName] = useState('');
    const [avatar, setAvatar] = useState<string | null>(null);
    
    const autoAuthAttempted = useRef(false);

    const handleGoogleSignIn = async () => {
        try {
            await signInWithGoogle();
        } catch (err) {
            // Error handled in context
        }
    };

    // Auto-trigger Google Auth if redirected from Preview
    useEffect(() => {
        if (autoAuthAttempted.current) return;
        
        // Check hash or search for 'startGoogle=1'
        const rawUrl = window.location.href;
        
        if (rawUrl.includes('startGoogle=1')) {
            console.debug("[LOGIN] Detected startGoogle signal. Auto-starting flow...");
            autoAuthAttempted.current = true;
            
            // Clean URL to prevent loops or messy history
            const cleanUrl = rawUrl.replace(/[?&]startGoogle=1/, '');
            window.history.replaceState({}, document.title, cleanUrl);
            
            // Start Flow
            handleGoogleSignIn();
        }
    }, []);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setAvatar(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) {
            setError("Please enter your email.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        // FIX: Use origin only. Do NOT append hash path.
        // This ensures Supabase returns to https://app.com/?code=... (query param)
        // The AppRouter will detect ?code= and route to #/auth/callback.
        const appOrigin = getOAuthAppOrigin();
        const redirectTo = `${appOrigin}?type=recovery#/resetPassword`;
        console.debug("[AUTH][RESET] redirectTo =", redirectTo);

        console.debug("[RECOVERY] resetPasswordForEmail", { email, redirectTo });

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo
            });
            
            console.debug("[AUTH] forgotPassword result", { error: error?.message ?? null });

            if (error) throw error;
            
            setSuccessMessage("If this email exists, a reset link has been sent.");
        } catch (err: any) {
            // Generic message for security, unless rate limited
            if (err.message?.includes("rate limit")) {
                setError("Too many requests. Please wait for a while.");
            } else {
                setSuccessMessage("If this email exists, a reset link has been sent.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleAuthSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setIsLoading(true);

        try {
            if (authMode === 'signup') {
                if (!authName.trim()) throw new Error("Name is required.");
                await signUpWithEmail(email, password, authName);
                
                // If we reach here, signup started successfully (verification might be needed)
                setSuccessMessage("Account created! Please check your email to verify.");
                // Switch to signin view so they can login after verification
                setAuthMode('signin');
            } else {
                await signInWithEmail(email, password);
                if (onSignInSuccess) onSignInSuccess();
            }
        } catch (err: any) {
            console.error(err);
            let msg = "Authentication failed.";
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') msg = "Invalid email or password.";
            else if (err.code === 'auth/email-already-in-use') msg = "Email already in use.";
            else if (err.code === 'auth/weak-password') msg = "Password should be at least 6 characters.";
            else if (err.message) msg = err.message;
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    if (step === 'intro') {
        return (
            <div className="flex flex-col h-full bg-white dark:bg-gray-900 p-6 items-center justify-center text-center animate-in fade-in duration-500">
                <div className="mt-4 mb-12 relative group">
                    {/* Ambient Glow */}
                    <div className="absolute -inset-0.5 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-[2.75rem] blur-2xl opacity-60 group-hover:opacity-100 transition duration-1000"></div>
                    
                    {/* Premium Frame */}
                    <div className="relative
                        mx-auto
                        w-[270px] h-[270px] sm:w-[310px] sm:h-[310px]
                        rounded-[2.5rem]
                        bg-white dark:bg-gray-800
                        border border-gray-100 dark:border-gray-700/50
                        shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)] dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.4)]
                        flex items-center justify-center
                        transform transition duration-500 group-hover:scale-[1.01] group-hover:-translate-y-1
                    ">
                        <EngramLogo 
                            size={1024} 
                            className="!w-64 !h-64 sm:!w-72 sm:!h-72 object-contain rounded-[1.75rem]" 
                        />
                    </div>
                </div>
                
                <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-3 tracking-wide">ENGRAM</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-10 text-lg leading-relaxed max-w-sm mx-auto font-medium">
                    Make neurons happier with spaced repetition. Capture notes, generate quizzes, and master your studies with AI.
                </p>

                <div className="w-full max-w-sm space-y-4">
                    <button 
                        onClick={() => setStep('auth')}
                        className="w-full py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold flex items-center justify-center shadow-lg hover:scale-[1.02] transition"
                    >
                        <LogIn size={20} className="mr-2" />
                        Sign In / Sign Up
                    </button>
                    
                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-200 dark:border-gray-700"></span></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-gray-900 px-2 text-gray-400">Or</span></div>
                    </div>

                    <button 
                        onClick={() => setStep('guest-setup')}
                        className="w-full py-3.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                    >
                        Continue as Guest
                    </button>
                </div>
                
                <p className="text-xs text-gray-400 mt-8">
                    By continuing, you agree to our <span className="underline cursor-pointer">Terms</span> & <span className="underline cursor-pointer">Privacy Policy</span>.
                </p>
            </div>
        );
    }

    if (step === 'auth') {
        return (
            <div className="flex flex-col h-full bg-white dark:bg-gray-900 p-6 items-center justify-center animate-in fade-in slide-in-from-right-10 duration-500 relative">
                <button onClick={() => setStep('intro')} className="absolute top-6 left-6 p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                    <ArrowLeft size={24} />
                </button>

                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {authMode === 'signin' ? 'Welcome Back' : authMode === 'signup' ? 'Create Account' : 'Reset Password'}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm text-center">
                    {authMode === 'signin' ? 'Enter your credentials to access your account.' 
                        : authMode === 'signup' ? 'Sign up to start your learning journey.' 
                        : 'Enter your email to receive a password reset link.'}
                </p>

                {authMode === 'forgot' ? (
                    <form onSubmit={handleResetPassword} className="w-full max-w-sm space-y-4">
                        <div className="relative">
                            <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="email"
                                placeholder="Email Address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition text-gray-900 dark:text-white"
                                required
                            />
                        </div>

                        {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl font-medium text-center">{error}</div>}
                        {successMessage && <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm rounded-xl font-medium text-center">{successMessage}</div>}

                        <button 
                            type="submit"
                            disabled={isLoading || !!successMessage}
                            className="w-full py-3.5 bg-amber-600 text-white rounded-2xl font-bold shadow-lg hover:bg-amber-700 transition transform active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {isLoading ? 'Sending...' : <><Send size={18} className="mr-2"/> Send Reset Link</>}
                        </button>

                        <button 
                            type="button"
                            onClick={() => { 
                                setAuthMode('signin'); 
                                setError(null); 
                                setSuccessMessage(null);
                                setIsLoading(false);
                            }}
                            className="w-full py-2 text-gray-500 dark:text-gray-400 text-sm font-bold hover:text-gray-700 dark:hover:text-gray-200"
                        >
                            Back to Sign In
                        </button>
                    </form>
                ) : (
                    <>
                        <form onSubmit={handleAuthSubmit} className="w-full max-w-sm space-y-4">
                            {authMode === 'signup' && (
                                <div className="relative">
                                    <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input 
                                        type="text"
                                        placeholder="Full Name"
                                        value={authName}
                                        onChange={(e) => setAuthName(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition text-gray-900 dark:text-white"
                                        required
                                    />
                                </div>
                            )}
                            
                            <div className="relative">
                                <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="email"
                                    placeholder="Email Address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition text-gray-900 dark:text-white"
                                    required
                                />
                            </div>

                            <div className="relative">
                                <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition text-gray-900 dark:text-white"
                                    required
                                />
                            </div>

                            {authMode === 'signin' && (
                                <div className="flex justify-end">
                                    <button 
                                        type="button"
                                        onClick={() => { 
                                            setAuthMode('forgot'); 
                                            setError(null); 
                                            setIsLoading(false);
                                        }}
                                        className="text-xs text-amber-600 dark:text-amber-400 font-bold hover:underline"
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                            )}

                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl font-medium text-center">
                                    {error}
                                </div>
                            )}
                            {successMessage && (
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm rounded-xl font-medium text-center">
                                    {successMessage}
                                </div>
                            )}

                            <button 
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3.5 bg-amber-600 text-white rounded-2xl font-bold shadow-lg hover:bg-amber-700 transition transform active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {isLoading 
                                    ? (authMode === 'signup' ? 'Confirm Your Signup' : 'Processing...') 
                                    : (authMode === 'signin' ? 'Sign In' : 'Sign Up')
                                }
                            </button>
                        </form>

                        <div className="relative w-full max-w-sm py-6">
                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-200 dark:border-gray-700"></span></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-gray-900 px-2 text-gray-400">Or continue with</span></div>
                        </div>

                        <button 
                            onClick={handleGoogleSignIn}
                            className="w-full max-w-sm py-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-2xl font-bold flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                        >
                            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                            Google
                        </button>

                        <div className="mt-8 flex items-center text-sm">
                            <span className="text-gray-500 dark:text-gray-400">
                                {authMode === 'signin' ? "Don't have an account?" : "Already have an account?"}
                            </span>
                            <button 
                                onClick={() => {
                                    setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                                    setError(null);
                                    setSuccessMessage(null);
                                    setIsLoading(false);
                                }}
                                className="ml-2 font-bold text-amber-600 dark:text-amber-400 hover:underline"
                            >
                                {authMode === 'signin' ? 'Sign Up' : 'Sign In'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 p-6 items-center justify-center text-center animate-in fade-in slide-in-from-right-10 duration-500">
            <div className="mb-8 relative group cursor-pointer">
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white dark:border-gray-800 shadow-xl bg-gray-100 dark:bg-gray-800 relative">
                    {avatar ? (
                        <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-800">
                             <Camera size={32} />
                        </div>
                    )}
                </div>
                <div className="absolute bottom-0 right-0 bg-amber-500 text-white p-2 rounded-full shadow-md border-2 border-white dark:border-gray-900">
                     <Plus size={16} strokeWidth={3} />
                </div>
                <input 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={handleAvatarChange} 
                />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Create Guest Profile</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm max-w-xs mx-auto">
                Set up your guest profile. This data stays on your device.
            </p>

            <div className="w-full max-w-sm space-y-4">
                <input 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-900 outline-none transition text-center font-semibold text-lg text-gray-900 dark:text-white placeholder-gray-400"
                    autoFocus
                />

                <button 
                    onClick={() => onComplete(name, avatar)}
                    disabled={!name.trim()}
                    className="w-full py-3.5 bg-amber-600 text-white rounded-2xl font-bold shadow-lg hover:bg-amber-700 transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    Get Started <ChevronRight size={20} className="ml-1" />
                </button>

                <button 
                    onClick={() => setStep('intro')}
                    className="py-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm font-medium transition"
                >
                    Go Back
                </button>
            </div>
        </div>
    );
};
