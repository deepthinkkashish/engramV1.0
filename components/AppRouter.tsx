
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavStack } from '../utils/navStack';
import { SPACING_INTERVALS } from '../constants';
import { supabase } from '../services/supabase';
import { AppShell } from './AppShell';
import { Topic, Subject, UserProfile, Habit, DateTimeSettings, NotificationSettings } from '../types';
import { AnalyticsService } from '../services/analytics';
import { batchGetTopicBodies, batchGetImages, batchSaveTopicBodies, batchSaveImages } from '../services/storage';

// Views
import { LoginView } from '../views/LoginView';
import { OnboardingView } from '../views/OnboardingView';
import { AuthCallbackView } from '../views/AuthCallbackView';
import { HomeView } from '../views/HomeView';
import { SubjectsView } from '../views/SubjectsView';
import { TopicDetailView } from '../views/TopicDetailView';
import { QuizView } from '../views/QuizView';
import { QuizReview } from '../views/QuizReview';
import { ChatView } from '../views/ChatView';
import { SettingsView } from '../views/SettingsView';
import { TopicListView } from '../views/TopicListView';
import { ResetPasswordView } from '../views/ResetPasswordView';
import { TabBarConfigView } from '../views/TabBarConfigView';
import { AppearanceView } from '../views/AppearanceView';
import { DateTimeSettingsView } from '../views/DateTimeSettingsView';
import { SoundsNotificationsView } from '../views/SoundsNotificationsView';
import { WidgetsView } from '../views/WidgetsView';
import { PodcastSettingsView, PodcastFullView } from '../views/PodcastView';
import { AboutView } from '../views/AboutView';
import { TermsView, PrivacyView, LicensesView } from '../views/LegalViews';
import { CalendarView, TaskView, EisenhowerMatrixView, PomodoroFullView, HabitTrackerView, SearchView } from '../views/ExtraViews';
import { ProfileView } from '../views/ProfileView';
import { AiFeaturesView } from '../views/AiFeaturesView';

interface AppRouterProps {
    user: any;
    isGuest: boolean;
    userId: string;
    authLoading: boolean;
    userProfile: UserProfile;
    setUserProfile: (profile: UserProfile) => void;
    isOnboarded: boolean;
    setIsOnboarded: (isOnboarded: boolean) => void;
    checkingProfile: boolean;
    profiles: any[];
    onLoginComplete: (name: string, avatar: string | null) => void;
    onOnboardingComplete: (profile: any) => void;
    onSignOut: () => void;
    onSwitchProfile: (id: string) => void;
    onAddProfile: () => void;

    studyLog: Topic[];
    userSubjects: Subject[];
    loadingData: boolean;
    habits: Habit[];
    setHabits: (habits: Habit[]) => void;
    handleUpdateTopic: (topic: Topic) => void;
    handleAddTopic: (topic: Omit<Topic, 'id'>) => void;
    handleAddSubject: (subject: Subject) => void;
    handleUpdateSubject: (subject: Subject) => void;
    handleDeleteSubject: (id: string) => void;
    importStudyLog: (data: Topic[]) => void;

    earnedBadges: any[];
    currentStreak: number;

    dateTimeSettings: DateTimeSettings;
    setDateTimeSettings: (settings: DateTimeSettings) => void;
    notificationSettings: NotificationSettings;
    setNotificationSettings: (settings: NotificationSettings) => void;
    currentTheme: string;
    setCurrentTheme: (theme: string) => void;
    themeIntensity: string;
    setThemeIntensity: (intensity: string) => void;
    appMode: string;
    setAppMode: (mode: string) => void;
    enabledTabs: string[];
    setEnabledTabs: (tabs: string[]) => void;
    permissionsGranted: boolean;
    handleAllowPermissions: () => void;

    podcastConfig: { language: 'English' | 'Hinglish' };
    setPodcastConfig: (config: { language: 'English' | 'Hinglish' }) => void;
    podcast: any;
    focusState: any;
}

