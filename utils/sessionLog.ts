
import { AnalyticsService } from "../services/analytics";

export const logGlobalSession = (minutes: number, topicName: string = 'Focus Session', subject: string = 'General') => {
    try {
        const now = new Date();
        const newLog = {
            date: now.toISOString().split('T')[0],
            time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase(),
            minutes: minutes,
            topicName,
            subject
        };
        
        const storedLogs = localStorage.getItem('engramGlobalFocusLogs');
        const logs = storedLogs ? JSON.parse(storedLogs) : [];
        const updatedLogs = [newLog, ...logs];
        
        localStorage.setItem('engramGlobalFocusLogs', JSON.stringify(updatedLogs));
        
        // Dispatch event for UI updates (e.g. PomodoroFullView today list)
        window.dispatchEvent(new Event('focus-log-updated'));
        
        console.debug("[LOG] Global session saved", newLog);
    } catch (e) {
        console.error("Failed to log global session", e);
    }
};
