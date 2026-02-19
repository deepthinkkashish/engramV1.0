
import { useState, useEffect, useCallback } from 'react';
import { Topic, Subject } from '../types';
import { INITIAL_SUBJECTS } from '../constants';
import { saveAudioToIDB, saveTopicBodyToIDB, getAllAudioKeys } from '../services/storage';

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

                    // --- RECONCILE AUDIO STATE (Boot Fix for Issue 2) ---
                    // Sync 'hasSavedAudio' flag with actual IDB state
                    try {
                        const audioKeys = await getAllAudioKeys();
                        const audioSet = new Set(audioKeys);
                        parsedData = parsedData.map((t: any) => ({
                            ...t,
                            // Force true if exists in IDB, otherwise default to current state (or false)
                            hasSavedAudio: audioSet.has(t.id) || t.hasSavedAudio
                        }));
                        console.debug("[Boot] Reconciled audio state. Found files for:", audioSet.size);
                    } catch (e) {
                        console.warn("[Boot] Audio reconciliation failed", e);
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

    // OPTION 2: Name-Based Subject Merge
    const importStudyLog = useCallback(async (importedTopics: Topic[], importedSubjects?: Subject[]) => {
        // 1. Restore Notes to IDB (Awaited for safety)
        const idbWrites = importedTopics
            .filter(t => t.shortNotes && t.shortNotes.length > 0)
            .map(t => saveTopicBodyToIDB(userId, t.id, t.shortNotes));
        
        await Promise.all(idbWrites);

        // 2. Reconstruct Imported Subjects List if missing from backup
        let finalImportedSubjects: Subject[] = [];
        if (importedSubjects && Array.isArray(importedSubjects) && importedSubjects.length > 0) {
            finalImportedSubjects = importedSubjects;
        } else {
            const subjectMap = new Map<string, Subject>();
            importedTopics.forEach(t => {
                if (t.subjectId) {
                    if (!subjectMap.has(t.subjectId)) {
                        subjectMap.set(t.subjectId, {
                            id: t.subjectId,
                            name: t.subject || "Restored Subject"
                        });
                    }
                }
            });
            finalImportedSubjects = Array.from(subjectMap.values());
        }

        // 3. Merge Logic
        // We use functional updates to ensure we are merging into the current state
        setUserSubjects(currentSubjects => {
            const subjectIdMap = new Map<string, string>(); // Map: ImportedID -> LocalID
            const nextSubjects = [...currentSubjects];

            finalImportedSubjects.forEach(impSub => {
                // Find if a local subject has the same name (case-insensitive)
                const existing = currentSubjects.find(s => 
                    s.name.trim().toLowerCase() === impSub.name.trim().toLowerCase()
                );

                if (existing) {
                    // Match found: Map imported subject ID to existing local ID
                    subjectIdMap.set(impSub.id, existing.id);
                } else {
                    // No match by name. Check for ID collision.
                    const idCollision = currentSubjects.some(s => s.id === impSub.id);
                    
                    if (idCollision) {
                        // ID exists but name is different. Generate new ID for imported subject.
                        const newId = `${impSub.id}_${Date.now()}`;
                        subjectIdMap.set(impSub.id, newId);
                        nextSubjects.push({ ...impSub, id: newId });
                    } else {
                        // Totally new subject. Keep ID.
                        subjectIdMap.set(impSub.id, impSub.id);
                        nextSubjects.push(impSub);
                    }
                }
            });

            // 4. Update Topics with Remapped IDs
            setStudyLog(currentTopics => {
                const nextTopics = [...currentTopics];
                const existingTopicIds = new Set(currentTopics.map(t => t.id));

                importedTopics.forEach(topic => {
                    const originalSubId = topic.subjectId;
                    const mappedSubId = subjectIdMap.get(originalSubId) || originalSubId;
                    
                    // Resolve correct subject name based on the mapping
                    const targetSubject = nextSubjects.find(s => s.id === mappedSubId);
                    const mappedSubjectName = targetSubject ? targetSubject.name : topic.subject;

                    const updatedTopic = {
                        ...topic,
                        subjectId: mappedSubId,
                        subject: mappedSubjectName
                    };

                    if (existingTopicIds.has(updatedTopic.id)) {
                        // Conflict: Topic ID exists. Overwrite with imported version.
                        const idx = nextTopics.findIndex(t => t.id === updatedTopic.id);
                        if (idx !== -1) {
                            nextTopics[idx] = updatedTopic;
                        }
                    } else {
                        // New Topic: Append
                        nextTopics.push(updatedTopic);
                        existingTopicIds.add(updatedTopic.id);
                    }
                });

                return nextTopics;
            });

            return nextSubjects;
        });
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
