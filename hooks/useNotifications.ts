
import { useEffect, useCallback, useRef } from 'react';
import { Topic, NotificationSettings } from '../types';

export const useNotifications = (
    studyLog: Topic[],
    settings: NotificationSettings
) => {
    // Permission Request Wrapper
    const requestPermission = useCallback(async (): Promise<boolean> => {
        if (!('Notification' in window)) return false;
        
        // Check if already granted
        if (Notification.permission === 'granted') return true;
        
        // Request
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }, []);

    // Scheduler Logic
    useEffect(() => {
        // Prerequisites: Enabled in settings, Browser supports it, Permission granted
        if (
            !settings.enabled || 
            !('Notification' in window) || 
            Notification.permission !== 'granted'
        ) {
            return;
        }

        const checkAndNotify = () => {
            const now = new Date();
            const today = now.toDateString();
            
            // 1. Check if already notified today
            const lastSent = localStorage.getItem('engram_last_notification_date');
            if (lastSent === today) return;

            // 2. Check Time (Simple HH:MM match)
            // Format: "09:00"
            const currentHm = now.toLocaleTimeString('en-GB', { 
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: false 
            }).slice(0, 5); // Ensure HH:MM format

            if (currentHm === settings.reminderTime) {
                // 3. Check for Due Topics
                const dueCount = studyLog.filter(t => {
                    if (!t.shortNotes) return false;
                    if ((t.repetitions?.length || 0) === 0) return true; // New topic
                    
                    const lastRep = t.repetitions[t.repetitions.length - 1];
                    // Strip time for date comparison
                    const nextDate = new Date(lastRep.nextReviewDate);
                    const todayDate = new Date();
                    nextDate.setHours(0,0,0,0);
                    todayDate.setHours(0,0,0,0);
                    
                    return nextDate <= todayDate;
                }).length;

                if (dueCount > 0) {
                    try {
                        // 4. Send Notification
                        const title = "Time to Study!";
                        const body = `You have ${dueCount} topic${dueCount > 1 ? 's' : ''} due for review today.`;
                        
                        // Try Service Worker registration first (better for mobile)
                        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                            navigator.serviceWorker.ready.then(registration => {
                                registration.showNotification(title, {
                                    body: body,
                                    icon: 'https://cdn-icons-png.flaticon.com/512/3062/3062634.png',
                                    badge: 'https://cdn-icons-png.flaticon.com/512/3062/3062634.png',
                                    tag: 'engram-reminder'
                                });
                            });
                        } else {
                            // Fallback to standard API
                            new Notification(title, {
                                body: body,
                                icon: 'https://cdn-icons-png.flaticon.com/512/3062/3062634.png'
                            });
                        }

                        // 5. Mark as sent
                        localStorage.setItem('engram_last_notification_date', today);
                    } catch (e) {
                        console.error("Notification failed", e);
                    }
                }
            }
        };

        // Check every minute
        const intervalId = setInterval(checkAndNotify, 60000);
        
        // Also check immediately on mount/update in case time matches exactly when loaded
        checkAndNotify();

        return () => clearInterval(intervalId);
    }, [studyLog, settings]); // Re-run if data or settings change

    return { requestPermission };
};
