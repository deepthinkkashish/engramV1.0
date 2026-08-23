const { GoogleGenAI } = require("@google/genai");

async function run() {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    try {
        const response = await ai.models.list();
        console.log(Object.keys(response));
        if (response.models) {
             console.log("has models");
        }
        for await (const m of response) {
            console.log(m.name);
        }
    } catch(e) {
        console.error("Failed:", e);
    }
}
run();
