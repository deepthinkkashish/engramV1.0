
import React, { useState, useEffect, useMemo } from 'react';
import { RotateCw } from 'lucide-react'; 

import { Topic, DateTimeSettings, UserProfile, Habit, NotificationSettings } from './types';
import { AppRouter } from './components/AppRouter';

import { useAuth } from './context/AuthContext';
import { useStudyData } from './hooks/useStudyData';
import { usePodcast } from './hooks/usePodcast';
import { useFocus } from './context/FocusContext';
import { ProcessingProvider } from './context/ProcessingContext';
import { useNotifications } from './hooks/useNotifications';
import { deleteTopicBodyFromIDB, deleteAudioFromIDB } from './services/storage';
import { attachDevTools } from './utils/devTools';
import { AnalyticsService } from './services/analytics';
import { ProfileService } from './services/profile';

export const App: React.FC = () => {
    // [AUTH DIAGNOSIS] Boot Logs & Upload Diagnostics
    useEffect(() => {
        const url = new URL(window.location.href);
        const searchParams = Object.fromEntries(url.searchParams.entries());
        console.debug("================ AUTH DIAGNOSIS START ================");
        console.debug("[AUTH] boot location.href", window.location.href);
        console.debug("[AUTH] boot search params", searchParams);
        console.debug("[AUTH] boot hash", window.location.hash);
        if (searchParams.code) console.debug("[AUTH] OAuth Code detected!");
        if (searchParams.error) console.error("[AUTH] OAuth Error detected:", searchParams.error, searchParams.error_description);
        console.debug("======================================================");

        // DEV: Upload Refresh Diagnosis
        window.addEventListener("beforeunload", e => console.debug("[UPLOAD] beforeunload fired"));
        window.addEventListener("pageshow", e => console.debug("[UPLOAD] pageshow", { persisted: e.persisted }));
        document.addEventListener("visibilitychange", () => console.debug("[UPLOAD] visibilitychange", document.visibilityState));
        // Removed unsafe 'submit' listener that caused circular structure errors
    }, []);

    // App State
    const { user, isGuest, loading: authLoading, logout: authLogout, continueAsGuest } = useAuth();
    
    // Derived userId: Use Supabase UID if logged in, otherwise local fallback
    const [userId, setUserId] = useState<string>(() => {
        return localStorage.getItem('engramCurrentUserId') || 'local-user-' + Math.floor(Math.random() * 100000);
    });

    // Profile Management State (Local)
    const [profiles, setProfiles] = useState<{id: string, name: string, avatar: string | null}[]>(() => {
        try {
            const stored = localStorage.getItem('engramProfiles');
            return stored ? JSON.parse(stored) : [];
        } catch { return []; }
    });

    // User Specific Data (Habits & Profile)
    const [userProfile, setUserProfile] = useState<UserProfile>({ 
        name: user?.displayName || user?.email?.split('@')[0] || 'Guest User', 
        avatar: user?.photoURL || null 
    });

    // Profile Gate State
    const [isOnboarded, setIsOnboarded] = useState(false);
    const [checkingProfile, setCheckingProfile] = useState(false);

    // Sync User ID and Check Profile (Onboarding Gate)
    // FIX: Optimized to prevent re-triggering blocking state when user object refreshes but ID is stable
    useEffect(() => {
        if (authLoading) return;

        if (user && !isGuest) {
            // Case 1: ID Changed (Login or Account Switch) -> Blocking Check
            if (user.uid !== userId) {
                console.debug("[APP] User ID changed. Syncing profile...", { old: userId, new: user.uid });
                setUserId(user.uid);
                setCheckingProfile(true);
                
                ProfileService.getCurrentProfile().then(profile => {
                    if (profile) {
                        setIsOnboarded(true);
                        setUserProfile({
                            name: profile.full_name,
                            avatar: profile.avatar_url || user.photoURL,
                            username: profile.username
                        });
                    } else {
                        setIsOnboarded(false);
                    }
                    setCheckingProfile(false);
                });
            } 
            // Case 2: ID Stable but not onboarded (Silent Check)
            // We do NOT block UI here to ensure file uploads don't get interrupted by background sync
            else if (!isOnboarded && !checkingProfile) {
                console.debug("[APP] Silent profile check for existing user...");
                ProfileService.getCurrentProfile().then(profile => {
                    if (profile) {
                        setIsOnboarded(true);
                        setUserProfile({
                            name: profile.full_name,
                            avatar: profile.avatar_url || user.photoURL,
                            username: profile.username
                        });
                    }
                });
            }
        } else if (isGuest) {
            // Guest mode logic
            const storedId = localStorage.getItem('engramCurrentUserId');
            if (!storedId || !storedId.startsWith('local-')) {
                const newId = 'local-user-' + Math.floor(Math.random() * 100000);
                setUserId(newId);
            }
            setIsOnboarded(true); // Guests bypass Supabase onboarding
            setCheckingProfile(false);
        } else {
            // Logged out
            setIsOnboarded(false);
            setCheckingProfile(false);
        }
    }, [user, isGuest, authLoading]); // userId dependency omitted intentionally to use current closure value comparison

    // Core Data Hooks - Pass userId to scope data
    const { 
        studyLog, 
        userSubjects, 
        loadingData, 
        handleUpdateTopic, 
        handleAddTopic: addTopicLogic, 
        handleAddSubject, 
        handleUpdateSubject,
        handleDeleteSubject,
        importStudyLog
    } = useStudyData(userId);
    
    // Attach Dev Tools & Analytics Migration
    useEffect(() => {
        const enableDevtools = 
            window.location.protocol === 'blob:' ||
            window.location.hostname === 'localhost' ||
            localStorage.getItem('ENGRAM_DEVTOOLS') === '1';

        if (enableDevtools && userId) {
            attachDevTools(userId, () => window.location.reload());
        }

        if (!loadingData && userId && studyLog.length > 0) {
            const agg = AnalyticsService.getAggregates(userId);
            if (!agg || agg.version !== 1) {
                AnalyticsService.rebuild(userId, studyLog);
            }
        }
    }, [userId, loadingData, studyLog]);
    
    // Focus Context
    const focusState = useFocus();

    // Global UI Settings
    const [currentTheme, setCurrentTheme] = useState<string>('amber'); 
    const [themeIntensity, setThemeIntensity] = useState<string>('50');
    const [appMode, setAppMode] = useState<string>('light'); 
    
    const [podcastConfig, setPodcastConfig] = useState<{ language: 'English' | 'Hinglish' }>({ language: 'English' });
    
    // Global Podcast State
    const podcast = usePodcast(podcastConfig.language);

    const [permissionsGranted, setPermissionsGranted] = useState<boolean>(() => {
        try {
            return localStorage.getItem('engramPermissionsGranted') === 'true';
        } catch { return false; }
    });

    const [enabledTabs, setEnabledTabs] = useState<string[]>(['home', 'subjects']);
    const [dateTimeSettings, setDateTimeSettings] = useState<DateTimeSettings>({
        timeFormat: 'system',
        startDayOfWeek: 'sunday',
        additionalCalendar: 'none',
        showWeekNumbers: false,
        week1Definition: 'default',
        countdownMode: false,
    });
    const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
        enabled: true,
        reminderTime: '09:00'
    });
    const [habits, setHabits] = useState<Habit[]>([]);
    
    useNotifications(studyLog, notificationSettings);
    
    // --- Global Stats Calculation (Streak & Badges) ---
    const currentStreak = useMemo(() => {
        const activityDates = new Set<string>();
        studyLog.forEach(topic => {
            if (topic.createdAt) activityDates.add(topic.createdAt.split('T')[0]);
            topic.repetitions?.forEach(rep => activityDates.add(rep.dateCompleted));
            topic.focusLogs?.forEach(log => activityDates.add(log.date));
        });

        const sortedDates = Array.from(activityDates).sort();
        if (sortedDates.length === 0) return 0;

        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        const lastActive = sortedDates[sortedDates.length - 1];
        if (lastActive !== today && lastActive !== yesterday) return 0;

        let streak = 1;
        let currentDateStr = lastActive;

        for (let i = sortedDates.length - 2; i >= 0; i--) {
            const prevDateStr = sortedDates[i];
            const d = new Date(currentDateStr);
            d.setDate(d.getDate() - 1);
            const expectedPrevStr = d.toISOString().split('T')[0];

            if (prevDateStr === expectedPrevStr) {
                streak++;
                currentDateStr = prevDateStr;
            } else {
                break;
            }
        }
        return streak;
    }, [studyLog]);

    const earnedBadges = useMemo(() => {
        const allBadges = [];
        if (currentStreak >= 3) allBadges.push({ id: 's1' });
        if (currentStreak >= 7) allBadges.push({ id: 's2' });
        if (currentStreak >= 21) allBadges.push({ id: 's3' });
        if (currentStreak >= 100) allBadges.push({ id: 's4' });

        const topicCount = studyLog.length;
        if (topicCount >= 1) allBadges.push({ id: 't1' });
        if (topicCount >= 10) allBadges.push({ id: 't2' });
        if (topicCount >= 50) allBadges.push({ id: 't3' });

        const totalMinutes = studyLog.reduce((acc, t) => acc + (t.pomodoroTimeMinutes || 0), 0);
        if (totalMinutes >= 60) allBadges.push({ id: 'f1' });
        if (totalMinutes >= 300) allBadges.push({ id: 'f2' });
        if (totalMinutes >= 1000) allBadges.push({ id: 'f3' });

        let perfectScores = 0;
        let totalReps = 0;
        studyLog.forEach(t => {
            t.repetitions?.forEach(r => {
                totalReps++;
                if (r.score === 10) perfectScores++;
            });
        });

        if (perfectScores >= 1) allBadges.push({ id: 'm1' });
        if (perfectScores >= 5) allBadges.push({ id: 'm2' });
        if (perfectScores >= 25) allBadges.push({ id: 'm3' });

        if (totalReps >= 10) allBadges.push({ id: 'r1' });
        if (totalReps >= 50) allBadges.push({ id: 'r2' });
        if (totalReps >= 200) allBadges.push({ id: 'r3' });

        return allBadges;
    }, [studyLog, currentStreak]);

    // Save active user ID whenever it changes
    useEffect(() => {
        localStorage.setItem('engramCurrentUserId', userId);
    }, [userId]);

    useEffect(() => {
        localStorage.setItem('engramProfiles', JSON.stringify(profiles));
    }, [profiles]);

    const handleLoginComplete = (guestName: string, guestAvatar: string | null) => {
        // Trigger AuthContext to switch to Guest mode
        continueAsGuest();

        const trimmedName = guestName.trim();
        if (!trimmedName) return;

        // 1. Same user re-login check (Local)
        if (userProfile && userProfile.name && userProfile.name.toLowerCase() === trimmedName.toLowerCase()) {
            const updatedProfile = { ...userProfile, avatar: guestAvatar || userProfile.avatar };
            setUserProfile(updatedProfile);
            setProfiles(prev => {
                const exists = prev.some(p => p.id === userId);
                if (exists) {
                    return prev.map(p => p.id === userId ? { ...p, avatar: guestAvatar || p.avatar } : p);
                }
                return [...prev, { id: userId, name: trimmedName, avatar: guestAvatar || userProfile.avatar }];
            });
            setIsOnboarded(true);
            return;
        }

        // 2. Existing profile switch? (Local)
        const existingProfile = profiles.find(p => p.name.toLowerCase() === trimmedName.toLowerCase());
        if (existingProfile) {
            setUserId(existingProfile.id);
            setIsOnboarded(true);
            return;
        }

        // 3. New User (Local)
        const newId = 'local-user-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        setUserId(newId);
        // Reset UI state immediately
        setUserProfile({ name: trimmedName, avatar: guestAvatar });
        setHabits([]); 
        // Add to profiles
        setProfiles(prev => [...prev, { id: newId, name: trimmedName, avatar: guestAvatar }]);
        
        setIsOnboarded(true);
    };

    const handleOnboardingComplete = (profile: any) => {
        setUserProfile({
            name: profile.full_name,
            avatar: profile.avatar_url || user?.photoURL,
            username: profile.username
        });
        setIsOnboarded(true);
    };

    const handleSwitchProfile = (id: string) => {
        const target = profiles.find(p => p.id === id);
        if (target) {
            setUserId(target.id);
        }
    };

    const handleAddProfile = () => {
        // Triggered by profile switcher, just logs out to allow new login/guest flow
        handleSignOut();
    };

    const handleAllowPermissions = async () => {
        if (navigator.storage && navigator.storage.persist) {
            try { await navigator.storage.persist(); } catch (e) {}
        }
        
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment' } 
                });
                stream.getTracks().forEach(track => track.stop());
            } catch (e) {
                console.warn("Camera permission denied", e);
            }
        }

        localStorage.setItem('engramPermissionsGranted', 'true');
        setPermissionsGranted(true);
    };
    
    useEffect(() => {
        if (!user && !isGuest) {
            podcast.controls.reset();
        }
    }, [user, isGuest]);

    // Initial Load Settings
    useEffect(() => {
        try {
            const storedTheme = localStorage.getItem('engramTheme');
            const storedIntensity = localStorage.getItem('engramThemeIntensity');
            const storedAppMode = localStorage.getItem('engramAppMode');
            const storedTabs = localStorage.getItem('engramTabs');
            const storedDateTime = localStorage.getItem('engramDateTime');
            const storedNotifications = localStorage.getItem('engramNotifications');
            
            const storedProfile = localStorage.getItem(`engramProfile_${userId}`);
            const storedHabits = localStorage.getItem(`engramHabits_${userId}`);
            
            if (storedTheme) setCurrentTheme(storedTheme);
            if (storedIntensity) setThemeIntensity(storedIntensity);
            if (storedAppMode) setAppMode(storedAppMode);
            if (storedTabs) setEnabledTabs(JSON.parse(storedTabs).filter((t: string) => t !== 'settings'));
            if (storedDateTime) setDateTimeSettings(JSON.parse(storedDateTime));
            if (storedNotifications) setNotificationSettings(JSON.parse(storedNotifications));
            
            // Only load local profile if not using Supabase profile
            if (!user && storedProfile) {
                const parsedProfile = JSON.parse(storedProfile);
                setUserProfile(parsedProfile);
            } else if (!user && !storedProfile) {
                const existing = profiles.find(p => p.id === userId);
                if (existing) setUserProfile({ name: existing.name, avatar: existing.avatar });
            }

            if (storedHabits) {
                setHabits(JSON.parse(storedHabits));
            } else {
                setHabits([]);
            }

        } catch (e) {
            console.error("Failed to load settings", e);
        }
    }, [userId, user]); 

    // Persistence Effects
    useEffect(() => { localStorage.setItem('engramTheme', currentTheme); }, [currentTheme]);
    useEffect(() => { localStorage.setItem('engramThemeIntensity', themeIntensity); }, [themeIntensity]);
    useEffect(() => { localStorage.setItem('engramAppMode', appMode); }, [appMode]);
    useEffect(() => { localStorage.setItem('engramTabs', JSON.stringify(enabledTabs)); }, [enabledTabs]);
    useEffect(() => { localStorage.setItem('engramDateTime', JSON.stringify(dateTimeSettings)); }, [dateTimeSettings]);
    useEffect(() => { localStorage.setItem('engramNotifications', JSON.stringify(notificationSettings)); }, [notificationSettings]);
    
    useEffect(() => { if(!loadingData) localStorage.setItem(`engramProfile_${userId}`, JSON.stringify(userProfile)); }, [userProfile, loadingData, userId]);
    useEffect(() => { if(!loadingData) localStorage.setItem(`engramHabits_${userId}`, JSON.stringify(habits)); }, [habits, loadingData, userId]);

    const handleSignOut = async () => {
        // Guest Cleanup Logic
        if (isGuest && userId.startsWith('local-user-')) {
            try {
                // 1. Identify data
                const dataKey = `engramData_${userId}`;
                const storedData = localStorage.getItem(dataKey);
                if (storedData) {
                    const topics: Topic[] = JSON.parse(storedData);
                    // 2. Clean IDB
                    for (const t of topics) {
                        await deleteTopicBodyFromIDB(userId, t.id);
                        if (t.hasSavedAudio) {
                            await deleteAudioFromIDB(t.id);
                        }
                    }
                }

                // 3. Clean LocalStorage
                const keysToRemove = [
                    `engramData_${userId}`,
                    `engramSubjects_${userId}`,
                    `engramProfile_${userId}`,
                    `engramHabits_${userId}`,
                    `engramCalendarAgg_${userId}`,
                    `engram-flashcard-history_${userId}`,
                    `engram_migration_v2_complete_${userId}`
                ];
                keysToRemove.forEach(k => localStorage.removeItem(k));

                // 4. Remove from profiles list
                const updatedProfiles = profiles.filter(p => p.id !== userId);
                setProfiles(updatedProfiles); 
                localStorage.setItem('engramProfiles', JSON.stringify(updatedProfiles));
            
            } catch (e) {
                console.error("Guest cleanup failed", e);
            }
        }

        localStorage.removeItem('engramHasLoggedIn');
        if (user) await authLogout();
        if (isGuest) await authLogout(); 
        
        setIsOnboarded(false);
        setCheckingProfile(false);
        podcast.controls.reset();
        
        // Reset userId
        setUserId('local-user-' + Math.floor(Math.random() * 100000));
    };

    if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900"><RotateCw size={32} className={`animate-spin text-${currentTheme}-600`} /></div>;

    return (
        <ProcessingProvider>
            <AppRouter 
                // Auth & User
                user={user}
                isGuest={isGuest}
                userId={userId}
                authLoading={authLoading}
                userProfile={userProfile}
                setUserProfile={setUserProfile}
                isOnboarded={isOnboarded}
                setIsOnboarded={setIsOnboarded}
                checkingProfile={checkingProfile}
                profiles={profiles}
                onLoginComplete={handleLoginComplete}
                onOnboardingComplete={handleOnboardingComplete}
                onSignOut={handleSignOut}
                onSwitchProfile={handleSwitchProfile}
                onAddProfile={handleAddProfile}

                // Data & Logic
                studyLog={studyLog}
                userSubjects={userSubjects}
                loadingData={loadingData}
                habits={habits}
                setHabits={setHabits}
                handleUpdateTopic={handleUpdateTopic}
                handleAddTopic={addTopicLogic}
                handleAddSubject={handleAddSubject}
                handleUpdateSubject={handleUpdateSubject}
                handleDeleteSubject={handleDeleteSubject}
                importStudyLog={importStudyLog}
                
                // Stats
                earnedBadges={earnedBadges}
                currentStreak={currentStreak}

                // Settings
                dateTimeSettings={dateTimeSettings}
                setDateTimeSettings={setDateTimeSettings}
                notificationSettings={notificationSettings}
                setNotificationSettings={setNotificationSettings}
                currentTheme={currentTheme}
                setCurrentTheme={setCurrentTheme}
                themeIntensity={themeIntensity}
                setThemeIntensity={setThemeIntensity}
                appMode={appMode}
                setAppMode={setAppMode}
                enabledTabs={enabledTabs}
                setEnabledTabs={setEnabledTabs}
                permissionsGranted={permissionsGranted}
                handleAllowPermissions={handleAllowPermissions}

                // Podcast & Focus
                podcastConfig={podcastConfig}
                setPodcastConfig={setPodcastConfig}
                podcast={podcast}
                focusState={focusState}
            />
        </ProcessingProvider>
    );
};
