
import { GoogleGenAI, Modality } from "@google/genai";
import { createWavBlob } from "../utils/audio";

const KEY_PREFIX = "ENGRM_SEC_";

export class NoApiKeyError extends Error {
    code = 'NO_API_KEY';
    constructor() {
        super("Add your API key in Settings to use AI features.");
        this.name = 'NoApiKeyError';
    }
}

export class UsageLimitError extends Error {
    code = 'USAGE_LIMIT';
    constructor() {
        super("You’ve reached your monthly AI limit. Add your API key in Settings for unlimited usage.");
        this.name = 'UsageLimitError';
    }
}

// --- USAGE TRACKING HELPERS ---

const USAGE_KEY = 'engram_ai_usage_stats';
const PREFS_KEY = 'engram_ai_preferences';

export const getUsageStats = () => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const customKey = localStorage.getItem('engram_custom_api_key');
    const source = customKey ? 'custom' : 'env';
    
    let stats = {
        month: currentMonth,
        count: 0,
        limit: 50,
        source: source as 'env' | 'custom',
        perFeature: { quiz: 0, chat: 0, podcast: 0, flashcards: 0, ocr: 0 } as Record<string, number>
    };

    try {
        const stored = localStorage.getItem(USAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.month === currentMonth) {
                stats = { ...stats, ...parsed, source }; // Keep counts, update source
            }
        }
    } catch (e) {
        console.warn("[Gemini] Failed to read usage stats", e);
    }

    // Always persist to ensure consistent state
    localStorage.setItem(USAGE_KEY, JSON.stringify(stats));
    return stats;
};

const checkUsageLimit = () => {
    const stats = getUsageStats();
    // Only enforce limit if using system key
    if (stats.source === 'env' && stats.count >= stats.limit) {
        throw new UsageLimitError();
    }
};

const incrementUsage = (featureId: string) => {
    const stats = getUsageStats();
    stats.count += 1;
    stats.perFeature[featureId] = (stats.perFeature[featureId] || 0) + 1;
    localStorage.setItem(USAGE_KEY, JSON.stringify(stats));
};

export const getFeatureConfig = (featureId: string) => {
    try {
        const stored = localStorage.getItem(PREFS_KEY);
        if (stored) {
            const prefs = JSON.parse(stored);
            return prefs[featureId] || {};
        }
    } catch (e) {
        // ignore
    }
    return {};
};

// --- END HELPERS ---

export const encodeKey = (key: string): string => {
    try {
        return KEY_PREFIX + btoa(key);
    } catch (e) {
        return key;
    }
};

export const decodeKey = (stored: string | null): string => {
    if (!stored) return "";
    if (stored.startsWith(KEY_PREFIX)) {
        try {
            return atob(stored.slice(KEY_PREFIX.length));
        } catch (e) {
            return stored;
        }
    }
    return stored; 
};

const getAiClient = () => {
    // 1. Try Custom Key (LocalStorage) - Primary for Static Builds
    const storedKey = localStorage.getItem('engram_custom_api_key');
    const customKey = decodeKey(storedKey);
    
    if (customKey && customKey.trim().length > 0) {
        console.debug("[Gemini] Using Custom API Key from LocalStorage");
        return {
            client: new GoogleGenAI({ apiKey: customKey.trim() }),
            isCustom: true,
            key: customKey.trim()
        };
    }

    // 2. Try Env Key (Process Env / Window Shim)
    // Only use if strictly defined and not empty
    const envKey = process.env.API_KEY;
    
    if (envKey && envKey.length > 0 && envKey !== 'undefined') {
        console.debug("[Gemini] Using System/Env API Key");
        return {
            client: new GoogleGenAI({ apiKey: envKey }),
            isCustom: false,
            key: envKey
        };
    }

    // 3. No Key Found - Fail fast
    console.warn("[Gemini] No API Key found.");
    throw new NoApiKeyError();
};

