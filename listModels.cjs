const { GoogleGenAI } = require("@google/genai");

async function run() {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    try {
        const response = await ai.models.list();
        for (const m of response.models) {
            console.log(m.name);
        }
    } catch(e) {
        console.error("Failed:", e);
    }
}
run();
