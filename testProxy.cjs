const { GoogleGenAI } = require("@google/genai");

async function run() {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const modelsToTest = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-flash-latest'];
    for (const m of modelsToTest) {
        try {
            await ai.models.generateContent({
                model: m,
                contents: 'hello',
            });
            console.log("Success:", m);
        } catch(e) {
            console.error("Failed:", m, e.message);
        }
    }
}
run();
