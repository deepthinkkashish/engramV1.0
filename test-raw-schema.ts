import { getAiClient } from './services/gemini';
import { Type, Schema } from "@google/genai";

(globalThis as any).localStorage = {
    getItem: () => null,
    setItem: () => {}
};

async function run() {
    try {
        const { client } = getAiClient();
        const responseSchema: Schema = {
            type: Type.OBJECT,
            properties: {
                questions: {
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
                }
            },
            required: ["questions"]
        };

        const response = await client.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: "Generate exactly 5 hard reasoning questions on round table seating.",
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.7,
                maxOutputTokens: 8192
            }
        });
        
        console.log("Raw Response:", JSON.parse(response.text).questions.length);
    } catch (e) {
        console.error(e);
    }
}
run();
