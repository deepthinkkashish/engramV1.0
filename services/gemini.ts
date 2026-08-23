
import { GoogleGenAI, Schema } from "@google/genai";

// -- USAGE LIMITS --
const FREE_LIMIT = 50; // Monthly
const getUsageKey = () => `engram_usage_stats_${localStorage.getItem('engramCurrentUserId') || 'default'}`;

export const getUsageStats = () => {
    try {
        const userId = localStorage.getItem('engramCurrentUserId') || 'default';
        const customKey = localStorage.getItem(`engram_custom_api_key_${userId}`);
        if (customKey) return { source: 'custom', count: 0, limit: Infinity };

        const raw = localStorage.getItem(getUsageKey());
        const stats = raw ? JSON.parse(raw) : { count: 0, month: new Date().getMonth() };
        
        // Reset if new month
        const currentMonth = new Date().getMonth();
        if (stats.month !== currentMonth) {
            return { count: 0, month: currentMonth, limit: FREE_LIMIT };
        }
        
        return { ...stats, limit: FREE_LIMIT };
    } catch {
        return { count: 0, limit: FREE_LIMIT, month: new Date().getMonth() };
    }
};

export const checkUsageLimit = () => {
    const stats = getUsageStats();
    if (stats.source === 'custom') return;
    if (stats.count >= stats.limit) {
        const error = new Error("Monthly AI quota reached (Free Tier). Add a custom API Key in Settings for unlimited access.");
        error.name = 'UsageLimitError';
        throw error;
    }
};

export const incrementUsage = () => {
    const stats = getUsageStats();
    if (stats.source === 'custom') return;
    
    stats.count++;
    localStorage.setItem(getUsageKey(), JSON.stringify(stats));
};

// -- CLIENT FACTORY --
export const getAiClient = () => {
    const userId = localStorage.getItem('engramCurrentUserId') || 'default';
    const customKey = localStorage.getItem(`engram_custom_api_key_${userId}`);
    
    // Priority: 1. Custom Key (LocalStorage) -> 2. Vite Env Var -> 3. Process Env (Fallback)
    // Cast import.meta to unknown then to any to avoid TS error about 'env' property
    const envKey = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined);
    const apiKey = customKey || envKey; 
    
    if (!apiKey) {
        throw new Error("No API Key available. Please configure a custom key in Settings.");
    }
    
    return { 
        client: new GoogleGenAI({ apiKey }),
        isCustom: !!customKey
    };
};

export const validateApiKey = async (key: string): Promise<boolean> => {
    try {
        const ai = new GoogleGenAI({ apiKey: key });
        await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: 'test',
        });
        return true;
    } catch (e) {
        console.error("Key Validation Failed", e);
        return false;
    }
};

