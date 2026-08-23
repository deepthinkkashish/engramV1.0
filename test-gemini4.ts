import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
    try {
        const chat = ai.chats.create({
            model: 'gemini-3.5-flash',
            history: [{ role: 'model', parts: [{text: 'Hi!'}] }]
        });
        const res = await chat.sendMessage({ message: 'Hello' });
        console.log("SUCCESS:", res.text);
    } catch (e) {
        console.error("ERROR:", e.status, e.message);
    }
}
run();
