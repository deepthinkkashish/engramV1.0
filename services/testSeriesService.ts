import { getAiClient, checkUsageLimit, incrementUsage, resolveModelName } from './gemini';
import { Type, Schema } from "@google/genai";
import { jsonrepair } from 'jsonrepair';

export interface TestSeriesQuestion {
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
}

const safeParseJSON = (text: string) => {
    try {
        // Strip out thinking process from reasoning models
        const textWithoutThink = text.replace(/<think>[\s\S]*?<\/think>/g, '');
        
        // Remove markdown formatting
        const jsonString = textWithoutThink.replace(/```json/gi, '').replace(/```/g, '').trim();

        try {
            return JSON.parse(jsonString);
        } catch {
            // Fallback to jsonrepair for truncated or malformed JSON
            const repaired = jsonrepair(jsonString);
            const parsed = JSON.parse(repaired);
            return parsed;
        }
    } catch {
        console.error("JSON Repair failed");
        throw new Error("Unable to parse the generated response.");
    }
};

export const fetchExamSubjects = async (exam: string, stream: string, language: string = "English"): Promise<string[]> => {
    checkUsageLimit();
    const { client } = getAiClient();
    
    // Fetch preferences
    let modelName = 'gemini-3.5-flash';
    let personaStr = '';
    try {
        const userId = localStorage.getItem('engramCurrentUserId') || 'default';
        const stored = localStorage.getItem(`engram_ai_preferences_${userId}`);
        if (stored) {
            const allPrefs = JSON.parse(stored);
            const tsPrefs = allPrefs['testSeries'] || {};
            modelName = resolveModelName(tsPrefs.model, 'testSeries');
            if (tsPrefs.persona) {
                personaStr = `\n\nAdhere to the following persona/instructions:\n${tsPrefs.persona}`;
            }
        }
    } catch {
        // ignore
    }

    const languageStr = language !== 'English' ? `\nReturn the names of the subjects translated to the requested language: ${language}.` : '';
    const prompt = `You are an expert curriculum designer. List ALL the core subjects and topics for the following competitive exam and stream. Provide an EXHAUSTIVE list covering the entire syllabus.
Exam: ${exam}
Stream/Branch: ${stream}${languageStr}${personaStr}

Return ONLY a JSON array of strings representing the subjects. Keep the subject names concise and standard. Include both technical subjects and non-technical subjects (e.g., General Knowledge, Aptitude, English, Reasoning) if they are typically part of this exam.`;

    const responseSchema: Schema = {
        type: Type.ARRAY,
        items: { type: Type.STRING }
    };

    try {
        let response;
        try {
            response = await client.models.generateContent({
                model: modelName,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema,
                    temperature: 0.2
                }
            });
        } catch (apiErr: unknown) {
            const errStr = (apiErr?.message || (apiErr?.error?.message) || JSON.stringify(apiErr) || String(apiErr) || "").toLowerCase();
            if (apiErr.status === 403 || apiErr.status === 404 || apiErr.status === 429 || errStr.includes('403') || errStr.includes('404') || errStr.includes('429') || errStr.includes('quota') || errStr.includes('exhausted') || errStr.includes('permission')) {
                console.warn("Model " + modelName + " failed with quota/permission/404, falling back to gemini-3.6-flash", apiErr.message);
                modelName = 'gemini-3.6-flash';
                response = await client.models.generateContent({
                    model: modelName,
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: responseSchema,
                        temperature: 0.2
                    }
                });
            } else {
                throw apiErr;
            }
        }
        
        incrementUsage();
        const text = response.text;
        if (!text) throw new Error("Empty response from Gemini");
        
        const subjects = safeParseJSON(text);
        return Array.isArray(subjects) ? subjects : [];
    } catch (error) {
        console.error("Failed to fetch exam subjects:", error);
        throw error;
    }
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateExamQuiz = async (
    exam: string, 
    stream: string, 
    subject: string, 
    difficulty: string, 
    numQuestions: number, 
    pastQuestionsContext: string[],
    specificTopics?: string,
    language: string = "English"
): Promise<TestSeriesQuestion[]> => {
    checkUsageLimit();
    const { client } = getAiClient();
    
    // Fetch preferences
    let modelName = 'gemini-3.5-flash';
    let personaStr = '';
    let diff = difficulty;
    
    try {
        const userId = localStorage.getItem('engramCurrentUserId') || 'default';
        const stored = localStorage.getItem(`engram_ai_preferences_${userId}`);
        if (stored) {
            const allPrefs = JSON.parse(stored);
            const tsPrefs = allPrefs['testSeries'] || {};
            modelName = resolveModelName(tsPrefs.model, 'testSeries');
            
            if (tsPrefs.persona) {
                personaStr = `\n\nAdhere to the following persona/instructions:\n${tsPrefs.persona}`;
            }
            if (tsPrefs.difficulty) {
                diff = tsPrefs.difficulty; // user's pref overrides the component's default if wanted, or we just keep it
            }
        }
    } catch { /* ignore */ }

    const pastContextStr = pastQuestionsContext.length > 0 
        ? `\nIMPORTANT: Do NOT generate questions that are identical or highly similar to these past questions:\n${pastQuestionsContext.slice(-20).map((q, i) => `${i+1}. ${q}`).join('\n')}`
        : '';
    const specificTopicsStr = specificTopics && specificTopics.trim().length > 0
        ? `\nIMPORTANT: The user has requested to ONLY test the following specific topics: "${specificTopics}". Ensure ALL questions strictly focus on these topics.`
        : '';

    let languageStr = '';
    const languageKeywords = ["language", "english", "hindi", "punjabi", "bengali", "tamil", "telugu", "marathi", "gujarati", "urdu", "kannada", "odia", "malayalam", "sanskrit"];
    const isLanguageSubject = subject !== "All Subjects" && languageKeywords.some(keyword => subject.toLowerCase().includes(keyword));
    if (isLanguageSubject) {
        languageStr = `\nIMPORTANT: Since this is a test of "${subject}", the questions, options, and explanations MUST be in the original script and language of "${subject}" itself, overriding any user preferred language. For example, if it's a Punjabi language test, use Gurmukhi script.`;
    } else if (language !== 'English') {
        languageStr = `\nIMPORTANT: The entire test (questions, options, and explanations) MUST be generated in ${language}. Use the appropriate script and vocabulary for ${language}.`;
    }

    const subjectPrompt = subject === "All Subjects" 
        ? "the entire syllabus encompassing all relevant subjects for this exam"
        : `the subject: "${subject}"`;

    const CHUNK_SIZE = 5;
    const numChunks = Math.ceil(numQuestions / CHUNK_SIZE);
    let allQuestions: TestSeriesQuestion[] = [];

    try {
        for (let i = 0; i < numChunks; i++) {
            const chunkAmount = (i === numChunks - 1 && numQuestions % CHUNK_SIZE !== 0) ? numQuestions % CHUNK_SIZE : CHUNK_SIZE;
            
            const chunkPrompt = `You are an expert examiner for the ${exam} exam (${stream} stream).
Generate a practice test for ${subjectPrompt}.${specificTopicsStr}${languageStr}${personaStr}
Difficulty level: ${diff}.
Number of questions: EXACTLY ${chunkAmount}. You MUST generate exactly ${chunkAmount} questions, no more, no less.

The questions should closely match the pattern, style, and syllabus of the actual ${exam} exam.
Include a mix of conceptual and numerical questions if applicable to the subject.
IMPORTANT: Keep the question text as concise as possible while maintaining the difficulty. Do not write overly long paragraphs.
${pastContextStr}
Return the output strictly as a JSON array of exactly ${chunkAmount} objects. Each object must have:
- "question": The concise question text.
- "options": An array of exactly 4 string options.
- "correctAnswer": The exact string of the correct option.
- "explanation": A very concise, 1-2 sentence explanation of why the correct answer is correct.`;

            let success = false;
            let retries = 0;
            const MAX_RETRIES = 3;

            while (!success && retries < MAX_RETRIES) {
                try {
                    
                    
                    let response;
                    try {
                        response = await client.models.generateContent({
                            model: modelName,
                            contents: chunkPrompt,
                            config: {
                                responseMimeType: "application/json",
                                responseSchema: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            question: { type: Type.STRING },
                                            options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                            correctAnswer: { type: Type.STRING },
                                            explanation: { type: Type.STRING }
                                        },
                                        required: ["question", "options", "correctAnswer", "explanation"]
                                    }
                                },
                                temperature: 0.7,
                                maxOutputTokens: 8192
                            }
                        });
                    } catch (apiErr) {
                        const errStr = (apiErr?.message || (apiErr?.error?.message) || JSON.stringify(apiErr) || String(apiErr) || "").toLowerCase();
                        if (apiErr.status === 403 || apiErr.status === 404 || apiErr.status === 429 || errStr.includes('403') || errStr.includes('404') || errStr.includes('429') || errStr.includes('quota') || errStr.includes('exhausted') || errStr.includes('permission')) {
                            console.warn("Model " + modelName + " failed with quota/permission/404, falling back to gemini-3.6-flash", apiErr.message);
                            modelName = 'gemini-3.6-flash';
                            response = await client.models.generateContent({
                                model: modelName,
                                contents: chunkPrompt,
                                config: {
                                    responseMimeType: "application/json",
                                    responseSchema: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                question: { type: Type.STRING },
                                                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                                correctAnswer: { type: Type.STRING },
                                                explanation: { type: Type.STRING }
                                            },
                                            required: ["question", "options", "correctAnswer", "explanation"]
                                        }
                                    },
                                    temperature: 0.7,
                                    maxOutputTokens: 8192
                                }
                            });
                        } else {
                            throw apiErr;
                        }
                    }


                    
                    incrementUsage();
                    const text = response.text;
                    if (!text) {
                        retries++;
                        continue;
                    }
                    
                    const parsed = safeParseJSON(text);
                    const rawQuestions = parsed.questions || parsed;
                    const chunkQuestions = Array.isArray(rawQuestions) ? rawQuestions : [];
                    
                    const validQuestions = chunkQuestions.filter((q: TestSeriesQuestion | Record<string, unknown>) => 
                        q && 
                        q.question && 
                        Array.isArray(q.options) && 
                        q.options.length > 0 &&
                        q.correctAnswer
                    );
                    
                    allQuestions = allQuestions.concat(validQuestions);
                    success = true;
                } catch(e: unknown) {
                    console.error(`Chunk ${i+1} parse/generation error (Attempt ${retries + 1}):`, (e as Error).message || e);
                    retries++;
                    if (retries < MAX_RETRIES) {
                        await delay(2000 * retries); // wait 2s, 4s
                    }
                }
            }
        }
        
        // Trim to exact requested amount just in case
        return allQuestions.slice(0, numQuestions);
    } catch (error) {
        console.error("Failed to generate exam quiz:", error);
        throw error;
    }
};