export const validateApiKey = async (apiKey: string): Promise<boolean> => {
    if (!apiKey || !apiKey.trim().startsWith('AIza') || apiKey.trim().length < 39) {
        return false;
    }
    try {
        const client = new GoogleGenAI({ apiKey: apiKey.trim() });
        await client.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ text: 'test' }] }
        });
        return true;
    } catch (e) {
        console.warn("[Gemini] Validation failed:", e);
        return false;
    }
};

const truncateContext = (text: string, limit: number = 60000): string => {
    if (!text || text.length <= limit) return text;
    const truncated = text.substring(0, limit);
    const lastParagraph = truncated.lastIndexOf('\n\n');
    if (lastParagraph > limit * 0.8) return truncated.substring(0, lastParagraph);
    return truncated.substring(0, limit);
};

// --- LOGGING HELPER ---
const logGeminiRequest = (model: string, method: string, isCustom: boolean) => {
    console.debug(`[Gemini] Request: ${method} | Model: ${model} | CustomKey: ${isCustom}`);
};

export const callGeminiApiWithRetry = async (
  prompt: string, 
  systemInstruction: string, 
  schema: any | null, 
  imageData: string | {base64: string, mimeType: string}[] | null = null, 
  mimeType: string | null = null, 
  retries = 3,
  model: string = 'gemini-3-flash-preview',
  featureId: string = 'unknown'
): Promise<any> => {
    
    checkUsageLimit();

    // 1. Get Client (Might throw NoApiKeyError)
    const { client, isCustom } = getAiClient();
    
    // Override model from preferences if available
    const prefs = getFeatureConfig(featureId);
    let effectiveModel = model;
    if (prefs.model) {
        // Map simplified keys to actual model strings
        if (prefs.model === 'flash') effectiveModel = 'gemini-2.5-flash';
        if (prefs.model === 'pro') effectiveModel = 'gemini-2.5-pro';
        // 'preview' or default remains passed model
    }

    logGeminiRequest(effectiveModel, 'generateContent', isCustom);

    const parts: any[] = [{ text: prompt }];

    if (imageData) {
        if (Array.isArray(imageData)) {
            imageData.forEach(item => {
                parts.push({
                    inlineData: {
                        mimeType: item.mimeType,
                        data: item.base64
                    }
                });
            });
        } else if (typeof imageData === 'string' && mimeType) {
            parts.push({
                inlineData: {
                    mimeType: mimeType,
                    data: imageData
                }
            });
        }
    }

    const config: any = {
        systemInstruction: systemInstruction,
    };

    if (effectiveModel.includes('gemini-3') || effectiveModel.includes('gemini-2.5')) {
        config.thinkingConfig = { thinkingBudget: 0 };
    }

    if (schema) {
        config.responseMimeType = "application/json";
        config.responseSchema = schema;
    }

    for (let i = 0; i < retries; i++) {
        try {
            const response = await client.models.generateContent({
                model: effectiveModel,
                contents: {
                    parts: parts
                },
                config: config
            });

            console.debug(`[Gemini] Response (${effectiveModel}): Success`);
            const text = response.text;
            if (!text) throw new Error("API response missing content.");
            
            // Success! Increment usage.
            incrementUsage(featureId);
            
            return schema ? JSON.parse(text) : { text: text };

        } catch (error: any) {
            // Propagate Errors immediately
            if (error.name === 'NoApiKeyError') throw error;
            if (error.name === 'UsageLimitError') throw error;

            console.warn(`[Gemini] Attempt ${i + 1} failed:`, error.status, error.message);
            
            if (error.message?.includes('API key') || error.status === 403 || error.status === 400) {
                 if (isCustom) throw new Error("Error generating AI: Your Custom API Key is invalid or quota exceeded.");
                 throw new NoApiKeyError(); // Treat as missing/invalid system key
            }
            if (i === retries - 1) {
                console.error("[Gemini] Failed after retries:", error);
                throw new Error("AI Service unavailable. Please try again later.");
            }
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
    }
};

export const generatePodcastScript = async (topicName: string, notes: string, language: 'English' | 'Hinglish' = 'English', targetDurationMinutes: number = 5, featureId: string = 'podcast') => {
    checkUsageLimit();
    const { client, isCustom } = getAiClient(); // Propagates NoApiKeyError
    
    // Default to flash-preview for script gen, or use prefs
    const prefs = getFeatureConfig(featureId);
    let model = 'gemini-3-flash-preview'; 
    if (prefs.model === 'pro') model = 'gemini-2.5-pro';
    
    logGeminiRequest(model, 'generatePodcastScript', isCustom);

    const safeNotes = truncateContext(notes, 60000);
    const durationText = targetDurationMinutes >= 15 
        ? "TARGET LENGTH: VERY LONG (10-15 MINUTES). This is a comprehensive subject recap." 
        : "TARGET LENGTH: 3-5 MINUTES.";

    let languageInstruction = `6.  **Language**: ${language}.`;
    if (language === 'Hinglish') {
        languageInstruction = `6.  **Language**: Hinglish (Mix of Hindi and English).
    -   Use Hindi for conversational fillers and connecting phrases.
    -   Keep core technical terms in English.`;
    }

    const personaInstruction = prefs.persona ? `\n    7.  **Style/Persona**: ${prefs.persona}` : "";

    const prompt = `Generate a realistic, engaging "Deep Dive" style podcast script between two hosts (Alex and Jamie) about "${topicName}".
    Source Material: ${safeNotes}
    STRICT GUIDELINES:
    1.  Goal: Help the user MEMORIZE the provided notes.
    2.  Format: Conversational dialogue. Alex (Expert), Jamie (Curious Student).
    3.  Tone: Enthusiastic, natural.
    4.  Duration: ${durationText}
    ${languageInstruction}${personaInstruction}
    Output Format:
    -   Return ONLY the dialogue text.
    -   Format strictly as: Alex: [text] Jamie: [text]`;

    try {
        const response = await client.models.generateContent({
            model: model,
            contents: prompt,
        });
        const text = response.text;
        if (!text) throw new Error("Empty response from AI");
        
        console.debug("[Gemini] Script Generated. Length:", text.length);
        incrementUsage(featureId); // Increment on success
        return text;
    } catch (e: any) {
        if (e.name === 'NoApiKeyError') throw e;
        if (e.name === 'UsageLimitError') throw e;
        console.error("[Gemini] Script generation failed", e);
        if (e.message?.includes('404')) throw new Error("Model not found or API Key missing permissions.");
        if (e.message?.includes('429')) throw new Error("Rate limit exceeded. Please try again later.");
        throw new Error(`Failed to generate script: ${e.message}`);
    }
};

export const generatePodcastAudio = async (script: string, featureId: string = 'podcast'): Promise<Blob> => {
    checkUsageLimit();
    const { client, isCustom } = getAiClient(); // Propagates NoApiKeyError
    
    // Configurable TTS Model
    const prefs = getFeatureConfig(featureId);
    let modelName = "gemini-2.5-flash-preview-tts"; // Default
    if (prefs.ttsModel === 'pro-tts') modelName = "gemini-3-pro-preview-tts"; 
    
    logGeminiRequest(modelName, 'generatePodcastAudio', isCustom);

    try {
        const response = await client.models.generateContent({
            model: modelName,
            contents: [{ parts: [{ text: script }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    multiSpeakerVoiceConfig: {
                        speakerVoiceConfigs: [
                            { speaker: 'Alex', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
                            { speaker: 'Jamie', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
                        ]
                    }
                },
            },
        });

        const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!audioBase64) {
            console.error("[Gemini] Audio response missing inlineData", response);
            throw new Error("No audio data returned from API.");
        }
        
        console.debug("[Gemini] Audio Generated. Size:", audioBase64.length);
        incrementUsage(featureId); // Increment on success
        return createWavBlob(atob(audioBase64));
    } catch (e: any) {
        if (e.name === 'NoApiKeyError') throw e;
        if (e.name === 'UsageLimitError') throw e;
        console.error("[Gemini] Audio generation failed", e);
        if (e.message?.includes('404')) throw new Error("TTS Model not found. Check API Key.");
        throw new Error(`Audio generation failed: ${e.message}`);
    }
};

export const chatWithNotesStream = async (
    history: { role: 'user' | 'model', text: string }[],
    newMessage: string,
    notesContext: string,
    subjectName: string,
    onChunk: (text: string) => void,
    featureId: string = 'chat'
): Promise<void> => {
    
    checkUsageLimit();
    const { client, isCustom } = getAiClient(); // Propagates NoApiKeyError
    const safeNotes = truncateContext(notesContext, 30000);

    const prefs = getFeatureConfig(featureId);
    let model = 'gemini-3-flash-preview';
    if (prefs.model === 'pro') model = 'gemini-2.5-pro';

    let personaInstruction = "";
    if (prefs.persona) {
        personaInstruction = `\n\nPERSONA INSTRUCTION: ${prefs.persona}\n\n`;
    }

    const systemInstruction = `You are a knowledgeable AI tutor helping the user study "${subjectName}".
    INSTRUCTIONS:
    1.  Use the provided STUDY NOTES below as your primary context.
    2.  If the answer is NOT in the notes, use your own GENERAL KNOWLEDGE.
    3.  **MATH**: ALWAYS use LaTeX. Inline: $...$, Block: $$...$$.
    ${personaInstruction}
    STYLE:
    -   Provide the answer directly and naturally.
    -   Keep responses concise (2-3 sentences) unless asked for detail.
    
    --- STUDY NOTES ---
    ${safeNotes}`;

    const contents = history.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] }));
    contents.push({ role: 'user', parts: [{ text: newMessage }] });

    try {
        const responseStream = await client.models.generateContentStream({
            model: model,
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                thinkingConfig: { thinkingBudget: 0 }
            }
        });

        let hasContent = false;
        for await (const chunk of responseStream) {
            const text = chunk.text;
            if (text) {
                onChunk(text);
                hasContent = true;
            }
        }
        if (hasContent) {
            incrementUsage(featureId);
        }
    } catch (error: any) {
        console.error("Chat Stream Error", error);
        if (error.name === 'NoApiKeyError' || error.message?.includes('API Key') || error.message?.includes('403')) {
             onChunk("\n[Error: Missing or Invalid API Key. Please check Settings.]");
        } else if (error.name === 'UsageLimitError') {
             onChunk("\n[Error: Monthly usage limit reached. Add your own API key in Settings.]");
        } else {
             onChunk("\n[Sorry, I lost connection. Please try again.]");
        }
    }
};

export const chatWithNotes = async (
    history: { role: 'user' | 'model', text: string }[],
    newMessage: string,
    notesContext: string,
    subjectName: string,
    featureId: string = 'chat'
): Promise<string> => {
    let result = '';
    await chatWithNotesStream(history, newMessage, notesContext, subjectName, (chunk) => result += chunk, featureId);
    return result;
};

export const generateScoreAnalysis = async (userName: string, score: number, level: number, studyLog: any[]) => {
    // Score analysis is treated as 'quiz' or 'general' usage
    try {
        return await callGeminiApiWithRetry(
            `Analyze score for ${userName}: ${score} (Level ${level})`,
            "You are a helpful analyst.",
            null,
            null,
            null,
            3,
            'gemini-3-flash-preview',
            'quiz' // Attribute to quiz/analysis
        );
    } catch (e: any) {
        return (e.text) ? e.text : "Analysis unavailable.";
    }
};
