const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: 'hello',
        });
        console.log("Success:", response.text);
    } catch(e) {
        console.log("Error:", e);
    }
}
run();
