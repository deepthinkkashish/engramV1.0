const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: 'test',
        });
        console.log("Success:", response.text);
    } catch(e) {
        console.log("Error:", e);
    }
}
run();