// -- CONFIG HELPERS --
export const getAvailableModels = async (): Promise<{id: string, label: string}[]> => {
    // Curated list of models available under generous free limits
    return [
        { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash (Advanced & Recommended)' },
        { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash (Latest & Fastest)' },
        { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite (Ultra-fast)' },
        { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview (Deep Reasoning)' }
    ];
};

export const getFeatureConfig = (featureId: string) => {
    try {
        const userId = localStorage.getItem('engramCurrentUserId') || 'default';
        const all = JSON.parse(localStorage.getItem(`engram_ai_preferences_${userId}`) || '{}');
        return all[featureId] || {};
    } catch {
        return {};
    }
};

export const resolveModelName = (prefsModel?: string, featureId?: string): string => {
    if (!prefsModel) {
        if (featureId === 'ocr') return 'gemini-3.6-flash';
        if (featureId === 'testSeries') return 'gemini-3.6-flash';
        return 'gemini-3.6-flash';
    }
    if (prefsModel === 'flash') return 'gemini-3.6-flash';
    if (prefsModel === 'pro') return 'gemini-3.1-pro-preview';
    
    // Auto-upgrade legacy models to prevent 404s and quota crashes
    if (prefsModel.includes('1.5') || prefsModel.includes('2.0') || prefsModel.includes('2.5') || prefsModel.includes('3.0') || prefsModel === 'gemini-3-flash-preview' || prefsModel.includes('omni-flash')) {
        return 'gemini-3.6-flash';
    }
    
    return prefsModel;
};

export const truncateContext = (text: string, maxLength: number = 10000) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...[truncated]";
};

// -- GENERIC CALLER --
export const callGeminiApiWithRetry = async (
    prompt: string,
    systemInstruction: string,
    responseSchema: Schema | null,
    images: { base64: string, mimeType: string }[] | null = null,
    tools: unknown[] | null = null,
    retries: number = 3,
    modelName: string = 'gemini-3.6-flash',
    featureId: string = 'general'
): Promise<unknown> => {
    checkUsageLimit();
    const { client } = getAiClient();

    // Prepare contents
    let contents: string | { parts: { inlineData?: { mimeType: string, data: string }, text?: string }[] } = prompt;
    if (images && images.length > 0) {
        const parts: { inlineData?: { mimeType: string, data: string }, text?: string }[] = images.map(img => ({
            inlineData: { mimeType: img.mimeType, data: img.base64 }
        }));
        parts.push({ text: prompt });
        contents = { parts };
    }

    const config: Record<string, unknown> = {
        systemInstruction,
    };

    if (responseSchema) {
        config.responseMimeType = "application/json";
        config.responseSchema = responseSchema;
    }
    
    if (tools) {
        config.tools = tools;
    }

    let lastError;
    for (let i = 0; i < retries; i++) {
        try {
            const response = await client.models.generateContent({
                model: modelName,
                contents,
                config
            });
            
            incrementUsage(featureId);
            
            if (responseSchema) {
                const text = response.text || "{}";
                // Basic cleanup for JSON
                const jsonStr = text.replace(/```json|```/g, '').trim();
                return JSON.parse(jsonStr);
            }
            return response;
        } catch (e: unknown) {
            console.warn(`Attempt ${i + 1} failed`, e);
            lastError = e;
            // if (e && typeof e === 'object' && e.name === 'UsageLimitError') throw e; // Let the fallback logic handle it
            
            // Intercept 404 Model Not Found or deprecated model errors
            
            const errStr = (e?.message || (e?.error?.message) || JSON.stringify(e) || String(e) || "").toLowerCase();
            if (e && typeof e === 'object' && ((e as any)?.status === 404 || errStr.includes('not found') || errStr.includes('no longer available'))) {
                // If it's a 404, we can optionally fallback, but the existing code threw.
                // Let's fallback to 3.6-flash here as well to prevent total failure
                if (modelName !== 'gemini-3.6-flash') {
                    console.warn("Model " + modelName + " not found (404), falling back to gemini-3.6-flash");
                    modelName = 'gemini-3.6-flash';
                    continue; // Retry with new model
                } else {
                    throw new Error("The selected AI model is deprecated or no longer available.");
                }
            }
            
            if (e && typeof e === 'object' && ((e as any)?.status === 403 || (e as any)?.status === 429 || errStr.includes('403') || errStr.includes('429') || errStr.includes('quota') || errStr.includes('exhausted') || errStr.includes('permission'))) {
                if (modelName !== 'gemini-3.6-flash') {
                    console.warn("Model " + modelName + " hit quota/permission limit, falling back to gemini-3.6-flash", errStr);
                    modelName = 'gemini-3.6-flash';
                    continue; // Retry with new model
                }
                
                // Rate limit, wait if we're already on 3.6-flash
                if ((e as any)?.status === 429 || errStr.includes('429') || errStr.includes('quota') || errStr.includes('exhausted')) {
                    await new Promise(r => setTimeout(r, 2000 * (i + 1)));
                    continue;
                }
            }

                // Fallback retry delay
                await new Promise(r => setTimeout(r, 2000 * (i + 1)));
            // For other errors, maybe retry
        }
    }
    throw lastError;
};

// -- FEATURE FUNCTIONS --

export const generatePodcastScript = async (
    topicName: string, 
    context: string, 
    language: 'English' | 'Hinglish', 
    durationMinutes: number,
    featureId: string = 'podcast'
): Promise<string> => {
    const prefs = getFeatureConfig(featureId);
    const model = resolveModelName(prefs.model, featureId);

    // Option A, B, D & 3: Hardened Technical Prompt
    const prompt = `You are an expert Engineering Professor and Podcast Producer. 
    Generate a comprehensive, deep-dive podcast script about "${topicName}".
    
    CONTEXT DATA:
    ${truncateContext(context, 20000)}
    
    CORE REQUIREMENTS:
    1. CHECKLIST VERIFICATION: First, identify every critical technical term, component, and principle in the context. You MUST explain every single one of these.
    2. PROPORTIONAL DEPTH: Adjust the depth based on the context provided. If the context is short (2-3 pages), keep the podcast concise and high-impact (around 2-4 mins). If it's long (7-8 pages), go into extreme detail (8-12 mins). Do NOT add "fluff" or repetitive banter just to hit a time limit.
    3. LECTURE STRUCTURE:
       - Introduction: High-level overview and real-world importance. DO NOT use generic filler intro phrases like "Welcome back to the technical deep dive series", "Welcome to BTech deep dive", or "Hello everyone, welcome back". Start the conversation naturally and directly.
       - Component Breakdown: Detailed look at every part/term identified.
       - Working Principle: Step-by-step logic of how it works.
       - Technical Nuances: Mathematical derivations, efficiency, or engineering challenges.
       - Summary: Quick recap of "Must-Remember" points.
    4. SMART COMPRESSION: Use "Fast-Paced Insight" mode. 95% of the content must be high-value technical explanation.
    
    FORMATTING:
    - Language: ${language}. 
      * If Hinglish: This MUST feel like a natural conversation between two Indian engineering students. Use a mix of Hindi and English (Code-Switching). Use Hindi for the "connective tissue" (narrative, logic, reactions, analogies) but keep ALL technical terms, definitions, and core concepts in English. Avoid pure translation; make it sound like a real campus discussion.
    - Target Duration: Approximately ${durationMinutes} minutes. Respect this as a maximum; if the content is explained perfectly in less time, prioritize quality over length.
    - Speakers: Kittu (Male, enthusiastic professor-type) and Kashish (Female, insightful and detail-oriented).
    - Output: Just the script, with speaker names like "Kittu:" and "Kashish:".`;

    const response = await callGeminiApiWithRetry(prompt, "You are a technical podcast script writer for engineering students.", null, null, null, 2, model, featureId);
    return response.text || "";
};

export const generatePodcastAudio = async (script: string, featureId: string = 'podcast', voicePref: 'Standard' | 'Deep' = 'Standard'): Promise<string> => {
    checkUsageLimit();
    const { client } = getAiClient();
    
    // Configured for Multi-Speaker (Kittu & Kashish)
    // Using flash preview tts as per request guidelines for tts
    const response = await client.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: { parts: [{ text: script }] },
        config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
                multiSpeakerVoiceConfig: {
                    speakerVoiceConfigs: [
                        {
                            speaker: 'Kittu',
                            voiceConfig: { prebuiltVoiceConfig: { voiceName: voicePref === 'Deep' ? 'Fenrir' : 'Puck' } } // Deep/Male
                        },
                        {
                            speaker: 'Kashish',
                            voiceConfig: { prebuiltVoiceConfig: { voiceName: voicePref === 'Deep' ? 'Kore' : 'Aoede' } }   // Clear/Female
                        }
                    ]
                }
            },
        },
    });

    incrementUsage(featureId);
    
    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64) throw new Error("No audio generated");
    
    return base64;
};

