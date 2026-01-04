
import React from 'react';
import { RotateCw, CheckCircle } from 'lucide-react';
import { NavButton } from './NavButton';
import { FloatingFocusTimer } from './FloatingFocusTimer';
import { PodcastMiniPlayer } from '../views/PodcastView';
import { OfflineBanner } from './OfflineBanner';
import { PermissionModal, FeedbackModal } from './Modals';
import { TAB_ITEMS } from '../constants';
import { UserProfile, Topic } from '../types';

interface AppShellProps {
    children: React.ReactNode;
    user: any;
    isGuest: boolean;
    currentView: string;
    themeColor: string;
    themeIntensity: string;
    appMode: string;
    userProfile: UserProfile;
    navigateTo: (view: string, data?: any) => void;
    enabledTabs: string[];
    showFeedbackModal: boolean;
    setShowFeedbackModal: (show: boolean) => void;
    showImportSuccessModal: boolean;
    permissionsGranted: boolean;
    handleAllowPermissions: () => void;
    podcast: any;
    focusState: any;
    handleFloatingLog: (minutes: number) => void;
    selectedTopic: Topic | null;
    
    // New Props for Podcast Overlay
    isPodcastOpen?: boolean;
    setIsPodcastOpen?: (open: boolean) => void;
    podcastOverlay?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
    children,
    user,
    isGuest,
    currentView,
    themeColor,
    themeIntensity,
    appMode,
    userProfile,
    navigateTo,
    enabledTabs,
    showFeedbackModal,
    setShowFeedbackModal,
    showImportSuccessModal,
    permissionsGranted,
    handleAllowPermissions,
    podcast,
    focusState,
    handleFloatingLog,
    selectedTopic,
    isPodcastOpen = false,
    setIsPodcastOpen,
    podcastOverlay
}) => {
    const visibleTabsIds = [...enabledTabs, 'settings'];
    const mainBgClass = appMode === 'dark' ? 'bg-gray-900' : `bg-${themeColor}-${themeIntensity}`;
    const isLoggedIn = !!(user || isGuest);

    const isImmersiveView = ['quiz', 'chat'].includes(currentView);

    return (
        <div 
            className={`min-h-screen bg-gray-100 dark:bg-gray-900 font-sans antialiased flex justify-center p-0 md:p-4 transition-colors duration-200 ${appMode === 'dark' ? 'dark' : ''}`}
            style={{ '--tabbar-height': '64px' } as React.CSSProperties}
        >
            {!permissionsGranted && isLoggedIn && <PermissionModal onAllow={handleAllowPermissions} />}
            <OfflineBanner />
            <FeedbackModal isOpen={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} themeColor={themeColor} />
            
            {showImportSuccessModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center border border-gray-100 dark:border-gray-800">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 dark:text-green-400 shadow-inner">
                            <CheckCircle size={32} />
                        </div>
                        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">Import Successful!</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-8 text-xs leading-relaxed">
                            Your data has been restored. Please relaunch the app to apply the changes.
                        </p>
                        <button 
                            onClick={() => window.location.reload()}
                            className={`w-full py-4 bg-${themeColor}-600 text-white rounded-2xl font-bold shadow-lg hover:bg-${themeColor}-700 transition transform active:scale-95 flex items-center justify-center`}
                        >
                            <RotateCw size={20} className="mr-2" />
                            Relaunch App
                        </button>
                    </div>
                </div>
            )}

            <div className={`w-full max-w-md md:rounded-3xl md:shadow-2xl overflow-hidden flex flex-col h-[100dvh] md:h-[calc(100vh-2rem)] border-0 md:border dark:border-gray-800 ${mainBgClass} relative`}>
                
                {/* GLOBAL PODCAST OVERLAY */}
                {/* Rendered absolutely on top of everything when open */}
                {isPodcastOpen && podcastOverlay && (
                    <div className="absolute inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col">
                        {podcastOverlay}
                    </div>
                )}

                {/* Header Logic (Hidden if Podcast Open or certain views) */}
                {isLoggedIn && !isPodcastOpen && currentView !== 'onboarding' && currentView !== 'settings' && currentView !== 'appearance' && currentView !== 'tabBarSettings' && currentView !== 'dateTimeSettings' && currentView !== 'profile' && currentView !== 'soundsNotifications' && currentView !== 'widgets' && currentView !== 'chat' && currentView !== 'about' && currentView !== 'terms' && currentView !== 'privacy' && currentView !== 'licenses' && currentView !== 'podcastSettings' && (
                    <header className={`bg-${themeColor}-600 dark:bg-${themeColor}-900 p-4 text-white flex justify-between items-center shrink-0`}>
                        <h1 className="text-xl font-bold">Engram</h1>
                    </header>
                )}
                {isLoggedIn && !isPodcastOpen && ['settings', 'tabBarSettings', 'dateTimeSettings', 'soundsNotifications', 'widgets'].includes(currentView) && currentView !== 'appearance' && (
                    <header className={`bg-${themeColor}-50 dark:bg-gray-900 p-4 text-${themeColor}-900 dark:text-${themeColor}-100 flex justify-between items-center shrink-0 z-10`}>
                        <h1 className="text-2xl font-bold pl-2">{currentView === 'settings' ? 'Settings' : ' '}</h1>
                    </header>
                )}
                
                <main 
                    id="main-scroll-container" 
                    className={`
                        px-4 pt-4
                        ${isImmersiveView 
                            ? 'pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-6 overflow-hidden' 
                            : 'pb-[calc(8rem+env(safe-area-inset-bottom))] md:pb-24 overflow-y-auto'
                        } 
                        overflow-x-hidden flex-1 flex flex-col min-h-0
                        ${(!isLoggedIn) || currentView === 'onboarding' ? 'bg-white dark:bg-gray-900 p-0' : ''}
                    `}
                >
                    {children}
                </main>
                
                <audio 
                    ref={podcast.audioRef} 
                    src={podcast.state.audioSrc || undefined}
                    onTimeUpdate={podcast.audioProps.onTimeUpdate}
                    onLoadedMetadata={podcast.audioProps.onLoadedMetadata}
                    onEnded={podcast.audioProps.onEnded}
                />

                {/* Mini Player Logic */}
                {/* Shows when logged in, have a topic, AND main player is NOT open */}
                {isLoggedIn && podcast.state.currentTopic && !isPodcastOpen && (
                    <PodcastMiniPlayer 
                        state={podcast.state} 
                        controls={podcast.controls} 
                        // Instead of navigating to a route, we just open the overlay
                        navigateTo={() => setIsPodcastOpen?.(true)} 
                        themeColor={themeColor}
                    />
                )}

                {isLoggedIn && focusState.topicId && currentView !== 'onboarding' && (
                    <FloatingFocusTimer
                        activeTopicId={focusState.topicId}
                        activeTopicName={focusState.topicName || "Topic"}
                        currentView={currentView}
                        selectedTopicId={selectedTopic?.id}
                        themeColor={themeColor}
                        onLogTime={handleFloatingLog}
                    />
                )}

                {isLoggedIn && currentView !== 'onboarding' && (
                    <footer className="fixed bottom-0 md:bottom-4 left-0 right-0 max-w-md mx-auto bg-white/80 dark:bg-gray-900/90 backdrop-blur-md border-t border-white/20 dark:border-gray-800 md:rounded-b-3xl shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)] flex justify-between items-center px-2 h-[calc(4rem+env(safe-area-inset-bottom))] md:h-16 pb-[env(safe-area-inset-bottom)] md:pb-0 z-20 overflow-x-auto no-scrollbar">
                        {visibleTabsIds.map(tabId => {
                            const item = TAB_ITEMS.find(t => t.id === tabId);
                            if (!item) return null;
                            return (<NavButton key={item.id} icon={item.icon} label={item.label} view={item.id} currentView={currentView} navigateTo={navigateTo} themeColor={themeColor} />);
                        })}
                    </footer>
                )}
            </div>
        </div>
    );
};
