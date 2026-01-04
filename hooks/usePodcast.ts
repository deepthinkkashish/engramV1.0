
import { useState, useRef, useEffect, useCallback } from 'react';
import { Topic } from '../types';
import { generatePodcastScript, generatePodcastAudio, getFeatureConfig } from '../services/gemini';
import { getAudioFromIDB, saveAudioToIDB } from '../services/storage';
import { createWavBlob } from '../utils/audio';
import { ensureAudioContext } from '../utils/audioCue';

export interface PodcastState {
    currentTopic: Topic | null;
    isPlaying: boolean;
    audioSrc: string | null;
    loading: boolean;
    status: string;
    currentTime: number;
    duration: number;
    generatedScript: string | null;
    estimatedDuration: number | null;
    downloadingIds: string[];
    error: string | null; // Added Error State
    generationStartTime: number | null; // Added for robust timer
}

export interface PodcastControls {
    playTopic: (topic: Topic, onUpdateTopic?: (t: Topic) => void) => Promise<void>;
    togglePlay: () => void;
    seek: (time: number) => void;
    skip: (seconds: number) => void;
    reset: () => void;
    downloadTopic: (topic: Topic, context: string, duration: number, language: string, onSuccess?: (audioData: Blob | string, script: string) => void) => Promise<void>;
}