export const generateScoreAnalysis = async (name: string, score: number, level: number, studyLog: unknown[]) => {
    const prompt = `Analyze the study performance for ${name}. Score: ${score}, Level: ${level}.
    Topics count: ${studyLog.length}.
    Give a short, encouraging summary of their progress and one specific tip to improve.`;
    
    const response = await callGeminiApiWithRetry(prompt, "You are a friendly study coach.", null, null, null, 2, 'gemini-3.6-flash', 'profile');
    return response.text;
};

export const chatWithNotes = async (history: { role: string, text: string }[], message: string, notes: string, subject: string, featureId: string) => {
    checkUsageLimit();
    const { client } = getAiClient();
    const prefs = getFeatureConfig(featureId);
    const model = resolveModelName(prefs.model, featureId);

    const systemInstruction = `You are a helpful tutor for ${subject}. 
    Base your answers on the following notes context, but you can add external knowledge if needed.
    If the user explicitly asks for a specific quantity of items (e.g., 500 idioms, 100 questions), do NOT refuse or say it's impossible due to message limits. You MUST attempt to fulfill the request completely and generate the exact requested amount.
    Notes: ${truncateContext(notes, 20000)}
    ${prefs.persona ? `Persona: ${prefs.persona}` : ''}`;

    const cleanedHistory: { role: string, parts: unknown[] }[] = [];
    for (const h of history) {
        if (cleanedHistory.length === 0) {
            if (h.role === 'user') {
                cleanedHistory.push({ role: h.role, parts: [{ text: h.text }] });
            }
        } else {
            const last = cleanedHistory[cleanedHistory.length - 1];
            if (last.role === h.role) {
                if (h.text) {
                    const lastTextPart = last.parts.find((p: any) => p.text);
                    if (lastTextPart) {
                        (lastTextPart as any).text += '\n\n' + h.text;
                    } else {
                        last.parts.push({ text: h.text });
                    }
                }
            } else {
                if (h.text) {
                    cleanedHistory.push({ role: h.role, parts: [{ text: h.text }] });
                }
            }
        }
    }
    
    if (cleanedHistory.length > 0 && cleanedHistory[cleanedHistory.length - 1].role === 'user') {
        cleanedHistory.pop();
    }

    const chat = client.chats.create({
        model,
        config: { systemInstruction },
        history: cleanedHistory
    });

    const response = await chat.sendMessage({ message });
    incrementUsage(featureId);
    return response.text;
};