export const AppRouter: React.FC<AppRouterProps> = (props) => {
    // Router State
    const [currentView, setCurrentView] = useState<string>('home');
    const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
    const [topicListData, setTopicListData] = useState<{ title: string; topics: Topic[] }>({ title: '', topics: [] });
    const [selectedQuizReviewData, setSelectedQuizReviewData] = useState<{ quizAttempt: any, repetitionNumber: number } | null>(null);
    const [isPodcastOverlayOpen, setIsPodcastOverlayOpen] = useState(false);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [showImportSuccessModal, setShowImportSuccessModal] = useState(false);

    // Derived Auth State
    const isLoggedIn = !!(props.user || props.isGuest);

    // Stable References for Event Listeners
    const processingHash = useRef<string | null>(null);
    const hasInitialized = useRef(false);
    const studyLogRef = useRef(props.studyLog);
    const currentViewRef = useRef(currentView);
    const lastHashRef = useRef<string>(window.location.hash);

    // Sync Refs with Props/State
    useEffect(() => { studyLogRef.current = props.studyLog; }, [props.studyLog]);
    useEffect(() => { currentViewRef.current = currentView; }, [currentView]);

    // REACTIVE UPDATE FIX: 
    // Ensure selectedTopic stays in sync when studyLog changes (e.g. logging time, renaming, etc.)
    useEffect(() => {
        if (selectedTopic && props.studyLog) {
            const freshTopic = props.studyLog.find(t => t.id === selectedTopic.id);
            if (freshTopic && freshTopic !== selectedTopic) {
                setSelectedTopic(freshTopic);
            }
        }
    }, [props.studyLog, selectedTopic]);

    // Navigation Handler (Updates Hash)
    const navigateTo = useCallback((view: string, data?: any) => {
        let hash = `#/${view}`;
        const params = new URLSearchParams();

        if (view === 'topicList' && data?.type) {
            hash = `#/list/${data.type}`;
        } else {
            if (data) {
                if (data.id) params.set('id', data.id); // Topic ID, Subject ID
                if (data.type) params.set('type', data.type); 
                
                // Special case for quizReview to ensure we can load specific attempt
                if (view === 'quizReview' && data.repetitionNumber !== undefined) {
                    const repIndex = data.repetitionNumber - 1;
                    params.set('repIndex', repIndex.toString());
                    if (data.topic?.id) params.set('id', data.topic.id);
                }
            }

            const queryString = params.toString();
            if (queryString) hash += `?${queryString}`;
        }

        processingHash.current = hash;
        window.location.hash = hash;
    }, []);

    const goBack = useCallback(() => {
        NavStack.goBackHash('#/home');
    }, []);

    // Helper: Parse Hash (Pure)
    const fromHash = useCallback((hash: string) => {
        if (!hash || hash === '#' || hash === '#/') return { view: 'home', params: {} };
        
        const cleanHash = hash.replace(/^#\/?/, '');
        const [pathPart, queryPart] = cleanHash.split('?');
        const params: any = {};
        
        if (queryPart) {
            new URLSearchParams(queryPart).forEach((value, key) => {
                params[key] = value;
            });
        }

        // Canonical TopicList Support: #/list/:type
        if (pathPart.startsWith('list/')) {
            const type = pathPart.split('/')[1];
            return { view: 'topicList', params: { ...params, type } };
        }

        const view = pathPart || 'home';
        return { view, params };
    }, []);

    // Core Hash Change Logic
    const handleHashChangeCore = useCallback((targetHash: string, source: string) => {
        let rawHash = targetHash || window.location.hash;
        
        // CANONICALIZATION
        if (rawHash.includes('topicList') && rawHash.includes('type=')) {
             const match = rawHash.match(/[?&]type=([^&]+)/);
             if (match) {
                 const type = match[1];
                 const canonicalHash = `#/list/${type}`;
                 window.history.replaceState(null, '', canonicalHash);
                 rawHash = canonicalHash;
             }
        }

        const isInternal = (processingHash.current === rawHash);
        
        console.debug("[ROUTER] handle", { rawHash, source, isInternal });
        
        lastHashRef.current = rawHash;

        if (isInternal) {
            processingHash.current = null;
            NavStack.pushHash(rawHash);
        } else {
            if (NavStack.getStack().length === 0) {
                 NavStack.pushHash(rawHash);
            }
        }
        
        const route = fromHash(rawHash);
        if (!route) {
            if (!currentViewRef.current) setCurrentView('home');
            return; 
        }

        const studyLog = studyLogRef.current;

        // Hydration Logic
        if (['topicDetail', 'quiz', 'chat', 'quizReview'].includes(route.view)) {
            if (route.params?.id) {
                const topic = studyLog.find(t => t.id === route.params.id) || null;
                if (topic) {
                    setSelectedTopic(topic);
                    
                    if (route.view === 'quizReview') {
                        const totalReps = topic.repetitions?.length || 0;
                        let targetIndex = totalReps - 1;
                        if (route.params.repIndex) {
                            targetIndex = parseInt(route.params.repIndex);
                        }
                        
                        const targetRep = topic.repetitions?.[targetIndex];
                        if (targetRep?.quizAttempt) {
                            setSelectedQuizReviewData({ 
                                quizAttempt: targetRep.quizAttempt, 
                                repetitionNumber: targetIndex + 1 
                            });
                        }
                    }
                }
            }
        } else if (route.view === 'topicList') {
            const today = new Date().toISOString().split('T')[0];
            let filtered: Topic[] = [];
            let title = 'Topics';
            const type = route.params?.type;

            if (type === 'due') {
                title = 'Due for Review';
                filtered = studyLog.filter(t => {
                    if ((t.repetitions?.length || 0) === 0) return true;
                    const lastRep = t.repetitions[t.repetitions.length - 1];
                    return lastRep && lastRep.nextReviewDate <= today;
                });
            } else if (type === 'active') {
                title = 'Active Topics';
                filtered = studyLog.filter(t => {
                    if ((t.repetitions?.length || 0) === 0) return false;
                    const lastRep = t.repetitions[t.repetitions.length - 1];
                    return lastRep && lastRep.nextReviewDate > today && t.repetitions.length < SPACING_INTERVALS.length;
                });
            } else if (type === 'history') {
                title = 'Recent Quizzes';
                filtered = studyLog
                    .filter(t => (t.repetitions?.length || 0) > 0)
                    .sort((a, b) => {
                        const dateA = a.repetitions[a.repetitions.length-1].dateCompleted || '';
                        const dateB = b.repetitions[b.repetitions.length-1].dateCompleted || '';
                        return dateB.localeCompare(dateA);
                    });
            }
            setTopicListData({ title, topics: filtered });
        }

        setCurrentView(route.view);
        setIsPodcastOverlayOpen(route.view === 'podcast');
    }, [fromHash]);

    // Attach Listeners with Polling Fallback
    useEffect(() => {
        console.debug("[ROUTER] mounted", { href: window.location.href, hash: window.location.hash });
        
        // Native Listener
        const onHashChange = () => handleHashChangeCore(window.location.hash, 'hashchange');
        window.addEventListener('hashchange', onHashChange);

        // SAFE Polling for Local Development only
        let pollInterval: any = null;
        const isLocalhost = 
            window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1';

        if (isLocalhost) {
            pollInterval = setInterval(() => {
                const now = window.location.hash;
                if (now !== lastHashRef.current) {
                    handleHashChangeCore(now, 'poll');
                }
            }, 500); 
        }

        return () => {
            window.removeEventListener('hashchange', onHashChange);
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [handleHashChangeCore]);

    // Initial Boot & OAuth Detection
    // FIX: Do NOT wait for props.loadingData. Boot router immediately to allow UI skeletons.
    useEffect(() => {
        if (!hasInitialized.current) {
            let initialHash = window.location.hash;
            
            // [AUTH FIX] Detect OAuth callback params in query string (PKCE flow)
            const searchParams = new URLSearchParams(window.location.search);
            const hasAuthCode = searchParams.has('code');
            const hasAuthError = searchParams.has('error');

            console.debug("[ROUTER] boot check", {
                search: window.location.search,
                hash: window.location.hash,
                hasAuthCode
            });

            if (hasAuthCode || hasAuthError) {
                console.debug("[ROUTER] boot: '?code' detected -> route '#/auth/callback'", {
                    search: window.location.search,
                    hash: window.location.hash
                });
                initialHash = '#/auth/callback';
                // Force hash update if needed
                if (window.location.hash !== initialHash) {
                    window.location.hash = initialHash;
                }
            }
             else if (!initialHash) {
                initialHash = '#/home';
                window.location.hash = initialHash;
            }
            
            handleHashChangeCore(initialHash, 'boot');
            console.debug("[ROUTER] post-auth default", { view: fromHash(initialHash).view });
            hasInitialized.current = true;
        }
    }, [handleHashChangeCore, fromHash]);

    // Secondary Hydration for Deep Links
    // If we booted early but data wasn't ready, re-evaluate routing when data arrives.
    useEffect(() => {
        if (!props.loadingData && hasInitialized.current) {
             // Only re-run if we are on a data-dependent view and topic is missing
             if (['topicDetail', 'quiz', 'chat', 'quizReview'].includes(currentViewRef.current) && !selectedTopic) {
                 console.debug("[ROUTER] Data loaded, re-evaluating deep link...");
                 handleHashChangeCore(window.location.hash, 'data-loaded');
             }
        }
    }, [props.loadingData, selectedTopic, handleHashChangeCore]);

    // Auth Redirects
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                navigateTo('resetPassword');
            }
        });
        return () => subscription.unsubscribe();
    }, [navigateTo]); 

    // Handle Auth Routing overrides
    useEffect(() => {
        if (props.authLoading) return;
        
        if (!props.user && !props.isGuest) {
            const allowed = ['onboarding', 'auth/callback', 'resetPassword'];
            if (!allowed.some(v => window.location.hash.includes(v))) {
                // Allow LoginView to handle 'home' route state
            }
        }
    }, [props.user, props.isGuest, props.authLoading]);

    // ROUTER GUARD: Logged in users should not be stuck on 'login' view
    useEffect(() => {
        // Prevent staying on '#/login' when authenticated
        if (isLoggedIn && currentView === 'login') {
            console.debug("[ROUTER] Authenticated on '/login' → redirect to 'home'");
            navigateTo('home');
        }
    }, [isLoggedIn, currentView, navigateTo]);

    // Handle Floating Timer Log
    const handleFloatingLog = useCallback((minutes: number) => {
        const topicId = props.focusState.topicId;
        if (!topicId) return;
        const topic = props.studyLog.find(t => t.id === topicId);
        if (topic) {
            const currentTotal = topic.pomodoroTimeMinutes || 0;
            const newTime = currentTotal + minutes;
            const today = new Date().toISOString().split('T')[0];
            const newSession = { date: today, minutes: minutes };
            
            AnalyticsService.trackSession(props.userId, topic.id, topic.subjectId, today, minutes);

            const updatedTopic = {
                ...topic,
                pomodoroTimeMinutes: newTime,
                focusLogs: [...(topic.focusLogs || []), newSession]
            };
            props.handleUpdateTopic(updatedTopic);
        }
    }, [props.studyLog, props.focusState.topicId, props.userId, props.handleUpdateTopic]);

    // Import/Export Handlers
    const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        // Size guard: 50MB limit to prevent browser crash on read
        if (file.size > 50 * 1024 * 1024) {
            alert("Backup file is too large (>50MB). Import cancelled.");
            return;
        }

        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const jsonStr = ev.target?.result as string;
                const data = JSON.parse(jsonStr);
                
                // Schema Validation
                if (data.schemaVersion !== "1.0.0") {
                    throw new Error("Unsupported backup version. Please export again using the latest version.");
                }
                if (!Array.isArray(data.studyLog)) {
                    throw new Error("Invalid backup format: Missing study log.");
                }

                // 1. Restore Notes Bodies (IDB)
                if (data.notesByTopicId) {
                    await batchSaveTopicBodies(props.userId, data.notesByTopicId);
                }

                // 2. Restore Images (IDB)
                if (data.images) {
                    await batchSaveImages(data.images);
                }

                // 3. Restore Preferences
                if (data.preferences) {
                    if (data.preferences.ai) {
                        localStorage.setItem('engram_ai_preferences', JSON.stringify(data.preferences.ai));
                    }
                    if (data.preferences.appMode) {
                        localStorage.setItem('engramAppMode', data.preferences.appMode);
                    }
                }

                // 4. Restore Index (State)
                props.importStudyLog(data.studyLog);
                
                // 5. Success
                setShowImportSuccessModal(true);

            } catch (err: any) {
                console.error("Import failed:", err);
                let msg = "Failed to parse backup file.";
                if (err.name === 'QuotaExceededError') msg = "Storage quota exceeded. Please free up space.";
                else if (err.message) msg = err.message;
                alert(msg);
            }
        };
        reader.readAsText(file);
    };

    const handleExportData = async () => {
        try {
            // 1. Sanitize Topic Index (remove audio blobs)
            const sanitizedLog = props.studyLog.map(({ podcastAudio, ...t }) => ({
                ...t,
                podcastAudio: undefined // Explicitly strip audio
            }));

            // 2. Gather Content from IDB
            const topicIds = sanitizedLog.map(t => t.id);
            const notesByTopicId = await batchGetTopicBodies(props.userId, topicIds);

            // 3. Scan for Images
            const imageIds = new Set<string>();
            const captureRegex = /\[FIG_CAPTURE: (.*?) \|/g; 
            Object.values(notesByTopicId).forEach(note => {
                if (!note) return;
                const matches = [...note.matchAll(captureRegex)];
                matches.forEach(m => imageIds.add(m[1]));
            });
            const images = await batchGetImages(Array.from(imageIds));

            // 4. Gather Preferences
            let aiPrefs = {};
            try {
                const raw = localStorage.getItem('engram_ai_preferences');
                if (raw) aiPrefs = JSON.parse(raw);
            } catch {}

            // 5. Assemble Bundle
            const backupBundle = {
                schemaVersion: "1.0.0",
                appVersion: "1.1",
                timestamp: new Date().toISOString(),
                userId: props.userId,
                studyLog: sanitizedLog,
                notesByTopicId,
                images,
                preferences: {
                    ai: aiPrefs,
                    appMode: localStorage.getItem('engramAppMode') || 'system'
                }
            };

            // 6. Download
            const dataStr = JSON.stringify(backupBundle, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `engram_backup_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(url);

        } catch (e) {
            console.error("Export failed:", e);
            alert("Export failed. Please check console for details.");
        }
    };

    // Render Logic
    if (props.authLoading) {
        return null;
    }

    if (currentView === 'resetPassword') {
        return <ResetPasswordView navigateTo={navigateTo} themeColor={props.currentTheme} />;
    }

    if (!isLoggedIn) {
        if (currentView === 'auth/callback') {
            return <AuthCallbackView navigateTo={navigateTo} setUserProfile={props.setUserProfile} setIsOnboarded={props.setIsOnboarded} themeColor={props.currentTheme} />;
        }
        return <LoginView onComplete={props.onLoginComplete} onSignInSuccess={() => { console.debug("[AUTH] onSignInSuccess → navigateTo('home')"); navigateTo('home'); }} />;
    }

    if (props.user && !props.isGuest && !props.isOnboarded && !props.checkingProfile) {
        return <OnboardingView onComplete={props.onOnboardingComplete} />;
    }

    console.debug("[HOME] render", { hasUser: !!props.user, hasProfile: !!props.userProfile, hasData: props.studyLog.length > 0, isLoading: props.loadingData });

    return (
        <AppShell
            user={props.user}
            isGuest={props.isGuest}
            currentView={currentView}
            themeColor={props.currentTheme}
            themeIntensity={props.themeIntensity}
            appMode={props.appMode}
            userProfile={props.userProfile}
            navigateTo={navigateTo}
            enabledTabs={props.enabledTabs}
            showFeedbackModal={showFeedbackModal}
            setShowFeedbackModal={setShowFeedbackModal}
            showImportSuccessModal={showImportSuccessModal}
            permissionsGranted={props.permissionsGranted}
            handleAllowPermissions={props.handleAllowPermissions}
            podcast={props.podcast}
            focusState={props.focusState}
            handleFloatingLog={handleFloatingLog}
            selectedTopic={selectedTopic}
            isPodcastOpen={isPodcastOverlayOpen}
            setIsPodcastOpen={(open) => {
                if(open) navigateTo('podcast');
                else goBack();
            }}
            podcastOverlay={
                <PodcastFullView 
                    studyLog={props.studyLog} 
                    onUpdateTopic={props.handleUpdateTopic} 
                    themeColor={props.currentTheme} 
                    onMinimize={goBack}
                    state={props.podcast.state}
                    controls={props.podcast.controls}
                    defaultLanguage={props.podcastConfig.language}
                />
            }
        >
            {/* View Switching Logic */}
            {currentView === 'home' && (
                <HomeView 
                    studyLog={props.studyLog} 
                    allSubjects={props.userSubjects} 
                    navigateTo={navigateTo} 
                    userId={props.userId} 
                    themeColor={props.currentTheme}
                    userProfile={props.userProfile}
                    loading={props.loadingData}
                />
            )}
            {currentView === 'subjects' && (
                <SubjectsView 
                    allSubjects={props.userSubjects} 
                    studyLog={props.studyLog} 
                    navigateTo={navigateTo} 
                    onAddSubject={props.handleAddSubject}
                    onUpdateSubject={props.handleUpdateSubject}
                    onDeleteSubject={props.handleDeleteSubject}
                    onAddTopic={props.handleAddTopic} 
                    themeColor={props.currentTheme} 
                />
            )}
            {currentView === 'topicDetail' && (
                <TopicDetailView 
                    topic={selectedTopic} 
                    userId={props.userId} 
                    navigateTo={navigateTo} 
                    onUpdateTopic={props.handleUpdateTopic} 
                    themeColor={props.currentTheme}
                    defaultLanguage={props.podcastConfig.language}
                />
            )}
            {currentView === 'quiz' && (
                <QuizView 
                    topic={selectedTopic} 
                    userId={props.userId} 
                    navigateTo={navigateTo} 
                    onUpdateTopic={props.handleUpdateTopic} 
                    themeColor={props.currentTheme}
                />
            )}
            {currentView === 'quizReview' && selectedTopic && selectedQuizReviewData && (
                <QuizReview 
                    topic={selectedTopic} 
                    quizData={selectedQuizReviewData.quizAttempt.questions}
                    answers={selectedQuizReviewData.quizAttempt.questions.map((q: any, i: number) => ({ qIndex: i, selected: q.userSelected, correct: q.correct_answer_letter }))}
                    timeTaken={selectedQuizReviewData.quizAttempt.timeTakenSeconds}
                    navigateTo={navigateTo}
                    repetitionNumber={selectedQuizReviewData.repetitionNumber}
                    themeColor={props.currentTheme}
                />
            )}
            {currentView === 'chat' && (
                <ChatView 
                    topic={selectedTopic} 
                    userId={props.userId} 
                    navigateTo={navigateTo} 
                    themeColor={props.currentTheme} 
                />
            )}
            {currentView === 'settings' && (
                <SettingsView 
                    userProfile={props.userProfile} 
                    userId={props.userId}
                    userEmail={props.user?.email}
                    currentTheme={props.currentTheme} 
                    navigateTo={navigateTo} 
                    setShowFeedbackModal={setShowFeedbackModal}
                    handleExportData={handleExportData}
                    handleImportData={handleImportData}
                    appMode={props.appMode}
                    setAppMode={props.setAppMode}
                    onSignOut={props.onSignOut}
                    level={Math.floor((props.earnedBadges?.length || 0) / 3) + 1}
                    badgeCount={props.earnedBadges?.length || 0}
                    streak={props.currentStreak}
                />
            )}
            {currentView === 'profile' && (
                <ProfileView 
                    userId={props.userId} 
                    studyLog={props.studyLog} 
                    userProfile={props.userProfile} 
                    onUpdateProfile={props.setUserProfile} 
                    habits={props.habits} 
                    onUpdateHabits={props.setHabits} 
                    navigateTo={navigateTo} 
                    goBack={goBack} 
                    themeColor={props.currentTheme}
                    availableProfiles={props.profiles}
                    onSwitchProfile={props.onSwitchProfile}
                    onAddProfile={props.onAddProfile}
                    onSignOut={props.onSignOut}
                />
            )}
            {currentView === 'topicList' && (
                <TopicListView 
                    title={topicListData.title} 
                    topics={topicListData.topics} 
                    navigateTo={navigateTo} 
                    themeColor={props.currentTheme} 
                />
            )}
            {currentView === 'aiFeatures' && (
                <AiFeaturesView 
                    navigateTo={navigateTo}
                    goBack={goBack}
                    themeColor={props.currentTheme}
                />
            )}
            {currentView === 'tabBarSettings' && (
                <TabBarConfigView 
                    enabledTabIds={props.enabledTabs} 
                    onToggleTab={(id) => {
                        if (props.enabledTabs.includes(id)) {
                            props.setEnabledTabs(props.enabledTabs.filter(t => t !== id));
                        } else {
                            props.setEnabledTabs([...props.enabledTabs, id]);
                        }
                    }} 
                    onReorderTabs={props.setEnabledTabs}
                    navigateTo={navigateTo} 
                    goBack={goBack} 
                    themeColor={props.currentTheme}
                />
            )}
            {currentView === 'appearance' && (
                <AppearanceView 
                    currentTheme={props.currentTheme} 
                    setCurrentTheme={props.setCurrentTheme} 
                    themeIntensity={props.themeIntensity} 
                    setThemeIntensity={props.setThemeIntensity} 
                    goBack={goBack} 
                />
            )}
            {currentView === 'dateTimeSettings' && (
                <DateTimeSettingsView 
                    settings={props.dateTimeSettings} 
                    onUpdateSettings={props.setDateTimeSettings} 
                    navigateTo={navigateTo} 
                    goBack={goBack} 
                    themeColor={props.currentTheme} 
                />
            )}
            {currentView === 'soundsNotifications' && (
                <SoundsNotificationsView 
                    settings={props.notificationSettings} 
                    onUpdateSettings={props.setNotificationSettings} 
                    navigateTo={navigateTo} 
                    goBack={goBack} 
                    themeColor={props.currentTheme} 
                />
            )}
            {currentView === 'widgets' && (
                <WidgetsView 
                    studyLog={props.studyLog} 
                    habits={props.habits} 
                    navigateTo={navigateTo} 
                    goBack={goBack} 
                    themeColor={props.currentTheme} 
                />
            )}
            {currentView === 'podcastSettings' && (
                <PodcastSettingsView 
                    config={props.podcastConfig} 
                    onUpdate={props.setPodcastConfig} 
                    navigateTo={navigateTo} 
                    goBack={goBack} 
                    themeColor={props.currentTheme} 
                    studyLog={props.studyLog}
                    onPlayTopic={(t) => { props.podcast.controls.playTopic(t); navigateTo('podcast'); }}
                    onUpdateTopic={props.handleUpdateTopic}
                />
            )}
            {currentView === 'about' && (
                <AboutView navigateTo={navigateTo} goBack={goBack} themeColor={props.currentTheme} />
            )}
            {currentView === 'terms' && (
                <TermsView navigateTo={navigateTo} goBack={goBack} themeColor={props.currentTheme} />
            )}
            {currentView === 'privacy' && (
                <PrivacyView navigateTo={navigateTo} goBack={goBack} themeColor={props.currentTheme} />
            )}
            {currentView === 'licenses' && (
                <LicensesView navigateTo={navigateTo} goBack={goBack} themeColor={props.currentTheme} />
            )}
            {currentView === 'calendar' && (
                <CalendarView themeColor={props.currentTheme} settings={props.dateTimeSettings} studyLog={props.studyLog} userId={props.userId} />
            )}
            {currentView === 'task' && (
                <TaskView themeColor={props.currentTheme} settings={props.dateTimeSettings} />
            )}
            {currentView === 'matrix' && (
                <EisenhowerMatrixView themeColor={props.currentTheme} />
            )}
            {currentView === 'pomodoro' && (
                <PomodoroFullView themeColor={props.currentTheme} />
            )}
            {currentView === 'habit' && (
                <HabitTrackerView themeColor={props.currentTheme} habits={props.habits} onUpdateHabits={props.setHabits} />
            )}
            {currentView === 'search' && (
                <SearchView themeColor={props.currentTheme} studyLog={props.studyLog} navigateTo={navigateTo} />
            )}
        </AppShell>
    );
};
