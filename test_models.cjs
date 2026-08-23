const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
    try {
        // We can just try to hit the rest API if the SDK models listing doesn't exist.
        // Actually, the new SDK might not have a simple models.list, but we can try.
        // Wait, the SDK has ai.models.list()
        // Or we can just use fetch.
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await res.json();
        console.log(data.models.map(m => m.name));
    } catch(e) {
        console.log(e);
    }
}
run();
