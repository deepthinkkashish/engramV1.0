const fs = require('fs');
const path = 'services/testSeriesService.ts';
let code = fs.readFileSync(path, 'utf8');

const regex = /export const fetchExamSubjects = async \([\s\S]*?\}\s*\} catch \(error\) \{\s*console\.error\("Failed to fetch exam subjects:", error\);\s*throw error;\s*\}\s*\};\s*const delay/m;

const newFetch = `export const fetchExamSubjects = async (exam: string, stream: string, language: string = "English"): Promise<string[]> => {
    checkUsageLimit();
    const { client } = getAiClient();
    
    // Fetch preferences
    let modelName = 'gemini-3.5-flash';
    let personaStr = '';
    try {
        const userId = localStorage.getItem('engramCurrentUserId') || 'default';
        const stored = localStorage.getItem(\`engram_ai_preferences_\${userId}\`);
        if (stored) {
            const allPrefs = JSON.parse(stored);
            const tsPrefs = allPrefs['testSeries'] || {};
            modelName = resolveModelName(tsPrefs.model, 'testSeries');
            if (tsPrefs.persona) {
                personaStr = \`\\n\\nAdhere to the following persona/instructions:\\n\${tsPrefs.persona}\`;
            }
        }
    } catch(_e) {
        // ignore
    }

    const languageStr = language !== 'English' ? \`\\nReturn the names of the subjects translated to the requested language: \${language}.\` : '';
    const prompt = \`You are an expert curriculum designer. List ALL the core subjects and topics for the following competitive exam and stream. Provide an EXHAUSTIVE list covering the entire syllabus.
Exam: \${exam}
Stream/Branch: \${stream}\${languageStr}\${personaStr}

Return ONLY a JSON array of strings representing the subjects. Keep the subject names concise and standard. Include both technical subjects and non-technical subjects (e.g., General Knowledge, Aptitude, English, Reasoning) if they are typically part of this exam.\`;

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
        } catch (apiErr: any) {
            const errStr = (apiErr.message || "").toLowerCase();
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

const delay`;

code = code.replace(regex, newFetch);
fs.writeFileSync(path, code);
