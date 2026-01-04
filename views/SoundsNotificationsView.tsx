
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Bell, Download, Play, Pause, Volume2, Check, AlertTriangle } from 'lucide-react';
import { Card } from '../components/Card';
import { NotificationSettings } from '../types';
import { AMBIENT_SOUNDS } from '../constants';
import { goBackOrFallback } from '../utils/navigation';

interface SoundsNotificationsViewProps {
    settings: NotificationSettings;
    onUpdateSettings: (settings: NotificationSettings) => void;
    navigateTo: (view: string) => void;
    goBack: () => void;
    themeColor: string;
}

export const SoundsNotificationsView: React.FC<SoundsNotificationsViewProps> = ({ settings, onUpdateSettings, navigateTo, goBack, themeColor }) => {
    const [downloading, setDownloading] = useState<string | null>(null);
    const [playing, setPlaying] = useState<string | null>(null);
    const [isCached, setIsCached] = useState<Record<string, boolean>>({});
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
    
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Sync permission status on mount
    useEffect(() => {
        if ('Notification' in window) {
            setPermissionStatus(Notification.permission);
        }
    }, []);

    const toggleNotification = async () => {
        // If turning OFF
        if (settings.enabled) {
            onUpdateSettings({ ...settings, enabled: false });
            return;
        }

        // If turning ON
        if (!('Notification' in window)) {
            alert('Notifications are not supported in this browser.');
            return;
        }

        if (Notification.permission === 'granted') {
            onUpdateSettings({ ...settings, enabled: true });
            new Notification("Notifications Active", { body: "You will be alerted when subjects are due." });
        } else if (Notification.permission === 'denied') {
            alert('Notifications are blocked. Please enable them in your browser settings to use this feature.');
            setPermissionStatus('denied');
        } else {
            // Request permission
            const permission = await Notification.requestPermission();
            setPermissionStatus(permission);
            if (permission === 'granted') {
                onUpdateSettings({ ...settings, enabled: true });
                new Notification("Notifications Active", { body: "You will be alerted when subjects are due." });
            } else {
                onUpdateSettings({ ...settings, enabled: false });
            }
        }
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdateSettings({ ...settings, reminderTime: e.target.value });
    };

    // Use shared constant for sound list
    const soundList = AMBIENT_SOUNDS;

    // Check cache status on load
    useEffect(() => {
        if ('caches' in window) {
            caches.open('engram-sound-cache').then(async (cache) => {
                const status: Record<string, boolean> = {};
                for (const sound of soundList) {
                    const match = await cache.match(sound.url);
                    status[sound.id] = !!match;
                }
                setIsCached(status);
            });
        }
    }, []);

    const handleDownload = async (id: string) => {
        const resource = soundList.find(r => r.id === id);
        if (!resource || !('caches' in window)) return;

        setDownloading(id);
        try {
            const cache = await caches.open('engram-sound-cache');
            await cache.add(resource.url);
            setIsCached(prev => ({ ...prev, [id]: true }));
            alert(`Downloaded ${resource.name} for offline use.`);
        } catch (e) {
            console.error("Download failed:", e);
            alert("Failed to download sound. Please check connection.");
        } finally {
            setDownloading(null);
        }
    };

    const handlePlay = async (id: string) => {
        const resource = soundList.find(r => r.id === id);
        if (!resource) return;

        if (playing === id) {
            // Stop playing
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            setPlaying(null);
        } else {
            // Play new sound
            if (audioRef.current) {
                audioRef.current.pause();
            }
            
            // Try to play from cache first, then network
            let playUrl = resource.url;
            if ('caches' in window) {
                try {
                    const cache = await caches.open('engram-sound-cache');
                    const response = await cache.match(resource.url);
                    if (response) {
                        const blob = await response.blob();
                        playUrl = URL.createObjectURL(blob);
                    }
                } catch (e) {
                    console.warn("Cache match failed, playing from network", e);
                }
            }

            const audio = new Audio(playUrl);
            audio.loop = true;
            audio.preload = "auto";
            
            // Add error handling for playback
            audio.onerror = (e) => {
                if (typeof e === 'string') {
                    console.error("Audio source error:", e);
                    alert(`Playback failed: ${e}`);
                    setPlaying(null);
                    return;
                }

                const target = e.currentTarget as HTMLAudioElement;
                console.error("Audio source error:", target.error);
                let msg = "Unknown error";
                if (target.error) {
                    switch (target.error.code) {
                        case target.error.MEDIA_ERR_ABORTED: msg = "Aborted"; break;
                        case target.error.MEDIA_ERR_NETWORK: msg = "Network error"; break;
                        case target.error.MEDIA_ERR_DECODE: msg = "Decode error"; break;
                        case target.error.MEDIA_ERR_SRC_NOT_SUPPORTED: msg = "Source not supported (404 or format)"; break;
                    }
                }
                alert(`Playback failed: ${msg}.`);
                setPlaying(null);
            };

            const playPromise = audio.play();

            if (playPromise !== undefined) {
                playPromise.then(() => {
                    setPlaying(id);
                }).catch(e => {
                    console.error("Error playing audio:", e);
                    // Don't alert if it's just an interruption
                    if (e.name !== 'AbortError') {
                        alert("Could not play audio. Please check your internet connection.");
                    }
                    setPlaying(null);
                });
            }
            
            audioRef.current = audio;
        }
    };

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    return (
        <div className="p-4 space-y-4">
             <div className="flex items-center space-x-2 mb-4">
                <button onClick={() => goBackOrFallback('#/settings')} className={`p-2 rounded-full hover:bg-${themeColor}-100 dark:hover:bg-gray-800 text-${themeColor}-600 dark:text-${themeColor}-400`}>
                    <ArrowLeft size={24} />
                </button>
                <h2 className={`text-2xl font-bold text-${themeColor}-800 dark:text-${themeColor}-200`}>Sounds & Notifications</h2>
            </div>

            <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <div className={`p-2 bg-${themeColor}-100 dark:bg-${themeColor}-900/30 rounded-lg text-${themeColor}-600 dark:text-${themeColor}-300`}>
                            <Bell size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-800 dark:text-gray-200">Due Subject Alerts</h3>
                            <div className="flex flex-col">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Notify when spaced repetition is due.</p>
                                {permissionStatus === 'denied' && (
                                    <p className="text-[10px] text-red-500 flex items-center mt-1">
                                        <AlertTriangle size={10} className="mr-1" />
                                        Permission Blocked
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={toggleNotification}
                        className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out relative ${settings.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${settings.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                </div>
                
                {settings.enabled && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-4 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Daily Reminder</span>
                            <input 
                                type="time" 
                                value={settings.reminderTime} 
                                onChange={handleTimeChange}
                                className="p-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:border-blue-500"
                            />
                        </div>
                        <p className="text-[10px] text-gray-400 italic">
                            Tip: For reliable notifications on mobile, ensure the app is running in the background or added to Home Screen.
                        </p>
                    </div>
                )}
            </Card>

            <div>
                <div className="flex justify-between items-end mb-3 ml-1">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Ambience Library</h3>
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">Offline Ready</span>
                </div>
                
                <div className="space-y-3">
                    {soundList.map(resource => (
                        <Card key={resource.id} className="p-3 flex items-center justify-between hover:shadow-md transition">
                            <div className="flex items-center space-x-3">
                                <div className={`p-3 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400`}>
                                    <resource.icon size={20} />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{resource.name}</h4>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">{resource.description}</p>
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1 rounded inline-block mt-1">{resource.size}</span>
                                </div>
                            </div>
                            <div className="flex space-x-2">
                                <button 
                                    onClick={() => handlePlay(resource.id)}
                                    className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition ${playing === resource.id ? `text-${themeColor}-500 bg-${themeColor}-50 dark:bg-${themeColor}-900/30` : 'text-gray-400 dark:text-gray-500'}`}
                                >
                                    {playing === resource.id ? (
                                        <Pause size={18} fill="currentColor" />
                                    ) : (
                                        <Play size={18} fill="currentColor" />
                                    )}
                                </button>
                                <button 
                                    onClick={() => handleDownload(resource.id)}
                                    disabled={downloading === resource.id || isCached[resource.id]}
                                    className={`p-2 rounded-full transition ${isCached[resource.id] ? 'bg-green-100 text-green-600' : downloading === resource.id ? 'bg-gray-50 dark:bg-gray-700 text-gray-300 dark:text-gray-600' : `bg-${themeColor}-50 dark:bg-${themeColor}-900/20 text-${themeColor}-600 dark:text-${themeColor}-400 hover:bg-${themeColor}-100 dark:hover:bg-${themeColor}-900/40`}`}
                                    title={isCached[resource.id] ? "Available Offline" : "Download"}
                                >
                                    {downloading === resource.id ? (
                                        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                                    ) : isCached[resource.id] ? (
                                        <Check size={18} />
                                    ) : (
                                        <Download size={18} />
                                    )}
                                </button>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
            
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 mt-6">
                <div className="flex items-start">
                    <Volume2 size={20} className="text-blue-500 dark:text-blue-400 mt-1 mr-2 shrink-0" />
                    <div>
                        <h4 className="text-sm font-bold text-blue-800 dark:text-blue-200">Pro Tip</h4>
                        <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                            Using white noise or nature sounds during Pomodoro sessions can increase focus retention by up to 40%.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
