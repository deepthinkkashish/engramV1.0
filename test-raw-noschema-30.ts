import { getAiClient } from './services/gemini';

(globalThis as any).localStorage = {
    getItem: () => null,
    setItem: () => {}
};

async function run() {
    try {
        const { client } = getAiClient();
        const response = await client.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: "Generate exactly 30 hard reasoning questions on round table seating.\n\nReturn the output strictly as a JSON array of exactly 30 objects. Each object must have:\n- \"question\": The question text.\n- \"options\": An array of exactly 4 string options.\n- \"correctAnswer\": The exact string of the correct option.\n- \"explanation\": A very concise, 1-2 sentence explanation of why the correct answer is correct.",
            config: {
                responseMimeType: "application/json",
                temperature: 0.7,
                maxOutputTokens: 8192
            }
        });
        
        const text = response.text;
        console.log("Raw Response length:", text.length);
        console.log("Parsed length:", JSON.parse(text).length);
    } catch (e) {
        console.error(e);
    }
}
run();