export const usePodcast = (defaultLanguage: 'English' | 'Hinglish' = 'English') => {
    const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioSrc, setAudioSrc] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [generatedScript, setGeneratedScript] = useState<string | null>(null);
    const [estimatedDuration, setEstimatedDuration] = useState<number | null>(null);
    const [generationStartTime, setGenerationStartTime] = useState<number | null>(null); // State for timer persistence
    const [downloadingIds, setDownloadingIds] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    
    const audioRef = useRef<HTMLAudioElement | null>(null);
    
    // Track if the current load operation is intended to auto-play (triggered by Play button)
    const shouldAutoPlayRef = useRef(false);

    const reset = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
        }
        setAudioSrc(null);
        setCurrentTopic(null);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        setGeneratedScript(null);
        setLoading(false);
        setEstimatedDuration(null);
        setGenerationStartTime(null);
        setError(null);
        shouldAutoPlayRef.current = false;
    }, []);

    const togglePlay = useCallback(() => {
        if (!audioRef.current || !audioSrc) return;
        
        // Ensure context is running (Mobile wake)
        ensureAudioContext();

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(e => {
                console.warn("Play interrupted", e);
                setIsPlaying(false);
            });
        }
        setIsPlaying(!isPlaying);
    }, [isPlaying, audioSrc]);

    const seek = useCallback((time: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    }, []);

    const skip = useCallback((seconds: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime += seconds;
        }
    }, []);

    const loadAudioBlob = (audioData: Blob | string, script?: string) => {
        let blob: Blob;
        if (typeof audioData === 'string') {
            blob = createWavBlob(atob(audioData));
        } else {
            blob = audioData;
        }
        const url = URL.createObjectURL(blob);
        setAudioSrc(url);
        if (script) setGeneratedScript(script);
        setLoading(false);
        setEstimatedDuration(null);
        setGenerationStartTime(null);
        
        // Status update - Playback handled by effect
        setStatus('Ready to Play'); 
    };

    const playTopic = useCallback(async (topic: Topic, onUpdateTopic?: (t: Topic) => void) => {
        if (loading) return;
        
        // Mobile Autoplay Policy: Prime the context and element immediately
        ensureAudioContext();
        if (audioRef.current) {
            // Loading an empty source or calling load() signals intent to the browser
            audioRef.current.load();
        }
        shouldAutoPlayRef.current = true;

        // If already loaded, just toggle
        if (currentTopic?.id === topic.id && audioSrc) {
            if (!isPlaying) togglePlay();
            return;
        }

        // Init State
        setCurrentTopic(topic);
        setLoading(true);
        setIsPlaying(false);
        setAudioSrc(null);
        setCurrentTime(0);
        setDuration(0);
        setGeneratedScript(null);
        setEstimatedDuration(null);
        setError(null);
        setGenerationStartTime(Date.now()); // Set start time

        // 1. Check In-Memory (Topic Object)
        if (topic.podcastAudio) {
            setStatus('Loading audio...');
            loadAudioBlob(topic.podcastAudio, topic.podcastScript);
            return;
        }

        // 2. Check IDB (Offline Cache)
        setStatus('Checking storage...');
        try {
            const savedAudio = await getAudioFromIDB(topic.id);
            if (savedAudio) {
                loadAudioBlob(savedAudio, topic.podcastScript);
                return;
            }
        } catch (e) {
            console.error("Storage check failed", e);
        }

        // 3. Generate Fresh
        // Check user preferences for auto-generate
        const prefs = getFeatureConfig('podcast');
        // By default, allow generation. If explicit 'autoGenerateOnNewTopic' is false, user might want a confirm
        // but for now, we treat clicking play as intent.
        
        setStatus(topic.id.startsWith('subject-recap') ? 'Synthesizing Subject Recap...' : 'Generating Deep Dive...');
        
        const estimate = topic.id.startsWith('subject-recap') ? 300 : 180;
        setEstimatedDuration(estimate);

        try {
            const context = topic.id.startsWith('subject-recap') 
                ? topic.shortNotes 
                : `Topic: ${topic.topicName}\n${topic.shortNotes}`;
            
            const targetDuration = topic.id.startsWith('subject-recap') ? 15 : 5;

            // Script Gen - FeatureID: 'podcast'
            const script = await generatePodcastScript(topic.topicName, context, defaultLanguage, targetDuration, 'podcast');
            setGeneratedScript(script);
            
            // Audio Gen - FeatureID: 'podcast'
            setStatus('Synthesizing Voices...');
            const audioData = await generatePodcastAudio(script, 'podcast');
            
            // Success Handling
            loadAudioBlob(audioData, script);
            
            // Cache in background
            saveAudioToIDB(topic.id, audioData).catch(e => console.warn("Failed to cache audio", e));
            
            // Update topic state if provided (non-recap)
            if (onUpdateTopic && !topic.id.startsWith('subject-recap')) {
                onUpdateTopic({
                    ...topic,
                    podcastScript: script,
                    hasSavedAudio: true
                });
            }

        } catch (e: any) {
            console.error("[Podcast] Generation Error:", e);
            setError(e.message || "Failed to generate podcast.");
            setStatus('Error');
            setLoading(false);
            setEstimatedDuration(null);
            setGenerationStartTime(null);
            shouldAutoPlayRef.current = false;
        }
    }, [currentTopic, audioSrc, isPlaying, loading, defaultLanguage, togglePlay]);

    const downloadTopic = useCallback(async (topic: Topic, context: string, duration: number, language: string, onSuccess?: (audioData: Blob | string, script: string) => void) => {
        if (downloadingIds.includes(topic.id)) return;
        
        setDownloadingIds(prev => [...prev, topic.id]);
        
        try {
            const script = await generatePodcastScript(topic.topicName, context, language as any, duration, 'podcast');
            const audioData = await generatePodcastAudio(script, 'podcast');
            
            if (audioData) {
                await saveAudioToIDB(topic.id, audioData);
                if (onSuccess) onSuccess(audioData, script);
            }
        } catch (e: any) {
            console.error("Download failed", e);
            alert(`Download failed: ${e.message}`);
        } finally {
            setDownloadingIds(prev => prev.filter(id => id !== topic.id));
        }
    }, [downloadingIds]);

    const onTimeUpdate = () => {
        if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
    };
    
    const onLoadedMetadata = () => {
        if (audioRef.current) setDuration(audioRef.current.duration);
    };

    const onEnded = () => setIsPlaying(false);

    // AUTO-PLAY LOGIC
    // Triggers when audioSrc is set AND we have flagged an auto-play intent
    useEffect(() => {
        if (audioSrc && shouldAutoPlayRef.current && audioRef.current) {
            console.debug("[Podcast] Auto-playing generated/loaded content...");
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        setIsPlaying(true);
                    })
                    .catch(error => {
                        console.warn("[Podcast] Auto-play prevented:", error);
                        setIsPlaying(false);
                        // Reset ref so we don't keep trying
                    });
            }
            shouldAutoPlayRef.current = false;
        }
    }, [audioSrc]);

    return {
        state: { currentTopic, isPlaying, audioSrc, loading, status, currentTime, duration, generatedScript, estimatedDuration, downloadingIds, error, generationStartTime },
        controls: { playTopic, togglePlay, seek, skip, reset, downloadTopic },
        audioRef,
        audioProps: {
            onTimeUpdate,
            onLoadedMetadata,
            onEnded
        }
    };
};
