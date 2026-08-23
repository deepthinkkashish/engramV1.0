const { GoogleGenAI } = require("@google/genai");

async function run() {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: 'test',
        });
        console.log("Success with gemini-1.5-flash");
    } catch(e) {
        console.error("1.5-flash failed:", e.message);
    }
}
run();
