
/**
 * Request notification permission from the user.
 * Should be called triggered by a user gesture (e.g., button click).
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
    if (!("Notification" in window)) return false;
    
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;

    try {
        const result = await Notification.requestPermission();
        return result === "granted";
    } catch (e) {
        console.warn("[NOTIF] Permission request error", e);
        return false;
    }
};

/**
 * Show a notification using the Service Worker if available (support for background/mobile),
 * falling back to standard Notification API.
 */
export const showLocalNotification = async (title: string, options: NotificationOptions = {}) => {
    if (!("Notification" in window)) return;
    
    if (Notification.permission !== "granted") {
        console.debug("[NOTIF] Permission missing, skipping.");
        return;
    }

    try {
        // 1. Try Service Worker (Robust for Mobile/Background)
        if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            if (reg && reg.showNotification) {
                await reg.showNotification(title, options);
                return;
            }
        }
        
        // 2. Fallback to Main Thread API (Desktop)
        new Notification(title, options);
    } catch (e) {
        console.error("[NOTIF] Failed to show notification", e);
    }
};
