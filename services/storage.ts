
const DB_NAME = 'EngramDB';
const AUDIO_STORE = 'audio_files';
const IMAGE_STORE = 'image_files';
const TOPIC_BODY_STORE = 'topic_bodies';
const DB_VERSION = 4; // Bumped to trigger upgrade and ensure stores exist

// Safe DEV flag that works in no-build environments without crashing on process.env access
const DEV = (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') ||
            (typeof window !== 'undefined' && (
                window.location.hostname === 'localhost' ||
                window.location.hostname.includes('googleusercontent.com') ||
                window.location.hostname.includes('ai.studio')
            ));

// Performance Budget Logger
const checkPerfBudget = (name: string, start: number, limit: number) => {
    if (!DEV) return;
    const duration = performance.now() - start;
    if (duration > limit) {
        console.warn(`%c [Perf] ${name} exceeded budget: ${duration.toFixed(2)}ms (Limit: ${limit}ms)`, 'color: orange; font-weight: bold');
    } else {
        console.debug(`[Perf] ${name}: ${duration.toFixed(2)}ms`);
    }
};

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error("IndexedDB is not supported in this browser."));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            
            if (!db.objectStoreNames.contains(AUDIO_STORE)) {
                db.createObjectStore(AUDIO_STORE);
            }
            if (!db.objectStoreNames.contains(IMAGE_STORE)) {
                db.createObjectStore(IMAGE_STORE);
            }
            if (!db.objectStoreNames.contains(TOPIC_BODY_STORE)) {
                db.createObjectStore(TOPIC_BODY_STORE);
            }
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (event) => {
            reject((event.target as IDBOpenDBRequest).error);
        };
    });
};

// --- Topic Body Storage (Text) ---

// Helper to create namespaced key
const getBodyKey = (userId: string, topicId: string) => `${userId}:${topicId}`;

export const saveTopicBodyToIDB = async (userId: string, topicId: string, content: string): Promise<void> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(TOPIC_BODY_STORE, 'readwrite');
            const store = transaction.objectStore(TOPIC_BODY_STORE);
            // Use namespaced key
            const request = store.put(content, getBodyKey(userId, topicId));

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("IndexedDB Topic Body Save Error:", e);
        throw e;
    }
};

export const getTopicBodyFromIDB = async (userId: string, topicId: string): Promise<string | undefined> => {
    const start = performance.now();
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const transaction = db.transaction(TOPIC_BODY_STORE, 'readonly');
            const store = transaction.objectStore(TOPIC_BODY_STORE);
            // Use namespaced key
            const request = store.get(getBodyKey(userId, topicId));

            request.onsuccess = () => {
                checkPerfBudget(`fetch_body_${topicId.slice(0, 5)}`, start, 150);
                resolve(request.result);
            };
            request.onerror = () => {
                console.warn(`Failed to read body for ${topicId}, returning empty.`);
                resolve(""); // Safe fallback
            };
        });
    } catch (e) {
        console.error("IndexedDB Topic Body Read Error (Critical):", e);
        return ""; // Safe fallback
    }
};

export const deleteTopicBodyFromIDB = async (userId: string, topicId: string): Promise<void> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(TOPIC_BODY_STORE, 'readwrite');
            const store = transaction.objectStore(TOPIC_BODY_STORE);
            const request = store.delete(getBodyKey(userId, topicId));

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("IndexedDB Topic Body Delete Error:", e);
    }
};

// --- Batch Helpers for Backup ---

export const batchGetTopicBodies = async (userId: string, topicIds: string[]): Promise<Record<string, string>> => {
    try {
        const db = await openDB();
        const results: Record<string, string> = {};
        // Sequential fetch to ensure transaction stability across browsers (safer than Promise.all with single store opening)
        // For backup, speed is less critical than reliability.
        for (const id of topicIds) {
            const val = await new Promise<string | undefined>((resolve) => {
                const tx = db.transaction(TOPIC_BODY_STORE, 'readonly');
                const req = tx.objectStore(TOPIC_BODY_STORE).get(getBodyKey(userId, id));
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(undefined);
            });
            if (val) results[id] = val;
        }
        return results;
    } catch (e) {
        console.error("Batch Body Read Error:", e);
        return {};
    }
};

export const batchSaveTopicBodies = async (userId: string, map: Record<string, string>): Promise<void> => {
    try {
        const db = await openDB();
        const tx = db.transaction(TOPIC_BODY_STORE, 'readwrite');
        const store = tx.objectStore(TOPIC_BODY_STORE);
        
        Object.entries(map).forEach(([id, content]) => {
            store.put(content, getBodyKey(userId, id));
        });
        
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) {
        console.error("Batch Body Save Error:", e);
        throw e;
    }
};

export const batchGetImages = async (imageIds: string[]): Promise<Record<string, string>> => {
    try {
        const db = await openDB();
        const results: Record<string, string> = {};
        for (const id of imageIds) {
            const val = await new Promise<string | undefined>((resolve) => {
                const tx = db.transaction(IMAGE_STORE, 'readonly');
                const req = tx.objectStore(IMAGE_STORE).get(id);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(undefined);
            });
            if (val) results[id] = val;
        }
        return results;
    } catch (e) {
        console.error("Batch Image Read Error:", e);
        return {};
    }
};

export const batchSaveImages = async (map: Record<string, string>): Promise<void> => {
    try {
        const db = await openDB();
        const tx = db.transaction(IMAGE_STORE, 'readwrite');
        const store = tx.objectStore(IMAGE_STORE);
        
        Object.entries(map).forEach(([id, base64]) => {
            store.put(base64, id);
        });
        
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) {
        console.error("Batch Image Save Error:", e);
        throw e;
    }
};

// Helper to ensure we have the body content (hydrates topic if needed)
export const ensureTopicContent = async (userId: string, topic: any): Promise<any> => {
    if (topic.shortNotes && topic.shortNotes.length > 0) return topic;
    const body = await getTopicBodyFromIDB(userId, topic.id);
    return { ...topic, shortNotes: body || "" };
};

// --- Audio Storage ---

export const saveAudioToIDB = async (topicId: string, audioData: Blob | string): Promise<void> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(AUDIO_STORE, 'readwrite');
            const store = transaction.objectStore(AUDIO_STORE);
            const request = store.put(audioData, topicId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("IndexedDB Audio Save Error:", e);
        throw e;
    }
};

export const getAudioFromIDB = async (topicId: string): Promise<Blob | string | undefined> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(AUDIO_STORE, 'readonly');
            const store = transaction.objectStore(AUDIO_STORE);
            const request = store.get(topicId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("IndexedDB Audio Read Error:", e);
        return undefined;
    }
};

export const deleteAudioFromIDB = async (topicId: string): Promise<void> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(AUDIO_STORE, 'readwrite');
            const store = transaction.objectStore(AUDIO_STORE);
            const request = store.delete(topicId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("IndexedDB Audio Delete Error:", e);
    }
};

// --- Image Storage ---

export const saveImageToIDB = async (imageId: string, base64Image: string): Promise<void> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(IMAGE_STORE, 'readwrite');
            const store = transaction.objectStore(IMAGE_STORE);
            const request = store.put(base64Image, imageId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("IndexedDB Image Save Error:", e);
        throw e;
    }
};

export const getImageFromIDB = async (imageId: string): Promise<string | undefined> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(IMAGE_STORE, 'readonly');
            const store = transaction.objectStore(IMAGE_STORE);
            const request = store.get(imageId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("IndexedDB Image Read Error:", e);
        return undefined;
    }
};
