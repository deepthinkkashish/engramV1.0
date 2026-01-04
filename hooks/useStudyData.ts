
import { useState, useEffect, useCallback } from 'react';
import { Topic, Subject } from '../types';
import { INITIAL_SUBJECTS } from '../constants';
import { saveAudioToIDB, saveTopicBodyToIDB } from '../services/storage';

export const useStudyData = (userId: string) => {
    const [studyLog, setStudyLog] = useState<Topic[]>([]);
    const [userSubjects, setUserSubjects] = useState<Subject[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    // Initial Load & Migration Logic
    useEffect(() => {
        setLoadingData(true);
        const bootStart = performance.now();
        performance.mark('boot_start');

        // Async hydration wrapped in a timeout to yield to main thread immediately
        const timerId = setTimeout(async () => {
            try {
                // Scoped Keys
                const dataKey = `engramData_${userId}`;
                const subjectsKey = `engramSubjects_${userId}`;
                const migrationKey = `engram_migration_v2_complete_${userId}`;

                const storedData = localStorage.getItem(dataKey);
                const storedSubjects = localStorage.getItem(subjectsKey);
                const isMigrated = localStorage.getItem(migrationKey) === 'true';

                if (storedData) {
                    let parsedData = JSON.parse(storedData);
                    
                    if (!Array.isArray(parsedData)) parsedData = [];

                    // --- MIGRATION: V1 (Fat JSON) -> V2 (Index + IDB) ---
                    if (!isMigrated && parsedData.length > 0) {
                        console.log("%c [Migration] Starting V2 Storage Migration...", 'color: orange');
                        
                        // 1. Backup legacy
                        localStorage.setItem(`${dataKey}_backup_v1`, storedData);
                        
                        // 2. Move bodies to IDB (Now namespaced with userId)
                        const migrationPromises = parsedData.map(async (topic: any) => {
                            if (topic.shortNotes && topic.shortNotes.length > 0) {
                                await saveTopicBodyToIDB(userId, topic.id, topic.shortNotes);
                            }
                            // Strip body for index
                            return { ...topic, shortNotes: "" };
                        });

                        // 3. Wait for all writes
                        const cleanData = await Promise.all(migrationPromises);
                        
                        // 4. Update State & Storage
                        parsedData = cleanData;
                        localStorage.setItem(dataKey, JSON.stringify(cleanData));
                        localStorage.setItem(migrationKey, 'true');
                        console.log("%c [Migration] V2 Migration Complete.", 'color: green');
                    }

                    // Standard Load (Index Only)
                    const cleanData = parsedData.map((t: any) => ({
                        ...t,
                        id: t.id || `topic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        repetitions: Array.isArray(t.repetitions) ? t.repetitions : [],
                        focusLogs: Array.isArray(t.focusLogs) ? t.focusLogs : [],
                        pomodoroTimeMinutes: typeof t.pomodoroTimeMinutes === 'number' ? t.pomodoroTimeMinutes : 0,
                        topicName: t.topicName || 'Untitled Topic',
                        subject: t.subject || 'Uncategorized',
                        shortNotes: t.shortNotes || '', // Will be empty string in V2
                        createdAt: t.createdAt || new Date().toISOString()
                    }));
                    
                    setStudyLog(cleanData);
                } else {
                    setStudyLog([]); // Empty for new user
                }

                if (storedSubjects) {
                    const parsedSubjects = JSON.parse(storedSubjects);
                    setUserSubjects(Array.isArray(parsedSubjects) ? parsedSubjects : []);
                } else {
                    setUserSubjects([]); 
                }
            } catch (e) {
                console.error("Failed to load local data", e);
                setStudyLog([]); 
                setUserSubjects([]);
            } finally {
                setLoadingData(false);
                performance.mark('boot_end');
                const duration = performance.now() - bootStart;
                
                // Dev Performance Budget Check
                if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
                    if (duration > 800) {
                        console.warn(`%c [Perf] Boot exceeded budget: ${duration.toFixed(0)}ms (Limit: 800ms)`, 'color: red; font-weight: bold');
                    } else {
                        console.debug(`[Perf] Boot Duration: ${duration.toFixed(0)}ms`);
                    }
                }
            }
        }, 0);

        return () => clearTimeout(timerId);
    }, [userId]);

    // Save Logic (Effects) with scoped keys
    useEffect(() => {
        if (!loadingData && userId) {
            // Strip heavy audio AND body text before saving to localStorage index
            const indexLog = studyLog.map(topic => {
                const { podcastAudio, shortNotes, ...rest } = topic;
                // We keep shortNotes field but empty to satisfy type, 
                // actual content is in IDB (handled by handleUpdateTopic or TopicDetailView)
                return { ...rest, shortNotes: "" };
            });
            try {
                localStorage.setItem(`engramData_${userId}`, JSON.stringify(indexLog));
            } catch (e) {
                console.error("Failed to save to localStorage", e);
            }
        }
    }, [studyLog, loadingData, userId]);

    useEffect(() => {
        if (!loadingData && userId) {
            localStorage.setItem(`engramSubjects_${userId}`, JSON.stringify(userSubjects));
        }
    }, [userSubjects, loadingData, userId]);

    // Handlers
    const handleUpdateTopic = useCallback(async (updatedTopic: Topic) => {
        let topicToState = { ...updatedTopic };

        // 1. Offload Audio
        if (updatedTopic.podcastAudio) {
            try {
                await saveAudioToIDB(updatedTopic.id, updatedTopic.podcastAudio);
                topicToState.podcastAudio = undefined;
                topicToState.hasSavedAudio = true;
            } catch (err) {
                console.error("Failed to save audio to IDB", err);
            }
        }

        // 2. Offload Body Text (Async Save with userId)
        // We do this optimistically. The state updates immediately with the content 
        // so UI is snappy, but the Effect above will strip it before saving to localStorage.
        if (updatedTopic.shortNotes && updatedTopic.shortNotes.length > 0) {
            saveTopicBodyToIDB(userId, updatedTopic.id, updatedTopic.shortNotes).catch(err => {
                console.error("Failed to save body to IDB", err);
            });
        }

        setStudyLog(prevLog => prevLog.map(t => (t.id === updatedTopic.id ? topicToState : t)));
        return topicToState; 
    }, [userId]);

    const handleAddTopic = useCallback((newTopicData: Omit<Topic, 'id'>) => {
        const newTopic: Topic = {
            ...newTopicData,
            id: 'topic-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            repetitions: [],
            focusLogs: [],
            pomodoroTimeMinutes: 0
        };
        // Save initial empty body if needed, mostly for consistency
        saveTopicBodyToIDB(userId, newTopic.id, newTopic.shortNotes || "");
        
        setStudyLog(prev => [...prev, newTopic]);
        return newTopic;
    }, [userId]);

    const handleAddSubject = useCallback((newSubject: Subject) => {
        setUserSubjects(prev => {
            if (prev.some(s => s.id === newSubject.id)) return prev;
            return [...prev, newSubject];
        });
    }, []);

    const handleUpdateSubject = useCallback((updatedSubject: Subject) => {
        setUserSubjects(prev => prev.map(s => s.id === updatedSubject.id ? updatedSubject : s));
    }, []);

    const handleDeleteSubject = useCallback((id: string) => {
        setUserSubjects(prev => prev.filter(s => s.id !== id));
    }, []);

    const importStudyLog = useCallback((data: Topic[]) => {
        // When importing, we assume data has full notes.
        // We should migrate them to IDB immediately.
        data.forEach(t => {
            if(t.shortNotes) saveTopicBodyToIDB(userId, t.id, t.shortNotes);
        });
        setStudyLog(data);
    }, [userId]);

    return {
        studyLog,
        userSubjects,
        loadingData,
        handleUpdateTopic,
        handleAddTopic,
        handleAddSubject,
        handleUpdateSubject,
        handleDeleteSubject,
        importStudyLog
    };
};