export const chatWithNotesStream = async (
    history: { role: string, text: string, images?: { base64: string, mimeType: string }[] }[],
    message: string,
    notes: string,
    subject: string,
    featureId: string,
    onChunk: (text: string) => void,
    modelOverride?: string,
    images?: { base64: string, mimeType: string }[]
) => {
    checkUsageLimit();
    const { client } = getAiClient();
    const prefs = getFeatureConfig(featureId);
    const model = resolveModelName(modelOverride || prefs.model, featureId);

    const systemInstruction = `You are a helpful AI tutor for ${subject}.
    Base your answers on the following notes context, but you can add external knowledge if needed.
    
    FORMATTING RULES:
    - Use **Markdown** for formatting.
    - Use **Markdown Tables** for structured data, comparisons, or lists.
    - Use **LaTeX** for math equations (wrap in $ for inline or $$ for block).
    - Be concise, clear, and engaging.
    - If the user explicitly asks for a specific quantity of items (e.g., 500 idioms, 100 questions), do NOT refuse or say it's impossible due to message limits. You MUST attempt to fulfill the request completely and generate the exact requested amount.
    - If a diagram or plot is requested (including graphs of eigen functions, unit step, impulse, parabolic, exponential, etc.), output the data in a JSON block at the end of your response, like this:
      \`\`\`json
      {
        "type": "plot",
        "title": "Plot Title",
        "xAxisLabel": "Variable X (e.g. Time (s))",
        "yAxisLabel": "Variable Y (e.g. Amplitude or Voltage (V))",
        "data": [{"x": 0, "y": 0}, {"x": 1, "y": 1}, ...]
      }
      \`\`\`
      Ensure calculation domains cover interesting features (-5 to 5 is a good default). ALL x and y values MUST be raw numeric floats (e.g. 3.14), no strings or math expressions (e.g. "pi/2").
    
    Notes: ${truncateContext(notes, 20000)}
    ${prefs.persona ? `Persona: ${prefs.persona}` : ''}`;

    // Clean history: must start with user, must alternate roles
    const cleanedHistory: { role: string, parts: unknown[] }[] = [];
    for (const h of history) {
        if (cleanedHistory.length === 0) {
            if (h.role === 'user') {
                const parts: unknown[] = [];
                if (h.text) parts.push({ text: h.text });
                if (h.images) {
                    h.images.forEach(img => {
                        parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
                    });
                }
                cleanedHistory.push({ role: h.role, parts });
            }
        } else {
            const last = cleanedHistory[cleanedHistory.length - 1];
            if (last.role === h.role) {
                if (h.text) {
                    const lastTextPart = last.parts.find((p: any) => p.text);
                    if (lastTextPart) {
                        (lastTextPart as any).text += '\n\n' + h.text;
                    } else {
                        last.parts.push({ text: h.text });
                    }
                }
                if (h.images) {
                    h.images.forEach(img => {
                        last.parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
                    });
                }
            } else {
                const parts: unknown[] = [];
                if (h.text) parts.push({ text: h.text });
                if (h.images) {
                    h.images.forEach(img => {
                        parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
                    });
                }
                // Only push if there are parts
                if (parts.length > 0) {
                    cleanedHistory.push({ role: h.role, parts });
                }
            }
        }
    }
    // Remove last message if it's from user, to ensure we don't have user, user (though the loop handles merging)
    // Wait, if it ends with user, and we are about to send a user message, the API will fail because it expects model!
    // If cleanedHistory ends with user, it's a problem because the next message we send is user.
    // Actually, sendMessage Stream sends a user message. The history MUST end with a model message (or be empty).
    if (cleanedHistory.length > 0 && cleanedHistory[cleanedHistory.length - 1].role === 'user') {
        // We can either remove it or add a dummy model message. Let's remove it (it gets merged with the current message in spirit, or we just drop it as an unanswered question).
        cleanedHistory.pop();
    }

    const chat = client.chats.create({
        model,
        config: { systemInstruction },
        history: cleanedHistory
    });

    const msgParts: unknown[] = [];
    if (message) msgParts.push({ text: message });
    if (images) {
        images.forEach(img => {
            msgParts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
        });
    }

    const result = await chat.sendMessageStream({ message: msgParts });
    incrementUsage(featureId);

    for await (const chunk of result) {
        const text = chunk.text;
        if (text) onChunk(text);
    }
};

export const detectMathStyle = (persona: string | undefined): string | null => {
    if (!persona) return null;
    if (persona.toLowerCase().includes('latex')) return 'latex';
    return null;
};
